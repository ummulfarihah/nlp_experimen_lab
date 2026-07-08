import os
import sys
import time
import json
import traceback
import threading
from datetime import datetime
from config import resolve_db_path, LOGS_FOLDER
from database import get_db_connection
from ml_engine import train_classical_model
from bert_engine import train_bert_model

# Global registry of active/running jobs
# Maps job_id (int) -> cancel_event (threading.Event)
ACTIVE_JOBS = {}
# Thread lock to prevent racing on ACTIVE_JOBS
_registry_lock = threading.Lock()

def create_job_log_file_path(job_id):
    """Returns absolute path to the job's log file."""
    return os.path.join(LOGS_FOLDER, f"job_{job_id}.log")

def write_to_log_file(job_id, level, event_type, message):
    """Appends a log line to a job's log file."""
    log_path = create_job_log_file_path(job_id)
    timestamp = datetime.now().isoformat()
    log_line = f"[{timestamp}] [{level}] [{event_type}] {message}\n"
    
    # Write to file
    try:
        with open(log_path, 'a', encoding='utf-8') as f:
            f.write(log_line)
    except Exception as e:
        print(f"Failed to write to log file for job {job_id}: {e}", file=sys.stderr)

def db_log_event(job_id, level, event_type, message, metrics=None):
    """Logs an event both to the SQLite database and the text log file."""
    # Write to file first
    write_to_log_file(job_id, level, event_type, message)
    
    # Write to DB
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO experiment_logs (experiment_job_id, log_level, event_type, message, metrics, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            job_id, 
            level, 
            event_type, 
            message, 
            json.dumps(metrics) if metrics else None, 
            datetime.now().isoformat()
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Database logging failed for job {job_id}: {e}", file=sys.stderr)

def update_job_progress(job_id, progress, status_message=None):
    """Updates progress (0-100) and status message in DB and file."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if status_message:
            cursor.execute('''
                UPDATE experiment_jobs 
                SET progress = ?, status = ?
                WHERE id = ?
            ''', (progress, status_message, job_id))
        else:
            cursor.execute('''
                UPDATE experiment_jobs 
                SET progress = ?
                WHERE id = ?
            ''', (progress, job_id))
            
        conn.commit()
        conn.close()
        
        if status_message:
            db_log_event(job_id, "INFO", "PROGRESS_UPDATE", f"{status_message} ({progress}%)")
    except Exception as e:
        print(f"Failed to update job {job_id} progress: {e}", file=sys.stderr)

def start_training_job_async(job_id, dataset_path, model_type, params):
    """Launches model training on a background thread."""
    cancel_event = threading.Event()
    
    with _registry_lock:
        ACTIVE_JOBS[job_id] = cancel_event
        
    thread = threading.Thread(
        target=_training_job_worker,
        args=(job_id, dataset_path, model_type, params, cancel_event),
        name=f"TrainingWorker-Job-{job_id}"
    )
    thread.daemon = True
    thread.start()
    
    # Return thread ID
    return thread.ident

def cancel_training_job(job_id):
    """Triggers cancellation event for a running background job."""
    with _registry_lock:
        if job_id in ACTIVE_JOBS:
            ACTIVE_JOBS[job_id].set()
            return True
    return False

def _training_job_worker(job_id, dataset_path, model_type, params, cancel_event):
    """Background worker thread function for training classical or DL models."""
    dataset_path = resolve_db_path(dataset_path)
    start_time = time.time()
    
    # Helper to check for cancellation
    def check_cancellation(progress_pct, step_name):
        if cancel_event.is_set():
            db_log_event(job_id, "WARNING", "CANCELLATION", f"Job cancellation requested during '{step_name}'. Aborting...")
            _handle_job_failure(job_id, "Job cancelled by user.", "Cancelled", start_time)
            raise InterruptedError("Job cancelled by user.")
            
    # Progress updating wrapper that checks cancellation
    def update_progress(progress_val, message):
        check_cancellation(progress_val, message)
        update_job_progress(job_id, progress_val, "Training")
        db_log_event(job_id, "INFO", "PROGRESS_STEP", message)

    try:
        # Initialize
        db_log_event(job_id, "INFO", "JOB_START", f"Starting training task {job_id} for model '{model_type}' on dataset {os.path.basename(dataset_path)}")
        update_job_progress(job_id, 0, "Preparing")
        time.sleep(0.5)
        
        check_cancellation(2, "Initialization")
        
        # Fetch split_config and random_seed from database
        conn = get_db_connection()
        job_info = conn.execute('''
            SELECT e.split_config, e.random_seed 
            FROM experiment_jobs j
            JOIN experiments e ON j.experiment_id = e.id
            WHERE j.id = ?
        ''', (job_id,)).fetchone()
        
        split_config = None
        random_seed = 42
        if job_info:
            if job_info['split_config']:
                try:
                    split_config = json.loads(job_info['split_config'])
                except:
                    pass
            if job_info['random_seed'] is not None:
                random_seed = int(job_info['random_seed'])
                
        # Lock random seeds for 100% reproducibility (Python, NumPy, PyTorch, CUDA)
        import random
        import numpy as np
        random.seed(random_seed)
        os.environ['PYTHONHASHSEED'] = str(random_seed)
        np.random.seed(random_seed)
        
        try:
            import torch
            torch.manual_seed(random_seed)
            if torch.cuda.is_available():
                torch.cuda.manual_seed(random_seed)
                torch.cuda.manual_seed_all(random_seed)
                torch.backends.cudnn.deterministic = True
                torch.backends.cudnn.benchmark = False
        except ImportError:
            pass
                
        test_dataset_path = None
        val_dataset_path = None
        test_size = 0.2
        
        if split_config:
            if split_config.get("method") == "external":
                test_id = split_config.get("test_dataset_id")
                val_id = split_config.get("val_dataset_id")
                if test_id:
                    row = conn.execute('SELECT filepath FROM datasets WHERE id = ?', (test_id,)).fetchone()
                    if row:
                        test_dataset_path = resolve_db_path(row['filepath'])
                if val_id:
                    row = conn.execute('SELECT filepath FROM datasets WHERE id = ?', (val_id,)).fetchone()
                    if row:
                        val_dataset_path = resolve_db_path(row['filepath'])
            else:
                test_size = float(split_config.get("test_size", 0.2))
        conn.close()
        
        if test_dataset_path:
            db_log_event(job_id, "INFO", "SPLIT_CONFIG", f"Menggunakan dataset uji eksternal: {os.path.basename(test_dataset_path)}")
            if val_dataset_path:
                db_log_event(job_id, "INFO", "SPLIT_CONFIG", f"Menggunakan dataset validasi eksternal: {os.path.basename(val_dataset_path)}")
        else:
            db_log_event(job_id, "INFO", "SPLIT_CONFIG", f"Menggunakan split dinamis dengan rasio uji {int(test_size * 100)}%")
            
        # Branch based on model type
        if model_type in ['naive_bayes', 'svm']:
            results = train_classical_model(
                dataset_path=dataset_path,
                model_type=model_type,
                params=params,
                job_id=job_id,
                update_progress_fn=update_progress,
                test_dataset_path=test_dataset_path,
                test_size=test_size
            )
        elif model_type == 'indobert':
            # Run real deep learning training
            # We supply both progress update and DB logging callbacks
            def dl_logger(level, event_type, message, metrics=None):
                check_cancellation(0, message)
                db_log_event(job_id, level, event_type, message, metrics)
                
            results = train_bert_model(
                dataset_path=dataset_path,
                params=params,
                job_id=job_id,
                update_progress_fn=update_progress,
                log_event_fn=dl_logger,
                test_dataset_path=test_dataset_path,
                val_dataset_path=val_dataset_path,
                test_size=test_size
            )
        else:
            raise ValueError(f"Unsupported model type: {model_type}")
            
        # Finalize and save
        check_cancellation(98, "Saving artifacts")
        
        end_time = time.time()
        elapsed_time = end_time - start_time
        
        artifact_path = results["artifact_path"]
        artifact_hash = results["artifact_hash"]
        eval_metrics = results["eval_results"]
        
        # Store Evaluation & Update Job state in a single transaction
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. Update experiment_jobs
        cursor.execute('''
            UPDATE experiment_jobs
            SET status = 'Completed',
                training_time = ?,
                model_artifact_path = ?,
                artifact_hash = ?,
                progress = 100,
                completed_at = ?
            WHERE id = ?
        ''', (elapsed_time, artifact_path, artifact_hash, datetime.now().isoformat(), job_id))
        
        # 2. Insert evaluations
        cursor.execute('''
            INSERT OR REPLACE INTO evaluations (
                experiment_job_id, accuracy, precision, recall, macro_f1, 
                per_class_metrics, confusion_matrix, classification_report,
                y_test, y_pred
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            job_id,
            eval_metrics["accuracy"],
            eval_metrics["precision"],
            eval_metrics["recall"],
            eval_metrics["macro_f1"],
            json.dumps(eval_metrics["per_class_metrics"]),
            json.dumps(eval_metrics["confusion_matrix"]),
            json.dumps(eval_metrics["classification_report"]),
            json.dumps(eval_metrics.get("y_test", [])),
            json.dumps(eval_metrics.get("y_pred", []))
        ))
        
        conn.commit()
        conn.close()
        
        # Log completion
        db_log_event(job_id, "INFO", "JOB_COMPLETE", f"Job completed successfully in {elapsed_time:.2f} seconds. Accuracy={eval_metrics['accuracy']:.4f}, Macro F1={eval_metrics['macro_f1']:.4f}")
        
    except InterruptedError:
        # Already handled inside check_cancellation
        pass
    except Exception as e:
        # Log traceback details
        error_msg = str(e)
        error_trace = traceback.format_exc()
        db_log_event(job_id, "ERROR", "JOB_ERROR", f"Exception during training: {error_msg}\n{error_trace}")
        _handle_job_failure(job_id, error_msg, "Failed", start_time)
        
    finally:
        # Clean up registry
        with _registry_lock:
            if job_id in ACTIVE_JOBS:
                del ACTIVE_JOBS[job_id]

def _handle_job_failure(job_id, reason, status, start_time):
    """Private helper to safely write failure metadata to the database."""
    elapsed = time.time() - start_time
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE experiment_jobs
            SET status = ?,
                failure_reason = ?,
                training_time = ?,
                completed_at = ?
            WHERE id = ?
        ''', (status, reason, elapsed, datetime.now().isoformat(), job_id))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Failed to record job failure in database for job {job_id}: {e}", file=sys.stderr)

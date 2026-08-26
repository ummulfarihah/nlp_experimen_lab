"""
Ummu NLP Lab - Asynchronous Background Task Manager
Manages worker threads for asynchronous model training, real-time progress updates,
cancellation tokens, structured dual logging (file & SQLite), and failure recovery.
"""

import os
import sys
import time
import json
import traceback
import threading
import logging
from datetime import datetime
from typing import Dict, Any, Optional

from config import resolve_db_path, LOGS_FOLDER
from database import get_db_connection, db_session, db_read
from ml_engine import train_classical_model
from bert_engine import train_bert_model

logger = logging.getLogger('nlp_lab.task_manager')

# Global thread-safe registry of active/running jobs
# Maps job_id (int) -> cancel_event (threading.Event)
ACTIVE_JOBS: Dict[int, threading.Event] = {}
_registry_lock = threading.Lock()


def create_job_log_file_path(job_id: int) -> str:
    """Returns absolute path to the job's log file."""
    return os.path.join(LOGS_FOLDER, f"job_{job_id}.log")


def write_to_log_file(job_id: int, level: str, event_type: str, message: str) -> None:
    """Appends a timestamped log line to a job's individual log file."""
    log_path = create_job_log_file_path(job_id)
    timestamp = datetime.now().isoformat()
    log_line = f"[{timestamp}] [{level}] [{event_type}] {message}\n"

    try:
        with open(log_path, 'a', encoding='utf-8') as f:
            f.write(log_line)
    except Exception as e:
        logger.error(f"Failed to write to log file for job {job_id}: {e}")


def db_log_event(
    job_id: int,
    level: str,
    event_type: str,
    message: str,
    metrics: Optional[Dict[str, Any]] = None
) -> None:
    """
    Logs an event both to the SQLite database and the text log file.

    Args:
        job_id (int): ID of the experiment job.
        level (str): 'INFO', 'WARNING', or 'ERROR'.
        event_type (str): Categorical event tag.
        message (str): Informational message.
        metrics (Optional[Dict]): Optional metrics dictionary.
    """
    # Write to text log file
    write_to_log_file(job_id, level, event_type, message)

    # Write to DB safely
    try:
        with db_session() as cursor:
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
    except Exception as e:
        logger.error(f"Database logging failed for job {job_id}: {e}")


def update_job_progress(job_id: int, progress: int, status_message: Optional[str] = None) -> None:
    """
    Updates the percentage progress (0-100) and status string in DB and log file.

    Args:
        job_id (int): ID of the job.
        progress (int): Percentage completed (0-100).
        status_message (Optional[str]): Optional lifecycle status update.
    """
    try:
        with db_session() as cursor:
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

        if status_message:
            db_log_event(job_id, "INFO", "PROGRESS_UPDATE", f"{status_message} ({progress}%)")
    except Exception as e:
        logger.error(f"Failed to update job {job_id} progress: {e}")


def start_training_job_async(
    job_id: int,
    dataset_path: str,
    model_type: str,
    params: Dict[str, Any]
) -> Optional[int]:
    """
    Launches model training asynchronously on a background worker thread.

    Args:
        job_id (int): The experiment job ID.
        dataset_path (str): Path to primary dataset.
        model_type (str): 'naive_bayes', 'svm', or 'indobert'.
        params (Dict[str, Any]): Model hyperparameter dictionary.

    Returns:
        Optional[int]: System thread ID of the spawned worker.
    """
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

    logger.info(f"Spawned asynchronous training worker thread for Job #{job_id}")
    return thread.ident


def is_job_cancelled(job_id: int, cancel_event: Optional[threading.Event] = None) -> bool:
    """
    Checks if a job has received a cancellation signal, either via local thread
    event or cross-worker database flag.
    """
    if cancel_event and cancel_event.is_set():
        return True
    try:
        with db_session() as cursor:
            cursor.execute('SELECT cancel_requested FROM experiment_jobs WHERE id = ?', (job_id,))
            row = cursor.fetchone()
            if row and (row['cancel_requested'] == 1 or row[0] == 1):
                return True
    except Exception as e:
        logger.warning(f"Could not query cancellation state from DB for job {job_id}: {e}")
    return False


def cancel_training_job(job_id: int) -> bool:
    """
    Triggers cancellation for a running background job via SQLite database flag.
    Completely cross-worker safe across any number of Gunicorn worker processes.

    Args:
        job_id (int): The experiment job ID to cancel.

    Returns:
        bool: True if cancellation flag was committed to DB, False otherwise.
    """
    cancelled_ok = False
    try:
        with db_session() as cursor:
            cursor.execute('''
                UPDATE experiment_jobs
                SET cancel_requested = 1
                WHERE id = ? AND status NOT IN ('Completed', 'Failed', 'Cancelled')
            ''', (job_id,))
            if cursor.rowcount > 0:
                cancelled_ok = True
                logger.info(f"Database cancellation flag set for Job #{job_id}")
    except Exception as e:
        logger.error(f"Failed to set cancellation flag in DB for Job #{job_id}: {e}")

    # Also notify local thread event if worker is on this process
    with _registry_lock:
        if job_id in ACTIVE_JOBS:
            ACTIVE_JOBS[job_id].set()
            cancelled_ok = True

    return cancelled_ok


def _training_job_worker(
    job_id: int,
    dataset_path: str,
    model_type: str,
    params: Dict[str, Any],
    cancel_event: threading.Event
) -> None:
    """
    Background worker thread execution function for classical and deep learning models.
    Guarantees that job status is updated to Completed, Cancelled, or Failed.
    """
    dataset_path = resolve_db_path(dataset_path)
    start_time = time.time()

    def check_cancellation(progress_pct: int, step_name: str) -> None:
        if is_job_cancelled(job_id, cancel_event):
            db_log_event(job_id, "WARNING", "CANCELLATION", f"Job cancellation requested during '{step_name}'. Aborting...")
            _handle_job_failure(job_id, "Pelatihan dibatalkan oleh pengguna.", "Cancelled", start_time)
            raise InterruptedError("Job cancelled by user.")

    def update_progress(progress_val: int, message: str) -> None:
        check_cancellation(progress_val, message)
        update_job_progress(job_id, progress_val, "Training")
        db_log_event(job_id, "INFO", "PROGRESS_STEP", message)

    try:
        db_log_event(job_id, "INFO", "JOB_START", f"Starting training task {job_id} for model '{model_type}' on dataset {os.path.basename(dataset_path)}")
        update_job_progress(job_id, 0, "Preparing")
        time.sleep(0.3)

        check_cancellation(2, "Initialization")

        # Fetch split_config and random_seed from database
        split_config = None
        random_seed = 42
        test_dataset_path = None
        val_dataset_path = None
        test_size = 0.2

        with db_read() as conn:
            job_info = conn.execute('''
                SELECT e.split_config, e.random_seed 
                FROM experiment_jobs j
                JOIN experiments e ON j.experiment_id = e.id
                WHERE j.id = ?
            ''', (job_id,)).fetchone()

            if job_info:
                if job_info['split_config']:
                    try:
                        split_config = json.loads(job_info['split_config'])
                    except Exception:
                        pass
                if job_info['random_seed'] is not None:
                    random_seed = int(job_info['random_seed'])

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

        # Lock random seeds for 100% scientific reproducibility
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

        if test_dataset_path:
            db_log_event(job_id, "INFO", "SPLIT_CONFIG", f"Menggunakan dataset uji eksternal: {os.path.basename(test_dataset_path)}")
            if val_dataset_path:
                db_log_event(job_id, "INFO", "SPLIT_CONFIG", f"Menggunakan dataset validasi eksternal: {os.path.basename(val_dataset_path)}")
        else:
            db_log_event(job_id, "INFO", "SPLIT_CONFIG", f"Menggunakan split dinamis dengan rasio uji {int(test_size * 100)}%")

        # Model dispatch
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
            def dl_logger(level: str, event_type: str, message: str, metrics: Optional[Dict[str, Any]] = None) -> None:
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
            raise ValueError(f"Tipe model tidak didukung: {model_type}")

        check_cancellation(98, "Menyimpan artefak")

        end_time = time.time()
        elapsed_time = end_time - start_time

        artifact_path = results["artifact_path"]
        artifact_hash = results["artifact_hash"]
        eval_metrics = results["eval_results"]

        # Atomic commit of evaluation metrics & completed status
        with db_session() as cursor:
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

        db_log_event(
            job_id,
            "INFO",
            "JOB_COMPLETE",
            f"Pelatihan model selesai dalam {elapsed_time:.2f} detik. Akurasi={eval_metrics['accuracy']:.4f}, Macro F1={eval_metrics['macro_f1']:.4f}"
        )

    except InterruptedError:
        pass
    except Exception as e:
        error_msg = str(e)
        error_trace = traceback.format_exc()
        logger.error(f"Job #{job_id} encountered exception: {error_msg}\n{error_trace}")
        db_log_event(job_id, "ERROR", "JOB_ERROR", f"Kesalahan saat pelatihan: {error_msg}\n{error_trace}")
        _handle_job_failure(job_id, error_msg, "Failed", start_time)

    finally:
        with _registry_lock:
            if job_id in ACTIVE_JOBS:
                del ACTIVE_JOBS[job_id]


def _handle_job_failure(job_id: int, reason: str, status: str, start_time: float) -> None:
    """Safely updates failure/cancellation status in the database."""
    elapsed = time.time() - start_time
    try:
        with db_session() as cursor:
            cursor.execute('''
                UPDATE experiment_jobs
                SET status = ?,
                    failure_reason = ?,
                    training_time = ?,
                    completed_at = ?
                WHERE id = ?
            ''', (status, reason, elapsed, datetime.now().isoformat(), job_id))
    except Exception as e:
        logger.error(f"Failed to record job failure in database for job {job_id}: {e}")


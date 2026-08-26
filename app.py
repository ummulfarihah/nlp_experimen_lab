import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
import sys
try:
    sys.stdout.reconfigure(line_buffering=True)
    sys.stderr.reconfigure(line_buffering=True)
except Exception:
    pass
import uuid
import json
import psutil
import logging
from datetime import datetime
from functools import wraps
from flask import Flask, request, jsonify, render_template, send_from_directory, session
from flask_cors import CORS
from werkzeug.utils import secure_filename

from config import (
    resolve_db_path, setup_logging,
    BASE_DIR, UPLOAD_FOLDER, DATASETS_FOLDER, MODELS_FOLDER, LOGS_FOLDER, AVATARS_FOLDER,
    SQLALCHEMY_DATABASE_URI, GOOGLE_CLIENT_ID, SECRET_KEY, PORT, MAX_CONTENT_LENGTH,
    DEBUG, ALLOWED_ORIGINS, FLASK_ENV
)
from database import db_read, db_session, init_db, hash_password, verify_password
from ml_engine import (
    compute_dataset_hash, analyze_dataset_file, preprocess_text_step_by_step, 
    run_mcnemar_test, load_model_artifact
)
from bert_engine import predict_sample, preprocess_bert_step_by_step
from task_manager import (
    start_training_job_async, cancel_training_job, create_job_log_file_path, db_log_event, ACTIVE_JOBS
)

import pandas as pd
import pickle

app = Flask(__name__, template_folder='templates', static_folder='static')
app.secret_key = SECRET_KEY

# Conditional development settings (disabled in production)
if DEBUG:
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Whitelist CORS origins
CORS(app, origins=ALLOWED_ORIGINS, supports_credentials=True)

# Initialize production logging
logger = setup_logging(app)

# Authentication decorator
def login_required(f):
    """
    Decorator enforcing session authentication.
    Returns 401 JSON if user session is not active.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session or not session.get('user'):
            return jsonify({
                "success": False,
                "error": "Sesi autentikasi telah berakhir atau Anda belum login. Silakan masuk kembali."
            }), 401
        return f(*args, **kwargs)
    return decorated_function

# Create folders if not exists
for folder in [UPLOAD_FOLDER, DATASETS_FOLDER, MODELS_FOLDER, LOGS_FOLDER, AVATARS_FOLDER]:
    os.makedirs(folder, exist_ok=True)

# Try initializing NVML for real GPU metrics
try:
    import pynvml
    pynvml.nvmlInit()
    HAS_GPU_MONITOR = True
except Exception:
    HAS_GPU_MONITOR = False

# Simulation / Demo configuration for local GPU monitoring
MOCK_GPU_ENABLED = False

# Helper for standard JSON responses
def error_response(message, status_code=400):
    return jsonify({"success": False, "error": message}), status_code

def success_response(data=None, message=None, status_code=200):
    res = {"success": True}
    if data is not None:
        res["data"] = data
    if message is not None:
        res["message"] = message
    return jsonify(res), status_code

# --- PRODUCTION SECURITY HEADERS ---
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Cross-Origin-Opener-Policy'] = 'same-origin-allow-popups'
    return response

# --- STANDARD ERROR HANDLERS ---
@app.errorhandler(404)
def handle_not_found(e):
    if request.path.startswith('/api/'):
        return jsonify({"success": False, "error": "Endpoint tidak ditemukan"}), 404
    return render_template('index.html', google_client_id=GOOGLE_CLIENT_ID), 200

@app.errorhandler(413)
def handle_large_file(e):
    return jsonify({"success": False, "error": "Ukuran berkas melebihi batas maksimum (Maks 15MB)"}), 413

@app.errorhandler(500)
def handle_server_error(e):
    return jsonify({"success": False, "error": "Terjadi kesalahan internal server"}), 500

# --- PWA & FRONTEND ROUTES (HTML5 History API Routing) ---
@app.route('/manifest.json')
def pwa_manifest():
    return send_from_directory('static', 'manifest.json', mimetype='application/manifest+json')

@app.route('/sw.js')
def pwa_service_worker():
    response = send_from_directory('static/js', 'sw.js', mimetype='application/javascript')
    response.headers['Service-Worker-Allowed'] = '/'
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return response

@app.route('/favicon.ico')
def favicon():
    return send_from_directory('static/img', 'favicon.ico', mimetype='image/vnd.microsoft.icon')

@app.route('/offline')
def offline():
    return send_from_directory('static', 'offline.html')

@app.route('/')
@app.route('/<path:path>')
def index(path=None):
    if path and path.startswith(('api/', 'static/')):
        return jsonify({"success": False, "error": "Not Found"}), 404
    return render_template('index.html', google_client_id=GOOGLE_CLIENT_ID)

@app.route('/api/v1/health', methods=['GET'])
def health_check():
    """
    Production health check probe returning DB connectivity, active jobs,
    and server status.
    """
    db_ok = False
    try:
        with db_session() as cursor:
            cursor.execute('SELECT 1')
            db_ok = True
    except Exception as e:
        logger.error(f"Health check DB error: {e}")

    return jsonify({
        "status": "healthy" if db_ok else "unhealthy",
        "version": "2.0.0",
        "database": "connected" if db_ok else "error",
        "active_jobs_count": len(ACTIVE_JOBS),
        "timestamp": datetime.now().isoformat()
    }), 200 if db_ok else 503

# --- AUTH API ---
@app.route('/api/v1/auth/google', methods=['POST'])
def auth_google():
    """Handles Google OAuth Token verification (ID Token, Access Token, or OAuth2 Payload)."""
    data = request.json or {}
    credential = data.get('credential') or data.get('access_token') or data.get('id_token')
    
    if not credential:
        return error_response("Token kredensial Google wajib diisi.")
        
    user_info = None
    
    # 1. Try verifying with Google OAuth ID Token
    if GOOGLE_CLIENT_ID:
        try:
            from google.oauth2 import id_token
            from google.auth.transport import requests as auth_requests
            idinfo = id_token.verify_oauth2_token(credential, auth_requests.Request(), GOOGLE_CLIENT_ID)
            user_info = {
                "id": str(idinfo.get('sub')),
                "email": idinfo.get('email'),
                "name": idinfo.get('name', 'Google User'),
                "picture": idinfo.get('picture', ''),
                "role": "Researcher"
            }
        except Exception as e:
            logger.info(f"ID token verify skipped/failed: {e}")
            
    # 2. Try fetching from Google UserInfo API (if Access Token is provided)
    if not user_info:
        try:
            import requests as py_requests
            resp = py_requests.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {credential}'},
                timeout=5
            )
            if resp.status_code == 200:
                u_data = resp.json()
                user_info = {
                    "id": str(u_data.get('sub', uuid.uuid4().hex)),
                    "email": u_data.get('email'),
                    "name": u_data.get('name', 'Google User'),
                    "picture": u_data.get('picture', ''),
                    "role": "Researcher"
                }
        except Exception as e:
            logger.info(f"Google UserInfo API check skipped/failed: {e}")

    # 3. Fallback JWT unverified decode
    if not user_info and '.' in str(credential):
        try:
            import base64
            parts = credential.split('.')
            if len(parts) >= 2:
                payload = parts[1]
                payload += '=' * (-len(payload) % 4)
                decoded = json.loads(base64.urlsafe_b64decode(payload).decode('utf-8'))
                if 'email' in decoded:
                    user_info = {
                        "id": str(decoded.get('sub', uuid.uuid4().hex)),
                        "email": decoded.get('email'),
                        "name": decoded.get('name', 'Google User'),
                        "picture": decoded.get('picture', ''),
                        "role": "Researcher"
                    }
        except Exception as e:
            logger.info(f"Base64 JWT payload decode failed: {e}")

    if not user_info or not user_info.get('email'):
        return error_response("Token Google tidak valid atau gagal diverifikasi.", 401)
        
    with db_session() as cursor:
        cursor.execute('SELECT * FROM users WHERE email = ?', (user_info['email'],))
        db_user = cursor.fetchone()
        if not db_user:
            cursor.execute('''
                INSERT INTO users (email, name, password, institution, role, picture)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                user_info['email'],
                user_info['name'],
                hash_password(uuid.uuid4().hex),
                "Universitas Muhammadiyah Sumatera Utara",
                user_info['role'],
                user_info['picture']
            ))
            cursor.execute('SELECT * FROM users WHERE email = ?', (user_info['email'],))
            db_user = cursor.fetchone()
    
    user_session = {
        "id": str(db_user['id']),
        "email": db_user['email'],
        "name": db_user['name'],
        "picture": db_user['picture'],
        "role": db_user['role'],
        "institution": db_user['institution']
    }
    
    session['user'] = user_session
    logger.info(f"User logged in successfully via Google: {user_session['email']}")
    return success_response(user_session, "Login Google berhasil.")

@app.route('/api/v1/auth/login', methods=['POST'])
def email_login():
    """Secure password authentication for NLP Experiment Lab."""
    data = request.json or {}
    email = data.get('email', '').strip()
    password = data.get('password', '')
    
    if not email or not password:
        return error_response("Email dan kata sandi wajib diisi.")
        
    with db_read() as conn:
        user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    
    if user and verify_password(password, user['password']):
        user_info = {
            "id": str(user['id']),
            "email": user['email'],
            "name": user['name'],
            "picture": user['picture'] if user['picture'] else "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=256",
            "role": user['role'],
            "institution": user['institution']
        }
        session['user'] = user_info
        logger.info(f"Successful login for user {email}")
        return success_response(user_info, "Login berhasil.")
    else:
        logger.warning(f"Failed login attempt for email: {email}")
        return error_response("Email atau kata sandi administrator salah.", 401)

@app.route('/api/v1/auth/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    return success_response(message="Berhasil keluar dari sistem.")

@app.route('/api/v1/auth/me', methods=['GET'])
def current_user():
    user = session.get('user')
    if user:
        with db_read() as conn:
            db_user = conn.execute('SELECT * FROM users WHERE id = ?', (user['id'],)).fetchone()
        if db_user:
            user_info = {
                "id": str(db_user['id']),
                "email": db_user['email'],
                "name": db_user['name'],
                "picture": db_user['picture'] if db_user['picture'] else "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=256",
                "role": db_user['role'],
                "institution": db_user['institution']
            }
            session['user'] = user_info
            return success_response(user_info)
        return success_response(user)
    return error_response("Sesi belum terautentikasi.", 401)

@app.route('/api/v1/auth/profile', methods=['POST'])
@login_required
def update_profile():
    user = session.get('user')
    data = request.json or {}
    name = data.get('name')
    email = data.get('email')
    institution = data.get('institution')
    role = data.get('role')
    
    if not name or not email or not institution or not role:
        return error_response("Semua kolom profil harus diisi.")
        
    with db_session() as cursor:
        cursor.execute('SELECT * FROM users WHERE email = ? AND id != ?', (email, user['id']))
        existing = cursor.fetchone()
        if existing:
            return error_response("Email sudah digunakan oleh akun lain.")
            
        cursor.execute('''
            UPDATE users
            SET name = ?, email = ?, institution = ?, role = ?
            WHERE id = ?
        ''', (name, email, institution, role, user['id']))
        
        cursor.execute('SELECT * FROM users WHERE id = ?', (user['id'],))
        db_user = cursor.fetchone()
    
    user_info = {
        "id": str(db_user['id']),
        "email": db_user['email'],
        "name": db_user['name'],
        "picture": db_user['picture'] if db_user['picture'] else "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=256",
        "role": db_user['role'],
        "institution": db_user['institution']
    }
    session['user'] = user_info
    return success_response(user_info, "Profil berhasil diperbarui.")

@app.route('/api/v1/auth/change_password', methods=['POST'])
@login_required
def change_password():
    user = session.get('user')
    data = request.json or {}
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')
    
    if not current_password or not new_password:
        return error_response("Kata sandi lama dan baru harus diisi.")
        
    if len(new_password) < 6:
        return error_response("Kata sandi baru minimal 6 karakter.")
        
    with db_read() as conn:
        db_user = conn.execute('SELECT * FROM users WHERE id = ?', (user['id'],)).fetchone()
        
    if not db_user:
        return error_response("Pengguna tidak ditemukan.", 404)
        
    if not verify_password(current_password, db_user['password']):
        return error_response("Kata sandi lama yang Anda masukkan salah.", 400)
        
    with db_session() as cursor:
        cursor.execute('UPDATE users SET password = ? WHERE id = ?', (hash_password(new_password), user['id']))
    
    logger.info(f"Password updated for user {user['id']}")
    return success_response(message="Kata sandi berhasil diubah.")

@app.route('/api/v1/auth/avatar', methods=['POST'])
@login_required
def upload_avatar():
    """Handles uploading a new profile picture avatar."""
    user = session.get('user')
    if 'avatar' not in request.files:
        return error_response("Tidak ada berkas foto profil yang dikirim.")
        
    file = request.files['avatar']
    if file.filename == '':
        return error_response("Berkas yang dipilih kosong.")
        
    # Check extension
    allowed_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        return error_response("Format berkas tidak didukung. Gunakan PNG, JPG, JPEG, GIF, atau WEBP.")
        
    # Generate unique filename using UUID to avoid collisions
    unique_filename = f"avatar_{user['id']}_{uuid.uuid4().hex}{ext}"
    save_path = os.path.join(AVATARS_FOLDER, unique_filename)
    
    # Save file
    file.save(save_path)
    
    # Update SQLite database
    avatar_url = f"/static/uploads/avatars/{unique_filename}"
    try:
        with db_session() as cursor:
            cursor.execute('UPDATE users SET picture = ? WHERE id = ?', (avatar_url, user['id']))
    except Exception as e:
        return error_response(f"Gagal memperbarui database: {str(e)}")
    
    # Update current session
    session['user']['picture'] = avatar_url
    session.modified = True
    
    return success_response({"picture": avatar_url}, "Foto profil berhasil diperbarui.")


# --- DATASET MANAGEMENT API ---
@app.route('/api/v1/datasets', methods=['GET'])
@login_required
def get_datasets():
    """Lists all uploaded datasets."""
    with db_read() as conn:
        datasets = conn.execute('SELECT * FROM datasets ORDER BY uploaded_at DESC').fetchall()
    
    result = []
    for d in datasets:
        row = dict(d)
        row['class_distribution'] = json.loads(row['class_distribution'])
        result.append(row)
        
    return success_response(result)

@app.route('/api/v1/datasets', methods=['POST'])
@login_required
def upload_dataset():
    """Handles CSV dataset file uploads, checks format, hashes, and records stats."""
    if 'file' not in request.files:
        return error_response("Tidak ada berkas yang dikirim.")
        
    file = request.files['file']
    raw_name = file.filename or ''
    if raw_name == '':
        return error_response("Berkas yang dipilih kosong.")
        
    clean_name = secure_filename(raw_name)
    if not clean_name.lower().endswith('.csv'):
        return error_response("Format dataset harus berupa file .CSV.")
        
    # Generate unique filename to avoid collision
    unique_filename = f"{uuid.uuid4().hex[:12]}_{clean_name}"
    save_path = os.path.join(DATASETS_FOLDER, unique_filename)
    
    # Save file
    file.save(save_path)
    
    try:
        # Check integrity, columns, and extract stats
        total_samples, class_dist, preview = analyze_dataset_file(save_path)
        
        # Calculate SHA256 Hash
        file_hash = compute_dataset_hash(save_path)
        
        # Check if hash already exists to prevent duplicate uploads
        with db_session() as cursor:
            cursor.execute('SELECT * FROM datasets WHERE file_hash = ?', (file_hash,))
            existing = cursor.fetchone()
            
            if existing:
                os.remove(save_path) # remove redundant file
                row = dict(existing)
                row['class_distribution'] = json.loads(row['class_distribution'])
                return success_response(row, "Dataset sudah ada. Memuat indeks yang telah tersedia.")
                
            # Write to database
            cursor.execute('''
                INSERT INTO datasets (name, filepath, file_hash, total_samples, class_distribution, uploaded_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                file.filename,
                save_path,
                file_hash,
                total_samples,
                json.dumps(class_dist),
                datetime.now().isoformat()
            ))
            dataset_id = cursor.lastrowid
        
        data_record = {
            "id": dataset_id,
            "name": file.filename,
            "filepath": save_path,
            "file_hash": file_hash,
            "total_samples": total_samples,
            "class_distribution": class_dist,
            "uploaded_at": datetime.now().isoformat()
        }
        return success_response(data_record, "Dataset berhasil diunggah dan dianalisis.")
        
    except Exception as e:
        # Delete invalid file
        if os.path.exists(save_path):
            os.remove(save_path)
        return error_response(f"Struktur dataset tidak valid: {str(e)}")

@app.route('/api/v1/datasets/<int:id>', methods=['DELETE'])
@login_required
def delete_dataset_endpoint(id):
    """Deletes a dataset, its CSV file, and all associated model/log files, then deletes database entries."""
    try:
        with db_session() as cursor:
            # 1. Check if dataset exists
            cursor.execute('SELECT * FROM datasets WHERE id = ?', (id,))
            dataset = cursor.fetchone()
            if not dataset:
                return error_response("Dataset tidak ditemukan.", 404)
                
            # 2. Check if any active training job is using this dataset
            cursor.execute('''
                SELECT ej.id FROM experiment_jobs ej
                JOIN experiments e ON ej.experiment_id = e.id
                WHERE e.dataset_id = ? AND ej.status IN ('Preparing', 'Downloading Model', 'Training', 'Evaluating')
            ''', (id,))
            active_job = cursor.fetchone()
            if active_job:
                return error_response(f"Dataset sedang digunakan oleh proses training aktif (Job ID: {active_job['id']}). Silakan batalkan training terlebih dahulu.", 400)
                
            # 3. Find all jobs associated with this dataset to delete physical model files and log files
            cursor.execute('''
                SELECT ej.id, ej.model_artifact_path FROM experiment_jobs ej
                JOIN experiments e ON ej.experiment_id = e.id
                WHERE e.dataset_id = ?
            ''', (id,))
            associated_jobs = cursor.fetchall()
            
            # Delete physical model files & log files
            for job in associated_jobs:
                if job['model_artifact_path'] and os.path.exists(job['model_artifact_path']):
                    try:
                        os.remove(job['model_artifact_path'])
                    except Exception as e:
                        logger.warning(f"Error removing model artifact for job {job['id']}: {e}")
                        
                log_path = create_job_log_file_path(job['id'])
                if os.path.exists(log_path):
                    try:
                        os.remove(log_path)
                    except Exception as e:
                        logger.warning(f"Error removing log file for job {job['id']}: {e}")
                        
            # 4. Delete physical CSV dataset file
            if dataset['filepath'] and os.path.exists(dataset['filepath']):
                try:
                    os.remove(resolve_db_path(dataset['filepath']))
                except Exception as e:
                    logger.warning(f"Error removing dataset file {dataset['filepath']}: {e}")
                    
            # 5. Delete dataset from DB (cascades experiments, jobs, logs, evaluations)
            cursor.execute('DELETE FROM datasets WHERE id = ?', (id,))
            
        return success_response(message="Dataset dan semua riwayat model terkait berhasil dihapus.")
        
    except Exception as e:
        return error_response(f"Gagal menghapus dataset: {str(e)}")

@app.route('/api/v1/datasets/<int:id>/preview', methods=['GET'])
@login_required
def dataset_preview(id):
    """Fetches first 10 rows of a dataset CSV."""
    with db_read() as conn:
        dataset = conn.execute('SELECT * FROM datasets WHERE id = ?', (id,)).fetchone()
    
    if not dataset:
        return error_response("Dataset tidak ditemukan.", 404)
        
    try:
        df = pd.read_csv(dataset['filepath'])
        preview_data = df.head(10).fillna('').to_dict(orient='records')
        return success_response(preview_data)
    except Exception as e:
        return error_response(f"Gagal memuat dataset: {e}")


# --- PREPROCESSING LAB API ---
@app.route('/api/v1/preprocess', methods=['POST'])
@login_required
def interactive_preprocess():
    """Allows step-by-step preview of Indonesian preprocessing operations (Classic Pipeline)."""
    data = request.json or {}
    text = data.get('text', '')
    
    if not text.strip():
        return error_response("Teks masukan tidak boleh kosong.")
        
    try:
        steps = preprocess_text_step_by_step(text)
        return success_response(steps)
    except Exception as e:
        return error_response(f"Terjadi kesalahan prapemrosesan: {e}")


@app.route('/api/v1/preprocess/bert', methods=['POST'])
@login_required
def interactive_preprocess_bert():
    """Allows step-by-step preview of IndoBERT subword tokenization and tensor encoding."""
    data = request.json or {}
    text = data.get('text', '')
    
    if not text.strip():
        return error_response("Teks masukan tidak boleh kosong.")
        
    try:
        steps = preprocess_bert_step_by_step(text)
        return success_response(steps)
    except Exception as e:
        return error_response(f"Terjadi kesalahan prapemrosesan BERT: {e}")


# --- EXPERIMENTS & TRAINING API ---
@app.route('/api/v1/experiments', methods=['POST'])
@login_required
def run_experiment():
    """Defines and schedules a model training task on a background worker thread."""
    data = request.json or {}
    name = data.get('name')
    dataset_id = data.get('dataset_id')
    model_type = data.get('model_type') # 'naive_bayes', 'svm', 'indobert'
    parameters = data.get('parameters', {})
    random_seed = int(data.get('random_seed', 42))
    split_config = data.get('split_config')
    
    if not name or not dataset_id or not model_type:
        return error_response("Nama eksperimen, ID dataset, dan tipe model wajib diisi.")
        
    # Validate split_config
    if not split_config:
        split_config = {
            "method": "dynamic",
            "test_size": 0.2
        }
    else:
        method = split_config.get("method", "dynamic")
        if method == "external":
            test_dataset_id = split_config.get("test_dataset_id")
            if not test_dataset_id:
                return error_response("ID dataset uji (test_dataset_id) wajib diisi untuk metode pemisahan eksternal.")
            with db_read() as conn:
                test_dataset = conn.execute('SELECT * FROM datasets WHERE id = ?', (test_dataset_id,)).fetchone()
                if not test_dataset:
                    return error_response(f"Dataset uji eksternal dengan ID {test_dataset_id} tidak ditemukan.", 404)
                    
                val_dataset_id = split_config.get("val_dataset_id")
                if val_dataset_id:
                    val_dataset = conn.execute('SELECT * FROM datasets WHERE id = ?', (val_dataset_id,)).fetchone()
                    if not val_dataset:
                        return error_response(f"Dataset validasi eksternal dengan ID {val_dataset_id} tidak ditemukan.", 404)
        else:
            try:
                test_size = float(split_config.get("test_size", 0.2))
                if not (0.0 < test_size < 1.0):
                    return error_response("Ukuran data uji (test_size) harus berupa angka desimal antara 0.0 dan 1.0.")
            except (ValueError, TypeError):
                return error_response("Ukuran data uji (test_size) harus berupa angka desimal yang valid.")
        
    try:
        with db_session() as cursor:
            cursor.execute('SELECT * FROM datasets WHERE id = ?', (dataset_id,))
            dataset = cursor.fetchone()
            if not dataset:
                return error_response("Dataset tidak ditemukan.", 404)

            # 1. Insert Model Config
            cursor.execute('''
                INSERT INTO model_configs (name, model_type, parameters, created_at)
                VALUES (?, ?, ?, ?)
            ''', (f"Config_{name}", model_type, json.dumps(parameters), datetime.now().isoformat()))
            config_id = cursor.lastrowid
            
            # 2. Insert Experiment
            env_meta = {
                "python_version": sys.version.split()[0],
                "os": sys.platform,
                "processor": psutil.cpu_allocator if hasattr(psutil, 'cpu_allocator') else 'X86_64'
            }
            cursor.execute('''
                INSERT INTO experiments (name, dataset_id, model_config_id, random_seed, environment_meta, split_config, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (name, dataset_id, config_id, random_seed, json.dumps(env_meta), json.dumps(split_config), datetime.now().isoformat()))
            experiment_id = cursor.lastrowid
            
            # 3. Insert Experiment Job (Status: Preparing)
            cursor.execute('''
                INSERT INTO experiment_jobs (experiment_id, status, started_at, progress)
                VALUES (?, 'Preparing', ?, 0)
            ''', (experiment_id, datetime.now().isoformat()))
            job_id = cursor.lastrowid
            dataset_filepath = str(dataset['filepath'])
        
        # 4. Trigger Asynchronous Task
        thread_id = start_training_job_async(
            job_id=job_id,
            dataset_path=resolve_db_path(dataset_filepath),
            model_type=model_type,
            params=parameters
        )
        
        # Update Job entry with thread ID acting as task_id
        with db_session() as cursor2:
            cursor2.execute('UPDATE experiment_jobs SET celery_task_id = ? WHERE id = ?', (str(thread_id), job_id))
        
        return success_response({"job_id": job_id}, f"Eksperimen berhasil diluncurkan. Menjalankan Job ID: {job_id}")
        
    except Exception as e:
        return error_response(f"Gagal meluncurkan eksperimen: {e}")

@app.route('/api/v1/experiments/jobs', methods=['GET'])
@login_required
def list_jobs():
    """Lists all training job execution records with training configs."""
    with db_read() as conn:
        query = '''
            SELECT ej.*, e.name as exp_name, mc.model_type, mc.parameters, d.name as dataset_name
            FROM experiment_jobs ej
            JOIN experiments e ON ej.experiment_id = e.id
            JOIN model_configs mc ON e.model_config_id = mc.id
            JOIN datasets d ON e.dataset_id = d.id
            ORDER BY ej.id DESC
        '''
        jobs = conn.execute(query).fetchall()
    
    result = []
    for j in jobs:
        row = dict(j)
        row['parameters'] = json.loads(row['parameters'])
        result.append(row)
        
    return success_response(result)


@app.route('/api/v1/experiments/jobs/<int:id>', methods=['GET'])
@login_required
def get_job(id):
    """Fetches full state and evaluations of a specific training job."""
    with db_read() as conn:
        job = conn.execute('''
            SELECT ej.*, e.name as exp_name, mc.model_type, mc.parameters, d.name as dataset_name, d.file_hash as dataset_hash
            FROM experiment_jobs ej
            JOIN experiments e ON ej.experiment_id = e.id
            JOIN model_configs mc ON e.model_config_id = mc.id
            JOIN datasets d ON e.dataset_id = d.id
            WHERE ej.id = ?
        ''', (id,)).fetchone()
        
        if not job:
            return error_response("Pekerjaan training tidak ditemukan.", 404)
            
        job_dict = dict(job)
        job_dict['parameters'] = json.loads(job_dict['parameters'])
        
        # Calculate elapsed training time on server
        if job_dict['status'] in ['Preparing', 'Downloading Model', 'Training', 'Evaluating']:
            try:
                started = datetime.fromisoformat(job_dict['started_at'])
                job_dict['elapsed_seconds'] = max(0, int((datetime.now() - started).total_seconds()))
            except Exception:
                job_dict['elapsed_seconds'] = 0
        else:
            if job_dict.get('training_time'):
                job_dict['elapsed_seconds'] = int(job_dict['training_time'])
            elif job_dict.get('completed_at') and job_dict.get('started_at'):
                try:
                    started = datetime.fromisoformat(job_dict['started_at'])
                    completed = datetime.fromisoformat(job_dict['completed_at'])
                    job_dict['elapsed_seconds'] = max(0, int((completed - started).total_seconds()))
                except Exception:
                    job_dict['elapsed_seconds'] = 0
            else:
                job_dict['elapsed_seconds'] = 0
                
        # Check evaluation metrics
        evaluation = conn.execute('SELECT * FROM evaluations WHERE experiment_job_id = ?', (id,)).fetchone()
        if evaluation:
            eval_dict = dict(evaluation)
            eval_dict['per_class_metrics'] = json.loads(eval_dict['per_class_metrics'])
            eval_dict['confusion_matrix'] = json.loads(eval_dict['confusion_matrix'])
            eval_dict['classification_report'] = json.loads(eval_dict['classification_report'])
            job_dict['evaluation'] = eval_dict
        else:
            job_dict['evaluation'] = None
        
    return success_response(job_dict)

@app.route('/api/v1/experiments/jobs/<int:id>', methods=['DELETE'])
@login_required
def delete_job_endpoint(id):
    """Deletes a training job record, its model artifact (.pkl), and its text log file from disk."""
    try:
        with db_session() as cursor:
            # 1. Check if job exists
            cursor.execute('SELECT * FROM experiment_jobs WHERE id = ?', (id,))
            job = cursor.fetchone()
            if not job:
                return error_response("Pekerjaan training tidak ditemukan.", 404)
                
            # 2. Check if job is currently running
            if job['status'] in ['Preparing', 'Downloading Model', 'Training', 'Evaluating']:
                return error_response("Pekerjaan training sedang aktif berjalan. Batalkan training terlebih dahulu sebelum menghapus riwayat.", 400)
                
            # 3. Delete physical model artifact if it exists
            if job['model_artifact_path'] and os.path.exists(job['model_artifact_path']):
                try:
                    os.remove(job['model_artifact_path'])
                except Exception as e:
                    logger.warning(f"Error removing model artifact for job {id}: {e}")
                    
            # 4. Delete physical log file from disk
            log_path = create_job_log_file_path(id)
            if os.path.exists(log_path):
                try:
                    os.remove(log_path)
                except Exception as e:
                    logger.warning(f"Error removing log file for job {id}: {e}")
                    
            # 5. Delete job from DB (cascades evaluations, logs)
            cursor.execute('DELETE FROM experiment_jobs WHERE id = ?', (id,))
            # Also clean up mcnemar results referencing this model
            cursor.execute('DELETE FROM mcnemar_results WHERE model_a_job_id = ? OR model_b_job_id = ?', (id, id))
            
        return success_response(message="Riwayat training model berhasil dihapus.")
        
    except Exception as e:
        return error_response(f"Gagal menghapus riwayat training: {str(e)}")

@app.route('/api/v1/experiments/jobs/<int:id>/cancel', methods=['POST'])
@login_required
def cancel_job_endpoint(id):
    """Triggers background thread cancellation for a running job."""
    cancelled = cancel_training_job(id)
    if cancelled:
        return success_response(message=f"Sinyal pembatalan untuk Job {id} berhasil dikirim.")
        
    # If not actively running in-memory, check if it's a zombie active job in DB
    try:
        with db_session() as cursor:
            cursor.execute('SELECT status FROM experiment_jobs WHERE id = ?', (id,))
            job = cursor.fetchone()
            if job and job['status'] in ['Preparing', 'Downloading Model', 'Training', 'Evaluating']:
                # Safe recovery: update database status to Cancelled
                cursor.execute('''
                    UPDATE experiment_jobs 
                    SET status = 'Cancelled', completed_at = ?, failure_reason = 'Pekerjaan usang dibatalkan setelah server dimulai ulang.' 
                    WHERE id = ?
                ''', (datetime.now().isoformat(), id))
                
                # Log the recovery event
                db_log_event(id, "WARNING", "ZOMBIE_RECOVERY", "Zombie/stale training job safely recovered and marked as Cancelled.")
                return success_response(message=f"Pekerjaan usang Job {id} berhasil dipulihkan dan ditandai sebagai Dibatalkan.")
    except Exception as e:
        logger.warning(f"Error recovering zombie job {id}: {e}")
            
    return error_response("Pekerjaan tidak sedang berjalan aktif atau tidak dapat dibatalkan.")

@app.route('/api/v1/experiments/jobs/<int:id>/logs', methods=['GET'])
@login_required
def get_job_logs(id):
    """Reads the raw task logger text file line-by-line."""
    log_path = create_job_log_file_path(id)
    if not os.path.exists(log_path):
        return success_response([], "Belum ada catatan log.")
        
    try:
        with open(log_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        # Parse logs
        parsed_logs = []
        for line in lines:
            line_str = line.strip()
            if not line_str: continue
            
            # Form: [timestamp] [level] [event_type] message
            parts = line_str.split('] ', 3)
            if len(parts) >= 4:
                parsed_logs.append({
                    "timestamp": parts[0].replace('[', ''),
                    "level": parts[1].replace('[', ''),
                    "event_type": parts[2].replace('[', ''),
                    "message": parts[3]
                })
            else:
                parsed_logs.append({
                    "timestamp": datetime.now().isoformat(),
                    "level": "INFO",
                    "event_type": "RAW",
                    "message": line_str
                })
        return success_response(parsed_logs)
    except Exception as e:
        return error_response(f"Gagal membaca log: {e}")


# --- EVALUATIONS & STATISTICAL COMPARISONS API ---
@app.route('/api/v1/evaluations', methods=['GET'])
@login_required
def list_evaluations():
    """Lists all computed model evaluations."""
    with db_read() as conn:
        query = '''
            SELECT ev.*, ej.model_artifact_path, mc.model_type, mc.name as config_name, e.name as exp_name
            FROM evaluations ev
            JOIN experiment_jobs ej ON ev.experiment_job_id = ej.id
            JOIN experiments e ON ej.experiment_id = e.id
            JOIN model_configs mc ON e.model_config_id = mc.id
            WHERE ej.status = 'Completed'
        '''
        evals = conn.execute(query).fetchall()
    
    result = []
    for ev in evals:
        row = dict(ev)
        row['per_class_metrics'] = json.loads(row['per_class_metrics'])
        row['confusion_matrix'] = json.loads(row['confusion_matrix'])
        row['classification_report'] = json.loads(row['classification_report'])
        result.append(row)
        
    return success_response(result)

@app.route('/api/v1/evaluations/mcnemar', methods=['POST'])
@login_required
def evaluate_mcnemar():
    """Computes McNemar Contingency table and Significance (p-value) comparing two classifiers."""
    data = request.json or {}
    model_a_id = data.get('model_a_job_id')
    model_b_id = data.get('model_b_job_id')
    
    if not model_a_id or not model_b_id:
        return error_response("ID model A dan model B wajib diisi.")
        
    if model_a_id == model_b_id:
        return error_response("Anda harus memilih dua model yang berbeda untuk dibandingkan.")
        
    try:
        with db_read() as conn:
            # 1. Fetch Evaluations to access test predictions and labels
            job_a = conn.execute('SELECT * FROM experiment_jobs WHERE id = ? AND status = "Completed"', (model_a_id,)).fetchone()
            job_b = conn.execute('SELECT * FROM experiment_jobs WHERE id = ? AND status = "Completed"', (model_b_id,)).fetchone()
            
            if not job_a or not job_b:
                return error_response("Kedua model harus berstatus Selesai (Completed).", 400)
                
            # Try to read pre-computed predictions from SQLite evaluations table first
            eval_a = conn.execute('SELECT y_test, y_pred FROM evaluations WHERE experiment_job_id = ?', (model_a_id,)).fetchone()
            eval_b = conn.execute('SELECT y_test, y_pred FROM evaluations WHERE experiment_job_id = ?', (model_b_id,)).fetchone()
            
            has_stored_preds = False
            if eval_a and eval_b:
                try:
                    if eval_a['y_test'] and eval_a['y_pred'] and eval_b['y_test'] and eval_b['y_pred']:
                        y_test_a = json.loads(eval_a['y_test'])
                        y_pred_a = json.loads(eval_a['y_pred'])
                        y_test_b = json.loads(eval_b['y_test'])
                        y_pred_b = json.loads(eval_b['y_pred'])
                        
                        # Guard: block if test sets differ in any way (size or contents)
                        if y_test_a != y_test_b:
                            return error_response("Uji McNemar hanya dapat dilakukan jika kedua model dievaluasi pada data uji (test set) yang sama persis.", 400)
                        
                        # Ensure they are non-empty and matching in size
                        if len(y_test_a) > 0 and len(y_test_a) == len(y_pred_a) and len(y_test_b) == len(y_pred_b) and len(y_pred_a) == len(y_pred_b):
                            y_test = y_test_a
                            has_stored_preds = True
                except Exception as e:
                    logger.warning(f"Failed to parse stored predictions for McNemar, falling back: {e}")
                    
            if has_stored_preds:
                # Run McNemar Test with stored predictions
                test_results = run_mcnemar_test(y_test, y_pred_a, y_pred_b)
            else:
                # Backward compatibility fallback: load pkl packages and run on-the-fly predictions
                with open(job_a['model_artifact_path'], 'rb') as f:
                    pkg_a = pickle.load(f)
                with open(job_b['model_artifact_path'], 'rb') as f:
                    pkg_b = pickle.load(f)
                    
                dataset_conn = conn.execute('''
                    SELECT d.filepath FROM datasets d
                    JOIN experiments e ON e.dataset_id = d.id
                    JOIN experiment_jobs ej ON ej.experiment_id = e.id
                    WHERE ej.id = ?
                ''', (model_a_id,)).fetchone()
                
                df = pd.read_csv(dataset_conn['filepath'])
                texts = df['text'].astype(str).tolist()
                labels = df['label'].astype(str).tolist()
                
                # Get test split (20% partition with safe stratification fallback)
                import numpy as np
                from sklearn.model_selection import train_test_split
                
                can_stratify = False
                if len(labels) >= 2:
                    class_counts = pd.Series(labels).value_counts()
                    test_size_count = int(np.ceil(0.2 * len(labels)))
                    if class_counts.min() >= 2 and test_size_count >= len(class_counts):
                        can_stratify = True
                stratify_param = labels if can_stratify else None
                
                _, X_test, _, y_test = train_test_split(
                    texts, labels, test_size=0.2, random_state=42, stratify=stratify_param
                )
                
                # Predict on X_test with Model A
                y_pred_a = []
                for text in X_test:
                    res_a = predict_sample(pkg_a, text)
                    y_pred_a.append(res_a['label'])
                    
                # Predict on X_test with Model B
                y_pred_b = []
                for text in X_test:
                    res_b = predict_sample(pkg_b, text)
                    y_pred_b.append(res_b['label'])
                    
                # Run McNemar Test
                test_results = run_mcnemar_test(y_test, y_pred_a, y_pred_b)
            
        # Save results in SQLite
        with db_session() as cursor:
            cursor.execute('''
                INSERT INTO mcnemar_results (model_a_job_id, model_b_job_id, p_value, contingency_matrix, significant, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                model_a_id, 
                model_b_id, 
                test_results['p_value'], 
                json.dumps(test_results['contingency_matrix']), 
                test_results['significant'], 
                datetime.now().isoformat()
            ))
        
        # Format response
        result_payload = {
            "p_value": test_results['p_value'],
            "contingency_matrix": test_results['contingency_matrix'],
            "significant": bool(test_results['significant']),
            "model_a_id": model_a_id,
            "model_b_id": model_b_id
        }
        return success_response(result_payload, "Uji signifikansi McNemar berhasil dihitung.")
        
    except Exception as e:
        logger.error(f"Statistical evaluation failed: {e}")
        return error_response(f"Evaluasi statistik gagal: {e}")


# --- PREDICTION LAB API ---
@app.route('/api/v1/predict/single', methods=['POST'])
@login_required
def predict_single():
    data = request.json or {}
    job_id = data.get('job_id')
    text = data.get('text', '')
    
    if not job_id or not text.strip():
        return error_response("ID pekerjaan dan teks wajib diisi.")
        
    with db_read() as conn:
        job = conn.execute('SELECT * FROM experiment_jobs WHERE id = ? AND status = "Completed"', (job_id,)).fetchone()
    
    if not job:
        return error_response("Artefak model yang selesai tidak ditemukan.", 404)
        
    try:
        artifact_path = resolve_db_path(job['model_artifact_path'])
        model_package = load_model_artifact(artifact_path)
        prediction = predict_sample(model_package, text)
        return success_response(prediction)
        
    except Exception as e:
        logger.error(f"Single prediction error: {e}")
        return error_response(f"Prediksi gagal: {e}")

@app.route('/api/v1/predict/batch', methods=['POST'])
@login_required
def predict_batch():
    if 'file' not in request.files:
        return error_response("Tidak ada berkas yang dikirim.")
    if 'job_id' not in request.form:
        return error_response("ID pekerjaan (job_id) wajib diisi.")
        
    file = request.files['file']
    try:
        job_id = int(request.form['job_id'])
    except Exception:
        return error_response("ID pekerjaan tidak valid.")
    
    if file.filename == '':
        return error_response("Berkas yang dipilih kosong.")
        
    with db_read() as conn:
        job = conn.execute('SELECT * FROM experiment_jobs WHERE id = ? AND status = "Completed"', (job_id,)).fetchone()
    
    if not job:
        return error_response("Artefak model yang selesai tidak ditemukan.", 404)
        
    try:
        artifact_path = resolve_db_path(job['model_artifact_path'])
        model_package = load_model_artifact(artifact_path)
            
        # Read batch file with encoding fallback
        try:
            df = pd.read_csv(file, encoding='utf-8')
        except UnicodeDecodeError:
            file.seek(0)
            df = pd.read_csv(file, encoding='latin-1')

        if 'text' not in df.columns:
            return error_response("Berkas CSV harus memiliki kolom 'text'.")

        if len(df) > 5000:
            return error_response("Ukuran berkas batch maksimal 5.000 baris per transaksi.")
            
        # Run prediction
        predictions = []
        confidences = []
        
        for text in df['text'].astype(str):
            res = predict_sample(model_package, text)
            predictions.append(res['label'])
            confidences.append(res['confidence'])
            
        df['predicted_label'] = predictions
        df['confidence_score'] = confidences
        
        # Save results CSV
        out_filename = f"batch_pred_job_{job_id}_{uuid.uuid4().hex[:8]}.csv"
        out_path = os.path.join(DATASETS_FOLDER, out_filename)
        df.to_csv(out_path, index=False)
        
        download_url = f"/static/uploads/datasets/{out_filename}"
        return success_response({
            "download_url": download_url,
            "total_samples": len(df)
        }, "Prediksi batch berhasil diselesaikan.")
        
    except Exception as e:
        logger.error(f"Batch prediction failed: {e}")
        return error_response(f"Prediksi batch gagal: {e}")


# --- MODEL REGISTRY API ---
@app.route('/api/v1/models', methods=['GET'])
@login_required
def get_model_registry():
    """Lists models inside registry and their lifecycle states."""
    with db_read() as conn:
        query = '''
            SELECT ej.id as job_id, ej.model_artifact_path, ej.artifact_hash, ej.artifact_lifecycle, ej.training_time,
                   e.name as exp_name, d.name as dataset_name, mc.model_type, mc.parameters,
                   ev.accuracy, ev.macro_f1
            FROM experiment_jobs ej
            JOIN evaluations ev ON ev.experiment_job_id = ej.id
            JOIN experiments e ON ej.experiment_id = e.id
            JOIN model_configs mc ON e.model_config_id = mc.id
            JOIN datasets d ON e.dataset_id = d.id
            WHERE ej.status = 'Completed' AND ej.model_artifact_path IS NOT NULL AND ej.artifact_lifecycle != 'Deleted'
            ORDER BY ej.id DESC
        '''
        models = conn.execute(query).fetchall()
    
    result = []
    for m in models:
        row = dict(m)
        row['parameters'] = json.loads(row['parameters'])
        result.append(row)
        
    return success_response(result)

@app.route('/api/v1/models/<int:job_id>', methods=['DELETE'])
@login_required
def delete_model_endpoint(job_id):
    """Deletes a registered model's physical .pkl file on disk and updates database to unregister it."""
    try:
        with db_session() as cursor:
            # 1. Check if job exists and has a model artifact
            cursor.execute('SELECT * FROM experiment_jobs WHERE id = ?', (job_id,))
            job = cursor.fetchone()
            if not job:
                return error_response("Model tidak ditemukan.", 404)
                
            # 2. Prevent deleting model file if job is actively running (Completed check is fine)
            if job['status'] in ['Preparing', 'Downloading Model', 'Training', 'Evaluating']:
                return error_response("Model masih dalam proses pelatihan aktif.", 400)
                
            # 3. Delete physical model artifact from disk
            if job['model_artifact_path'] and os.path.exists(job['model_artifact_path']):
                try:
                    os.remove(job['model_artifact_path'])
                except Exception as e:
                    logger.warning(f"Error removing model artifact for job {job_id}: {e}")
                    
            # 4. Update the DB: set model_artifact_path = NULL, and artifact_lifecycle = 'Deleted'
            # That way, the training history (job) remains, but the model is removed from the registry list.
            cursor.execute('''
                UPDATE experiment_jobs 
                SET model_artifact_path = NULL, artifact_lifecycle = 'Deleted' 
                WHERE id = ?
            ''', (job_id,))
            
            # Also clean up mcnemar results referencing this model because it cannot be evaluated anymore
            cursor.execute('DELETE FROM mcnemar_results WHERE model_a_job_id = ? OR model_b_job_id = ?', (job_id, job_id))
            
        return success_response(message="Model berhasil dihapus dari registry.")
        
    except Exception as e:
        return error_response(f"Gagal menghapus model dari registry: {str(e)}")

@app.route('/api/v1/models/<int:job_id>/status', methods=['POST'])
@login_required
def update_model_lifecycle(job_id):
    """Sets a registered model's lifecycle state (Active, Archived, Deprecated)."""
    data = request.json or {}
    new_lifecycle = data.get('lifecycle') # 'Active', 'Archived', 'Deprecated'
    
    if new_lifecycle not in ['Active', 'Archived', 'Deprecated']:
        return error_response("Status siklus hidup tidak valid. Harus 'Active', 'Archived', atau 'Deprecated'.")
        
    with db_session() as cursor:
        cursor.execute('SELECT * FROM experiment_jobs WHERE id = ?', (job_id,))
        job = cursor.fetchone()
        
        if not job:
            return error_response("Model tidak ditemukan.", 404)
            
        cursor.execute('UPDATE experiment_jobs SET artifact_lifecycle = ? WHERE id = ?', (new_lifecycle, job_id))
    
    return success_response(message=f"Status siklus hidup model job {job_id} berhasil diubah menjadi '{new_lifecycle}'.")


@app.route('/api/v1/system/toggle_mock_gpu', methods=['POST'])
@login_required
def toggle_mock_gpu():
    """Toggles local high-fidelity GPU monitoring simulation."""
    global MOCK_GPU_ENABLED
    MOCK_GPU_ENABLED = not MOCK_GPU_ENABLED
    return success_response({"mock_gpu_enabled": MOCK_GPU_ENABLED}, f"Simulasi GPU diatur ke {MOCK_GPU_ENABLED}")


# --- RESOURCE MONITOR API ---
@app.route('/api/v1/system/resources', methods=['GET'])
@login_required
def get_system_resources():
    """Reads system stats: CPU, Memory, Disk, and GPU usage metrics."""
    cpu = psutil.cpu_percent()
    mem = psutil.virtual_memory().percent
    disk = psutil.disk_usage('/').percent
    
    gpu_metrics = {
        "available": False,
        "name": "N/A",
        "load": 0.0,
        "memory_used": 0.0,
        "memory_total": 0.0,
        "memory_percent": 0.0
    }
    
    real_gpu_found = False
    if HAS_GPU_MONITOR:
        try:
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)
            gpu_name = pynvml.nvmlDeviceGetName(handle)
            # handle bytes to string in python3
            if isinstance(gpu_name, bytes):
                gpu_name = gpu_name.decode('utf-8')
                
            info = pynvml.nvmlDeviceGetMemoryInfo(handle)
            util = pynvml.nvmlDeviceGetUtilizationRates(handle)
            
            gpu_metrics = {
                "available": True,
                "name": gpu_name,
                "load": float(util.gpu),
                "memory_used": float(info.used / (1024**2)), # MB
                "memory_total": float(info.total / (1024**2)), # MB
                "memory_percent": float(info.used / info.total * 100)
            }
            real_gpu_found = True
        except Exception:
            pass # fallback to simulated values if driver queries mismatch
            
    # Local High-Fidelity NVIDIA L4 GPU Simulation Fallback
    if not gpu_metrics["available"] and MOCK_GPU_ENABLED:
        import random
        # Check if there are active training jobs in the database
        has_active_bert = False
        has_active_other = False
        try:
            with db_read() as conn:
                active_job = conn.execute('''
                    SELECT ej.*, mc.model_type 
                    FROM experiment_jobs ej
                    JOIN experiments e ON ej.experiment_id = e.id
                    JOIN model_configs mc ON e.model_config_id = mc.id
                    WHERE ej.status IN ('Preparing', 'Downloading Model', 'Training', 'Evaluating')
                    LIMIT 1
                ''').fetchone()
            
            if active_job:
                if active_job['model_type'] == 'indobert':
                    has_active_bert = True
                else:
                    has_active_other = True
        except Exception:
            pass
            
        # Determine GPU load and memory dynamically based on active model training
        if has_active_bert:
            load = float(random.randint(82, 98))
            mem_used = float(random.randint(14500, 18500))
        elif has_active_other:
            load = float(random.randint(12, 28))
            mem_used = float(random.randint(4500, 5800))
        else:
            load = float(random.randint(1, 4))
            mem_used = float(random.randint(3100, 3800))
            
        mem_total = 24576.0 # L4 has 24GB of VRAM
        mem_percent = (mem_used / mem_total) * 100.0
        
        gpu_metrics = {
            "available": True,
            "name": "NVIDIA L4 (Demo Simulation)",
            "load": load,
            "memory_used": mem_used,
            "memory_total": mem_total,
            "memory_percent": mem_percent
        }
    
    payload = {
        "cpu": cpu,
        "memory": mem,
        "disk": disk,
        "gpu": gpu_metrics,
        "real_gpu_available": real_gpu_found,
        "mock_enabled": MOCK_GPU_ENABLED and not real_gpu_found,
        "timestamp": datetime.now().isoformat()
    }
    return success_response(payload)



if __name__ == '__main__':
    # Initialize DB schema
    init_db()
    print(f"Flask server starting on http://127.0.0.1:{PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=False, use_reloader=False)

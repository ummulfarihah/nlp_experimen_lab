import sqlite3
import json
import os
from datetime import datetime
from config import DATABASE_PATH

def get_db_connection():
    """Returns a thread-safe connection to the SQLite database."""
    conn = sqlite3.connect(DATABASE_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute('PRAGMA journal_mode=WAL;')
        conn.execute('PRAGMA foreign_keys = ON;')
    except Exception as e:
        pass
    return conn

def init_db():
    """Initializes the database and creates all tables if they don't exist."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Datasets Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS datasets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            filepath TEXT NOT NULL,
            file_hash TEXT UNIQUE NOT NULL,
            total_samples INTEGER NOT NULL,
            class_distribution TEXT NOT NULL, -- JSON String
            uploaded_at TEXT NOT NULL
        )
    ''')

    # 2. Model Configs Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS model_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            model_type TEXT NOT NULL, -- 'naive_bayes', 'svm', 'indobert'
            parameters TEXT NOT NULL, -- JSON String
            created_at TEXT NOT NULL
        )
    ''')

    # 3. Experiments Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS experiments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            dataset_id INTEGER NOT NULL,
            model_config_id INTEGER NOT NULL,
            random_seed INTEGER NOT NULL,
            environment_meta TEXT NOT NULL, -- JSON String
            split_config TEXT,             -- JSON String (Split Config)
            created_at TEXT NOT NULL,
            FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE,
            FOREIGN KEY (model_config_id) REFERENCES model_configs(id) ON DELETE CASCADE
        )
    ''')

    # 4. Experiment Jobs Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS experiment_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            experiment_id INTEGER NOT NULL,
            celery_task_id TEXT, -- Background Thread / Task ID
            status TEXT NOT NULL, -- 'Preparing', 'Downloading Model', 'Training', 'Evaluating', 'Completed', 'Cancelled', 'Failed'
            retry_count INTEGER DEFAULT 0,
            training_time REAL, -- in seconds
            failure_reason TEXT,
            model_artifact_path TEXT,
            artifact_hash TEXT,
            artifact_lifecycle TEXT DEFAULT 'Active', -- 'Active', 'Archived', 'Deprecated'
            started_at TEXT NOT NULL,
            completed_at TEXT,
            progress INTEGER DEFAULT 0,
            FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
        )
    ''')

    # 5. Experiment Logs Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS experiment_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            experiment_job_id INTEGER NOT NULL,
            log_level TEXT NOT NULL, -- 'INFO', 'WARNING', 'ERROR'
            event_type TEXT,
            message TEXT NOT NULL,
            metrics TEXT, -- JSON String (optional)
            timestamp TEXT NOT NULL,
            FOREIGN KEY (experiment_job_id) REFERENCES experiment_jobs(id) ON DELETE CASCADE
        )
    ''')

    # 6. Evaluations Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS evaluations (
            experiment_job_id INTEGER PRIMARY KEY,
            accuracy REAL NOT NULL,
            precision REAL NOT NULL,
            recall REAL NOT NULL,
            macro_f1 REAL NOT NULL,
            per_class_metrics TEXT NOT NULL, -- JSON String
            confusion_matrix TEXT NOT NULL, -- JSON String (2D Array)
            classification_report TEXT NOT NULL, -- JSON String
            y_test TEXT, -- JSON String list
            y_pred TEXT, -- JSON String list
            FOREIGN KEY (experiment_job_id) REFERENCES experiment_jobs(id) ON DELETE CASCADE
        )
    ''')

    try:
        cursor.execute("ALTER TABLE evaluations ADD COLUMN y_test TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE evaluations ADD COLUMN y_pred TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE experiments ADD COLUMN split_config TEXT")
    except sqlite3.OperationalError:
        pass

    # 7. McNemar Results Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS mcnemar_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model_a_job_id INTEGER NOT NULL,
            model_b_job_id INTEGER NOT NULL,
            p_value REAL NOT NULL,
            contingency_matrix TEXT NOT NULL, -- JSON String (2x2)
            significant INTEGER NOT NULL, -- 0 or 1
            created_at TEXT NOT NULL,
            FOREIGN KEY (model_a_job_id) REFERENCES experiment_jobs(id) ON DELETE CASCADE,
            FOREIGN KEY (model_b_job_id) REFERENCES experiment_jobs(id) ON DELETE CASCADE
        )
    ''')

    # 8. Users Table for Profile and Auth
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password TEXT NOT NULL,
            institution TEXT NOT NULL,
            role TEXT NOT NULL,
            picture TEXT
        )
    ''')

    # Seed default user if empty
    cursor.execute('SELECT COUNT(*) FROM users')
    if cursor.fetchone()[0] == 0:
        cursor.execute('''
            INSERT INTO users (email, name, password, institution, role, picture)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            "ummulfarihah20@gmail.com",
            "Administrator",
            "admin123",
            "Universitas Muhammadiyah Malang",
            "Administrator",
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=256"
        ))

    conn.commit()
    conn.close()

# Initialize DB when this module is imported/run
if __name__ == '__main__':
    init_db()
    print("Database initialized successfully at:", DATABASE_PATH)
else:
    # Auto init DB
    if not os.path.exists(DATABASE_PATH):
        init_db()

"""
Ummu NLP Lab - Database Layer & Connection Manager
Provides SQLite connection lifecycle, schema initialization, automated indexes,
and password hashing migrations for production readiness.
"""

import sqlite3
import json
import os
import logging
from contextlib import contextmanager
from datetime import datetime
from typing import Generator, Optional, Any, Dict
from werkzeug.security import generate_password_hash, check_password_hash

from config import DATABASE_PATH

logger = logging.getLogger('nlp_lab.database')


def get_db_connection() -> sqlite3.Connection:
    """
    Returns a thread-safe connection to the SQLite database with WAL mode,
    busy timeout, and row factory configured.

    Returns:
        sqlite3.Connection: Configured SQLite database connection.
    """
    conn = sqlite3.connect(DATABASE_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute('PRAGMA journal_mode = WAL;')
        conn.execute('PRAGMA busy_timeout = 30000;')
        conn.execute('PRAGMA synchronous = NORMAL;')
        conn.execute('PRAGMA foreign_keys = ON;')
    except Exception as e:
        logger.warning(f"Could not apply SQLite performance PRAGMAs: {e}")
    return conn


@contextmanager
def db_session() -> Generator[sqlite3.Cursor, None, None]:
    """
    Context manager for database transactions.
    Automatically commits on success, rolls back on exception, and closes connection.

    Yields:
        sqlite3.Cursor: Active cursor for executing queries.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        yield cursor
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Database transaction rolled back due to error: {e}")
        raise e
    finally:
        conn.close()


def hash_password(plain_password: str) -> str:
    """Hashes a plain text password using Werkzeug security PBKDF2/SHA256."""
    return generate_password_hash(plain_password, method='pbkdf2:sha256')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain password against a stored hash.
    Also handles legacy plaintext passwords transparently for backwards compatibility.
    """
    if not hashed_password:
        return False
    # If the stored password starts with a standard hash prefix
    if hashed_password.startswith(('pbkdf2:', 'scrypt:', 'argon2:')):
        return check_password_hash(hashed_password, plain_password)
    # Legacy plaintext fallback check
    return plain_password == hashed_password


def init_db() -> None:
    """
    Initializes the database schema, indexes, and seeds the default admin user.
    Migrates legacy plaintext passwords to secure hashes.
    """
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

    # Safe column migrations
    for col, table in [("y_test TEXT", "evaluations"), ("y_pred TEXT", "evaluations"), ("split_config TEXT", "experiments")]:
        try:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col}")
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

    # 9. PERFORMANCE INDEXES
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_experiment_jobs_exp_id ON experiment_jobs(experiment_id);')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_experiment_jobs_status ON experiment_jobs(status);')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_experiment_logs_job_id ON experiment_logs(experiment_job_id);')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_mcnemar_models ON mcnemar_results(model_a_job_id, model_b_job_id);')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_datasets_hash ON datasets(file_hash);')

    # Seed default user if empty or migrate passwords to hash
    cursor.execute('SELECT id, password FROM users')
    existing_users = cursor.fetchall()
    if not existing_users:
        cursor.execute('''
            INSERT INTO users (email, name, password, institution, role, picture)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            "ummulfarihah20@gmail.com",
            "Administrator",
            hash_password("admin123"),
            "Universitas Muhammadiyah Malang",
            "Administrator",
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=256"
        ))
    else:
        # Migrate any plain-text passwords to secure hashes
        for user in existing_users:
            pwd = user['password']
            if not pwd.startswith(('pbkdf2:', 'scrypt:', 'argon2:')):
                hashed = hash_password(pwd)
                cursor.execute('UPDATE users SET password = ? WHERE id = ?', (hashed, user['id']))

    conn.commit()
    conn.close()
    logger.info("Database schema, performance indexes, and migrations applied successfully.")


# Initialize DB when this module is imported/run
if __name__ == '__main__':
    init_db()
    print("Database initialized successfully at:", DATABASE_PATH)
else:
    if not os.path.exists(DATABASE_PATH):
        init_db()


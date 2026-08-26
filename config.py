"""
Ummu NLP Lab - Configuration Module
Manages application environment variables, filesystem paths, database URIs,
security limits, and production logging.
"""

import os
import sys
import logging
from logging.handlers import RotatingFileHandler
from typing import Optional

# Try loading .env file if python-dotenv is available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Base Directory of the application
BASE_DIR: str = os.path.abspath(os.path.dirname(__file__))

# Filesystem upload folders
UPLOAD_FOLDER: str = os.path.join(BASE_DIR, 'static', 'uploads')
DATASETS_FOLDER: str = os.path.join(UPLOAD_FOLDER, 'datasets')
MODELS_FOLDER: str = os.path.join(UPLOAD_FOLDER, 'models')
LOGS_FOLDER: str = os.path.join(UPLOAD_FOLDER, 'logs')
AVATARS_FOLDER: str = os.path.join(UPLOAD_FOLDER, 'avatars')

# Ensure critical directories exist
for folder in [UPLOAD_FOLDER, DATASETS_FOLDER, MODELS_FOLDER, LOGS_FOLDER, AVATARS_FOLDER]:
    os.makedirs(folder, exist_ok=True)

# Database Configuration
DATABASE_PATH: str = os.getenv('DATABASE_PATH', os.path.join(BASE_DIR, 'nlp_lab.db'))
SQLALCHEMY_DATABASE_URI: str = f"sqlite:///{DATABASE_PATH}"

# Server & Runtime Configuration
FLASK_ENV: str = os.getenv('FLASK_ENV', 'development')
DEBUG: bool = os.getenv('FLASK_DEBUG', '1' if FLASK_ENV == 'development' else '0').lower() in ('true', '1', 't')
HOST: str = os.getenv('HOST', '0.0.0.0')
PORT: int = int(os.getenv('PORT', '5000'))

# Security & Authentication
_RAW_SECRET_KEY = os.getenv('SECRET_KEY')
if FLASK_ENV == 'production':
    if not _RAW_SECRET_KEY or _RAW_SECRET_KEY.strip() == '' or _RAW_SECRET_KEY == 'nlp-lab-production-secure-key-982341':
        raise RuntimeError(
            "FATAL CONFIG ERROR: SECRET_KEY environment variable is missing or insecure in production mode. "
            "Please configure a strong, random 64-character SECRET_KEY in your .env file or server environment."
        )
    SECRET_KEY: str = _RAW_SECRET_KEY
else:
    if not _RAW_SECRET_KEY:
        import secrets
        SECRET_KEY: str = secrets.token_hex(32)
        logging.warning(
            "[CONFIG WARNING] SECRET_KEY not provided in environment. "
            "Generated temporary on-the-fly key for development. DO NOT use this for production."
        )
    else:
        SECRET_KEY: str = _RAW_SECRET_KEY

GOOGLE_CLIENT_ID: str = os.getenv('GOOGLE_CLIENT_ID', '913045747684-3csh1li78d5isiprhph251rguof4nmln.apps.googleusercontent.com')
MAX_CONTENT_LENGTH: int = int(os.getenv('MAX_CONTENT_LENGTH', str(15 * 1024 * 1024)))  # 15 MB

# CORS Allowed Origins
_RAW_ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS')
if _RAW_ALLOWED_ORIGINS:
    ALLOWED_ORIGINS = [orig.strip() for orig in _RAW_ALLOWED_ORIGINS.split(',') if orig.strip()]
else:
    ALLOWED_ORIGINS = [
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        "http://localhost:3000",
        "https://gotten-kinsman-drained.ngrok-free.dev"
    ]

# Model Inference Cache Configuration
MODEL_CACHE_SIZE: int = int(os.getenv('MODEL_CACHE_SIZE', '10'))

# Main Application Log Path
MAIN_LOG_PATH: str = os.path.join(LOGS_FOLDER, 'nlp_lab.log')


def resolve_db_path(db_path: Optional[str]) -> Optional[str]:
    """
    Resolves a stored database file path dynamically to match the current
    operating system platform (Windows/Linux) and project BASE_DIR layout.

    Args:
        db_path (Optional[str]): The stored path string from database record.

    Returns:
        Optional[str]: Absolute normalized path on the host system.
    """
    if not db_path:
        return db_path
    normalized = db_path.replace('\\', '/')
    if 'static/' in normalized:
        relative_part = normalized.split('static/', 1)[1]
        return os.path.join(BASE_DIR, 'static', relative_part.replace('/', os.sep))
    return db_path


def setup_logging(app=None) -> logging.Logger:
    """
    Configures structured production logging with stdout and rotating file handlers.

    Args:
        app: Optional Flask application instance to attach logger to.

    Returns:
        logging.Logger: The configured root/application logger.
    """
    logger = logging.getLogger('nlp_lab')
    logger.setLevel(logging.INFO)

    # Avoid duplicate handlers if already configured
    if not logger.handlers:
        formatter = logging.Formatter(
            '[%(asctime)s] [%(levelname)s] [%(name)s:%(lineno)d] %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )

        # Stream Handler (stdout)
        stdout_handler = logging.StreamHandler(sys.stdout)
        stdout_handler.setFormatter(formatter)
        stdout_handler.setLevel(logging.INFO)
        logger.addHandler(stdout_handler)

        # Rotating File Handler (10MB per file, max 5 backups)
        try:
            file_handler = RotatingFileHandler(
                MAIN_LOG_PATH, maxBytes=10 * 1024 * 1024, backupCount=5, encoding='utf-8'
            )
            file_handler.setFormatter(formatter)
            file_handler.setLevel(logging.INFO)
            logger.addHandler(file_handler)
        except Exception as e:
            sys.stderr.write(f"Warning: Could not configure rotating log file: {e}\n")

    if app:
        app.logger.handlers = logger.handlers
        app.logger.setLevel(logger.level)

    return logger

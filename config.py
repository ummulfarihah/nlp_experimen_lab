import os

# Base Directory
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Folder configurations
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'uploads')
DATASETS_FOLDER = os.path.join(UPLOAD_FOLDER, 'datasets')
MODELS_FOLDER = os.path.join(UPLOAD_FOLDER, 'models')
LOGS_FOLDER = os.path.join(UPLOAD_FOLDER, 'logs')
AVATARS_FOLDER = os.path.join(UPLOAD_FOLDER, 'avatars')

# Ensure directories exist
for folder in [UPLOAD_FOLDER, DATASETS_FOLDER, MODELS_FOLDER, LOGS_FOLDER, AVATARS_FOLDER]:
    os.makedirs(folder, exist_ok=True)

# Database Configuration
DATABASE_PATH = os.path.join(BASE_DIR, 'nlp_lab.db')
SQLALCHEMY_DATABASE_URI = f"sqlite:///{DATABASE_PATH}"

# Google Login Configuration (OAuth 2.0)
# Users can override this or use Simulation Mode
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')

# Secret key for Flask sessions
SECRET_KEY = os.environ.get('SECRET_KEY', 'nlp-lab-super-secret-key-12345')

# Server Port
PORT = 5000


def resolve_db_path(db_path):
    """Resolves a database absolute path dynamically to the current platform
    and BASE_DIR layout (handles cross-platform Windows/Linux paths)."""
    if not db_path:
        return db_path
    normalized_path = db_path.replace('\\', '/').replace('\\', '/')
    if 'static/' in normalized_path:
        relative_part = normalized_path.split('static/', 1)[1]
        return os.path.join(BASE_DIR, 'static', relative_part)
    return db_path

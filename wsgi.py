"""
Ummu NLP Lab - WSGI Production Entrypoint
Provides WSGI application object for Gunicorn, uWSGI, or mod_wsgi.
"""

from app import app, init_db

# Initialize database schema and indexes on startup
init_db()

if __name__ == "__main__":
    app.run()

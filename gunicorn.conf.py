"""
Ummu NLP Lab - Gunicorn Production Server Configuration
Optimized for multi-threaded async job execution and file uploads.
"""

import multiprocessing
import os

# Server socket
bind = f"{os.getenv('HOST', '0.0.0.0')}:{os.getenv('PORT', '5000')}"
backlog = 2048

# Worker processes
# For ML workloads with background threads, 2-4 workers with 4 threads each is optimal
workers = int(os.getenv('GUNICORN_WORKERS', str(min(4, max(2, multiprocessing.cpu_count())))))
worker_class = 'gthread'
threads = int(os.getenv('GUNICORN_THREADS', '4'))
worker_connections = 1000
timeout = 300  # 5 minutes for heavy batch inference / training init
keepalive = 5

# Logging
accesslog = '-'
errorlog = '-'
loglevel = os.getenv('LOG_LEVEL', 'info')
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" (%(L)ss)'

# Process naming
proc_name = 'ummu_nlp_lab'

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

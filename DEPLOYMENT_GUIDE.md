# Panduan Deployment Produksi — Ummu NLP Lab

Dokumen ini menjelaskan langkah-langkah lengkap untuk melakukan deployment **Ummu NLP Lab (Flask + SQLite + Scikit-Learn/IndoBERT)** ke lingkungan server produksi (Linux VPS, Ubuntu Server, Docker, atau Google Cloud).

---

## 1. Arsitektur & Spesifikasi Sistem

* **Backend**: Python 3.10+ / Flask 3.0+
* **WSGI Server**: Gunicorn (Multi-threaded worker `gthread`)
* **Database**: SQLite dengan WAL Mode (*Write-Ahead Logging*)
* **Reverse Proxy**: Nginx (direkomendasikan) dengan sertifikat SSL Let's Encrypt
* **Background Worker**: Python ThreadPool terisolasi dengan locking cancellation token
* **Port Standar**: `5000` (Internal) $\rightarrow$ `80`/`443` (Nginx External)

---

## 2. Persiapan Environment Variables (`.env`)

Salin file `.env.example` ke `.env` pada root project:
```bash
cp .env.example .env
```

Sesuaikan konfigurasi kunci:
```ini
FLASK_ENV=production
FLASK_DEBUG=0
HOST=0.0.0.0
PORT=5000

# Generate kunci acak 64-karakter dengan: python -c "import secrets; print(secrets.token_hex(32))"
# WAJIB diisi saat FLASK_ENV=production (aplikasi akan fail-fast jika kosong atau default)
SECRET_KEY=masukkan_secret_key_yang_sangat_kuat_disini

# Whitelist Domain CORS (pisahkan dengan koma)
ALLOWED_ORIGINS=https://domain-anda.com,http://localhost:5000

# Lokasi Database SQLite
DATABASE_PATH=nlp_lab.db

# Maksimal Ukuran Unggah Dataset (15 MB = 15728640 bytes)
MAX_CONTENT_LENGTH=15728640

# Kapasitas In-Memory Cache Model untuk Inference Cepat
MODEL_CACHE_SIZE=10
```

---

## 3. Langkah Instalasi di Linux Ubuntu/Debian

### Step 3.1 — Update Sistem & Install Prasyarat
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv nginx git
```

### Step 3.2 — Clone Repositori & Setup Virtual Environment
```bash
cd /var/www
git clone https://github.com/ummulfarihah/nlp_experimen_lab.git nlp_lab
cd nlp_lab

# Buat Virtual Environment
python3 -m venv venv
source venv/bin/activate

# Install Dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 3.3 — Inisialisasi Database & Password Hashing
```bash
python database.py
```

---

## 4. Konfigurasi Systemd Service (`/etc/systemd/system/nlplab.service`)

Buat unit service systemd agar aplikasi berjalan otomatis di background dan auto-restart jika server reboot:

```ini
[Unit]
Description=Ummu NLP Lab Production Gunicorn Service
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/nlp_lab
Environment="PATH=/var/www/nlp_lab/venv/bin"
ExecStart=/var/www/nlp_lab/venv/bin/gunicorn --config gunicorn.conf.py wsgi:app

Restart=always
RestartSec=5
StandardOutput=append:/var/www/nlp_lab/static/uploads/logs/systemd_out.log
StandardError=append:/var/www/nlp_lab/static/uploads/logs/systemd_err.log

[Install]
WantedBy=multi-user.target
```

Aktifkan service:
```bash
sudo chown -R www-data:www-data /var/www/nlp_lab
sudo systemctl daemon-reload
sudo systemctl enable nlplab
sudo systemctl start nlplab
sudo systemctl status nlplab
```

---

## 5. Konfigurasi Reverse Proxy Nginx (`/etc/nginx/sites-available/nlplab`)

```nginx
server {
    listen 80;
    server_name nlp-lab.domainanda.com;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket & Long-polling support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
    }

    location /static/ {
        alias /var/www/nlp_lab/static/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

Aktifkan site Nginx dan pasang SSL:
```bash
sudo ln -s /etc/nginx/sites-available/nlplab /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Install SSL Gratis dengan Certbot
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d nlp-lab.domainanda.com
```

---

## 6. Probing & Health Check Endpoint

Untuk monitoring uptime secara periodik oleh layanan monitoring seperti UptimeKuma atau New Relic:
```http
GET /api/v1/health
```
Response:
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "database": "connected",
  "active_jobs_count": 0,
  "timestamp": "2026-08-26T13:30:00.000000"
}
```

---

## 7. Pemeliharaan & Troubleshooting

1. **Melihat Log Aplikasi**:
   ```bash
   tail -f /var/www/nlp_lab/static/uploads/logs/nlp_lab.log
   ```
2. **Restart Server**:
   ```bash
   sudo systemctl restart nlplab
   ```
3. **Backup Database SQLite**:
   ```bash
   sqlite3 /var/www/nlp_lab/nlp_lab.db ".backup '/var/backups/nlp_lab_$(date +%Y%m%d).db'"
   ```

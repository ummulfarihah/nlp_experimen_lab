# 📚 DOKUMENTASI LENGKAP & DETAIL: UMMU NLP LAB
**Platform Penelitian & Klasifikasi Teks Bahasa Indonesia Terintegrasi**

---

## 🌟 1. Pendahuluan & Ringkasan Eksekutif

**Ummu NLP Lab** adalah sebuah platform penelitian (*research suite*) berbasis web yang dirancang khusus untuk memfasilitasi eksperimen klasifikasi teks dalam Bahasa Indonesia secara terstruktur, terarah, dan dapat diaudit (*auditable*). Platform ini mengintegrasikan metode klasifikasi tradisional berbasis statistika dengan arsitektur pembelajaran mendalam modern berbasis *Transformer*.

### 🧠 Model Klasifikasi yang Didukung:
1.  **Multinomial Naive Bayes (NB)**: Model probabilistik klasik yang sangat cepat dan efisien sebagai baseline penelitian.
2.  **Support Vector Machine (SVM)**: Model pengklasifikasi geometris dengan margin optimal, sangat tangguh untuk klasifikasi teks berskala kecil hingga menengah.
3.  **IndoBERT**: Model deep learning berbasis arsitektur *Bidirectional Encoder Representations from Transformers* (BERT) yang telah dilatih menggunakan korpus besar Bahasa Indonesia untuk memahami konteks semantik teks secara mendalam.

Sistem ini didesain secara profesional untuk dijalankan pada server cloud produksi Google Cloud Platform (GCP) dengan akselerasi GPU NVIDIA L4, serta mendukung pengujian antarmuka, pengelolaan berkas, dan visualisasi preprocessing di lingkungan localhost.

---

## 🏗️ 2. Arsitektur Sistem & Aliran Data

Ummu NLP Lab dirancang menggunakan arsitektur **Single-Page Application (SPA)** yang responsif dengan backend bertenaga tinggi berbasis Flask dan database relasional SQLite yang dikonfigurasi dalam mode Write-Ahead Logging (WAL) untuk menjamin kestabilan transaksi data.

```mermaid
graph TD
    subgraph Frontend [Lapisan Antarmuka (Browser)]
        UI[SPA Dashboard / HTML5] -->|AJAX / Fetch API| JS[App.js Event Handler]
        JS -->|Polling Status| UI
    end

    subgraph Backend [Server Web & Orkestrasi]
        Flask[Flask Web Server / app.py] -->|Mengontrol Thread| TM[Task Manager / task_manager.py]
        TM -->|Melahirkan Pekerja Latar Belakang| Worker[Worker Thread]
    end

    subgraph Database [Lapisan Penyimpanan]
        Flask -->|Membaca/Menulis| DB[(SQLite Database / nlp_lab.db)]
        Worker -->|Update Status & Logs| DB
        Worker -->|Tulis Model .pkl| Disk[(Disk Server / static/uploads/)]
    end

    subgraph ML_Engine [Mesin Machine Learning]
        Worker -->|Memanggil| NB_SVM[ML Engine / ml_engine.py]
        Worker -->|Memanggil| BERT[BERT Engine / bert_engine.py]
    end
```

### ⚙️ Komponen Utama Sistem:
*   **Frontend (HTML5, CSS Premium, JS Vanilla)**: Menyajikan antarmuka premium dengan tema warna merah muda (*rose-pink*), transisi transparan (*glassmorphism*), dan penampil grafik interaktif berbasis ApexCharts.
*   **Flask API Server (`app.py`)**: Menangani routing HTTP REST API, otorisasi login administrator, dan melayani file statis maupun berkas unggahan.
*   **Asynchronous Task Manager (`task_manager.py`)**: Mengatur eksekusi proses training yang memakan waktu lama di dalam thread latar belakang (`threading.Thread`) agar server web tidak mengalami pembekuan (*non-blocking*).
*   **Classical NLP Engine (`ml_engine.py`)**: Bertanggung jawab penuh atas pembersihan teks bahasa Indonesia, normalisasi bahasa gaul (*slang*), pembuangan stopwords, pembobotan TF-IDF, serta training SVM dan Naive Bayes (proses stemming Sastrawi telah sepenuhnya dihapus untuk menjaga keutuhan struktur kata).
*   **Deep Learning Engine (`bert_engine.py`)**: Mengatur proses fine-tuning model IndoBERT berbasis PyTorch di atas GPU NVIDIA. Berkas biner model (`.pkl`) yang disimpan secara otomatis menyertakan model surrogate TF-IDF + Logistic Regression untuk melayani klasifikasi teks tunggal secara cepat dan aman di Prediction Lab tanpa risiko OOM (Out-of-Memory).

---

## 📊 3. Desain Database & Skema SQLite

Sistem menggunakan SQLite dengan optimasi berikut:
*   `PRAGMA journal_mode=WAL;` (mengaktifkan Write-Ahead Logging untuk konkurensi paralel).
*   `PRAGMA foreign_keys = ON;` (menegakkan integritas referensial dan cascade deletion secara otomatis).

### 🏷️ Skema Tabel Utama:

#### 1. Tabel `users`
Menyimpan data akun administrator/peneliti.
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    institution TEXT NOT NULL,
    role TEXT NOT NULL,
    picture TEXT
);
```

#### 2. Tabel `datasets`
Menyimpan metadata dataset CSV yang diunggah oleh pengguna.
```sql
CREATE TABLE datasets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    filepath TEXT NOT NULL,
    file_hash TEXT UNIQUE NOT NULL,
    total_samples INTEGER NOT NULL,
    class_distribution TEXT NOT NULL, -- Format JSON String
    uploaded_at TEXT NOT NULL
);
```

#### 3. Tabel `model_configs`
Menyimpan konfigurasi parameter model yang dibuat peneliti.
```sql
CREATE TABLE model_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    model_type TEXT NOT NULL,         -- 'naive_bayes', 'svm', 'indobert'
    parameters TEXT NOT NULL,         -- Format JSON String (Hyperparameters)
    created_at TEXT NOT NULL
);
```

#### 4. Tabel `experiments`
Menyimpan metadata eksperimen komparatif terstruktur.
```sql
CREATE TABLE experiments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    dataset_id INTEGER NOT NULL,
    model_config_id INTEGER NOT NULL,
    random_seed INTEGER NOT NULL,
    environment_meta TEXT NOT NULL,   -- Format JSON String
    split_config TEXT,                -- Format JSON String (Split Config)
    created_at TEXT NOT NULL,
    FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE,
    FOREIGN KEY (model_config_id) REFERENCES model_configs(id) ON DELETE CASCADE
);
```

#### 5. Tabel `experiment_jobs`
Menyimpan riwayat status eksekusi proses training.
```sql
CREATE TABLE experiment_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    experiment_id INTEGER NOT NULL,
    celery_task_id TEXT,              -- Thread ID untuk orkestrasi asinkron
    status TEXT NOT NULL,             -- 'Preparing', 'Training', 'Completed', 'Cancelled', 'Failed'
    retry_count INTEGER DEFAULT 0,
    training_time REAL,               -- Durasi dalam detik
    failure_reason TEXT,
    model_artifact_path TEXT,
    artifact_hash TEXT,
    artifact_lifecycle TEXT DEFAULT 'Active', -- 'Active', 'Deleted'
    started_at TEXT NOT NULL,
    completed_at TEXT,
    progress INTEGER DEFAULT 0,
    FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
);
```

#### 6. Tabel `experiment_logs`
Menyimpan log telemetri baris-demi-baris dari proses training.
```sql
CREATE TABLE experiment_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    experiment_job_id INTEGER NOT NULL,
    log_level TEXT NOT NULL,          -- 'INFO', 'WARNING', 'ERROR'
    event_type TEXT,                  -- 'JOB_START', 'PROGRESS_STEP', 'DL_LOSS', 'JOB_COMPLETE'
    message TEXT NOT NULL,
    metrics TEXT,                     -- Format JSON String (Opsional)
    timestamp TEXT NOT NULL,
    FOREIGN KEY(experiment_job_id) REFERENCES experiment_jobs(id) ON DELETE CASCADE
);
```

#### 7. Tabel `evaluations`
Menyimpan metrik performa model serta rekaman prediksi asli data uji (uji McNemar).
```sql
CREATE TABLE evaluations (
    experiment_job_id INTEGER PRIMARY KEY,
    accuracy REAL NOT NULL,
    precision REAL NOT NULL,
    recall REAL NOT NULL,
    macro_f1 REAL NOT NULL,
    per_class_metrics TEXT NOT NULL,  -- Format JSON String
    confusion_matrix TEXT NOT NULL,   -- Format JSON String (2D Array)
    classification_report TEXT NOT NULL, -- Format JSON String
    y_test TEXT,                      -- Format JSON String (Daftar label aktual)
    y_pred TEXT,                      -- Format JSON String (Daftar label prediksi)
    FOREIGN KEY(experiment_job_id) REFERENCES experiment_jobs(id) ON DELETE CASCADE
);
```

#### 8. Tabel `mcnemar_results`
Menyimpan komparasi p-value McNemar antara dua model.
```sql
CREATE TABLE mcnemar_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_a_job_id INTEGER NOT NULL,
    model_b_job_id INTEGER NOT NULL,
    p_value REAL NOT NULL,
    contingency_matrix TEXT NOT NULL, -- Format JSON String (2x2)
    significant INTEGER NOT NULL,     -- 0 (False), 1 (True)
    created_at TEXT NOT NULL,
    FOREIGN KEY(model_a_job_id) REFERENCES experiment_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY(model_b_job_id) REFERENCES experiment_jobs(id) ON DELETE CASCADE
);
```

---

## 🛠️ 4. Spesifikasi REST API Reference

Semua komunikasi data antara antarmuka frontend dan server Flask menggunakan standar JSON dengan format dasar respons berikut:
```json
{
    "success": true,
    "message": "Pesan sukses atau deskripsi",
    "data": {} // Isi data bervariasi
}
```

### 🔐 Autentikasi & Profil (Auth Module)

#### `POST /api/v1/auth/login`
Melakukan verifikasi masuk admin.
*   **Body Request**:
    ```json
    { "email": "ummulfarihah20@gmail.com", "password": "admin123" }
    ```
*   **Respons (200 OK)**:
    ```json
    { "success": true, "message": "Login berhasil." }
    ```

#### `GET /api/v1/auth/me`
Mengambil data detail session administrator saat ini.
*   **Respons (200 OK)**:
    ```json
    {
        "success": true,
        "data": {
            "id": "1",
            "name": "Ummul Farihah",
            "email": "ummulfarihah20@gmail.com",
            "institution": "Universitas Muhammadiyah Sumatera Utara",
            "role": "Administrator",
            "picture": "/static/uploads/avatars/avatar_1_uuid.png"
        }
    }
    ```

#### `POST /api/v1/auth/profile`
Memperbarui informasi profil administrator (nama, email, instansi, peran).
*   **Body Request**:
    ```json
    {
        "name": "Ummul Farihah, M.Comp",
        "email": "ummulfarihah20@gmail.com",
        "institution": "Universitas Muhammadiyah Sumatera Utara",
        "role": "Dosen / Peneliti Utama"
    }
    ```

#### `POST /api/v1/auth/avatar`
Mengunggah file foto profil baru secara asinkron (*multipart/form-data*).
*   **Header**: `Content-Type: multipart/form-data`
*   **Payload**: Berkas biner gambar (`PNG, JPG, JPEG, GIF, WEBP` < 2MB).
*   **Respons (200 OK)**:
    ```json
    {
        "success": true,
        "message": "Foto profil berhasil diperbarui.",
        "data": { "picture": "/static/uploads/avatars/avatar_1_f7b23c.png" }
    }
    ```

### 📁 Pengelolaan Dataset (Dataset Module)

#### `POST /api/v1/datasets`
Mengunggah berkas CSV dataset baru. Berkas wajib memiliki kolom `text` dan `label`.
*   **Header**: `Content-Type: multipart/form-data`
*   **Respons (201 Created)**:
    ```json
    {
        "success": true,
        "message": "Dataset berhasil diunggah.",
        "data": { "id": 1, "name": "ulasan_sentiment.csv" }
    }
    ```

#### `DELETE /api/v1/datasets/<id>`
Menghapus dataset dari database dan disk server secara cascade (riwayat model, log, evaluasi, dan perbandingan McNemar terkait otomatis ikut terhapus).
*   **Respons (200 OK)**:
    ```json
    { "success": true, "message": "Dataset dan semua riwayat model terkait berhasil dihapus." }
    ```

### 🚀 Eksperimen & Live Training (Experiment Module)

#### `POST /api/v1/experiments`
Mulai meluncurkan proses training model secara asinkron di background thread.
*   **Body Request**:
    ```json
    {
        "name": "Eksperimen_BERT_01",
        "dataset_id": 12,
        "model_type": "indobert",
        "random_seed": 42,
        "split_config": {
            "method": "external",
            "test_dataset_id": 13
        },
        "parameters": { "epoch": 3, "learning_rate": 2e-5, "batch_size": 8, "max_length": 128 }
    }
    ```
*   **Respons (200 OK)**:
    ```json
    {
        "success": true,
        "message": "Experiment launched successfully. Running background Job ID: 15",
        "data": { "job_id": 15 }
    }
    ```

#### `GET /api/v1/experiments/jobs/<job_id>`
Mengambil progress persentase dan status aktivitas training saat ini.
*   **Respons (200 OK)**:
    ```json
    {
        "success": true,
        "data": {
            "id": 15,
            "experiment_id": 2,
            "status": "Training",
            "progress": 45,
            "training_time": null,
            "started_at": "2026-07-04T10:20:00",
            "completed_at": null
        }
    }
    ```

#### `DELETE /api/v1/experiments/jobs/<job_id>`
Menghapus riwayat pekerjaan training beserta file log fisik terkait dari database dan disk.
*   **Respons (200 OK)**:
    ```json
    {
        "success": true,
        "message": "Riwayat training model berhasil dihapus."
    }
    ```

#### `POST /api/v1/experiments/jobs/<job_id>/cancel`
Mengirim sinyal pembatalan paksa kepada thread training yang sedang berjalan.
*   **Respons (200 OK)**:
    ```json
    { "success": true, "message": "Sinyal pembatalan dikirim ke Job 15." }
    ```

#### `GET /api/v1/experiments/jobs/<job_id>/logs`
Mengambil seluruh aliran log telemetri yang dihasilkan oleh pekerjaan training.
*   **Respons (200 OK)**:
    ```json
    {
        "success": true,
        "data": [
            { "log_level": "INFO", "event_type": "JOB_START", "message": "Starting training task 15...", "timestamp": "..." }
        ]
    }
    ```

### 🏷️ Registry Model & Pengaturan Berkas

#### `DELETE /api/v1/models/<job_id>`
Menghapus berkas biner fisik `.pkl` model dari disk untuk menghemat memori, tetapi tetap mempertahankan metrik di leaderboard evaluasi.
*   **Respons (200 OK)**:
    ```json
    {
        "success": true,
        "message": "Model berhasil dihapus dari registry."
    }
    ```

### 📊 Evaluasi & McNemar (Evaluation Module)

#### `GET /api/v1/evaluations`
Mengambil daftar hasil evaluasi model yang telah sukses di-training lengkap dengan metrik akurasi.

#### `POST /api/v1/evaluations/mcnemar`
Menghitung signifikansi statistik perbedaan performa antara Model A dan Model B menggunakan uji McNemar berbasis larik prediksi asli.
*   **Body Request**:
    ```json
    {
        "model_a_job_id": 12,
        "model_b_job_id": 15
    }
    ```
*   **Respons (200 OK)**:
    ```json
    {
        "success": true,
        "message": "McNemar significance testing computed successfully.",
        "data": {
            "p_value": 0.0342,
            "contingency_matrix": [[85, 12], [4, 99]],
            "significant": true
        }
    }
    ```

### 🔮 Layanan Prediksi (Prediction Lab Service)

#### `POST /api/v1/predict/single`
Melakukan prediksi kategori dan tingkat kepercayaan untuk satu ulasan teks tunggal.
*   **Body Request**:
    ```json
    {
        "job_id": 15,
        "text": "pelayanan di toko ini sangat memuaskan dan pengirimannya cepat."
    }
    ```
*   **Respons (200 OK)**:
    ```json
    {
        "success": true,
        "data": {
            "label": "positive",
            "confidence": 0.9004,
            "probabilities": { "negative": 0.05, "neutral": 0.05, "positive": 0.90 }
        }
    }
    ```

#### `POST /api/v1/predict/batch`
Melakukan prediksi massal terhadap seluruh baris teks di dalam berkas CSV yang diunggah.
*   **Header**: `Content-Type: multipart/form-data`
*   **Form Data**: `file` (berkas CSV dengan kolom `text`), `job_id` (ID model)
*   **Respons (200 OK)**:
    ```json
    {
        "success": true,
        "message": "Batch prediction completed.",
        "data": {
            "download_url": "/static/uploads/datasets/batch_pred_job_15_uuid.csv",
            "rows_processed": 500
        }
    }
    ```

### 🖥️ Sumber Daya Sistem (System Resources)

#### `GET /api/v1/system/resources`
Mengambil persentase beban kerja CPU, RAM, disk, serta load GPU NVIDIA L4 dan VRAM secara *real-time*.
*   **Respons (200 OK)**:
    ```json
    {
        "success": true,
        "data": {
            "cpu_load": 12.5,
            "memory": 45.2,
            "disk": 22.1,
            "gpu_load": 75.0,
            "gpu_memory": 35.8,
            "real_gpu_available": true
        }
    }
    ```

---

## 📝 5. Aliran Preprocessing & Ekstraksi Fitur NLP

Proses pra-pengolahan teks (*NLP Preprocessing*) dan ekstraksi fitur pada platform ini dioptimalkan khusus untuk efisiensi klasifikasi sentimen Bahasa Indonesia (tanpa stemming untuk menjaga konteks emosional kata) di modul `ml_engine.py`:

```
   [Teks Mentah Input]
          │
          ▼
   [1. Case Folding] ──────► Mengubah teks menjadi huruf kecil semua.
          │
          ▼
   [2. Noise Removal] ─────► Menghapus tag HTML dan link/URL.
          │
          ▼
 [3. Tokenization &] ──────► Memisahkan kalimat menjadi larik kata alfanumerik dan
 [Slang Normalization]       normalisasi bahasa gaul (contoh: "yg" -> "yang", "gak" -> "tidak").
          │
          ▼
 [4. Stopword Removal] ────► Pembuangan kata umum non-sentimen secara selektif
          │                  (contoh: "di", "dan", "untuk", "oleh").
          ▼
[5. TF-IDF N-gram & df] ───► Ekstraksi fitur menggunakan N-Gram (1, 2) unigram/bigram
                             dan penyaringan kata langka melalui batas min_df=5.
          │
          ▼
  [Teks Bersih Siap Latih]
```

---

## 🛡️ 6. Pengelolaan Sumber Daya (Resource Lifecycle Management)

Aplikasi memiliki penanganan siklus hidup data (*lifecycle*) yang aman dan tangguh untuk mencegah inkonsistensi data:

1.  **Hapus Dataset (Cascade Delete)**: Menghapus baris dataset akan memicu SQLite untuk secara otomatis menghapus record experiments, jobs, logs, evaluations, dan McNemar terkait secara beruntun menggunakan integritas `ON DELETE CASCADE`. Berkas fisik CSV, file log training, dan biner `.pkl` juga otomatis dihapus dari harddisk.
2.  **Pembatalan Pelatihan (Cancel Training)**: Backend mendaftarkan objek `threading.Event()` untuk setiap pekerjaan aktif. Saat pengguna mengklik "Batalkan", event diset menjadi aktif. Iterasi training di thread pekerja mendeteksi sinyal ini secara instan, menghentikan loop, melakukan rollback database, menandai status sebagai `Cancelled`, dan mematikan thread secara aman.
3.  **Hapus Model dari Registry (Unregister Model)**: Berguna untuk menghemat kapasitas harddisk server. Aksi ini akan menghapus file fisik `.pkl` berukuran besar dari disk, namun tetap mempertahankan record metrik akurasi historis di leaderboard guna keperluan kompilasi laporan riset Anda.

## 🔬 7. Penyelarasan Parameter (Hyperparameter Tuning)

Penyelarasan parameter (*Hyperparameter Tuning*) dilakukan secara eksploratif menggunakan **Jupyter Notebook** melalui metode Grid Search berbasis data validasi eksternal (`valid_df`). Hasil parameter terbaik (*best parameters*) dari notebook ini kemudian menjadi acuan ilmiah bagi peneliti untuk diinputkan secara manual pada formulir parameter eksperimen di **Web App**.

Alur tuning di notebook berjalan dengan ketentuan:

1. **Metrik Optimasi Utama (Macro F1-Score)**:
   Proses pencarian parameter dioptimalkan menggunakan metrik **Macro F1-score** (bukan akurasi dasar) guna memastikan model memiliki performa klasifikasi yang seimbang dan adil terhadap kelas minoritas (misalnya sentimen `neutral` yang jumlah datanya lebih sedikit).
   
2. **Ruang Pencarian Parameter (Grid Search Space)**:
   * **Naive Bayes (NB)**: Penyetelan nilai penghalusan smoothing $\alpha$ (`alpha = [0.1, 0.5, 1.0, 1.5, 2.0]`).
   * **Support Vector Machine (SVM)**: Penyetelan margin penalty $C$ (`[0.1, 1.0, 10.0]`), jenis kernel (`['linear', 'rbf']`), dan parameter koefisien RBF $\gamma$ (`['scale', 'auto']`).
   * **IndoBERT**: Penyetelan kecepatan belajar *learning rate* (`[2e-5, 5e-5]`) dan ukuran tumpukan *batch size* (`[8, 16]`).

3. **Konsistensi Reproduksibilitas (Seed Locking)**:
   Sistem mengunci seed generator angka acak secara ketat (`set_seed(42)`) di seluruh modul pemodelan (NumPy, Python random, PyTorch, dan CUDA GPU) untuk memastikan bahwa hasil training dari parameter yang sama akan memunculkan nilai metrik yang 100% konsisten.

4. **Isolasi RNG State (Resolusi Keselarasan Akurasi 88.60%)**:
   Untuk menjamin keselarasan hasil evaluasi klasifikasi IndoBERT antara Web App dan Jupyter Notebook (tepat pada angka **88.60%** secara presisi), platform mengimplementasikan isolasi status generator acak (*RNG State Isolation*). Di dalam PyTorch, proses iterasi data loader evaluasi (meskipun dengan `shuffle=False` di akhir epoch) secara internal memutasi generator acak global (*RNG*). Platform secara dinamis menyimpan (*Save*) status RNG global (Python `random`, `numpy.random`, PyTorch CPU/CUDA) tepat sebelum loop evaluasi epoch dijalankan, dan memulihkannya (*Restore*) segera setelah evaluasi selesai. Hal ini mengisolasi efek samping evaluasi sela sehingga pengacakan data latih (*dataloader shuffling*) pada epoch berikutnya tetap berjalan 100% selaras dengan notebook.

---

## ✨ 8. Desain Premium UI/UX & Pembaruan Terbaru

Aplikasi ini mengadopsi prinsip desain modern dengan estetika visual tinggi:
1.  **Glow Buttons & Modern Form Elements**: Tombol **Simpan Profil** dan **Ubah Kata Sandi** pada halaman pengaturan profil telah diperbarui sepenuhnya agar menggunakan gaya premium `.btn-premium`. Menggunakan gradasi warna gradien (`linear-gradient(135deg, #ff5287 0%, #ff73a1 100%)`), efek bayangan menyala (*glow shadow*), ukuran yang melengkung (*pill-shaped* `16px`), dan transisi animasi mikro yang halus saat kursor melayang (*hover*).
2.  **Minimalis Login Screen**: Footer halaman masuk login disederhanakan dengan menghapus string status online komputer lokal, memprioritaskan privasi dan estetika premium yang sangat bersih (*minimalist approach*).
3.  **Non-Blocking Interface**: Semua interaksi dashboard berjalan asinkron menggunakan fetch API. Pengguna tidak perlu memuat ulang halaman saat dataset diunggah atau model dilatih, karena status real-time dipantau melalui polling yang cerdas.

---

## 🚀 9. Panduan Deployment Produksi pada VM GCP

Ikuti langkah-langkah di bawah ini untuk memindahkan sistem dari komputer lokal Anda ke instans **Google Cloud Virtual Machine (GCP) g2-standard-4** yang dibekali GPU **NVIDIA L4 24GB**:

### 📋 Prasyarat di VM GCP Anda:
1.  **Sistem Operasi**: Ubuntu 22.04 LTS sangat direkomendasikan.
2.  **Driver NVIDIA & CUDA Toolkit**: Pastikan driver NVIDIA (versi >= 525) dan CUDA Toolkit (versi >= 12.0) sudah terpasang sempurna di sistem Ubuntu Anda.
3.  **Python**: Versi 3.10 atau lebih baru.

### 🔌 Langkah 1: Kloning & Unggah Folder Proyek
Unggah seluruh folder proyek `NLP_LAB_v.2` Anda ke direktori home VM GCP menggunakan protokol SFTP atau git clone:
```bash
scp -r NLP_LAB_v.2 username@IP_STATIC_VM:~/
```

### 📦 Langkah 2: Instalasi Dependensi Deep Learning
Masuk ke VM Anda via SSH, lalu jalankan instalasi seluruh pustaka deep learning terdaftar. Karena berkas `requirements.txt` sudah disesuaikan, jalankan perintah berikut:
```bash
cd ~/NLP_LAB_v.2
pip install -r requirements.txt
```
> [!IMPORTANT]
> Pastikan PyTorch CUDA mengenali GPU Anda dengan mengetik perintah pemeriksaan cepat di Python:
> `python -c "import torch; print('CUDA Tersedia:', torch.cuda.is_available())"`
> Respons harus memunculkan hasil **`CUDA Tersedia: True`**.

### 🔒 Langkah 3: Konfigurasi IP Statis & Firewall GCP
1.  Pastikan Anda telah melakukan reservasi **External Static IP Address** di GCP Console VPC Network Anda untuk memastikan IP eksternal VM tidak berubah saat VM dinyalakan/dimatikan.
2.  Buka menu **VPC network** -> **Firewall** di Google Cloud Console Anda.
3.  Klik **Create Firewall Rule**.
4.  Konfigurasikan aturan berikut:
    *   **Name**: `allow-nlp-lab`
    *   **Targets**: `All instances in the network`
    *   **Source IPv4 ranges**: `0.0.0.0/0` (atau IP spesifik komputer rumah Anda untuk keamanan maksimal)
    *   **Protocols and ports**: Centang `Specified protocols and ports` -> Centang `TCP` -> Masukkan angka port `5000`.
5.  Klik **Create**.

### 🟢 Langkah 4: Menjalankan Server secara Permanen di VM
Agar server web Flask Anda terus berjalan di VM meskipun Anda menutup jendela terminal SSH, gunakan utilitas terminal pembantu seperti `nohup` atau `tmux`:

```bash
# Menjalankan menggunakan nohup di latar belakang
nohup python app.py > server.log 2>&1 &
```

Aplikasi kini telah menyala secara permanen di VM GCP Anda! Anda dapat membukanya melalui alamat IP statis Anda di browser:
👉 **`http://<IP_STATIC_GCP_ANDA>:5000`**

---

## ❓ 10. FAQ & Pemecahan Masalah (Troubleshooting)

### Q1: Mengapa pelatihan IndoBERT tidak dapat dijalankan di komputer lokal saya tanpa GPU?
**A**: Pelatihan model deep learning IndoBERT membutuhkan akselerasi hardware CUDA GPU (NVIDIA) untuk dapat berjalan. Jika dijalankan di perangkat lokal tanpa GPU NVIDIA yang kompatibel, sistem secara otomatis akan membatalkan pekerjaan dengan status 'Failed' dan melempar pesan RuntimeError. Untuk menjalankan pelatihan sesungguhnya, silakan deploy ke VM GCP dengan GPU NVIDIA L4 atau jalankan via Kaggle/Colab. Namun, Anda tetap bisa melakukan prediksi teks tunggal menggunakan model IndoBERT yang sudah jadi di localhost karena Prediction Lab memanfaatkan model surrogate ringan (TF-IDF + Logistic Regression) yang tersimpan di dalam berkas `.pkl`.

### Q2: Mengapa model IndoBERT yang saya latih di VM GCP memakan waktu lebih lama di awal?
**A**: Saat proses training IndoBERT dijalankan pertama kali di VM GCP, pustaka HuggingFace Transformers membutuhkan waktu beberapa menit di awal untuk mengunduh (*download*) model arsitektur dasar `indobenchmark/indobert-base-p1` (sekitar 500MB) langsung dari server HuggingFace Hub. Unduhan ini otomatis disimpan dalam *cache* lokal sehingga pelatihan kedua dan seterusnya akan dimulai secara instan tanpa perlu menunggu proses download lagi.

### Q3: File foto profil saya tidak diperbarui di dashboard meskipun upload berhasil.
**A**: Server web menggunakan pengenal biner UUID acak pada penamaan file foto profil Anda (contoh: `avatar_1_uuid.png`) untuk memecahkan masalah cache permanen di browser web. Jika foto belum berganti, cukup lakukan pembersihan cache browser Anda secara cepat (*Hard Refresh* menggunakan tombol kombinasi `Ctrl + F5` atau `Cmd + Shift + R`).

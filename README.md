# NLP Experiment Lab (NLP Research Center)

NLP Experiment Lab adalah platform penelitian berbasis web untuk mengelola dataset, melakukan preprocessing, melatih model klasifikasi teks, melakukan evaluasi, membandingkan hasil secara statistik (McNemar Test), dan melakukan prediksi.

Aplikasi ini mendukung tiga algoritma klasifikasi teks utama untuk bahasa Indonesia:
1. **Multinomial Naive Bayes (Klasikal)**
2. **Support Vector Machine (SVM) (Klasikal)**
3. **IndoBERT (Deep Learning / Fine-Tuning)**

---

## 🚀 Fitur Utama

- **Dataset Management:** Unggah CSV (kolom wajib: `text` dan `label`), kalkulasi statistik data, visualisasi sebaran kelas, dan hashing otomatis (SHA256) untuk audit penelitian.
- **Preprocessing Lab:** Case folding, tokenization, normalisasi slang words (*slang words dictionary*), dan seleksi stopword bahasa Indonesia (tanpa proses stemming untuk menjaga keutuhan struktur kata).
- **Asynchronous Training:** Proses pelatihan berjalan di latar belakang (*background thread worker*) sehingga UI tidak membeku. Dilengkapi kemampuan memantau progres log secara real-time (*live training logs*) dan fitur pembatalan (*cancellation*).
- **Evaluation Lab:** Perhitungan metrik evaluasi standar secara macro (Accuracy, Precision, Recall, Macro F1), Confusion Matrix, dan Classification Report per kelas.
- **McNemar Statistical Test:** Pengujian signifikansi statistik untuk membandingkan performa dua model klasifikasi secara objektif.
- **Prediction Lab:** Pengujian prediksi model teraktivasi baik untuk masukan tunggal (*single*) maupun massal (*batch*).
- **Resource Monitoring:** Pemantauan real-time penggunaan CPU, RAM, Disk, serta CUDA GPU (NVIDIA L4) menggunakan `psutil` dan `pynvml`.

---

## 🛠️ Persyaratan Sistem (System Requirements)

- **Sistem Operasi:** Windows / Linux / macOS (Windows / Linux sangat direkomendasikan untuk dukungan CUDA GPU)
- **Python Version:** Python 3.10 ke atas
- **Hardware (Wajib untuk IndoBERT):** Kartu Grafis NVIDIA dengan CUDA untuk fine-tuning IndoBERT (misal: NVIDIA L4 GPU). Jika CUDA tidak tersedia, sistem akan melempar kesalahan (RuntimeError) jika Anda meluncurkan pelatihan IndoBERT, sedangkan Naive Bayes dan SVM tetap dapat berjalan normal di CPU.

---

## 📦 Panduan Instalasi & Penggunaan

### 1. Klon Repositori dan Masuk ke Direktori
```bash
cd nlp_experimen_lab
```

### 2. Buat dan Aktifkan Virtual Environment
**Windows:**
```powershell
python -m venv venv
.\venv\Scripts\activate
```

**Linux/macOS:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Instal Dependensi
```bash
pip install -r requirements.txt
```

### 4. Jalankan Verifikasi Mandiri (*Self-Verification*)
Tersedia skrip verifikasi otomatis untuk memastikan database, pipeline preprocessing, perhitungan McNemar, dan modul latih model Anda semuanya bekerja 100% normal:
```bash
python verify.py
```
*Pastikan Anda melihat pesan:* `ALL TESTS COMPLETED SUCCESSFULLY! CORE ENGINE GREEN.`

### 5. Jalankan Aplikasi Flask Web Server
```bash
python app.py
```
Aplikasi akan aktif dan dapat diakses melalui browser di alamat:
[http://127.0.0.1:5000](http://127.0.0.1:5000)

### 6. Jalankan di Google Colab (Remote GPU)
Jika Anda tidak memiliki GPU NVIDIA lokal, Anda dapat menjalankan server Flask ini secara remote di Google Colab dengan mengunggah dan mengeksekusi berkas **`run_server_colab.ipynb`** menggunakan tunnel Ngrok.

---

## 📁 Struktur Proyek (Directory Tree)

```text
nlp_experimen_lab/
├── static/
│   ├── css/
│   │   └── style.css           # Berkas gaya tampilan antarmuka (Vanilla CSS)
│   ├── js/
│   │   ├── app.js              # Logika frontend utama dan AJAX
│   │   └── charts.js           # Logika visualisasi grafik evaluasi (Chart.js)
│   └── uploads/                # Direktori penyimpanan dinamis (diabaikan oleh git)
│       ├── datasets/           # Berkas CSV dataset yang diunggah
│       ├── models/             # Berkas biner model terlatih (.pkl)
│       ├── logs/               # Catatan log fisik per pekerjaan (.log)
│       └── avatars/            # Foto profil pengguna
├── templates/                  # Halaman HTML Frontend Flask
│   └── index.html              # Single Page Application utama
├── app.py                      # API Server & Backend Entrypoint
├── config.py                   # Konfigurasi sistem & jalur direktori
├── database.py                 # Manajemen inisialisasi & koneksi database SQLite
├── ml_engine.py                # Pipeline Preprocessing, Naive Bayes & SVM
├── bert_engine.py              # Fine-Tuning IndoBERT (PyTorch/Transformers)
├── task_manager.py             # Pengelola antrean pelatihan asinkron (Threading Worker)
├── verify.py                   # Alat pengujian otomatisasi mandiri
├── nlp_experiments.ipynb       # Jupyter Notebook Eksperimen Utama
├── hyperparameter_tuning.ipynb # Jupyter Notebook Penalaan Parameter (Grid Search)
├── run_server_colab.ipynb      # Jupyter Notebook Runner Server di Google Colab
├── requirements.txt            # Daftar pustaka & dependensi Python
└── README.md                   # Dokumentasi panduan penggunaan (berkas ini)
```

---

## 📋 Lisensi & Reproduksibilitas

Setiap eksperimen yang dilakukan pada platform ini secara otomatis merekam metadata reproduksibilitas penuh di database, termasuk:
- SHA256 Hash Dataset asli
- Random Seed (Sistem & Model)
- Model Hyperparameters lengkap
- Versi Python, Sistem Operasi, Versi CUDA, model GPU, versi PyTorch, dan versi Transformers.

Selamat melakukan penelitian NLP! 🚀

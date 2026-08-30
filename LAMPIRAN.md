# **LAMPIRAN**

## **Lampiran 1. Akses Kode Program dan Panduan Reproduksibilitas Riset**

Sebagai wujud komitmen terhadap integritas akademik, pelestarian lingkungan, efisiensi pencetakan dokumen, serta penyajian data penelitian yang transparan dan dapat direproduksi secara waktu nyata (*reproducible research*), seluruh kode program sumber, konfigurasi hiperparameter, notebook eksperimen, dan visualisasi hasil evaluasi pada penelitian ini di-host secara publik pada repositori GitHub. Dosen penguji dan pembaca dapat mengakses seluruh artefak riset secara mandiri melalui tautan resmi yang disediakan.

### **Lampiran 1.1. Metadata Repositori Utama GitHub**

Seluruh kode program platform web *Ummu NLP Lab*, skrip pemodelan pembelajaran mesin, pipeline ekstraksi fitur, dan dokumentasi penelitian disimpan pada repositori publik GitHub guna mendukung prinsip sains terbuka (*Open Science*). Rincian metadata repositori dirangkum pada tabel berikut:

| Atribut Repositori | Keterangan Informasi |
| :--- | :--- |
| **Nama Repositori** | `nlp_experimen_lab` |
| **URL Repositori** | https://github.com/ummulfarihah/nlp_experimen_lab |
| **Pemilik Repositori** | Ummul Farihah (Program Studi Sistem Informasi, FIKTI UMSU) |
| **Lisensi Perangkat Lunak** | MIT License (*Open-Source* untuk keperluan akademik dan riset lanjutan) |
| **Bahasa Pemrograman** | Python 3.10+, JavaScript (ES6+), HTML5, CSS3 |
| **Kerangka Kerja Utama** | Flask 3.0.3, PyTorch 2.2.2, Hugging Face Transformers 4.40.2, Scikit-Learn 1.4.2 |

### **Lampiran 1.2. Berkas Riset Eksperimen Utama (*Jupyter Notebooks*)**

Eksperimen komputasi dan pemodelan mandiri diorganisasikan ke dalam tiga berkas *Jupyter Notebook* terpisah:

1. **Notebook Eksperimen Klasifikasi Sentimen Utama (`nlp_experiments.ipynb`)**  
   Memuat seluruh tahapan riset mulai dari pemuatan data SmSA IndoNLU, isolasi data uji (500 sampel), *dual preprocessing pipeline*, ekstraksi fitur TF-IDF unigram-bigram, pelatihan model Naïve Bayes, SVM, dan IndoBERT PyTorch, visualisasi grafik *Confusion Matrix*, analisis telemetri operasional, hingga komputasi inferensial Uji McNemar berbasis distribusi binomial eksak.  
   *Tautan Akses:* https://github.com/ummulfarihah/nlp_experimen_lab/blob/main/nlp_experiments.ipynb

2. **Notebook Penalaan Hiperparameter (`hyperparameter_tuning.ipynb`)**  
   Memuat kode terfokus untuk melakukan penalaan parameter (*Grid Search Tuning*) model Multinomial Naïve Bayes ($lpha$), SVM (kernel, $C$, $\gamma$), dan IndoBERT (*learning rate*, *batch size*, *epochs*) pada 1.260 sampel data validasi menggunakan akselerasi GPU.  
   *Tautan Akses:* https://github.com/ummulfarihah/nlp_experimen_lab/blob/main/hyperparameter_tuning.ipynb

3. **Notebook Runner Server Google Colab (`run_server_colab.ipynb`)**  
   Memuat instruksi otomatisasi instalasi dependensi, kloning repositori, pembukaan terowongan aman (*secure tunnel*) menggunakan Ngrok / Cloudflare Tunnel, dan peluncuran server Flask dengan akselerasi GPU Cloud agar platform web dapat diakses secara publik.  
   *Tautan Akses:* https://github.com/ummulfarihah/nlp_experimen_lab/blob/main/run_server_colab.ipynb

### **Lampiran 1.3. Struktur Direktori Repositori Proyek**

Struktur pengorganisasian berkas dan modul kode program pada repositori *Ummu NLP Lab* disusun sebagai berikut:

```
nlp_experimen_lab/
├── static/
│   ├── css/
│   │   └── style.css            # Desain antarmuka kustom (Rose-Pink Glassmorphism)
│   ├── js/
│   │   └── app.js               # Logika frontend, validasi form, dan asynchronous polling
│   └── uploads/
│       ├── avatars/             # Penyimpanan foto profil avatar peneliti
│       ├── datasets/            # Berkas CSV dataset yang diunggah
│       ├── logs/                # Berkas log riwayat pelatihan per task
│       └── models/              # Artefak biner model terlatih (.pkl & PyTorch bin)
├── templates/
│   └── index.html               # Antarmuka Single Page Application (SPA) utama
├── app.py                       # Server Flask, REST API Endpoints, dan routing
├── config.py                    # Konfigurasi aplikasi dan jalur penyimpanan
├── database.py                  # Inisialisasi dan koneksi basis data SQLite WAL
├── ml_engine.py                 # Pipeline Preprocessing klasik, Naïve Bayes, dan SVM
├── bert_engine.py               # Engine IndoBERT PyTorch dan tokenizer WordPiece
├── task_manager.py              # Pengelola antrean pelatihan asinkron (background threading)
├── requirements.txt             # Daftar pustaka dan dependensi pustaka Python
├── nlp_experiments.ipynb        # Notebook eksperimen klasifikasi utama
├── hyperparameter_tuning.ipynb  # Notebook penalaan parameter model
├── run_server_colab.ipynb       # Notebook server runner di Google Colab
└── README.md                    # Panduan instalasi dan dokumentasi repositori
```

### **Lampiran 1.4. Panduan Reproduksi Eksperimen pada Lingkungan Lokal**

Guna mereproduksi seluruh hasil metrik evaluasi dan menjalankan platform *Ummu NLP Lab* pada komputer lokal, lakukan langkah-langkah berikut:

1. **Langkah 1: Kloning Repositori Proyek**  
   Buka terminal atau command prompt, lalu unduh kode program melalui perintah:  
   ```bash
   git clone https://github.com/ummulfarihah/nlp_experimen_lab.git
   cd nlp_experimen_lab
   ```

2. **Langkah 2: Pembuatan Virtual Environment dan Instalasi Dependensi**  
   Buat lingkungan virtual Python terisolasi dan instal seluruh pustaka yang dipersyaratkan:  
   ```bash
   python -m venv venv
   source venv/bin/activate  # Untuk Linux/macOS, atau: venv\Scriptsctivate untuk Windows
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

3. **Langkah 3: Menjalankan Notebook Eksperimen**  
   Jalankan server Jupyter Notebook untuk mereproduksi hasil evaluasi model dan Uji McNemar:  
   ```bash
   jupyter notebook
   ```  
   Buka berkas `nlp_experiments.ipynb` dan pilih menu **Cell -> Run All**. Seluruh metrik (*Accuracy, Precision, Recall, Macro F1-Score*), grafik matriks kontingensi, dan nilai *p-value* Uji McNemar akan direproduksi secara otomatis.

4. **Langkah 4: Menjalankan Platform Web App Ummu NLP Lab (Opsional)**  
   Untuk meluncurkan antarmuka web platform penelitian secara lokal, jalankan perintah:  
   ```bash
   python app.py
   ```  
   Buka peramban web (*web browser*) dan akses alamat lokal: `http://localhost:5000`. Peneliti dapat melakukan manajemen dataset, pelatihan model asinkron, kalkulasi Uji McNemar otomatis, dan pengujian inferensi *Prediction Lab*.

### **Lampiran 1.5. Lisensi Perangkat Lunak dan Atribusi Ilmiah**

Seluruh artefak riset didistribusikan di bawah lisensi terbuka dengan atribusi ilmiah:

| Entitas Artefak | Ketentuan Lisensi & Hak Cipta |
| :--- | :--- |
| **Kode Program Sumber** | **MIT License** (Hak Cipta © 2026 Ummul Farihah). Bebas digunakan, dimodifikasi, dan didistribusikan untuk riset akademik. |
| **Dataset Acuan SmSA** | **IndoNLU Benchmark** (Wilie et al., 2020). Digunakan sesuai lisensi non-komersial riset NLP Indonesia. |
| **Model IndoBERT** | **IndoBenchmark** (`indobenchmark/IndoBERT-base-p1` via Hugging Face Transformers). |

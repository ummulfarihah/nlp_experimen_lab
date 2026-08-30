# LAMPIRAN A: AKSES KODE PROGRAM DAN REPRODUKSIBILITAS EKSPERIMEN ONLINE

Sebagai upaya efisiensi pencetakan dokumen, pelestarian lingkungan, serta penyajian data penelitian yang interaktif dan dapat direproduksi secara real-time (*reproducible research*), seluruh kode program, konfigurasi parameter, dan visualisasi hasil eksperimen pada penelitian ini tidak dicetak secara fisik. Seluruh berkas tersebut di-host secara publik pada repositori **GitHub**.

Pembaca atau dosen penguji dapat mengakses kode program, data uji, dan hasil evaluasi model melalui tautan repositori utama atau dengan memindai kode respons cepat (QR Code) di bawah ini:

---

## 1. Repositori Utama GitHub (Ummu NLP Lab)

*   **URL Repositori**: [https://github.com/ummulfarihah/nlp_experimen_lab](https://github.com/ummulfarihah/nlp_experimen_lab)
*   **Akses QR Code**:
    
    ![QR Code Repositori](https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://github.com/ummulfarihah/nlp_experimen_lab)

*Keterangan: Pindai gambar di atas menggunakan kamera ponsel cerdas Anda untuk langsung membuka halaman repositori kode sumber proyek.*

---

## 2. Berkas Riset Eksperimen Utama & Notebook (Jupyter Notebooks)

Berikut adalah daftar berkas Jupyter Notebook riset yang dapat diakses dan dijalankan secara interaktif (misalnya di lingkungan Google Colab):

### A. Notebook Eksperimen Klasifikasi Sentimen Utama
*   **Nama Berkas**: `nlp_experiments.ipynb`
*   **Deskripsi**: Berisi seluruh tahapan riset dari pemuatan data IndoNLU SmSA, pemisahan dataset, NLP preprocessing pipeline, ekstraksi fitur TF-IDF, training model klasifikasi (Naive Bayes, SVM, IndoBERT), visualisasi grafik perbandingan, confusion matrix, hingga pengujian signifikansi statistik McNemar Test.
*   **Tautan Akses**: [Lihat Kode & Output di GitHub](https://github.com/ummulfarihah/nlp_experimen_lab/blob/main/nlp_experiments.ipynb)
*   **Akses QR Code**:
    
    ![QR Code Notebook Utama](https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://github.com/ummulfarihah/nlp_experimen_lab/blob/main/nlp_experiments.ipynb)

### B. Notebook Penalaan Hiperparameter (Grid Search Tuning)
*   **Nama Berkas**: `hyperparameter_tuning.ipynb`
*   **Deskripsi**: Berisi kode terfokus untuk melakukan pencarian kombinasi parameter optimal (Grid Search) untuk model Multinomial Naive Bayes, SVM, dan IndoBERT secara murni pada data validasi menggunakan akselerasi GPU.
*   **Tautan Akses**: [Lihat Kode di GitHub](https://github.com/ummulfarihah/nlp_experimen_lab/blob/main/hyperparameter_tuning.ipynb)
*   **Akses QR Code**:
    
    ![QR Code Notebook Tuning](https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://github.com/ummulfarihah/nlp_experimen_lab/blob/main/hyperparameter_tuning.ipynb)

### C. Notebook Runner Server Google Colab (Cloud Runner)
*   **Nama Berkas**: `run_server_colab.ipynb`
*   **Deskripsi**: Berisi langkah-langkah instalasi dependensi, kloning repositori secara otomatis, pembukaan secure HTTP tunnel menggunakan Ngrok, dan peluncuran server Flask agar platform dapat diuji secara eksternal.
*   **Tautan Akses**: [Lihat Kode di GitHub](https://github.com/ummulfarihah/nlp_experimen_lab/blob/main/run_server_colab.ipynb)
*   **Akses QR Code**:
    
    ![QR Code Notebook Colab](https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://github.com/ummulfarihah/nlp_experimen_lab/blob/main/run_server_colab.ipynb)

---

## 3. Cara Menjalankan Eksperimen Secara Mandiri

Untuk mereproduksi seluruh hasil metrik performa model pada komputer lokal Anda, lakukan langkah-langkah berikut:

1.  **Klon Repositori**:
    ```bash
    git clone https://github.com/ummulfarihah/nlp_experimen_lab.git
    cd nlp_experimen_lab
    ```
2.  **Pasang Dependensi**:
    ```bash
    pip install -r requirements.txt
    ```
3.  **Jalankan Verifikasi Unit Test**:
    ```bash
    python verify.py
    ```
4.  **Buka Jupyter Notebook**:
    Jalankan perintah `jupyter notebook` dan buka file `nlp_experiments.ipynb` untuk melakukan eksekusi ulang pada seluruh sel kode.

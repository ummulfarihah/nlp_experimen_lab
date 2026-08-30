# LAMPIRAN 5
# TAMPILAN ANTARMUKA SISTEM (SCREENSHOT)

Berikut adalah tampilan antarmuka sistem Ummu NLP Lab yang telah diimplementasikan sebagai bagian dari penelitian ini. Seluruh screenshot diambil dari lingkungan pengembangan lokal dan mencerminkan fungsionalitas sistem secara keseluruhan.

---

## Lampiran 5.1. Halaman Login

![Halaman Login Ummu NLP Lab](screenshots/login.png)

**Keterangan:**  
Tampilan antarmuka gerbang masuk keamanan (autentikasi) peneliti utama. Kartu masuk (*login card*) dirancang dengan teknik *glassmorphism* menggunakan efek blur latar belakang dan pinggiran tipis mawar pastel. Ikon logo brand berbentuk *squircle* pastel pink dengan ikon bunga mawar pink cerah di tengah bertindak sebagai ikon institusional yang elegan. Input email dan kata sandi menggunakan ikon visual interaktif Lucide dan validasi format aman. Bagian *footer* menyajikan pembatas mawar tipis serta penulisan versi aplikasi resmi (*Version 2.0*) secara rapi tanpa indikator status eksternal guna memprioritaskan estetika minimalis yang bersih (*clean approach*).

*Sumber: Dokumentasi sistem (2026)*

---

## Lampiran 5.2. Dashboard Utama

![Dashboard Utama Ummu NLP Lab](screenshots/dashboard.png)

**Keterangan:**  
Panel pusat kendali utama (*command center dashboard*) yang memuat rangkuman eksekutif aktivitas penelitian. Dashboard menyajikan metrik statistik interaktif seperti total dataset terunggah, jumlah eksperimen selesai, model terdaftar di registry, serta visualisasi diagram lingkaran distribusi kelas dataset aktif dengan celah irisan putih setebal 3px yang elegan dan format angka standar Indonesia. Panel navigasi di sisi kiri mempermudah akses peneliti ke modul preprocessing klasik, preprocessing BERT, pelatihan, evaluasi, hingga lab prediksi secara asinkron (*non-blocking*).

*Sumber: Dokumentasi sistem (2026)*

---

## Lampiran 5.3. Unggah Dataset

![Unggah Dataset Ummu NLP Lab](screenshots/upload_dataset.png)

**Keterangan:**  
Antarmuka modul manajemen berkas data (*Dataset Manager*). Peneliti dapat mengunggah dataset berformat CSV melalui metode seret-dan-lepas (*drag-and-drop*) dengan validasi kolom otomatis untuk mendeteksi kolom wajib `text` (teks ulasan bahasa Indonesia) dan `label` (kelas sentimen). Setelah proses unggah selesai, sistem secara otomatis menghitung hash SHA-256 unik untuk keperluan audit replikabilitas ilmiah, menampilkan pratinjau data ulasan, dan merender grafik ringkasan distribusi kelas secara dinamis.

*Sumber: Dokumentasi sistem (2026)*

---

## Lampiran 5.4. Form Eksperimen

![Form Eksperimen Ummu NLP Lab](screenshots/form_experiment.png)

**Keterangan:**  
Formulir pengaturan parameter eksperimen klasifikasi teks (*Hyperparameter Tuning Form*). Peneliti dapat menentukan konfigurasi pembagian data latih/uji (baik pemisahan dinamis terskala maupun data uji eksternal yang diisolasi), mengunci generator bilangan acak (*random seed*) untuk reproduksibilitas metrik, serta menyelaraskan hyperparameter spesifik model seperti smoothing alpha (Naive Bayes), penalti C dan kernel (SVM), hingga learning rate, batch size, dan jumlah epoch (IndoBERT).

*Sumber: Dokumentasi sistem (2026)*

---

## Lampiran 5.5. Training Progress

![Training Progress Ummu NLP Lab](screenshots/training_progress.png)

**Keterangan:**  
Panel pemantau proses pelatihan model secara asinkron (*Asynchronous Live Training Monitor*). Memanfaatkan arsitektur *non-blocking* di mana thread pekerja berjalan di latar belakang tanpa membekukan antarmuka browser. Pengguna disajikan diagram lingkaran progress bar interaktif, indikator persentase real-time, dan log aktivitas telemetri mendalam per baris. Tombol **Batalkan** yang terhubung dengan event thread abort terintegrasi untuk menghentikan latihan secara aman di tengah jalan dengan melakukan rollback database otomatis.

*Sumber: Dokumentasi sistem (2026)*

---

## Lampiran 5.6. Hasil Evaluasi

![Hasil Evaluasi Ummu NLP Lab](screenshots/evaluation.png)

**Keterangan:**  
Laporan hasil analisis evaluasi performa model terperinci (*Model Performance Report*). Halaman ini merender empat metrik utama penelitian (*Accuracy*, *Precision*, *Recall*, *Macro F1-score*) secara agregat dan detail per kelas sentimen. Matriks kekacauan (*Confusion Matrix*) divisualisasikan dalam bentuk *heatmap* bergradasi warna interaktif untuk mendeteksi persentase tebakan salah atau benar model, serta dilengkapi classification report mentah dalam format ilmiah untuk kebutuhan kutipan jurnal riset.

*Sumber: Dokumentasi sistem (2026)*

---

## Lampiran 5.7. Leaderboard

![Leaderboard Ummu NLP Lab](screenshots/leaderboard.png)

**Keterangan:**  
Papan peringkat performa model klasifikasi (*Model Accuracy Leaderboard*). Membantu peneliti membandingkan tingkat keberhasilan klasifikasi berbagai model secara berdampingan. Menampilkan tabel terurut berdasarkan nilai akurasi dan Macro F1-score tertinggi, didukung visualisasi diagram batang (*bar chart*) performa model untuk analisis komparatif instan. Dilengkapi akses cepat tombol **Inspeksi** untuk melacak detail parameter, waktu latih, dan aliran log pekerjaan masa lalu.

*Sumber: Dokumentasi sistem (2026)*

---

## Lampiran 5.8. Uji McNemar

![Uji McNemar Ummu NLP Lab](screenshots/mcnemar.png)

**Keterangan:**  
Panel komparasi signifikansi statistik model (*McNemar Statistical Significance Lab*). Menggunakan uji statistik non-parametrik McNemar untuk membuktikan apakah perbedaan akurasi antara dua model klasifikasi bersifat signifikan secara statistik atau hanya kebetulan acak. Sistem merender tabel kontingensi 2x2 (jumlah tebakan benar-salah silang), kalkulasi p-value, dan kesimpulan hipotesis otomatis pada ambang batas signifikansi α = 0,05, sehingga memberikan dasar validitas riset komparatif yang objektif.

*Sumber: Dokumentasi sistem (2026)*

---

## Lampiran 5.9. Prediction Lab

![Prediction Lab Ummu NLP Lab](screenshots/prediction_lab.png)

**Keterangan:**  
Laboratorium inferensi teks mandiri (*Inference & Prediction Lab*). Menyediakan layanan prediksi sentimen teks baru menggunakan model terdaftar. Fitur ini mendukung input ulasan tunggal (dengan visualisasi persentase probabilitas tiap kelas) serta input batch berbasis berkas CSV untuk klasifikasi ribuan teks sekaligus secara cepat. Menggunakan model surrogate (regresi logistik berbobot TF-IDF) yang terkompresi di dalam file `.pkl` guna menghasilkan prediksi instan tanpa risiko OOM (*Out-of-Memory*) di server Flask.

*Sumber: Dokumentasi sistem (2026)*

---

## Lampiran 5.10. System Resources

![System Resources Ummu NLP Lab](screenshots/system_resources.png)

**Keterangan:**  
Dashboard pemantauan beban server komputasi (*System Resource Monitoring Lab*). Menyajikan indikator pemantauan real-time terhadap performa CPU, memori RAM, kapasitas penyimpanan Disk, serta akselerator grafis NVIDIA L4 (GPU Load & VRAM Usage). Modul ini menggunakan library `psutil` dan `pynvml` untuk deteksi langsung di tingkat driver hardware. Jika server berjalan di perangkat tanpa GPU, sistem secara cerdas menampilkan teks fallback "GPU tidak tersedia" dengan load 0% untuk kejujuran visual.

*Sumber: Dokumentasi sistem (2026)*

---

## Lampiran 5.11. Halaman Profil

![Halaman Profil Ummu NLP Lab](screenshots/profile.png)

**Keterangan:**  
Modul pengelolaan akun dan otorisasi peneliti (*User Settings & Security Center*). Memungkinkan perubahan nama, instansi, alamat email, dan kata sandi dengan perlindungan enkripsi. Dilengkapi fitur upload foto profil (avatar) berbasis asinkron AJAX di mana kursor yang melayang (*hover*) menampilkan *overlay glassmorphism* kamera. Sistem melakukan validasi tipe berkas dan ukuran (<2MB) sebelum memperbarui database SQLite secara instan tanpa memuat ulang browser.

*Sumber: Dokumentasi sistem (2026)*

---

## Lampiran 5.12. Classic Preprocessing Lab

![Classic Preprocessing Lab Ummu NLP Lab](screenshots/classic_preprocessing.png)

**Keterangan:**  
Laboratorium simulasi pra-pengolahan teks klasik (*Classic NLP Preprocessing Suite*). Menyajikan terminal interaktif yang menggambarkan transformasi teks mentah secara bertahap meliputi: (0) teks masukan asli, (1) case folding (penyeragaman huruf kecil), (2) noise removal (pembersihan tautan URL dan tag HTML), (3) slang normalization (konversi bahasa gaul menggunakan kamus slang terintegrasi), dan (4) stopword removal (pembuangan kata hubung tidak bernilai sentimen). Proses stemming Sastrawi sengaja dihilangkan untuk menjaga integritas makna kata dasar.

*Sumber: Dokumentasi sistem (2026)*

---

## Lampiran 5.13. BERT Preprocessing Lab (WordPiece)

![BERT Preprocessing Lab Ummu NLP Lab](screenshots/bert_preprocessing.png)

**Keterangan:**  
Laboratorium pemrosesan token BERT (*BERT WordPiece Tokenization Lab*). Menampilkan visualisasi langkah demi langkah proses pemecahan kalimat menjadi token subkata menggunakan algoritma WordPiece. Token khusus (`[CLS]`, `[SEP]`) diwarnai ungu, kata dasar diwarnai hijau, dan potongan imbuhan yang ditandai simbol kelanjutan `##` diwarnai pink. Dilengkapi dengan tabel pemetaan ke Vocabulary ID numerik asli, baris Attention Mask (0 atau 1), serta representasi array Padded Input Tensor dengan panjang maksimum 32 token yang siap diproses oleh model IndoBERT.

*Sumber: Dokumentasi sistem (2026)*

---

## Lampiran 5.14. Model Registry Lifecycle

![Model Registry Ummu NLP Lab](screenshots/model_registry.png)

**Keterangan:**  
Tampilan halaman manajemen siklus hidup biner model (*Model Registry Lifecycle*). Halaman ini mendaftarkan seluruh model yang telah berhasil dilatih. Peneliti dapat mengelola kapasitas penyimpanan server secara cerdas dengan menghapus file fisik biner model (`.pkl`) yang berukuran besar untuk membebaskan ruang harddisk (tindakan *unregister model*) sementara tetap mempertahankan data metrik historis performa model tersebut pada papan peringkat leaderboard. Modul ini menjamin pengelolaan siklus hidup data komputasi yang efisien tanpa menghilangkan rekam jejak riset eksperimental.

*Sumber: Dokumentasi sistem (2026)*
# Checklist Revisi Skripsi — Analisis Komparatif NB/SVM/IndoBERT & Ummu NLP Lab

Gabungan hasil audit anomali konsep, teori, dan metode pada `Draft_Skripsi_Final.md`.
Kerjakan satu per satu, tunjukkan teks lama vs teks baru sebelum diterapkan ke file.
Jangan ubah bagian lain draft — angka hasil eksperimen di Tabel 4.2–4.7 sudah
diverifikasi konsisten secara matematis dan tidak perlu disentuh, kecuali
penyesuaian kualifikasi status "Lolos" di Tabel 4.7 sesuai poin 8.

---

## 🔴 Bagian A — BAB I/II (Fatal)

### [ ] 1. Persamaan (2.12) — Rumus Akurasi salah secara matematis
**Lokasi:** Section 2.5.4

**Masalah:** Kesetaraan "Akurasi = ΣTPk/N = ΣTPk/Σ(TPk+FPk+FNk)" salah, karena
Σ(TPk+FPk+FNk) = N + E (E = jumlah error), bukan N.

**Perbaikan:** Hapus bagian kedua persamaan. Tulis ulang jadi hanya:
Akurasi = ΣTPk / N, dengan N = jumlah total sampel data uji (bukan turunan dari
TP+FP+FN per kelas). Tambahkan satu kalimat penjelas kenapa penjumlahan
TP+FP+FN per kelas TIDAK sama dengan N pada kasus multi-kelas.

---

### [ ] 2. Klaim strategi SVM One-vs-Rest (OvR) tidak cocok dengan implementasi default library
**Lokasi:** Section 3.2.5, Persamaan (3.3)

**Masalah:** Teks mengklaim OvR (K hyperplane independen + argmax), tapi jika
kode memakai `sklearn.svm.SVC` polos (bukan `LinearSVC`), default library
adalah One-vs-One (OvO).

**Tindakan:**
a) Cek dulu apakah kode memakai `SVC` atau `LinearSVC` di `ml_engine.py`.
b) Jika `SVC()` polos tanpa `decision_function_shape='ovr'` → itu OvO secara
   default. Pilih salah satu:
   - Ubah kode ke `LinearSVC` atau `SVC(decision_function_shape='ovr')` agar
     sesuai klaim OvR di teks (lalu re-run eksperimen dan cek apakah metrik
     berubah), ATAU
   - Ubah teks BAB III (dan Persamaan 3.3) supaya sesuai OvO yang benar-benar
     dipakai kode: jelaskan mekanisme voting antar C(3,2)=3 classifier biner,
     bukan argmax atas 3 fungsi keputusan independen.
c) Pastikan konsisten dengan bagian mana pun di draft yang menyebut "One-vs-Rest".

---

### [ ] 3. Inkonsistensi jumlah tugas IndoNLU (11 vs 12)
**Lokasi A:** Section 2.4 — "...12 tugas pemahaman bahasa alami"
**Lokasi B:** Tabel 2.1, baris Wilie et al. (2020) — "...11 tugas IndoNLU"

**Perbaikan:** Samakan ke angka yang benar sesuai paper asli Wilie et al.
(2020), yaitu 12 tugas. Perbaiki Tabel 2.1.

---

## 🟡 Bagian B — BAB I/II (Perlu klarifikasi)

### [ ] 4. Uji McNemar berganda tanpa koreksi multiple comparison
**Lokasi:** Section 4.4.1 (setelah Tabel 4.4)

**Perbaikan:** Tambahkan 1–2 kalimat yang menyatakan bahwa dengan 3
perbandingan berpasangan, secara metodologis idealnya diterapkan koreksi
Bonferroni (α_koreksi = 0,05/3 ≈ 0,0167), namun karena seluruh p-value yang
diperoleh berada pada orde 10⁻⁸ hingga 10⁻²³ (jauh di bawah ambang batas
terkoreksi sekalipun), kesimpulan signifikansi tetap tidak berubah — sehingga
koreksi tidak mengubah interpretasi hasil.

---

### [ ] 5. Klaim precision sempurna (100%) kelas netral IndoBERT
**Lokasi:** Section 4.4.2, poin 3

**Perbaikan:** Tambahkan kalimat pembahasan singkat yang menjelaskan mengapa
precision sempurna (0 false positive) berjalan beriringan dengan recall yang
jauh lebih rendah (51,14%, 45/88 sampel) — yaitu model cenderung konservatif,
hanya memprediksi netral saat sangat yakin, sehingga precision tinggi dicapai
dengan mengorbankan recall. Hindari framing seolah 100% precision berarti
model "sempurna" tanpa trade-off ini.

---

### [ ] 6. Pola sitasi terhadap karya Dekan (Al-Khowarizmi)
**Lokasi:** Section 2.2.2 (baris SVM, cyberbullying) dan Section 2.2.3
(baris NB, kualitas udara)

**Perbaikan:** Untuk tiap sitasi Al-Khowarizmi et al. (2024), Dongoran et al.
(2024), dan Zhafirah & Al-Khowarizmi (2025), persempit klaim kalimat agar
benar-benar spesifik pada apa yang dibuktikan paper tersebut (mis.
"diverifikasi pada konteks deteksi cyberbullying" bukan klaim umum
"keandalan SVM di lingkungan akademis dan media sosial Indonesia"). Jika
memungkinkan, tambahkan minimal 1 sitasi literatur lain yang topiknya lebih
langsung relevan dengan klasifikasi sentimen teks.

---

## 🔴 Bagian C — BAB III (Fatal)

### [ ] 7. Kontradiksi mekanisme autentikasi (paling prioritas — cek kode dulu)
**Lokasi:** Section 2.7.4, 3.4.2, Tabel 3.8 (kolom `password_hash`), Tabel
3.9 (endpoint `/api/login` & `/api/register`), Section 4.3.1 (deskripsi UI
login)

**Masalah:** Tiga narasi keamanan saling bertentangan:
- (a) OAuth 2.0 SSO + email whitelist eksklusif
- (b) tabel `users` punya `password_hash` + endpoint login/register tradisional
- (c) deskripsi UI login menyebut "kata sandi terenkripsi hash SHA-256"

**Tindakan:**
a) Cek `app.py`/`database.py` untuk memastikan mekanisme auth yang
   SEBENARNYA diimplementasikan (murni OAuth, murni password, atau hybrid).
b) Samakan seluruh narasi (2.7.4, 3.4.2, Tabel 3.8, Tabel 3.9, 4.3.1) ke
   mekanisme yang benar-benar dipakai kode.
c) Jika benar memakai SHA-256 untuk password lokal, tambahkan catatan kritis
   di bagian Saran (5.2) bahwa ini bukan praktik terbaik dan idealnya
   memakai bcrypt/scrypt/Argon2 dengan salt — atau, kalau memungkinkan,
   ganti implementasinya dan update dokumentasi.
d) Jika sistem OAuth-only, hapus/ganti istilah "pendaftaran" (register)
   menjadi "verifikasi whitelist" karena tidak ada self-service signup, dan
   tambahkan endpoint `/api/v1/auth/google` ke Tabel 3.9, hapus
   `password_hash` dari Tabel 3.8 jika memang tidak dipakai.

---

### [ ] 8. Kriteria test plan dilanggar tapi dilaporkan "Lolos"
**Lokasi:** Tabel 3.10 (baris "Pengujian Inferensi Mandiri", kriteria <20 ms)
vs Tabel 4.6 (latensi IndoBERT CPU ~85 ms) vs Tabel 4.7 (status "Valid Lolos")

**Perbaikan:** Pilih salah satu:
a) Revisi kriteria di Tabel 3.10 menjadi spesifik per skenario, misalnya
   "< 20 ms untuk model klasik (NB/SVM) dan IndoBERT ber-GPU; < 100 ms untuk
   IndoBERT CPU-only", ATAU
b) Tambahkan catatan kaki/kalimat pembahasan di 4.4.4 yang menjelaskan bahwa
   kriteria <20ms tercapai untuk skenario GPU (15,04 ms) namun skenario
   CPU-only IndoBERT (85 ms) melebihi target awal karena keterbatasan
   komputasi CPU untuk model Transformer, sehingga status "Lolos" pada Tabel
   4.7 perlu diberi kualifikasi "Lolos dengan Catatan" untuk baris ini,
   bukan "Lolos" polos.

---

## 🟡 Bagian D — BAB III (Perlu klarifikasi)

### [ ] 9. Jumlah modul antarmuka tidak konsisten (13 vs 14)
**Lokasi A:** Section 3.5 — "Rincian Empat Belas Rancangan Antarmuka Sistem"
**Lokasi B:** Section 4.3 (paragraf pembuka) — "dokumentasi 13 modul
antarmuka sistem"

**Perbaikan:** Ubah Section 4.3 menjadi "14 modul antarmuka sistem" karena
daftar isi dan isi bab (4.3.1 s.d. 4.3.14) memang berjumlah 14.

---

### [ ] 10. Flowchart sistem (Gambar 3.3) menyiratkan logika training yang salah
**Lokasi:** Section 3.4.3, blok mermaid flowchart, node `CheckGPU`

**Masalah:** Diagram menyiratkan hanya SATU dari (IndoBERT via GPU) ATAU
(SVM/NB via CPU) yang dijalankan, padahal ketiga model selalu dilatih dan
dibandingkan (inti penelitian komparatif).

**Perbaikan:** Revisi flowchart agar node `Launch` bercabang menjadi 3 jalur
training paralel/sekuensial (NB, SVM, IndoBERT) yang semuanya selalu
dieksekusi, dengan `CheckGPU` hanya memengaruhi kecepatan/mode eksekusi
IndoBERT (GPU vs CPU fallback), bukan menentukan model mana yang dilatih.
Contoh revisi struktur:

```
Launch --> TrainNB[Training Naive Bayes]
Launch --> TrainSVM[Training SVM]
Launch --> CheckGPU{Cek GPU?}
CheckGPU -->|GPU Ada| TrainBERT_GPU[Fine-Tuning IndoBERT via GPU]
CheckGPU -->|CPU Only| TrainBERT_CPU[Fine-Tuning IndoBERT via CPU lebih lambat]
TrainNB & TrainSVM & TrainBERT_GPU & TrainBERT_CPU --> SaveModel
```

---

### [ ] 11. Skema database (Tabel 3.8) tidak cukup granular untuk klaim Tabel 4.5
**Lokasi:** Tabel 3.8, baris tabel `experiments`

**Masalah:** Kolom hanya `accuracy`, `macro_f1`, `params` (flat) — tidak
cukup untuk menyimpan seluruh metrik granular (Weighted F1, F1 per kelas x 3
kelas x 3 model) yang diklaim direproduksi identik di Tabel 4.5.

**Perbaikan:** Tambahkan kolom eksplisit ke Tabel 3.8, misalnya
`metrics_detail` (tipe JSON) yang menyimpan precision/recall/F1 per kelas
dan weighted F1, dengan deskripsi "Rincian metrik evaluasi granular per
kelas sentimen dalam format JSON". Sesuaikan juga narasi di Section 3.3.2
agar menyebut field ini secara eksplisit.

---

### [ ] 12. Inkonsistensi versioning endpoint API
**Lokasi:** Tabel 3.9 (semua endpoint pola `/api/...` tanpa versi) vs
Section 3.4.2 (`/api/v1/auth/google`, pakai versi)

**Perbaikan:** Samakan skema penamaan endpoint. Jika API memang versioned,
ubah seluruh endpoint di Tabel 3.9 menjadi `/api/v1/...`, atau jika hanya
endpoint auth yang versioned dengan alasan tertentu (misal mengikuti
konvensi Google Identity Services), tambahkan satu kalimat penjelas di 3.4.1
kenapa hanya endpoint ini yang berbeda skema.

---

## 🔴 Bagian E — BAB IV/V & Daftar Pustaka (Fatal)

### [ ] 13. Sitasi "Wongso et al., 2021" dipakai 4 kali tapi tidak ada di Daftar Pustaka
**Lokasi:** Section 1.1, Section 4.4.3, Section 5.1 poin 5, Section 5.2 poin 5

**Masalah:** Referensi ini dicek terhadap seluruh entri Daftar Pustaka
(Agam...Zhang) dan tidak ditemukan sama sekali. Klaim yang cukup penting
(ketiadaan platform NLP terbuka terintegrasi, prinsip *open science*) tidak
bisa diverifikasi pembaca/penguji.

**Perbaikan:** Cari referensi asli yang dimaksud (kemungkinan Wongso, F.,
dkk. terkait NLP toolkit/platform Indonesia) dan tambahkan entrinya secara
lengkap ke Daftar Pustaka, atau ganti seluruh 4 sitasi ke referensi lain yang
memang ada di daftar dan relevan (mis. Pineau et al., 2021 untuk
*reproducibility* di 4.4.3 dan 5.1; cari pengganti yang sesuai untuk 1.1 dan
5.2).

---

## 🟡 Bagian F — BAB IV/V & Daftar Pustaka (Perlu klarifikasi)

### [ ] 14. Sitasi salah pasang di bagian Saran (5.2)
**Lokasi:** Section 5.2, poin 2 dan poin 4

**Masalah:**
- Poin 2: klaim tentang *Bayesian Optimization* dengan TPE disitir ke
  (Bergstra & Bengio, 2012) — padahal paper itu tentang *Random Search*
  (metode pembanding terhadap Bayesian Optimization, bukan tentang itu).
- Poin 4: klaim tentang LLaMA-3/Mistral dengan teknik PEFT/LoRA disitir ke
  (Devlin et al., 2019; Wilie et al., 2020) — itu paper BERT dan IndoBERT,
  bukan tentang LLM atau LoRA.

**Perbaikan:**
- Poin 2: ganti sitasi ke **Snoek et al. (2012)** "Practical Bayesian
  Optimization of Machine Learning Algorithms" (sudah ada di Daftar
  Pustaka, belum dipakai di badan teks).
- Poin 4: ganti/tambahkan sitasi ke **Touvron et al. (2023)** untuk LLaMA
  dan **Hu et al. (2022)** untuk LoRA (keduanya sudah ada di Daftar
  Pustaka, belum dipakai di badan teks).

---

### [x] 15. Sembilan referensi "orphan" di Daftar Pustaka — tak pernah disitasi di badan teks
**Lokasi:** Daftar Pustaka — Cahyawijaya et al. (2023, NusaCrowd), Creswell &
Creswell (2018), Hastie et al. (2009), OpenAI (2023, GPT-4), Pedregosa et al.
(2011, scikit-learn), Snoek et al. (2012, lihat juga poin 14), Sun et al.
(2019, fine-tuning BERT), Hidayatullah et al. (2021), Zhang (2004,
optimalitas Naive Bayes)

**Status:** SELESAI (Pedregosa, Sun, Zhang, Hidayatullah, Snoek disitasi ke badan teks; 4 referensi tak terpakai dihapus).

---

## Bagian G — Temuan Audit Keselarasan (Rencana vs Artefak Aktual vs Laporan)

### [x] 16. Sinkronisasi Narasi Metode Komputasi Uji McNemar (Exact Binomial vs Chi-Square)
**Lokasi:** Section 3.2.6 & Section 4.4.1 (Tabel 4.4)  
**Temuan Audit:** Notebook eksperimen utama (`nlp_experiments.ipynb` Cell 28 & 30) mengomputasi nilai $p$-value untuk seluruh pasangan model menggunakan **Exact Binomial Test** (`2.0 * binom.cdf(min(b, c), b+c, 0.5)`), yang menghasilkan angka eksak $p = 3{,}3216\times 10^{-8}$, $p = 9{,}9415\times 10^{-11}$, dan $p = 9{,}6596\times 10^{-23}$ pada Tabel 4.4. Sementara itu, `ml_engine.py` pada sistem web menyediakan formulasi Chi-Square dengan koreksi kontinuitas Yates sebagai alternatif komputasi cepat.  
**Rekomendasi:** Perjelas di Section 3.2.6 dan 4.4.1 bahwa Tabel 4.4 mengacu pada metode baku *Exact Binomial Test* (Persamaan 2.14) yang tidak bergantung pada aproksimasi asimtotik, sementara Persamaan (3.6) diimplementasikan sebagai fitur inferensial alternatif pada web app.

### [x] 17. Penyelarasan Strategi Caching Service Worker PWA
**Lokasi:** Section 3.4.4 Butir 2  
**Temuan Audit:** `static/js/sw.js` mengimplementasikan strategi *Network-First dengan Offline Fallback* untuk permintaan dokumen navigasi/HTML, dan *Stale-While-Revalidate* (dengan pre-caching saat install) untuk aset statis (CSS, JS, gambar, ikon), bukan semata-mata *Cache-First*.  
**Rekomendasi:** Perjelas narasi Subbab 3.4.4 butir 2 agar mendeskripsikan strategi caching hibrid (*Network-First* untuk dokumen dinamis dan *Stale-While-Revalidate* untuk aset statis).

### [x] 18. Dokumentasi Kamus Slang Riset Offline vs In-Memory Web App
**Lokasi:** Section 3.2.3 (Tahapan Normalisasi Kata Slang)  
**Temuan Audit:** Eksperimen pemodelan korpus SmSA pada `nlp_experiments.ipynb` menggunakan kamus slang acuan nasional (~1.500+ pasangan kata), sedangkan modul `ml_engine.py` pada backend web app menyematkan subset kurasi in-memory sebanyak 84 pasangan kata untuk simulasi edukasi interaktif yang ringan dan instan.  
**Rekomendasi:** Tambahkan keterangan pembeda antara pemrosesan korpus riset utama dengan modul simulasi web app pada Subbab 3.2.3.

### [x] 19. Penyelarasan Cakupan Batasan Masalah dengan Modul Tambahan Web App
**Lokasi:** Section 1.3 Butir 4 (Batasan Masalah)  
**Temuan Audit:** Platform web *Ummu NLP Lab* yang berhasil dibangun mencakup modul fungsional tambahan melampaui batasan awal, meliputi: kapabilitas PWA (*Service Worker* & *Standalone Install*), pemantauan telemetri hardware real-time (`psutil`/`pynvml`), manajemen profil & avatar peneliti, serta laboratorium simulasi preprocessing interaktif.  
**Rekomendasi:** Perluas narasi Section 1.3 butir 4 untuk mencatat ketersediaan modul-modul pendukung operasional riset tersebut.

### [x] 20. Verifikasi Dependensi Library Python (Tabel 3.3 vs requirements.txt)
**Lokasi:** Tabel 3.3 (Daftar Pustaka Pemrograman Python)  
**Temuan Audit:** Tabel 3.3 mencatat versi lingkungan eksperimen acuan saat penelitian dirancang (mis. Scikit-Learn 1.4.2, PyTorch 2.2.2, Transformers 4.40.2, Flask 3.0.3), sedangkan berkas `requirements.txt` pada repositori berisi pin versi rilis lingkungan deployment lokal terkini.  
**Rekomendasi:** Berikan catatan kaki (*footnote*) pada Tabel 3.3 bahwa versi pustaka mencerminkan lingkungan komputasi Google Colab GPU / workstation saat pengujian model dieksekusi.

---

## Catatan Verifikasi Akhir
- **100% Seluruh Angka Eksperimen Terverifikasi:** Seluruh nilai pada Tabel 4.1 s.d. 4.6 terbukti 100% identik dan berakar dari cell output nyata `nlp_experiments.ipynb` dan `hyperparameter_tuning.ipynb`.
- **24 Test Cases PyTest:** Terverifikasi presisi $7 + 4 + 13 = 24$ fungsi pengujian otomatis pada `tests/`.
- **SQLite WAL & Determinisme:** Terverifikasi `PRAGMA journal_mode = WAL;` aktif di `database.py` dan seluruh seed terkunci 42.


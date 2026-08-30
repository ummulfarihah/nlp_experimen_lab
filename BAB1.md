# BAB I
# PENDAHULUAN

## 1.1. Latar Belakang Masalah

Perkembangan platform digital di Indonesia telah menghasilkan volume data teks yang terus meningkat secara eksponensial dalam kehidupan masyarakat modern. Manajer produk di berbagai platform *e-commerce* terkemuka kini harus memproses ratusan ribu ulasan pembeli setiap harinya guna mengetahui tingkat kepuasan konsumen serta mengidentifikasi keluhan berulang yang membutuhkan penanganan segera. Di sektor lain, analis kebijakan publik dan tim komunikasi politik memantau jutaan percakapan daring di media sosial setiap jam untuk mengukur respons publik terhadap suatu regulasi. Kebutuhan terhadap pengolahan data teks skala besar ini menuntut adanya sistem klasifikasi sentimen otomatis yang mampu memproses teks berbahasa Indonesia secara cepat, akurat, dan berskala besar (Liu, 2015).

Akselerasi transformasi digital di Indonesia semakin mempertegas urgensi otomatisasi pemrosesan bahasa alami tersebut. Berdasarkan laporan data lanskap digital terkini, penetrasi pengguna internet di Indonesia telah melampaui 200 juta jiwa dengan jutaan pertukaran opini yang terdistribusi di berbagai saluran digital setiap harinya (We Are Social & Meltwater, 2026). Besarnya skala arus teks opini ini mustahil dapat dianalisis secara manual oleh tenaga manusia karena adanya keterbatasan kapasitas kognitif, tingginya biaya operasional, serta risiko inkonsistensi penilaian subjektif yang tinggi (Pang & Lee, 2008). Oleh sebab itu, penerapan teknologi *Natural Language Processing* (NLP) menjadi sebuah keharusan operasional dalam mengubah tumpukan data teks mentah menjadi wawasan strategis yang bernilai guna.

Meskipun urgensi pemrosesan otomatis telah disepakati secara luas, analisis sentimen pada teks berbahasa Indonesia menghadapi karakteristik linguistik yang khas dan sangat menantang. Struktur penulisan opini di dunia maya didominasi oleh ragam bahasa informal, penggunaan singkatan tidak baku, pencampuran dialek daerah (*code-mixing*), pembalikan makna melalui kata negasi, serta tata kalimat yang tidak terstruktur secara gramatikal (Alfina et al., 2017). Kondisi linguistik yang dinamis ini menuntut algoritma klasifikasi memiliki kapasitas representasi bahasa yang lentur dan tangguh agar tidak salah mengartikan polaritas sentimen kalimat.

Di samping kompleksitas linguistik, tantangan kritis yang sering dijumpai dalam korpus sentimen nyata adalah fenomena ketidakseimbangan distribusi kelas (*class imbalance*). Pada dataset standar acuan nasional seperti *Sentiment Multi-level Sentence Analysis* (SmSA) dari *benchmark* IndoNLU (Wilie et al., 2020), distribusi sampel sangat timpang di mana kelas positif mendominasi sebesar 57,67%, diikuti kelas negatif 31,61%, sedangkan kelas netral hanya mencakup 10,72%. Ketimpangan ini menyebabkan algoritma pembelajaran mesin konvensional rentan mengalami bias ke arah kelas mayoritas dan mengalami kegagalan sistematis saat mengenali sentimen netral, sehingga evaluasi model mutlak memerlukan metrik yang adil seperti *Macro F1-Score* (Japkowicz & Shah, 2011; Sokolova & Lapalme, 2009).

Perkembangan metodologi klasifikasi teks menawarkan berbagai pendekatan yang mewakili paradigma komputasi berbeda. Paradigma probabilistik klasik melalui *Multinomial Naïve Bayes* menawarkan efisiensi komputasi yang sangat tinggi dan waktu latih instan, namun sangat dibatasi oleh asumsi independensi fitur (*bag-of-words*) yang mengabaikan urutan kata (McCallum & Nigam, 1998). Paradigma geometris klasik melalui *Support Vector Machine* (SVM) mampu mengatasi dimensi fitur tinggi pada representasi *Term Frequency-Inverse Document Frequency* (TF-IDF) dengan mencari bidang pemisah ber-margin optimal, tetapi tetap memiliki keterbatasan dalam memahami konteks semantik yang kompleks (Cortes & Vapnik, 1995; Joachims, 1998). Di sisi lain, paradigma *deep learning* berbasis *Transformer* seperti **IndoBERT** merevolusi pemrosesan bahasa melalui mekanisme *Self-Attention* dwiarah yang dilatih pada miliaran kata korpus bahasa Indonesia, sehingga mampu menangkap relasi kontekstual secara mendalam meskipun menuntut komputasi yang intensif (Vaswani et al., 2017; Devlin et al., 2019; Wilie et al., 2020).

Kesenjangan penting yang ditemukan dalam literatur NLP bahasa Indonesia saat ini adalah ketiadaan pengujian signifikansi statistik inferensial formal. Sebagian besar penelitian terdahulu menyimpulkan superioritas suatu model hanya berdasarkan selisih persentase angka akurasi mentah tanpa memvalidasi apakah perbedaan tersebut signifikan secara statistik atau hanya kebetulan variasi sampel uji (Dietterich, 1998; Alpaydin, 1999). Di samping itu, terdapat keterbatasan ketersediaan platform eksperimen terbuka yang menyatukan manajemen data, perbandingan multi-model, validasi statistik otomatis Uji McNemar, dan pemantauan telemetri komputasi ke dalam satu antarmuka yang transparan dan dapat direproduksi (Wongso et al., 2021). Berdasarkan latar belakang permasalahan tersebut, penelitian ini dirancang dan akan dilaksanakan guna melakukan evaluasi komparatif yang komprehensif serta membangun platform web terintegrasi bernama **Ummu NLP Lab**.

---

## 1.2. Rumusan Masalah

Berdasarkan latar belakang masalah yang telah diuraikan, rumusan masalah dalam penelitian ini dirumuskan sebagai berikut:

1. Bagaimana perbandingan performa klasifikasi sentimen teks berbahasa Indonesia antara model Multinomial Naïve Bayes, Support Vector Machine (SVM), dan IndoBERT pada dataset acuan SmSA IndoNLU?
2. Apakah perbedaan kinerja klasifikasi antar-paradigma model tersebut terbukti signifikan secara statistik inferensial berdasarkan pengujian berpasangan *McNemar Test* pada tingkat signifikansi $\alpha = 0{,}05$?
3. Bagaimana merancang dan mengimplementasikan platform penelitian berbasis web (*Ummu NLP Lab*) yang mampu mengintegrasikan alur eksperimen, pengujian signifikansi statistik otomatis, serta pemantauan sumber daya komputasi secara *real-time*?

---

## 1.3. Batasan Masalah

Guna menjaga fokus penelitian agar tetap terarah dan mendalam pada pokok permasalahan yang telah dirumuskan, ruang lingkup penelitian ini dibatasi pada batasan-batasan berikut:

1. Ruang lingkup dataset penelitian dibatasi pada dataset sekunder *Sentiment Multi-level Sentence Analysis* (SmSA) dari standar acuan nasional IndoNLU sebanyak 12.760 sampel yang terbagi atas data latih (11.000 sampel), data validasi (1.260 sampel), dan data uji (500 sampel) dengan tiga kategori polaritas sentimen: positif, negatif, dan netral (Wilie et al., 2020).
2. Ruang lingkup algoritma klasifikasi dibatasi pada tiga model representatif dari tiga paradigma yang berbeda:
   a. Paradigma probabilistik klasik menggunakan model *Multinomial Naïve Bayes* dengan pembobotan fitur TF-IDF unigram-bigram.
   b. Paradigma geometris klasik menggunakan model *Support Vector Machine* (SVM) kernel linear dengan pembobotan fitur TF-IDF.
   c. Paradigma pembelajaran mendalam Transformer menggunakan model *IndoBERT* varian `indobenchmark/IndoBERT-base-p1`.
3. Ruang lingkup pengujian signifikansi statistik inferensial dibatasi pada uji komparasi berpasangan *McNemar Test* berbasis distribusi binomial eksak pada tingkat signifikansi $\alpha = 0{,}05$.
4. Ruang lingkup pengembangan platform perangkat lunak *Ummu NLP Lab* dibatasi pada arsitektur monolitik web berbasis framework Python Flask, basis data SQLite berarsitektur *Write-Ahead Logging* (WAL), pemrosesan asinkron *background thread*, dan antarmuka *Rose-Pink Glassmorphism*.

---

## 1.4. Tujuan Penelitian

Sejalan dengan rumusan masalah yang telah ditetapkan, tujuan yang hendak dicapai dalam pelaksanaan penelitian ini adalah:

1. Menganalisis, mengukur, dan membandingkan performa empiris model *Multinomial Naïve Bayes*, *Support Vector Machine* (SVM), dan *IndoBERT* pada dataset SmSA IndoNLU menggunakan metrik *Accuracy*, *Precision*, *Recall*, *Weighted F1-Score*, dan *Macro F1-Score*.
2. Membuktikan secara statistik inferensial keabsahan perbedaan performa prediktif antar ketiga paradigma model klasifikasi melalui pengujian hipotesis berpasangan *McNemar Test* pada data uji terisolasi.
3. Merancang, membangun, dan menguji platform berbasis web *Ummu NLP Lab* sebagai lingkungan eksperimen NLP yang terintegrasi, transparan, dan mampu mereproduksi seluruh hasil evaluasi secara mandiri.

---

## 1.5. Manfaat Penelitian

Pelaksanaan penelitian ini diharapkan dapat memberikan kontribusi yang nyata, baik dari dimensi teoretis keilmuan maupun dimensi praktis terapan.

### 1.5.1. Manfaat Teoretis
1. Memberikan kontribusi metodologis baru dalam literatur NLP bahasa Indonesia mengenai pentingnya penerapan uji signifikansi statistik formal dalam menilai superioritas model *Transformer* atas model pembelajaran mesin klasik.
2. Menyediakan analisis komparatif yang komprehensif mengenai interaksi antara karakteristik arsitektur model dengan penanganan ketidakseimbangan kelas pada korpus bahasa Indonesia.

### 1.5.2. Manfaat Praktis
1. Memberikan panduan dan rekomendasi empiris yang terjustifikasi bagi praktisi industri perangkat lunak dalam memilih model klasifikasi teks yang sesuai dengan kebutuhan komputasi dan akurasi.
2. Menyediakan produk artefak platform web *open-source* (*Ummu NLP Lab*) yang dapat dimanfaatkan oleh akademisi dan peneliti sebagai laboratorium penelitian sentimen yang siap pakai dan reproduksibel.

---

## 1.6. Sistematika Penulisan

Penyusunan naskah skripsi ini diorganisasikan ke dalam lima bab utama yang saling terhubung secara runtut dan sistematis:

1. Bab I Pendahuluan, menguraikan latar belakang masalah, perumusan masalah, batasan masalah, tujuan penelitian, manfaat penelitian teoretis dan praktis, serta sistematika penulisan skripsi secara keseluruhan.
2. Bab II Landasan Teori, memuat kajian studi terdahulu yang relevan, analisis kesenjangan penelitian (*research gap*), serta landasan teoretis pemrosesan teks, pembobotan TF-IDF, Naïve Bayes, SVM, Transformer IndoBERT, metrik evaluasi klasifikasi, dan formulasi matematis Uji McNemar.
3. Bab III Analisis dan Perancangan Sistem, menjelaskan lokasi dan jadwal penelitian, spesifikasi lingkungan komputasi, kerangka konseptual alur penelitian 11 tahap, perancangan basis data SQLite WAL, arsitektur REST API, flowchart sistem asinkron, perancangan antarmuka *Rose-Pink Glassmorphism*, serta rencana pengujian sistem.
4. Bab IV Implementasi dan Pembahasan, menyajikan hasil analisis deskriptif dataset SmSA, hasil penalaan hiperparameter, dokumentasi 13 modul antarmuka web app Ummu NLP Lab, analisis Uji McNemar, evaluasi *Confusion Matrix* kelas minoritas netral, validasi konsistensi, dan telemetri server.
5. Bab V Kesimpulan dan Saran, menyajikan sintesis kesimpulan akhir yang menjawab rumusan masalah berdasarkan bukti empiris eksperimen, disertai saran konstruktif untuk pengembangan penelitian NLP bahasa Indonesia di masa mendatang.
6. Bagian Akhir, memuat Daftar Pustaka yang disusun berdasarkan format standar APA Style serta Lampiran pendukung transparansi dan reproduksibilitas riset.

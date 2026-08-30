# BAB V
# KESIMPULAN DAN SARAN

## 5.1. Kesimpulan

Berdasarkan hasil analisis, pengujian sistem, dan pembahasan eksperimen komparatif klasifikasi sentimen tiga kelas pada dataset *Sentiment Multi-level Sentence Analysis* (SmSA) dari standar acuan IndoNLU (Wilie et al., 2020), maka diperoleh beberapa kesimpulan utama sebagai berikut:

1. Perbandingan Kinerja Komparatif Antar Paradigma Model
   Model pembelajaran mendalam berbasis arsitektur *Transformer*, yaitu **IndoBERT** (`indobenchmark/IndoBERT-base-p1`), terbukti menghasilkan performa klasifikasi terbaik di seluruh metrik evaluasi dengan perolehan **Akurasi sebesar 88,60%** dan **Macro F1-Score sebesar 83,77%** pada data uji terisolasi (500 sampel). Di posisi kedua, model pembelajaran mesin geometris **Support Vector Machine (SVM) Linear** menghasilkan kinerja yang stabil dan tangguh dengan **Akurasi sebesar 76,20%** dan **Macro F1-Score sebesar 71,68%**. Sementara itu, model probabilistik **Multinomial Naïve Bayes** berada di posisi terbawah dengan perolehan **Akurasi sebesar 66,00%** dan **Macro F1-Score sebesar 60,99%**. Temuan ini membuktikan secara empiris bahwa pemodelan representasi kontekstual dwiarah menawarkan keunggulan diskriminasi semantik yang jauh melampaui paradigma ekstraksi fitur statistik frekuensi kata tradisional (Devlin et al., 2019; Joachims, 1998).

2. Validasi Signifikansi Statistik Inferensial (Uji McNemar)
   Berdasarkan validasi statistik inferensial formal menggunakan metode berpasangan non-parametrik *McNemar Test* pada tingkat signifikansi $\alpha = 0{,}05$, seluruh perbandingan kinerja antar model terbukti **signifikan secara statistik** ($p < 0{,}05$):
   a. Perbandingan antara SVM Linear vs Naïve Bayes menghasilkan nilai $p = 3{,}3216 \times 10^{-8}$ ($0{,}0000000332$, Signifikan, $p < 0{,}05$).
   b. Perbandingan antara IndoBERT vs SVM Linear menghasilkan nilai $p = 9{,}9415 \times 10^{-11}$ ($0{,}0000000000994$, Signifikan, $p < 0{,}05$).
   c. Perbandingan antara IndoBERT vs Naïve Bayes menghasilkan nilai $p = 9{,}6596 \times 10^{-23}$ (Sangat Signifikan, $p < 0{,}05$).
   Bukti statistik inferensial ini menegaskan bahwa keunggulan model IndoBERT atas SVM dan Naïve Bayes bukanlah artefak kebetulan acak dari variasi pembagian data uji (*random test split sampling*), melainkan mencerminkan superioritas kapasitas pemodelan bahasa yang nyata dan dapat dipertanggungjawabkan secara ilmiah (Dietterich, 1998; Alpaydin, 1999).

3. Ketahanan Menghadapi Ketidakseimbangan Kelas Minoritas Netral
   Ketidakseimbangan kelas pada dataset SmSA (di mana kelas netral hanya mencakup 10,72% dari total populasi) menjadi penguji ketahanan utama bagi masing-masing arsitektur. Model Naïve Bayes mengalami kegagalan sistematis dalam mendeteksi kelas netral dengan nilai *Recall* hanya 37,50% dan *F1-Score* sebesar **46,48%** akibat bias probabilitas prior ke arah kelas mayoritas. Model SVM Linear mampu meningkatkan *F1-Score* kelas netral menjadi **55,56%** (Recall 45,45%) berkat pembentukan bidang pemisah ber-margin optimal. Sementara itu, model IndoBERT membuktikan ketangguhan luar biasa dengan meraih *Precision* sempurna 100,00%, *Recall* 51,14%, dan *F1-Score* kelas netral sebesar **67,67%**, menegaskan bahwa representasi semantik hasil prapelatihan mampu mengompensasi keterbatasan kuantitas data latih pada kelas minoritas (Japkowicz & Shah, 2011; Wilie et al., 2020).

4. Kesesuaian Strategi Preprocessing terhadap Arsitektur Model
   Hasil eksperimen membuktikan bahwa perbedaan karakteristik arsitektur model menuntut penerapan strategi prapemrosesan (*preprocessing*) yang kontras. Model klasik (SVM dan Naïve Bayes) mutlak memerlukan *preprocessing* eksplisit lengkap—meliputi *case folding*, pembersihan derau, normalisasi kata slang, dan pembuangan *stopwords* selektif—guna mereduksi dimensionalitas fitur TF-IDF dan mencegah kejarangan matriks (*sparsity*). Sebaliknya, arsitektur IndoBERT memerlukan *preprocessing* minimalis yang mempertahankan *stopwords*, tanda baca, dan urutan kata asli agar mekanisme *Self-Attention* dapat mengekstrak relasi konteks dwiarah secara utuh (Devlin et al., 2019; Vaswani et al., 2017).

5. Implementasi Sistem dan Reproduksibilitas Platform Web Ummu NLP Lab
   Seluruh siklus hidup penelitian berhasil diimplementasikan ke dalam artefak platform penelitian berbasis web bernama **Ummu NLP Lab** yang mengintegrasikan ketiga model klasifikasi, modul Uji McNemar otomatis, serta pemantauan telemetri beban server. Hasil pengujian konsistensi menunjukkan bahwa sistem web menghasilkan nilai metrik performa yang identik 100% (selisih 0,00%) dengan hasil komputasi *notebook* laboratorium, membuktikan keberhasilan platform dalam menjamin transparansi, *auditability*, dan reproduksibilitas eksperimen NLP bahasa Indonesia (Wongso et al., 2021).

---

## 5.2. Saran

Berdasarkan evaluasi terhadap temuan eksperimen serta batasan operasional yang dijumpai dalam penelitian ini, beberapa rekomendasi dan saran konstruktif untuk pengembangan penelitian selanjutnya diuraikan sebagai berikut:

1. Penerapan teknik penyeimbangan data (*data balancing*) seperti *Synthetic Minority Over-sampling Technique* (SMOTE) tekstual maupun penyesuaian bobot penalti kelas (*class weight penalty*) disarankan untuk dieksplorasi pada penelitian selanjutnya guna mendongkrak sensitivitas model klasik pada kelas minoritas netral (Chawla et al., 2002; Japkowicz & Shah, 2011).
2. Eksplorasi metode optimasi hiperparameter lanjutan seperti *Bayesian Optimization* menggunakan *Tree-structured Parzen Estimator* (TPE) disarankan untuk memperluas ruang penalaan parameter *Transformer*, termasuk penyesuaian *warmup ratio*, *weight decay*, dan penjadwalan laju pembelajaran (Bergstra & Bengio, 2012).
3. Pengujian daya generalisasi model pada domain spesifik lainnya seperti korpus rekam medis, dokumen putusan hukum, ulasan politik formal, atau ujaran media sosial bersarkasme tinggi disarankan guna menguji keandalan arsitektur di berbagai ranah aplikasi praktis (Liu, 2015; Koto et al., 2020).
4. Eksplorasi arsitektur *Transformer* berskala besar (*IndoBERT-Large*, *IndoRoBERTa*) dan adaptasi *Large Language Models* (LLM) seperti LLaMA-3 atau Mistral menggunakan teknik *Parameter-Efficient Fine-Tuning* (PEFT) seperti LoRA disarankan untuk diteliti lebih lanjut (Devlin et al., 2019; Wilie et al., 2020).
5. Pengembangan fitur lanjutan pada platform web Ummu NLP Lab disarankan mencakup penambahan modul *Explainable AI* (XAI) berbasis SHAP atau LIME untuk transparansi keputusan model, serta penyediaan *Public REST API* terotentikasi guna melayani inferensi berskala luas secara *real-time* (Wongso et al., 2021).

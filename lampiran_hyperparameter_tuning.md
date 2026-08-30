# LAMPIRAN: KODE SUMBER PENALAAN HIPERPARAMETER (JUPYTER NOTEBOOK)

Dokumen lampiran ini memuat kode sumber (*source code*) khusus untuk proses **Penalaan Hiperparameter (*Hyperparameter Tuning*)** yang digunakan pada Jupyter Notebook eksperimen. Setiap blok kode dijelaskan secara rinci untuk memberikan transparansi metodologi ilmiah yang diterapkan.

Tuning parameter dilakukan menggunakan metode **Grid Search** pada data validasi (*validation set*) untuk mengoptimalkan kinerja *Multinomial Naïve Bayes*, *Support Vector Machine* (SVM), dan *IndoBERT* berdasarkan nilai *Macro F1-Score*.

---

## 1. Penalaan Hiperparameter Model Klasik (`tune_classical_models`)

Fungsi `tune_classical_models` mengotomatisasi pencarian parameter terbaik untuk model Naïve Bayes dan SVM menggunakan pustaka Scikit-Learn.

### Snippet 1.1: Kode Sumber Penalaan Model Klasik
```python
def tune_classical_models(X_train, X_val, y_train, y_val):
    print("=== HYPERPARAMETER TUNING: CLASSICAL MODELS ===\n")

    # 1. Ekstraksi Fitur TF-IDF pada Data Latih & Validasi
    min_df_val = 5 if len(X_train) >= 25 else 1
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=min_df_val)
    X_train_vec = vectorizer.fit_transform(X_train)
    X_val_vec = vectorizer.transform(X_val)

    # 2. Penalaan Model Naïve Bayes
    nb_grid = {'alpha': [0.1, 0.5, 1.0, 1.5, 2.0]}
    best_nb_f1 = -1
    best_nb_params = None
    nb_results = []

    for g in ParameterGrid(nb_grid):
        model = MultinomialNB(alpha=g['alpha'])
        model.fit(X_train_vec, y_train)
        y_pred = model.predict(X_val_vec)
        metrics = calculate_metrics(y_val, y_pred)
        f1 = metrics['macro_f1']
        nb_results.append({"alpha": g['alpha'], "macro_f1": f1})
        if f1 > best_nb_f1:
            best_nb_f1 = f1
            best_nb_params = g

    print("[Hasil Tuning Naive Bayes]")
    print(pd.DataFrame(nb_results).to_string(index=False))
    print(f'-> Parameter Terbaik NB: {best_nb_params} | Macro F1: {best_nb_f1:.2%}\n')

    # 3. Penalaan Model SVM
    svm_grid = {
        'C': [0.1, 1.0, 10.0],
        'kernel': ['linear', 'rbf'],
        'gamma': ['scale', 'auto']
    }
    best_svm_f1 = -1
    best_svm_params = None
    svm_results = []

    for g in ParameterGrid(svm_grid):
        model = SVC(C=g['C'], kernel=g['kernel'], gamma=g['gamma'])
        model.fit(X_train_vec, y_train)
        y_pred = model.predict(X_val_vec)
        metrics = calculate_metrics(y_val, y_pred)
        f1 = metrics['macro_f1']
        svm_results.append({
            "C": g['C'], "kernel": g['kernel'], "gamma": g['gamma'], "macro_f1": f1
        })
        if f1 > best_svm_f1:
            best_svm_f1 = f1
            best_svm_params = g

    print("[Hasil Tuning SVM]")
    print(pd.DataFrame(svm_results).to_string(index=False))
    print(f'-> Parameter Terbaik SVM: {best_svm_params} | Macro F1: {best_svm_f1:.2%}\n')

    return {
        "naive_bayes": best_nb_params,
        "svm": best_svm_params
    }
```

### Penjelasan Detail Blok Kode:
1.  **Ekstraksi Fitur TF-IDF (`TfidfVectorizer`)**:
    *   `ngram_range=(1, 2)`: Mengekstrak kombinasi kata tunggal (*unigram*) dan pasangan kata berurutan (*bigram*) untuk menangkap frasa sentimen seperti "tidak bagus".
    *   `min_df=min_df_val`: Menyaring kata yang muncul kurang dari 5 kali di seluruh dokumen untuk mengabaikan kata salah tik (*typo*) dan mengurangi dimensi fitur.
2.  **Perulangan Grid Search Naïve Bayes (`ParameterGrid(nb_grid)`)**:
    *   Melakukan iterasi untuk nilai parameter smoothing *alpha* $\alpha \in \{0.1, 0.5, 1.0, 1.5, 2.0\}$.
    *   Model dilatih pada data latih vektor (`X_train_vec`) dan dievaluasi pada data validasi (`X_val_vec`) menggunakan metrik `macro_f1` (nilai F1 rata-rata makro).
    *   Jika F1-score hasil iterasi lebih besar dari `best_nb_f1`, status parameter terbaik diperbarui.
3.  **Perulangan Grid Search SVM (`ParameterGrid(svm_grid)`)**:
    *   Menguji kombinasi dari tiga hyperparameter utama:
        *   `C` (Regularisasi): Mengatur keseimbangan antara batas klasifikasi lebar dengan minimalisasi kesalahan latihan ($C \in \{0.1, 1.0, 10.0\}$).
        *   `kernel` (Fungsi Kernel): Memetakan data ke dimensi lebih tinggi menggunakan kernel `linear` atau `rbf` (Radial Basis Function).
        *   `gamma` (Koefisien Kernel RBF): Mengatur jangkauan pengaruh satu data latih (`scale` atau `auto`).
    *   Total terdapat $3 \times 2 \times 2 = 12$ kombinasi parameter yang dilatih dan diuji satu per satu.
4.  **Output Penalaan**:
    *   Menampilkan ringkasan seluruh hasil iterasi dalam format Pandas DataFrame untuk memudahkan analisis perbandingan.
    *   Mereturn dictionary berisi parameter terbaik yang siap digunakan untuk melatih model final.

---

## 2. Penalaan Hiperparameter Model Deep Learning (`tune_bert_model`)

Fungsi `tune_bert_model` melatih dan mengevaluasi arsitektur IndoBERT PyTorch secara iteratif pada GPU untuk mencari kombinasi *learning rate* dan *batch size* yang paling optimal.

### Snippet 2.1: Kode Sumber Penalaan Model IndoBERT
```python
def tune_bert_model(X_train, X_val, y_train, y_val):
    print("=== HYPERPARAMETER TUNING: INDOBERT ===\n")

    bert_grid = {
        'learning_rate': [2e-5, 5e-5],
        'batch_size': [8, 16]
    }
    classes = sorted(list(set(y_train + y_val)))
    label_map = {name: i for i, name in enumerate(classes)}
    inv_label_map = {i: name for name, i in label_map.items()}
    num_labels = len(classes)
    model_name = "indobenchmark/indobert-base-p1"

    best_f1 = -1
    best_params = None
    results = []

    for g in ParameterGrid(bert_grid):
        # Mengunci benih acak untuk menjamin replikabilitas antar-kombinasi
        set_seed(42)

        print(f"Menguji Parameter: LR={g['learning_rate']} | Batch Size={g['batch_size']}")
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForSequenceClassification.from_pretrained(
            model_name, num_labels=num_labels, ignore_mismatched_sizes=True
        )
        model.to(DEVICE)

        # Inisialisasi Loader Data sesuai Kombinasi Batch Size
        train_dataset = IndonesianTextDataset(X_train, y_train, tokenizer, 128, label_map)
        eval_dataset = IndonesianTextDataset(X_val, y_val, tokenizer, 128, label_map)
        train_loader = DataLoader(train_dataset, batch_size=g['batch_size'], shuffle=True)
        eval_loader = DataLoader(eval_dataset, batch_size=g['batch_size'])

        optimizer = AdamW(model.parameters(), lr=g['learning_rate'])

        # Pelatihan Singkat (2 Epoch) untuk Evaluasi Kecepatan Konvergensi
        for epoch in range(2):
            model.train()
            for batch in train_loader:
                optimizer.zero_grad()
                input_ids = batch['input_ids'].to(DEVICE)
                attention_mask = batch['attention_mask'].to(DEVICE)
                targets = batch['label'].to(DEVICE)
                outputs = model(input_ids=input_ids, attention_mask=attention_mask, labels=targets)
                loss = outputs.loss
                loss.backward()
                optimizer.step()

        # Evaluasi pada Data Validasi
        model.eval()
        y_pred_idx = []
        with torch.no_grad():
            for batch in eval_loader:
                input_ids = batch['input_ids'].to(DEVICE)
                attention_mask = batch['attention_mask'].to(DEVICE)
                outputs = model(input_ids=input_ids, attention_mask=attention_mask)
                preds = torch.argmax(outputs.logits, dim=1)
                y_pred_idx.extend(preds.cpu().tolist())

        y_pred = [inv_label_map[idx] for idx in y_pred_idx]
        metrics = calculate_metrics(y_val, y_pred)
        f1 = metrics['macro_f1']
        results.append({
            "learning_rate": g['learning_rate'],
            "batch_size": g['batch_size'],
            "macro_f1": f1
        })
        if f1 > best_f1:
            best_f1 = f1
            best_params = g

    print(f'\n[Hasil Tuning IndoBERT]')
    print(pd.DataFrame(results).to_string(index=False))
    print(f'-> Parameter Terbaik IndoBERT: {best_params} | Macro F1: {best_f1:.2%}\n')
    return best_params
```

### Penjelasan Detail Blok Kode:
1.  **Parameter Grid Search IndoBERT**:
    *   Menguji kombinasi laju pembelajaran (*learning rate*) dan ukuran tumpukan data latih (*batch size*):
        *   `learning_rate`: $\{2\times 10^{-5}, 5\times 10^{-5}\}$ (Nilai standar stabilitas gradien AdamW pada model bahasa BERT).
        *   `batch_size`: $\{8, 16\}$ (Disesuaikan dengan batas kapasitas VRAM GPU T4/L4 agar tidak memicu error *Out of Memory*).
2.  **Penguncian Seed (`set_seed(42)`)**:
    *   Setiap kali memulai loop parameter baru, generator acak PyTorch, NumPy, dan Python direset ke benih acak 42. Hal ini wajib dilakukan agar inisialisasi bobot *classifier head* baru dan pengocokan data latih di setiap kombinasi berjalan identik, menjamin hasil komparasi parameter bersifat adil dan tidak bias.
3.  **Pelatihan Terbatas (2 Epoch)**:
    *   Pelatihan tuning dibatasi sebanyak 2 epoch untuk menghemat waktu komputasi riset. Kombinasi parameter dengan kemampuan konvergensi tercepat pada data validasi akan terpilih sebagai konfigurasi terbaik.
4.  **Evaluasi Non-Gradien (`torch.no_grad()`)**:
    *   Loop evaluasi validasi dinonaktifkan alur kalkulasi gradiennya (`torch.no_grad`) guna menghemat konsumsi memori VRAM GPU dan melipatgandakan kecepatan inferensi model.

---

## 3. Blok Kode Pemicu Penalaan Hiperparameter

Blok kode ini merupakan sel pemicu utama di dalam Jupyter Notebook untuk memulai proses penalaan pada ketiga model sebelum model final dilatih.

### Snippet 3.1: Eksekusi Grid Search
```python
# 1. Jalankan Hyperparameter Tuning menggunakan data validasi
best_classical_params = tune_classical_models(X_train, X_valid, y_train, y_valid)
best_bert_params = tune_bert_model(X_train, X_valid, y_train, y_valid)
```

### Penjelasan Detail Blok Kode:
*   Fungsi tuning dipanggil dengan melewatkan set pelatihan (`X_train`, `y_train`) dan set validasi (`X_valid`, `y_valid`). Set validasi berperan sebagai data buta sementara untuk menguji generalisasi model sebelum model final dihadapkan pada set pengujian asli (*test set*).
*   Hasil pencarian disimpan ke dalam variabel `best_classical_params` (berisi alpha untuk NB dan C/kernel/gamma untuk SVM) serta `best_bert_params` (berisi learning rate dan batch size untuk IndoBERT) untuk diteruskan langsung ke pemanggilan fungsi pelatihan model final.

# LAMPIRAN: KODE SUMBER UTAMA APLIKASI WEB (UMMU NLP LAB)

Dokumen lampiran ini menyajikan analisis mendalam dan penjelasan lengkap untuk setiap blok kode (*code block*) pada modul-modul utama backend aplikasi web **Ummu NLP Lab**. 

Repository penuh kode sumber aplikasi ini dapat diakses secara terbuka melalui link GitHub berikut:
👉 **[GitHub Repository: nlp-experiment-lab](https://github.com/ummulfarihah/nlp-experiment-lab)**

---

## 1. Modul Preprocessing & Klasifikasi Klasik (`ml_engine.py`)

Modul `ml_engine.py` bertindak sebagai mesin utama untuk memproses teks ulasan (klasikal) dan melatih model statistika tradisional (*Multinomial Naive Bayes* dan *Support Vector Machine*).

### Blok Kode 1.1: Pemrosesan Teks Langkah-demi-Langkah (`preprocess_text_step_by_step`)
```python
def preprocess_text_step_by_step(text):
    """Applies pipeline steps and returns intermediate texts for UI visualization."""
    # Step 1: Case Folding & Noise Removal (HTML & URL)
    case_folded = text.lower()
    clean_text = re.sub(r'<[^>]+>', '', case_folded)
    clean_text = re.sub(r'https?://\S+|www\.\S+', '', clean_text)
    
    # Step 2: Tokenization & Slang Normalization
    tokens = re.findall(r'\b[a-zA-Z0-9]+\b', clean_text)
    normalized_tokens = [SLANG_WORDS_DICT.get(tok, tok) for tok in tokens]
    
    # Step 3: Stopword Removal (Selective)
    filtered_tokens = [tok for tok in normalized_tokens if tok not in INDONESIAN_STOPWORDS]
    
    # Final processed text (no stemming)
    processed_text = " ".join(filtered_tokens)
    
    return {
        "raw": text,
        "case_folded": case_folded,
        "tokens": normalized_tokens,
        "filtered_tokens": filtered_tokens,
        "processed": processed_text
    }
```
*   **Fungsi**: Memecah kalimat ulasan menjadi struktur bertahap agar hasilnya dapat divisualisasikan secara *real-time* di terminal preprocessing UI.
*   **Penjelasan Blok**:
    *   **Case Fold & HTML/URL Cleaning**: Mengonversi teks ke huruf kecil dan menghapus noise (tag HTML, URL link) agar representasi kata seragam.
    *   **Tokenization & Slang Dictionary Lookup**: Memotong kalimat menjadi token alfanumerik dan mengganti istilah gaul/singkatan menjadi kata baku (contoh: "dgn" -> "dengan").
    *   **Stopword Filter**: Menghilangkan kata bantu non-sentimen. Proses *stemming* (Sastrawi) ditiadakan agar makna dasar kata emotif tetap terjaga.

### Blok Kode 1.2: Pemrosesan Teks Cepat (`preprocess_text`)
```python
def preprocess_text(text):
    """Fast, single-step preprocessor returning the final cleaned text."""
    text = text.lower()
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    tokens = re.findall(r'\b[a-zA-Z0-9]+\b', text)
    cleaned = []
    for tok in tokens:
        norm_tok = SLANG_WORDS_DICT.get(tok, tok)
        if norm_tok not in INDONESIAN_STOPWORDS:
            cleaned.append(norm_tok)
    return " ".join(cleaned)
```
*   **Fungsi**: Digunakan oleh modul training SVM/Naive Bayes dan Prediction Lab untuk mempercepat proses transformasi data ulasan skala besar menjadi string bersih.

### Blok Kode 1.3: Audit & Hashing Dataset (`compute_dataset_hash` & `analyze_dataset_file`)
```python
def compute_dataset_hash(filepath):
    """Calculates the SHA256 hash of a file for experiment auditing."""
    sha256 = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while chunk := f.read(8192):
            sha256.update(chunk)
    return sha256.hexdigest()

def analyze_dataset_file(filepath):
    """Analyzes CSV dataset and returns sample count, distribution, and preview."""
    df = pd.read_csv(filepath)
    if 'text' not in df.columns or 'label' not in df.columns:
        raise ValueError("Dataset CSV must contain 'text' and 'label' columns.")
    total_samples = len(df)
    dist = df['label'].value_counts().to_dict()
    class_distribution = {str(k): int(v) for k, v in dist.items()}
    preview = df.head(10).fillna('').to_dict(orient='records')
    return total_samples, class_distribution, preview
```
*   **Fungsi**: Melakukan audit integritas berkas ulasan terunggah.
*   **Penjelasan Blok**:
    *   `compute_dataset_hash`: Menghasikan *checksum* SHA-256 berkas CSV untuk mengunci keabsahan berkas riset.
    *   `analyze_dataset_file`: Menguji ketersediaan kolom `text` dan `label`, menghitung jumlah sampel, sebaran kelas sentimen untuk visualisasi donut chart, serta menyusun 10 baris pertama sebagai pratinjau data.

### Blok Kode 1.4: Kalkulasi Metrik Evaluasi (`calculate_metrics`)
```python
def calculate_metrics(y_true, y_pred):
    """Calculates standard classification metrics."""
    acc = accuracy_score(y_true, y_pred)
    precision, recall, f1, support = precision_recall_fscore_support(
        y_true, y_pred, average='macro', zero_division=0
    )
    report = classification_report(y_true, y_pred, output_dict=True, zero_division=0)
    matrix = confusion_matrix(y_true, y_pred).tolist()
    
    per_class_metrics = {}
    for cls in report.keys():
        if cls not in ['accuracy', 'macro avg', 'weighted avg']:
            per_class_metrics[cls] = {
                "precision": float(report[cls]["precision"]),
                "recall": float(report[cls]["recall"]),
                "f1-score": float(report[cls]["f1-score"]),
                "support": int(report[cls]["support"])
            }
            
    return {
        "accuracy": float(acc),
        "precision": float(precision),
        "recall": float(recall),
        "macro_f1": float(f1),
        "per_class_metrics": per_class_metrics,
        "confusion_matrix": matrix,
        "classification_report": report
    }
```
*   **Fungsi**: Menghitung seluruh parameter keberhasilan pengujian model klasifikasi.
*   **Penjelasan Blok**: Menghitung nilai akurasi global dan melakukan rata-rata makro (*macro average*) untuk presisi, recall, dan F1-score guna mengantisipasi bias pada ketidakseimbangan sebaran kelas data (*unbalanced dataset*). Metrik per-kelas disimpan untuk keperluan visualisasi dasbor.

### Blok Kode 1.5: Pelatihan Model Klasik (`train_classical_model`)
```python
def train_classical_model(dataset_path, model_type, params, job_id, update_progress_fn=None, test_dataset_path=None, test_size=0.2):
    """Loads dataset, preprocesses text, splits (dynamic or external test), 
    extracts TF-IDF, trains Naive Bayes or SVM, evaluates and returns metrics."""
    df = pd.read_csv(dataset_path)
    texts = df['text'].astype(str).tolist()
    labels = df['label'].astype(str).tolist()
    
    # Pembersihan seluruh ulasan primer
    preprocessed_texts = [preprocess_text(t) for t in texts]
    
    # Penentuan split data (Uji Eksternal vs Pemisahan Latih-Uji Acak)
    if test_dataset_path:
        test_df = pd.read_csv(test_dataset_path)
        test_texts = test_df['text'].astype(str).tolist()
        y_test = test_df['label'].astype(str).tolist()
        X_train = preprocessed_texts
        y_train = labels
        X_test = [preprocess_text(t) for t in test_texts]
    else:
        # Split latih-uji dengan stratifikasi kelas untuk menjaga kestabilan
        stratify_param = labels if len(set(labels)) > 1 else None
        X_train, X_test, y_train, y_test = train_test_split(
            preprocessed_texts, labels, test_size=test_size, random_state=42, stratify=stratify_param
        )
    
    # Vektorisasi TF-IDF Unigram & Bigram
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=5)
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)
    
    # Pemilihan Algoritma Model
    if model_type == 'naive_bayes':
        alpha = float(params.get('alpha', 1.0))
        model = MultinomialNB(alpha=alpha)
    elif model_type == 'svm':
        kernel = params.get('kernel', 'linear')
        C = float(params.get('C', 1.0))
        gamma = params.get('gamma', 'scale')
        model = SVC(kernel=kernel, C=C, gamma=gamma, probability=True)
        
    model.fit(X_train_vec, y_train)
    y_pred = model.predict(X_test_vec).tolist()
    
    # Kalkulasi Metrik Akhir
    eval_results = calculate_metrics(y_test, y_pred)
    eval_results["y_test"] = y_test
    eval_results["y_pred"] = y_pred
    
    return model, vectorizer, eval_results
```
*   **Fungsi**: Memisahkan partisi ulasan, mengekstraksi bobot TF-IDF unigram & bigram, menyaring kosa kata langka (*min_df=5*), mencocokkan tipe model, mengeksekusi pelatihan, dan mereturn performa evaluasi.

---

## 2. Modul Deep Learning & Representasi Token (`bert_engine.py`)

Modul `bert_engine.py` mengintegrasikan pelatihan deep learning berbasis IndoBERT PyTorch, WordPiece tokenization, serta representasi token visual.

### Blok Kode 2.1: PyTorch Custom Dataset (`IndonesianTextDataset`)
```python
class IndonesianTextDataset(Dataset):
    """Custom PyTorch Dataset for IndoBERT training."""
    def __init__(self, texts, labels, tokenizer, max_length, label_map):
        self.texts = texts
        self.labels = [label_map[l] for l in labels]
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        text = str(self.texts[idx])
        label = self.labels[idx]
        
        encoding = self.tokenizer(
            text,
            add_special_tokens=True,
            max_length=self.max_length,
            padding='max_length',
            truncation=True,
            return_attention_mask=True,
            return_tensors='pt'
        )
        
        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'label': torch.tensor(label, dtype=torch.long)
        }
```
*   **Fungsi**: Menyuplai struktur data tensor untuk iterator DataLoader PyTorch.
*   **Penjelasan Blok**: Memetakan string ulasan menjadi sequence tensor indeks kosa kata (*input_ids*) dan tensor biner penanda padding (*attention_mask*), serta memotong/memperpanjang kalimat ulasan ke batas *max_length* secara otomatis menggunakan tokenizer.

### Blok Kode 2.2: Pra-pengolahan Khusus BERT (`preprocess_text_minimal`)
```python
def preprocess_text_minimal(text):
    """Applies text_minimal preprocessing: Case folding, noise removal, slang normalization.
    Stopwords are preserved for IndoBERT. Identical to notebook implementation."""
    import re
    text = str(text).lower()
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    
    tokens = re.findall(r'\b[a-zA-Z0-9]+\b', text)
    from ml_engine import SLANG_WORDS_DICT
    cleaned = [SLANG_WORDS_DICT.get(tok, tok) for tok in tokens]
    return " ".join(cleaned)
```
*   **Fungsi**: Membersihkan teks untuk model IndoBERT. Berbeda dengan model klasik, seluruh kata hubung (*stopword*) tetap dipertahankan karena arsitektur Transformer membutuhkan relasi antar-kata utuh untuk menangkap makna konteks semantik secara mendalam.

### Blok Kode 2.3: Pelatihan IndoBERT (`train_bert_model`)
```python
def train_bert_model(dataset_path, params, job_id, update_progress_fn=None, log_event_fn=None, test_dataset_path=None, val_dataset_path=None, test_size=0.2):
    # Strict GPU check
    if not HAS_TORCH_TRANSFORMERS or DEVICE == "cpu" or str(DEVICE) == "cpu":
        raise RuntimeError("Pelatihan IndoBERT tidak dapat dilakukan di Aplikasi Web karena GPU (CUDA) tidak terdeteksi oleh PyTorch. Harap aktifkan akselerasi GPU (T4 GPU) pada Google Colab.")
    
    # Inisialisasi model klasifikasi dan optimizer AdamW
    model = BertForSequenceClassification.from_pretrained(model_name, num_labels=num_labels)
    model.to(DEVICE)
    optimizer = AdamW(model.parameters(), lr=lr)
    
    # Loop pelatihan per epoch
    for epoch in range(epochs):
        model.train()
        for step, batch in enumerate(train_loader):
            optimizer.zero_grad()
            input_ids = batch['input_ids'].to(DEVICE)
            attention_mask = batch['attention_mask'].to(DEVICE)
            targets = batch['label'].to(DEVICE)
            
            outputs = model(input_ids=input_ids, attention_mask=attention_mask, labels=targets)
            loss = outputs.loss
            loss.backward()
            optimizer.step()
            
        # [Save & Restore RNG States untuk isolasi epoch evaluasi ...]
        
    model_package = {
        "model_type": "indobert",
        "classes": classes,
        "params": params
    }
    # [Serialisasi model_package ke berkas .pkl ...]
```
*   **Fungsi**: Memuat arsitektur pretrained, mengeksekusi pelatihan PyTorch di GPU, mengukur loss gradien, serta menyusun paket metadata evaluasi model yang disimpan ke dalam berkas `.pkl` untuk leaderboard dan database.

### Blok Kode 2.4: Terminal Visual Preprocessing BERT (`preprocess_bert_step_by_step`)
```python
def preprocess_bert_step_by_step(text):
    raw_text = text
    normalized = preprocess_text_minimal(text)
    
    tokenizer = get_bert_tokenizer()
    tokens = tokenizer.tokenize(normalized)
    tokens = ['[CLS]'] + tokens + ['[SEP]']
    token_ids = tokenizer.convert_tokens_to_ids(tokens)
    attention_mask = [1] * len(tokens)
    
    # Padding ke batas maksimal panjang representasi visual (32)
    max_length = 32
    padding_needed = max_length - len(tokens)
    padded_tokens = list(tokens) + ['[PAD]'] * padding_needed
    padded_token_ids = list(token_ids) + [0] * padding_needed
    padded_attention_mask = list(attention_mask) + [0] * padding_needed
    
    return {
        "raw": raw_text,
        "normalized": normalized,
        "tokens": tokens,
        "token_ids": token_ids,
        "attention_mask": attention_mask,
        "padded_tokens": padded_tokens,
        "padded_token_ids": padded_token_ids,
        "padded_attention_mask": padded_attention_mask
    }
```
*   **Fungsi**: Memotong kata menjadi sub-token WordPiece, menghasilkan daftar kosa kata ID numerik, menyusun masker atensi, serta melakukan padding dinamis yang dikirim sebagai respons API visualisasi antarmuka.

---

## 3. Modul Threading Latar Belakang (`task_manager.py`)

Modul `task_manager.py` mengatur jalannya pelatihan asinkron di server Flask agar antarmuka web tetap interaktif tanpa terpengaruh oleh lamanya proses kalkulasi model.

### Blok Kode 3.1: Peluncuran Thread Pekerja Asinkron (`start_training_job_async`)
```python
ACTIVE_JOBS = {}
_registry_lock = threading.Lock()

def start_training_job_async(job_id, dataset_path, model_type, params):
    """Launches model training on a background thread."""
    cancel_event = threading.Event()
    
    with _registry_lock:
        ACTIVE_JOBS[job_id] = cancel_event
        
    thread = threading.Thread(
        target=_training_job_worker,
        args=(job_id, dataset_path, model_type, params, cancel_event),
        name=f"TrainingWorker-Job-{job_id}"
    )
    thread.daemon = True
    thread.start()
    return thread.ident
```
*   **Fungsi**: Memulai alur kerja thread baru di latar belakang.
*   **Penjelasan Blok**: Membuat objek sinyal interupsi `threading.Event()`, mendaftarkannya secara *thread-safe* menggunakan mutex `_registry_lock` ke dalam kamus `ACTIVE_JOBS`, kemudian melahirkan thread pekerja (`threading.Thread`) bertipe daemon agar otomatis mati jika server web dimatikan.

### Blok Kode 3.2: Alur Siklus Hidup Pekerjaan Training (`_training_job_worker`)
```python
def _training_job_worker(job_id, dataset_path, model_type, params, cancel_event):
    dataset_path = resolve_db_path(dataset_path)
    start_time = time.time()
    
    # Callback pemeriksa sinyal batal
    def check_cancellation(progress_pct, step_name):
        if cancel_event.is_set():
            update_job_progress(job_id, progress_pct, "Cancelled")
            raise RuntimeError(f"Job {job_id} cancelled by user request.")
            
    try:
        update_job_progress(job_id, 0, "Preparing")
        # [Penetapan parameter, pemisahan dataset latih/uji ...]
        
        if model_type in ['naive_bayes', 'svm']:
            # Pelatihan klasik SVM / Naive Bayes
            model, vectorizer, eval_results = train_classical_model(...)
            # [Penyimpanan biner model ke berkas .pkl ...]
            
        elif model_type == 'indobert':
            # Pelatihan deep learning IndoBERT
            results = train_bert_model(...)
            eval_results = results["eval_results"]
            
        # Simpan metrik hasil evaluasi dan data prediksi McNemar ke database SQLite
        save_job_evaluation(job_id, eval_results)
        update_job_progress(job_id, 100, "Completed")
        
    except Exception as e:
        db_log_event(job_id, "ERROR", "JOB_FAILED", str(e))
        update_job_progress(job_id, None, "Failed")
        
    finally:
        with _registry_lock:
            ACTIVE_JOBS.pop(job_id, None)
```
*   **Fungsi**: Titik masuk logis untuk thread latar belakang. Mengawal alur kerja dari inisiasi status `Preparing`, kalkulasi epoch latihan, penanganan pembatalan lewat `check_cancellation`, penulisan hasil metrik evaluasi ke tabel database SQLite, hingga pelepasan sumber daya thread di akhir eksekusi.

---

## 4. Konfigurasi Database & Orkestrasi Web Server (`app.py`)

Modul `app.py` mengonfigurasi jalur transaksi database SQLite secara konkuren serta mengarahkan aliran integrasi antarmuka melalui HTTP routing.

### Blok Kode 4.1: Koneksi Thread-Safe SQLite WAL Mode (`get_db_connection`)
```python
def get_db_connection():
    """Returns a thread-safe connection to the SQLite database."""
    conn = sqlite3.connect(DATABASE_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute('PRAGMA journal_mode=WAL;')
        conn.execute('PRAGMA foreign_keys = ON;')
    except Exception:
        pass
    return conn
```
*   **Fungsi**: Membuka koneksi database SQLite yang aman diakses secara bersamaan oleh thread Flask utama maupun thread latih latar belakang.
*   **Penjelasan Blok**:
    *   `journal_mode=WAL`: Mengaktifkan mode *Write-Ahead Logging* untuk memperbolehkan pembacaan data tetap berjalan dengan cepat tanpa terblokir ketika ada transaksi penulisan database.
    *   `foreign_keys=ON`: Menegakkan relasi antar-tabel agar aksi penghapusan dataset memicu cascade delete pada logs, riwayat model, dan hasil perbandingan McNemar terkait secara beruntun.

### Blok Kode 4.2: Uji Signifikansi Statistik Asinkron (`evaluate_mcnemar`)
```python
@app.route('/api/v1/evaluations/mcnemar', methods=['POST'])
def evaluate_mcnemar():
    data = request.json or {}
    model_a_id = data.get('model_a_job_id')
    model_b_id = data.get('model_b_job_id')
    
    # Pemuatan data array prediksi hasil training dari database evaluations
    conn = get_db_connection()
    job_a = conn.execute('SELECT * FROM evaluations WHERE experiment_job_id = ?', (model_a_id,)).fetchone()
    job_b = conn.execute('SELECT * FROM evaluations WHERE experiment_job_id = ?', (model_b_id,)).fetchone()
    
    y_test = json.loads(job_a['y_test'])
    y_pred_a = json.loads(job_a['y_pred'])
    y_pred_b = json.loads(job_b['y_pred'])
    
    # Hitung tabel kontingensi 2x2 dan p-value uji McNemar
    test_results = run_mcnemar_test(y_test, y_pred_a, y_pred_b)
    
    # Simpan hasil perbandingan secara permanen
    conn.execute('''
        INSERT OR REPLACE INTO mcnemar_results 
        (model_a_job_id, model_b_job_id, p_value, contingency_matrix, significant, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (model_a_id, model_b_id, test_results['p_value'], 
          json.dumps(test_results['matrix']), test_results['significant'], datetime.now().isoformat()))
    conn.commit()
    conn.close()
    
    return success_response(test_results)
```
*   **Fungsi**: Melakukan komparasi performa statistik dua model klasifikasi secara instan.
*   **Penjelasan Blok**: Membaca larik target asli (`y_test`) dan larik tebakan prediksi (`y_pred`) masing-masing model yang tersimpan di SQLite, kemudian memanggil modul statistik untuk mengalkulasi signifikansi perbedaan performa tanpa risiko OOM pada server web.

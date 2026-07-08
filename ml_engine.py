import os
import re
import pickle
import hashlib
import json
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix, classification_report

# Indonesian Stopwords List (standard, compiled for high performance)
INDONESIAN_STOPWORDS = set([
    'yang', 'di', 'dan', 'itu', 'dengan', 'untuk', 'dari', 'ke', 'ini', 'adalah',
    'bisa', 'ada', 'pada', 'juga', 'saya', 'kami', 'mereka', 'dia', 'anda', 'kamu',
    'akan', 'telah', 'sudah', 'sedang', 'dalam', 'oleh', 'olehnya', 'atau', 'tetapi',
    'namun', 'hanya', 'saja', 'jika', 'kalau', 'karena', 'sehingga', 'maka', 'tentang',
    'seperti', 'seperti', 'terhadap', 'secara', 'kembali', 'kemudian', 'lalu', 'setelah',
    'sebelum', 'ketika', 'saat', 'sementara', 'bagi', 'bagi', 'bagi', 'sangat', 'amat',
    'paling', 'lebih', 'kurang', 'sangat', 'terlalu', 'banyak', 'beberapa', 'semua',
    'tiap', 'setiap', 'bukan', 'tidak', 'tak', 'belum', 'jangan', 'bagaimana', 'apa',
    'siapa', 'dimana', 'kapan', 'mengapa', 'kenapa', 'bagaimana', 'ya', 'tidak', 'oh',
    'sih', 'lah', 'deh', 'kah', 'pun', 'kok', 'punya', 'punya', 'buat', 'adalah', 'ialah'
])

# Indonesian Slang Words / Informal Words mapping (Slang Words Normalization)
SLANG_WORDS_DICT = {
    'yg': 'yang', 'dgn': 'dengan', 'utk': 'untuk', 'sy': 'saya', 'tdk': 'tidak',
    'gak': 'tidak', 'ga': 'tidak', 'tp': 'tetapi', 'bgt': 'sangat', 'bkn': 'bukan',
    'klo': 'kalau', 'pake': 'pakai', 'pas': 'saat', 'sdg': 'sedang', 'hub': 'hubung',
    'org': 'orang', 'krn': 'karena', 'lu': 'kamu', 'gw': 'saya', 'aja': 'saja',
    'sm': 'sama', 'bener': 'benar', 'udh': 'sudah', 'udah': 'sudah', 'jd': 'jadi',
    'gpp': 'tidak apa-apa', 'bs': 'bisa', 'bbrp': 'beberapa', 'msh': 'masih', 'dr': 'dari'
}

def preprocess_text_step_by_step(text):
    """Processes a text and returns steps: Raw, Case Folded, Tokenized, Stopwords Removed.
    Note: Stemming has been removed from the pipeline."""
    # Step 1: Case Folding
    case_folded = text.lower()
    
    # Noise Removal (HTML tags, URLs)
    clean_text = re.sub(r'<[^>]+>', '', case_folded)
    clean_text = re.sub(r'https?://\S+|www\.\S+', '', clean_text)
    
    # Step 2: Tokenization (letters and numbers, remove symbols/punctuation) & Slang Normalization
    tokens = re.findall(r'\b[a-zA-Z0-9]+\b', clean_text)
    normalized_tokens = [SLANG_WORDS_DICT.get(tok, tok) for tok in tokens]
    
    # Step 3: Stopword Removal (Selective)
    filtered_tokens = [tok for tok in normalized_tokens if tok not in INDONESIAN_STOPWORDS]
    
    # Final processed text (no stemming)
    processed_text = " ".join(filtered_tokens)
    
    return {
        "raw": text,
        "case_folded": case_folded,
        "tokens": tokens,
        "filtered_tokens": filtered_tokens,
        "processed": processed_text
    }

def preprocess_text(text):
    """Fast, single-step preprocessor returning the final cleaned text.
    Note: Stemming has been removed from the pipeline."""
    # Case Fold & Noise removal
    text = text.lower()
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    # Tokenize
    tokens = re.findall(r'\b[a-zA-Z0-9]+\b', text)
    # Slang normalization & Selective Stopword removal (no stemming)
    cleaned = []
    for tok in tokens:
        norm_tok = SLANG_WORDS_DICT.get(tok, tok)
        if norm_tok not in INDONESIAN_STOPWORDS:
            cleaned.append(norm_tok)
    return " ".join(cleaned)

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
    
    # Calculate class distribution
    dist = df['label'].value_counts().to_dict()
    # Convert keys/values to standard python types for JSON serialization
    class_distribution = {str(k): int(v) for k, v in dist.items()}
    
    # Get standard preview (first 10 items)
    preview_df = df.head(10).fillna('')
    preview = preview_df.to_dict(orient='records')
    
    return total_samples, class_distribution, preview

def calculate_metrics(y_true, y_pred):
    """Calculates standard classification metrics."""
    acc = accuracy_score(y_true, y_pred)
    # Handle multiclass or binary gracefully with macro averaging
    precision, recall, f1, support = precision_recall_fscore_support(
        y_true, y_pred, average='macro', zero_division=0
    )
    
    # Per class metrics
    classes = sorted(list(set(y_true) | set(y_pred)))
    p_class, r_class, f_class, s_class = precision_recall_fscore_support(
        y_true, y_pred, labels=classes, zero_division=0
    )
    
    per_class_metrics = {}
    for i, cls in enumerate(classes):
        per_class_metrics[str(cls)] = {
            "precision": float(p_class[i]),
            "recall": float(r_class[i]),
            "f1": float(f_class[i]),
            "support": int(s_class[i])
        }
        
    # Standard classification report
    report = classification_report(y_true, y_pred, zero_division=0, output_dict=True)
    
    # Confusion Matrix
    cm = confusion_matrix(y_true, y_pred, labels=classes)
    
    return {
        "accuracy": float(acc),
        "precision": float(precision),
        "recall": float(recall),
        "macro_f1": float(f1),
        "classes": [str(c) for cls_list in [classes] for c in cls_list],
        "per_class_metrics": per_class_metrics,
        "confusion_matrix": cm.tolist(),
        "classification_report": report
    }

def train_classical_model(dataset_path, model_type, params, job_id, update_progress_fn=None, test_dataset_path=None, test_size=0.2):
    """
    Loads dataset, preprocesses text, splits (dynamic or external test), extracts TF-IDF, 
    trains Naive Bayes or SVM, evaluates, and returns model artifact paths & evaluation metrics.
    """
    if update_progress_fn: update_progress_fn(5, "Reading dataset...")
    df = pd.read_csv(dataset_path)
    
    if 'text' not in df.columns or 'label' not in df.columns:
        raise ValueError("Dataset CSV must contain 'text' and 'label' columns.")
        
    texts = df['text'].astype(str).tolist()
    labels = df['label'].astype(str).tolist()
    
    if update_progress_fn: update_progress_fn(15, "Preprocessing dataset texts...")
    
    # Preprocess all texts
    preprocessed_texts = []
    n_texts = len(texts)
    for i, t in enumerate(texts):
        preprocessed_texts.append(preprocess_text(t))
        if i % max(1, n_texts // 10) == 0 and update_progress_fn:
            progress = 15 + int((i / n_texts) * 20) # scale up to 35%
            update_progress_fn(progress, f"Preprocessing... {i}/{n_texts}")

    if update_progress_fn: update_progress_fn(40, "Preparing data split...")
    
    if test_dataset_path:
        # Load external test dataset
        test_df = pd.read_csv(test_dataset_path)
        if 'text' not in test_df.columns or 'label' not in test_df.columns:
            raise ValueError("External test dataset CSV must contain 'text' and 'label' columns.")
        test_texts = test_df['text'].astype(str).tolist()
        y_test = test_df['label'].astype(str).tolist()
        
        # Training partition is the whole primary dataset
        X_train = preprocessed_texts
        y_train = labels
        
        # Preprocess test set texts
        X_test = []
        n_test = len(test_texts)
        for i, t in enumerate(test_texts):
            X_test.append(preprocess_text(t))
            if i % max(1, n_test // 10) == 0 and update_progress_fn:
                progress = 40 + int((i / n_test) * 15) # scale from 40 to 55%
                update_progress_fn(progress, f"Preprocessing test set... {i}/{n_test}")
    else:
        # Split into train-test sets with safe stratification fallback
        can_stratify = False
        if len(labels) >= 2:
            class_counts = pd.Series(labels).value_counts()
            test_size_count = int(np.ceil(test_size * len(labels)))
            if class_counts.min() >= 2 and test_size_count >= len(class_counts):
                can_stratify = True
        stratify_param = labels if can_stratify else None

        X_train, X_test, y_train, y_test = train_test_split(
            preprocessed_texts, labels, test_size=test_size, random_state=42, stratify=stratify_param
        )
    
    # Vectorization (ngram_range=(1,2), min_df=5 with safe fallback for tiny test sets)
    min_df_val = 5 if len(X_train) >= 25 else 1
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=min_df_val)
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)
    
    if update_progress_fn: update_progress_fn(60, "Initializing and training ML model...")
    
    # Initialize appropriate model
    if model_type == 'naive_bayes':
        alpha = float(params.get('alpha', 1.0))
        model = MultinomialNB(alpha=alpha)
    elif model_type == 'svm':
        kernel = params.get('kernel', 'linear')
        C = float(params.get('C', 1.0))
        gamma = params.get('gamma', 'scale')
        # handle numeric gamma
        try:
            if gamma not in ['scale', 'auto']:
                gamma = float(gamma)
        except ValueError:
            gamma = 'scale'
        model = SVC(kernel=kernel, C=C, gamma=gamma, probability=True)
    else:
        raise ValueError(f"Unknown classical model type: {model_type}")
        
    # Fit model
    model.fit(X_train_vec, y_train)
    
    if update_progress_fn: update_progress_fn(80, "Model trained. Evaluating performance on test partition...")
    
    # Predict
    y_pred = model.predict(X_test_vec)
    
    # Calculate metrics
    eval_results = calculate_metrics(y_test, y_pred)
    
    # Predict on a single sample to verify vectorizer alignment
    test_pred_label = model.predict(vectorizer.transform([X_test[0]]))[0]
    
    # Packages model and vectorizer
    model_package = {
        "model_type": model_type,
        "model": model,
        "vectorizer": vectorizer,
        "classes": model.classes_.tolist(),
        "created_at": datetime.now().isoformat()
    }
    
    # Define model artifact path
    from config import MODELS_FOLDER
    artifact_name = f"model_job_{job_id}.pkl"
    artifact_path = os.path.join(MODELS_FOLDER, artifact_name)
    
    if update_progress_fn: update_progress_fn(95, "Saving trained model artifact package...")
    
    with open(artifact_path, 'wb') as f:
        pickle.dump(model_package, f)
        
    # Compute SHA256 of saved model
    artifact_hash = compute_dataset_hash(artifact_path)
    
    # Save evaluation test predictions and ground truth for McNemar test
    eval_results["y_test"] = y_test
    eval_results["y_pred"] = y_pred.tolist()
    
    if update_progress_fn: update_progress_fn(100, "Model training completed successfully!")
    
    return {
        "artifact_path": artifact_path,
        "artifact_hash": artifact_hash,
        "eval_results": eval_results
    }

def run_mcnemar_test(y_true, y_pred_a, y_pred_b):
    """
    Computes McNemar test between two models.
    y_true: True Labels
    y_pred_a: Predictions of Model A
    y_pred_b: Predictions of Model B
    Returns p_value, contingency_matrix, and whether result is significant (p < 0.05).
    """
    # y_true, y_pred_a, and y_pred_b must be same length
    n = len(y_true)
    if len(y_pred_a) != n or len(y_pred_b) != n:
        raise ValueError("Ground truth and both model predictions must be the same length.")
        
    # Contingency Table:
    #                 Model B Correct    Model B Incorrect
    # Model A Correct       n00                n01
    # Model A Incorrect     n10                n11
    
    n00 = n01 = n10 = n11 = 0
    
    for yt, ya, yb in zip(y_true, y_pred_a, y_pred_b):
        a_correct = (ya == yt)
        b_correct = (yb == yt)
        
        if a_correct and b_correct:
            n00 += 1
        elif a_correct and not b_correct:
            n01 += 1
        elif not a_correct and b_correct:
            n10 += 1
        else:
            n11 += 1
            
    # Contingency Matrix
    contingency_matrix = [
        [n00, n01],
        [n10, n11]
    ]
    
    # McNemar Statistic with continuity correction:
    # chi2 = (|n01 - n10| - 1)^2 / (n01 + n10)
    # Degrees of freedom = 1
    
    if n01 + n10 == 0:
        p_value = 1.0
    else:
        # Use stats scipy if available, else standard analytical formulation
        try:
            from scipy.stats import chi2
            stat = (abs(n01 - n10) - 0.5)**2 / (n01 + n10) # Yates continuity correction
            p_value = chi2.sf(stat, 1)
        except ImportError:
            # Simple direct approximation
            stat = (abs(n01 - n10) - 1)**2 / (n01 + n10) if (n01 + n10) > 0 else 0.0
            # Rough standard approximation of p-value for chi-squared 1 d.o.f:
            # We can use standard math expansion or fallback safe evaluation
            if stat <= 0:
                p_value = 1.0
            else:
                # Approximation of survival function of chi2 1 dof
                # equivalent to 2 * (1 - norm.cdf(sqrt(stat)))
                import math
                x = math.sqrt(stat)
                # Standard approximation for normal CDF
                p_value = 2 * (1.0 - 0.5 * (1.0 + math.erf(x / math.sqrt(2.0))))
                
    significant = 1 if p_value < 0.05 else 0
    
    return {
        "p_value": float(p_value),
        "contingency_matrix": contingency_matrix,
        "significant": significant
    }

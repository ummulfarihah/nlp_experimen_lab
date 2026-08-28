"""
Ummu NLP Lab - Classical Machine Learning & NLP Preprocessing Engine
Implements text preprocessing pipeline, TF-IDF feature extraction,
Multinomial Naive Bayes, Support Vector Machine (SVM), in-memory artifact caching,
and McNemar statistical hypothesis testing.
"""

import os
import re
import pickle
import hashlib
import json
import logging
import threading
from datetime import datetime
from typing import Dict, List, Tuple, Any, Optional, Callable, Set

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import SVC
from sklearn.metrics import (
    accuracy_score, precision_recall_fscore_support, confusion_matrix, classification_report
)

from config import MODELS_FOLDER, MODEL_CACHE_SIZE

logger = logging.getLogger('nlp_lab.ml_engine')

# Thread-safe in-memory model cache: artifact_path -> (mtime, model_package)
_MODEL_CACHE: Dict[str, Tuple[float, Dict[str, Any]]] = {}
_CACHE_LOCK = threading.Lock()


# Indonesian Stopwords List (Identical to nlp_experiments.ipynb)
INDONESIAN_STOPWORDS: Set[str] = set([
    'yang', 'di', 'dan', 'itu', 'dengan', 'untuk', 'dari', 'ke', 'ini', 'adalah',
    'bisa', 'ada', 'pada', 'juga', 'saya', 'kami', 'mereka', 'dia', 'anda', 'kamu',
    'akan', 'telah', 'sudah', 'sedang', 'dalam', 'oleh', 'olehnya', 'atau', 'tetapi',
    'namun', 'hanya', 'saja', 'jika', 'kalau', 'karena', 'sehingga', 'maka', 'tentang',
    'seperti', 'terhadap', 'secara', 'kembali', 'kemudian', 'lalu', 'setelah',
    'sebelum', 'ketika', 'saat', 'sementara', 'bagi', 'sangat', 'amat',
    'paling', 'lebih', 'kurang', 'terlalu', 'banyak', 'beberapa', 'semua',
    'tiap', 'setiap', 'bukan', 'tidak', 'tak', 'belum', 'jangan', 'bagaimana', 'apa',
    'siapa', 'dimana', 'kapan', 'mengapa', 'kenapa', 'ya', 'oh',
    'sih', 'lah', 'deh', 'kah', 'pun', 'kok', 'punya', 'buat', 'ialah'
])

# Indonesian Slang / Informal Words mapping (Slang Normalization)
SLANG_WORDS_DICT: Dict[str, str] = {
    'yg': 'yang', 'dgn': 'dengan', 'utk': 'untuk', 'sy': 'saya', 'tdk': 'tidak',
    'gak': 'tidak', 'ga': 'tidak', 'tp': 'tetapi', 'bgt': 'sangat', 'bkn': 'bukan',
    'klo': 'kalau', 'pake': 'pakai', 'pas': 'saat', 'sdg': 'sedang', 'hub': 'hubung',
    'org': 'orang', 'krn': 'karena', 'lu': 'kamu', 'gw': 'saya', 'aja': 'saja',
    'sm': 'sama', 'bener': 'benar', 'udh': 'sudah', 'udah': 'sudah', 'jd': 'jadi',
    'gpp': 'tidak apa-apa', 'bs': 'bisa', 'bbrp': 'beberapa', 'msh': 'masih', 'dr': 'dari'
}


def load_model_artifact(artifact_path: str) -> Dict[str, Any]:
    """
    Loads a serialized model artifact (.pkl) with thread-safe LRU in-memory caching.
    Invalidates cache automatically if the file on disk is modified.

    Args:
        artifact_path (str): Absolute filesystem path to the .pkl model package.

    Returns:
        Dict[str, Any]: Unpickled model package dictionary.

    Raises:
        FileNotFoundError: If the model artifact does not exist on disk.
    """
    if not os.path.exists(artifact_path):
        raise FileNotFoundError(f"Model artifact file not found: {artifact_path}")

    file_mtime = os.path.getmtime(artifact_path)

    with _CACHE_LOCK:
        if artifact_path in _MODEL_CACHE:
            cached_mtime, package = _MODEL_CACHE[artifact_path]
            if cached_mtime == file_mtime:
                return package

        # Evict oldest entry if cache capacity is exceeded
        if len(_MODEL_CACHE) >= MODEL_CACHE_SIZE:
            oldest_key = next(iter(_MODEL_CACHE))
            del _MODEL_CACHE[oldest_key]

        with open(artifact_path, 'rb') as f:
            package = pickle.load(f)

        _MODEL_CACHE[artifact_path] = (file_mtime, package)
        logger.info(f"Loaded and cached model artifact into memory: {os.path.basename(artifact_path)}")
        return package


def preprocess_text_step_by_step(text: str) -> Dict[str, Any]:
    """
    Processes raw text step-by-step for educational visualization:
    Step 1: Case Folding & Noise Removal (HTML, URLs)
    Step 2: Tokenization & Slang Normalization
    Step 3: Selective Stopword Removal (Negation words preserved)

    Args:
        text (str): Raw input text string.

    Returns:
        Dict[str, Any]: Dictionary containing each preprocessing stage output.
    """
    if not isinstance(text, str):
        text = str(text or "")

    # Step 1: Case Folding & Noise Removal
    case_folded = text.lower()
    clean_text = re.sub(r'<[^>]+>', '', case_folded)
    clean_text = re.sub(r'https?://\S+|www\.\S+', '', clean_text)

    # Step 2: Tokenization & Slang Normalization
    tokens = re.findall(r'\b[a-zA-Z0-9]+\b', clean_text)
    normalized_tokens = [SLANG_WORDS_DICT.get(tok, tok) for tok in tokens]

    # Step 3: Stopword Removal (Selective)
    filtered_tokens = [tok for tok in normalized_tokens if tok not in INDONESIAN_STOPWORDS]

    # Final preprocessed text
    processed_text = " ".join(filtered_tokens)

    return {
        "raw": text,
        "case_folded": case_folded,
        "tokens": normalized_tokens,
        "filtered_tokens": filtered_tokens,
        "processed": processed_text
    }


def preprocess_text(text: str) -> str:
    """
    Fast, single-step preprocessor returning the final cleaned text string.

    Args:
        text (str): Raw input text.

    Returns:
        str: Cleaned and normalized text string.
    """
    if not isinstance(text, str):
        text = str(text or "")

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


def compute_dataset_hash(filepath: str) -> str:
    """
    Calculates the SHA256 cryptographic hash of a file for experiment reproducibility auditing.

    Args:
        filepath (str): Absolute file path.

    Returns:
        str: Hexadecimal SHA256 hash string.
    """
    sha256 = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while chunk := f.read(65536):
            sha256.update(chunk)
    return sha256.hexdigest()


def analyze_dataset_file(filepath: str) -> Tuple[int, Dict[str, int], List[Dict[str, Any]]]:
    """
    Analyzes a CSV dataset file: counts samples, evaluates class distribution,
    and returns a preview of the first 10 rows.

    Args:
        filepath (str): Path to CSV dataset.

    Returns:
        Tuple[int, Dict[str, int], List[Dict[str, Any]]]: (total_samples, class_distribution, preview_rows)

    Raises:
        ValueError: If required columns 'text' and 'label' are missing or CSV is corrupt.
    """
    try:
        df = pd.read_csv(filepath, encoding='utf-8')
    except UnicodeDecodeError:
        df = pd.read_csv(filepath, encoding='latin-1')

    if 'text' not in df.columns or 'label' not in df.columns:
        raise ValueError("Dataset CSV must contain 'text' and 'label' columns.")

    # Drop completely empty rows
    df = df.dropna(subset=['text', 'label'])
    total_samples = len(df)

    if total_samples == 0:
        raise ValueError("Dataset CSV contains no valid data rows.")

    dist = df['label'].astype(str).value_counts().to_dict()
    class_distribution = {str(k): int(v) for k, v in dist.items()}

    preview_df = df.head(10).fillna('')
    preview = preview_df.to_dict(orient='records')

    return total_samples, class_distribution, preview


def calculate_metrics(y_true: List[str], y_pred: List[str]) -> Dict[str, Any]:
    """
    Calculates standard scientific classification metrics:
    Accuracy, Precision (Macro), Recall (Macro), Macro F1, Per-Class Breakdown,
    Confusion Matrix, and full Classification Report.

    Args:
        y_true (List[str]): Ground truth labels.
        y_pred (List[str]): Model predicted labels.

    Returns:
        Dict[str, Any]: Structured evaluation metrics.
    """
    y_true_str = [str(y) for y in y_true]
    y_pred_str = [str(y) for y in y_pred]

    acc = accuracy_score(y_true_str, y_pred_str)
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_true_str, y_pred_str, average='macro', zero_division=0
    )

    classes = sorted(list(set(y_true_str) | set(y_pred_str)))
    p_class, r_class, f_class, s_class = precision_recall_fscore_support(
        y_true_str, y_pred_str, labels=classes, zero_division=0
    )

    per_class_metrics = {}
    for i, cls in enumerate(classes):
        per_class_metrics[str(cls)] = {
            "precision": float(p_class[i]),
            "recall": float(r_class[i]),
            "f1": float(f_class[i]),
            "support": int(s_class[i])
        }

    report = classification_report(y_true_str, y_pred_str, zero_division=0, output_dict=True)
    cm = confusion_matrix(y_true_str, y_pred_str, labels=classes)

    return {
        "accuracy": float(acc),
        "precision": float(precision),
        "recall": float(recall),
        "macro_f1": float(f1),
        "classes": [str(c) for c in classes],
        "per_class_metrics": per_class_metrics,
        "confusion_matrix": cm.tolist(),
        "classification_report": report
    }


def train_classical_model(
    dataset_path: str,
    model_type: str,
    params: Dict[str, Any],
    job_id: int,
    update_progress_fn: Optional[Callable[[int, str], None]] = None,
    test_dataset_path: Optional[str] = None,
    test_size: float = 0.2
) -> Dict[str, Any]:
    """
    Loads dataset, preprocesses text, splits data, extracts TF-IDF features,
    trains Naive Bayes or SVM, evaluates performance on test partition,
    and saves serialized model package.

    Args:
        dataset_path (str): Path to primary training CSV.
        model_type (str): 'naive_bayes' or 'svm'.
        params (Dict[str, Any]): Hyperparameters dictionary.
        job_id (int): ID of the experiment job.
        update_progress_fn (Optional[Callable]): Callback for progress reporting.
        test_dataset_path (Optional[str]): Optional separate test dataset path.
        test_size (float): Train-test split ratio when dynamic split is used.

    Returns:
        Dict[str, Any]: Result package containing artifact_path, artifact_hash, and eval_results.
    """
    if update_progress_fn:
        update_progress_fn(5, "Membaca berkas dataset...")

    try:
        df = pd.read_csv(dataset_path, encoding='utf-8')
    except UnicodeDecodeError:
        df = pd.read_csv(dataset_path, encoding='latin-1')

    if 'text' not in df.columns or 'label' not in df.columns:
        raise ValueError("Dataset CSV wajib memiliki kolom 'text' dan 'label'.")

    df = df.dropna(subset=['text', 'label'])
    texts = df['text'].astype(str).tolist()
    labels = df['label'].astype(str).tolist()

    if len(texts) < 4:
        raise ValueError("Dataset terlalu kecil untuk pelatihan (minimal 4 baris data).")

    if update_progress_fn:
        update_progress_fn(15, "Melakukan text preprocessing...")

    preprocessed_texts = []
    n_texts = len(texts)
    for i, t in enumerate(texts):
        preprocessed_texts.append(preprocess_text(t))
        if i % max(1, n_texts // 10) == 0 and update_progress_fn:
            progress = 15 + int((i / n_texts) * 20)
            update_progress_fn(progress, f"Preprocessing... {i}/{n_texts}")

    if update_progress_fn:
        update_progress_fn(40, "Menyiapkan pembagian data uji...")

    if test_dataset_path and os.path.exists(test_dataset_path):
        try:
            test_df = pd.read_csv(test_dataset_path, encoding='utf-8')
        except UnicodeDecodeError:
            test_df = pd.read_csv(test_dataset_path, encoding='latin-1')

        if 'text' not in test_df.columns or 'label' not in test_df.columns:
            raise ValueError("Dataset uji eksternal wajib memiliki kolom 'text' dan 'label'.")

        test_df = test_df.dropna(subset=['text', 'label'])
        test_texts = test_df['text'].astype(str).tolist()
        y_test = test_df['label'].astype(str).tolist()

        X_train = preprocessed_texts
        y_train = labels

        X_test = []
        n_test = len(test_texts)
        for i, t in enumerate(test_texts):
            X_test.append(preprocess_text(t))
            if i % max(1, n_test // 10) == 0 and update_progress_fn:
                progress = 40 + int((i / n_test) * 15)
                update_progress_fn(progress, f"Preprocessing dataset uji... {i}/{n_test}")
    else:
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

    # TF-IDF Feature Extraction
    min_df_val = 5 if len(X_train) >= 25 else 1
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=min_df_val)
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    if update_progress_fn:
        update_progress_fn(60, "Melatih model Machine Learning...")

    # Model Initialization
    if model_type == 'naive_bayes':
        alpha = float(params.get('alpha', 1.0))
        model = MultinomialNB(alpha=alpha)
    elif model_type == 'svm':
        kernel = params.get('kernel', 'linear')
        C = float(params.get('C', 1.0))
        gamma = params.get('gamma', 'scale')
        try:
            if gamma not in ['scale', 'auto']:
                gamma = float(gamma)
        except ValueError:
            gamma = 'scale'
        model = SVC(kernel=kernel, C=C, gamma=gamma, probability=True, random_state=42)
    else:
        raise ValueError(f"Tipe model klasik tidak didukung: {model_type}")

    # Training
    model.fit(X_train_vec, y_train)

    if update_progress_fn:
        update_progress_fn(80, "Mengevaluasi performa model pada data uji...")

    # Inference & Metrics
    y_pred = model.predict(X_test_vec)
    eval_results = calculate_metrics(y_test, y_pred)

    # Model Serialization Package
    model_package = {
        "model_type": model_type,
        "model": model,
        "vectorizer": vectorizer,
        "classes": model.classes_.tolist(),
        "created_at": datetime.now().isoformat()
    }

    artifact_name = f"model_job_{job_id}.pkl"
    artifact_path = os.path.join(MODELS_FOLDER, artifact_name)

    if update_progress_fn:
        update_progress_fn(95, "Menyimpan paket artefak model...")

    with open(artifact_path, 'wb') as f:
        pickle.dump(model_package, f)

    artifact_hash = compute_dataset_hash(artifact_path)
    eval_results["y_test"] = y_test
    eval_results["y_pred"] = y_pred.tolist()

    if update_progress_fn:
        update_progress_fn(100, "Pelatihan model berhasil diselesaikan!")

    return {
        "artifact_path": artifact_path,
        "artifact_hash": artifact_hash,
        "eval_results": eval_results
    }


def run_mcnemar_test(
    y_true: List[str],
    y_pred_a: List[str],
    y_pred_b: List[str]
) -> Dict[str, Any]:
    """
    Performs McNemar Statistical Hypothesis Test with Yates continuity correction
    between Model A and Model B predictions against Ground Truth.

    Args:
        y_true (List[str]): Ground truth test labels.
        y_pred_a (List[str]): Predictions from Model A.
        y_pred_b (List[str]): Predictions from Model B.

    Returns:
        Dict[str, Any]: {p_value: float, contingency_matrix: 2x2 list, significant: int (0 or 1)}
    """
    n = len(y_true)
    if len(y_pred_a) != n or len(y_pred_b) != n:
        raise ValueError("Panjang label aktual, prediksi Model A, dan Model B harus persis sama.")

    # Contingency Table:
    #                 Model B Correct    Model B Incorrect
    # Model A Correct       n00                n01
    # Model A Incorrect     n10                n11
    n00 = n01 = n10 = n11 = 0

    for yt, ya, yb in zip(y_true, y_pred_a, y_pred_b):
        a_correct = (str(ya) == str(yt))
        b_correct = (str(yb) == str(yt))

        if a_correct and b_correct:
            n00 += 1
        elif a_correct and not b_correct:
            n01 += 1
        elif not a_correct and b_correct:
            n10 += 1
        else:
            n11 += 1

    contingency_matrix = [
        [n00, n01],
        [n10, n11]
    ]

    if (n01 + n10) == 0:
        p_value = 1.0
    else:
        try:
            from scipy.stats import chi2
            stat = (abs(n01 - n10) - 0.5)**2 / (n01 + n10)
            p_value = float(chi2.sf(stat, 1))
        except ImportError:
            import math
            stat = (abs(n01 - n10) - 0.5)**2 / (n01 + n10)
            if stat <= 0:
                p_value = 1.0
            else:
                x = math.sqrt(stat)
                p_value = float(2.0 * (1.0 - 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))))

    significant = 1 if p_value < 0.05 else 0

    return {
        "p_value": float(p_value),
        "contingency_matrix": contingency_matrix,
        "significant": significant
    }


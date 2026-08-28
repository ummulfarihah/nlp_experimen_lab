"""
Unit tests for NLP Preprocessing and Dataset Analysis
"""

import os
import tempfile
import pandas as pd
import pytest

from ml_engine import (
    preprocess_text,
    preprocess_text_step_by_step,
    analyze_dataset_file,
    compute_dataset_hash,
    SLANG_WORDS_DICT,
    INDONESIAN_STOPWORDS
)


def test_preprocess_text_case_folding():
    raw = "PRODUK INI SANGAT BAGUS SEKALI!"
    result = preprocess_text(raw)
    assert result == result.lower()
    assert "produk" in result


def test_preprocess_text_noise_removal():
    raw = "<p>Klik link ini https://example.com/promo untuk diskon!</p>"
    result = preprocess_text(raw)
    assert "https" not in result
    assert "http" not in result
    assert "<p>" not in result
    assert "</p>" not in result


def test_preprocess_text_slang_normalization():
    raw = "barang nya bgt beneran bagus bgt bkn kaleng2"
    steps = preprocess_text_step_by_step(raw)
    # 'bgt' -> 'sangat', 'bkn' -> 'bukan'
    assert "sangat" in steps["tokens"] and "bukan" in steps["tokens"]


def test_preprocess_text_step_by_step():
    raw = "Pelayanan toko <b>sangat cepat</b> dan respon ramah!"
    steps = preprocess_text_step_by_step(raw)
    assert "raw" in steps
    assert "case_folded" in steps
    assert "tokens" in steps
    assert "filtered_tokens" in steps
    assert "processed" in steps
    assert steps["raw"] == raw


def test_analyze_dataset_file_valid():
    df = pd.DataFrame({
        "text": ["Barang bagus", "Pelayanan jelek", "Biasa saja", "Sangat memuaskan"],
        "label": ["positif", "negatif", "netral", "positif"]
    })
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w", encoding="utf-8") as f:
        df.to_csv(f.name, index=False)
        temp_path = f.name

    try:
        total, dist, preview = analyze_dataset_file(temp_path)
        assert total == 4
        assert dist["positif"] == 2
        assert dist["negatif"] == 1
        assert dist["netral"] == 1
        assert len(preview) == 4
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def test_analyze_dataset_file_missing_columns():
    df = pd.DataFrame({
        "content": ["Text one", "Text two"],
        "sentiment": ["pos", "neg"]
    })
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w", encoding="utf-8") as f:
        df.to_csv(f.name, index=False)
        temp_path = f.name

    try:
        with pytest.raises(ValueError, match="must contain 'text' and 'label'"):
            analyze_dataset_file(temp_path)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def test_compute_dataset_hash():
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w", encoding="utf-8") as f:
        f.write("text,label\ntest,pos\n")
        temp_path = f.name

    try:
        h1 = compute_dataset_hash(temp_path)
        h2 = compute_dataset_hash(temp_path)
        assert len(h1) == 64
        assert h1 == h2
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

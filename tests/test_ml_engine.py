"""
Unit tests for Machine Learning Engine, Metrics, and McNemar Test
"""

import os
import tempfile
import pandas as pd
import pytest

from ml_engine import (
    calculate_metrics,
    train_classical_model,
    run_mcnemar_test,
    load_model_artifact
)


def test_calculate_metrics():
    y_true = ["positif", "negatif", "positif", "netral", "negatif"]
    y_pred = ["positif", "negatif", "negatif", "netral", "negatif"]
    
    metrics = calculate_metrics(y_true, y_pred)
    assert "accuracy" in metrics
    assert "precision" in metrics
    assert "recall" in metrics
    assert "macro_f1" in metrics
    assert "confusion_matrix" in metrics
    assert "classification_report" in metrics
    assert 0.0 <= metrics["accuracy"] <= 1.0
    assert metrics["accuracy"] == 0.8  # 4 out of 5 correct


def test_train_classical_model_naive_bayes():
    df = pd.DataFrame({
        "text": [
            "produk ini sangat bagus dan memuaskan",
            "layanan sangat buruk dan mengecewakan",
            "kualitas biasa saja standar",
            "sangat senang belanja di toko ini",
            "kecewa sekali barang rusak parah",
            "paket rapi pengiriman cepat sekali"
        ],
        "label": ["positif", "negatif", "netral", "positif", "negatif", "positif"]
    })
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w", encoding="utf-8") as f:
        df.to_csv(f.name, index=False)
        temp_csv = f.name

    try:
        results = train_classical_model(
            dataset_path=temp_csv,
            model_type="naive_bayes",
            params={"alpha": 1.0},
            job_id=9999,
            test_size=0.33
        )
        assert "artifact_path" in results
        assert "artifact_hash" in results
        assert "eval_results" in results
        assert os.path.exists(results["artifact_path"])

        # Test loading cached artifact
        package = load_model_artifact(results["artifact_path"])
        assert package["model_type"] == "naive_bayes"
        assert "model" in package
        assert "vectorizer" in package
    finally:
        if os.path.exists(temp_csv):
            os.remove(temp_csv)
        if "results" in locals() and os.path.exists(results["artifact_path"]):
            os.remove(results["artifact_path"])


def test_train_classical_model_svm():
    df = pd.DataFrame({
        "text": [
            "produk ini sangat bagus dan memuaskan",
            "layanan sangat buruk dan mengecewakan",
            "kualitas biasa saja standar",
            "sangat senang belanja di toko ini",
            "kecewa sekali barang rusak parah",
            "paket rapi pengiriman cepat sekali"
        ],
        "label": ["positif", "negatif", "netral", "positif", "negatif", "positif"]
    })
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w", encoding="utf-8") as f:
        df.to_csv(f.name, index=False)
        temp_csv = f.name

    try:
        results = train_classical_model(
            dataset_path=temp_csv,
            model_type="svm",
            params={"kernel": "linear", "C": 1.0, "gamma": "scale"},
            job_id=9998,
            test_size=0.33
        )
        assert "artifact_path" in results
        assert os.path.exists(results["artifact_path"])
    finally:
        if os.path.exists(temp_csv):
            os.remove(temp_csv)
        if "results" in locals() and os.path.exists(results["artifact_path"]):
            os.remove(results["artifact_path"])


def test_run_mcnemar_test():
    y_true = ["pos", "neg", "pos", "neg", "pos", "neg", "pos", "pos", "neg", "neg"]
    y_pred_a = ["pos", "neg", "pos", "neg", "pos", "neg", "pos", "pos", "neg", "neg"]  # 10/10 correct
    y_pred_b = ["neg", "pos", "neg", "pos", "neg", "pos", "neg", "neg", "pos", "pos"]  # 0/10 correct

    result = run_mcnemar_test(y_true, y_pred_a, y_pred_b)
    assert "p_value" in result
    assert "contingency_matrix" in result
    assert "significant" in result
    assert 0.0 <= result["p_value"] <= 1.0
    assert result["significant"] == 1  # Should be statistically significant

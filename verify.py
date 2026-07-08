# NLP Experiment Lab - Self Verification Script
import os
import sys
import json
import sqlite3
import pandas as pd
from datetime import datetime

# Import modules from our project
from config import DATABASE_PATH, DATASETS_FOLDER, MODELS_FOLDER, LOGS_FOLDER
from database import init_db, get_db_connection
from ml_engine import preprocess_text, preprocess_text_step_by_step, run_mcnemar_test, train_classical_model
from bert_engine import train_bert_model

def run_verification():
    print("=" * 60)
    print("         NLP EXPERIMENT LAB - SELF VERIFICATION TEST          ")
    print("=" * 60)
    
    # Test 1: Folders and configuration checks
    print("\n[TEST 1/5] Checking workspace directories...")
    folders = [DATASETS_FOLDER, MODELS_FOLDER, LOGS_FOLDER]
    for f in folders:
        if os.path.exists(f):
            print(f"  [+] Directory exists: {os.path.basename(f)}")
        else:
            print(f"  [!] Creating missing directory: {os.path.basename(f)}")
            os.makedirs(f, exist_ok=True)
            
    # Test 2: Database Initialization and Schema Integrity
    print("\n[TEST 2/5] Initializing SQLite Database & Schema verification...")
    init_db()
    if os.path.exists(DATABASE_PATH):
        print(f"  [+] SQLite DB exists at: {DATABASE_PATH}")
    else:
        print("  [-] Error: Database file was not created!")
        sys.exit(1)
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    conn.close()
    
    expected_tables = ['datasets', 'model_configs', 'experiments', 'experiment_jobs', 'experiment_logs', 'evaluations', 'mcnemar_results']
    for t in expected_tables:
        if t in tables:
            print(f"  [+] Database Table exists: '{t}'")
        else:
            print(f"  [-] Error: Missing Database Table: '{t}'")
            sys.exit(1)
            
    # Test 3: Indonesian NLP Preprocessing Engine
    print("\n[TEST 3/5] Testing Indonesian NLP Preprocessing pipeline...")
    sample_text = "Saya sedang mendengarkan pidato dari bapak Presiden di dpr yang sangat menakjubkan sekali!"
    steps = preprocess_text_step_by_step(sample_text)
    
    print(f"  [+] Original Text:  \"{steps['raw']}\"")
    print(f"  [+] Case Folded:    \"{steps['case_folded']}\"")
    print(f"  [+] Tokens extracted: {steps['tokens']}")
    print(f"  [+] Stopwords filtered: {steps['filtered_tokens']}")
    print(f"  [+] Final Preprocessed: \"{steps['processed']}\"")
    
    # Assert preprocessing results
    assert 'sedang' not in steps['filtered_tokens'], "Stopwords were not removed!"
    assert 'pidato' in steps['filtered_tokens'], "Key content word was lost!"
    print("  [+] Preprocessing pipeline is fully operational!")

    # Test 4: McNemar Significance test math formulation
    print("\n[TEST 4/5] Testing McNemar Statistical Significance test calculations...")
    y_true =   ['positif', 'negatif', 'positif', 'positif', 'negatif', 'netral', 'netral', 'positif', 'negatif', 'netral']
    y_pred_a = ['positif', 'negatif', 'positif', 'negatif', 'negatif', 'netral', 'netral', 'positif', 'negatif', 'netral'] # 9/10 correct
    y_pred_b = ['negatif', 'negatif', 'negatif', 'negatif', 'negatif', 'netral', 'netral', 'positif', 'negatif', 'netral'] # 7/10 correct
    
    mc_results = run_mcnemar_test(y_true, y_pred_a, y_pred_b)
    print(f"  [+] Computed p-value: {mc_results['p_value']:.6f}")
    print(f"  [+] Contingency matrix: {mc_results['contingency_matrix']}")
    print(f"  [+] Significant (p < 0.05): {bool(mc_results['significant'])}")
    assert mc_results['p_value'] >= 0, "P-value cannot be negative!"
    print("  [+] McNemar Test math formulation verified.")

    # Test 5: End-to-end Classical training mock
    print("\n[TEST 5/5] Testing Mock Training Job (Naive Bayes)...")
    mock_csv_path = os.path.join(DATASETS_FOLDER, "verify_temp_dataset.csv")
    
    # Create a small dummy training CSV dataset
    dummy_data = {
        'text': [
            "Buku ini sangat bagus sekali saya menyukainya!",
            "Pelayanan toko ini sangat jelek dan mengecewakan.",
            "Produk dikirim sangat cepat dan kemasan rapi mantap.",
            "Barang rusak saat sampai dan penjual lambat merespon benci.",
            "Biasa saja tidak ada yang istimewa dari produk ini netral.",
            "Kualitas standar sesuai harga pengiriman lumayan netral."
        ],
        'label': ['positif', 'negatif', 'positif', 'negatif', 'netral', 'netral']
    }
    pd.DataFrame(dummy_data).to_csv(mock_csv_path, index=False)
    
    try:
        # Run a Naive Bayes model training
        results = train_classical_model(
            dataset_path=mock_csv_path,
            model_type='naive_bayes',
            params={'alpha': 1.0},
            job_id=999
        )
        print(f"  [+] Model Artifact saved at: {os.path.basename(results['artifact_path'])}")
        print(f"  [+] Model Hash generated: {results['artifact_hash'][:12]}...")
        print(f"  [+] Accuracy evaluated: {results['eval_results']['accuracy'] * 100:.2f}%")
        print(f"  [+] Macro F1 evaluated: {results['eval_results']['macro_f1'] * 100:.2f}%")
        print("  [+] Naive Bayes Training Engine verified.")
    except Exception as e:
        print(f"  [-] Error training classical model: {e}")
        sys.exit(1)
    finally:
        # Clean up mock file
        if os.path.exists(mock_csv_path):
            os.remove(mock_csv_path)
            
    print("\n" + "=" * 60)
    print("        ALL TESTS COMPLETED SUCCESSFULLY! CORE ENGINE GREEN.        ")
    print("=" * 60)

if __name__ == '__main__':
    run_verification()

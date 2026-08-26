"""
Integration tests for Flask API endpoints, authentication, and background tasks
"""

import json
import pytest
from app import app
from database import get_db_connection, init_db
from task_manager import cancel_training_job, is_job_cancelled


@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def auth_client(client):
    """Client with an authenticated session."""
    with client.session_transaction() as sess:
        sess['user'] = {
            "id": "1",
            "email": "ummulfarihah20@gmail.com",
            "name": "Administrator",
            "picture": "",
            "role": "Administrator",
            "institution": "Universitas Muhammadiyah Malang"
        }
    return client


def test_health_check_endpoint(client):
    res = client.get('/api/v1/health')
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["status"] == "healthy"
    assert "version" in data
    assert data["database"] == "connected"


def test_login_endpoint_success(client):
    payload = {
        "email": "ummulfarihah20@gmail.com",
        "password": "admin123"
    }
    res = client.post('/api/v1/auth/login', json=payload)
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["success"] is True
    assert data["data"]["email"] == "ummulfarihah20@gmail.com"


def test_login_endpoint_invalid_password(client):
    payload = {
        "email": "ummulfarihah20@gmail.com",
        "password": "wrongpassword999"
    }
    res = client.post('/api/v1/auth/login', json=payload)
    assert res.status_code == 401
    data = json.loads(res.data)
    assert data["success"] is False


def test_unauthenticated_access_blocked(client):
    """Verifies that protected mutating and compute endpoints return 401 when not logged in."""
    # Datasets
    res = client.get('/api/v1/datasets')
    assert res.status_code == 401
    assert json.loads(res.data)["success"] is False

    # Preprocess
    res = client.post('/api/v1/preprocess', json={"text": "Tes autentikasi"})
    assert res.status_code == 401

    # Experiments
    res = client.post('/api/v1/experiments', json={"name": "test"})
    assert res.status_code == 401

    # Predict
    res = client.post('/api/v1/predict/single', json={"job_id": 1, "text": "halo"})
    assert res.status_code == 401


def test_authenticated_access_allowed(auth_client):
    """Verifies that logged in users can access protected endpoints."""
    res = auth_client.get('/api/v1/datasets')
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["success"] is True

    # Preprocess
    res = auth_client.post('/api/v1/preprocess', json={"text": "Pengiriman barang cepat banget dan rapih!"})
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["success"] is True
    assert "case_folded" in data["data"]


def test_preprocess_api_empty_text(auth_client):
    payload = {
        "text": ""
    }
    res = auth_client.post('/api/v1/preprocess', json=payload)
    assert res.status_code == 400
    data = json.loads(res.data)
    assert data["success"] is False


def test_system_resources_endpoint(client):
    res = client.get('/api/v1/system/resources')
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["success"] is True
    assert "cpu" in data["data"]
    assert "memory" in data["data"]
    assert "disk" in data["data"]


def test_database_driven_cancellation():
    """Verifies that cancel_training_job updates the DB flag and is_job_cancelled reads it."""
    with get_db_connection() as conn:
        # Create a mock experiment job
        cursor = conn.cursor()
        cursor.execute("INSERT INTO model_configs (name, model_type, parameters, created_at) VALUES ('mock', 'nb', '{}', '2026-01-01')")
        mc_id = cursor.lastrowid
        cursor.execute(f"INSERT INTO datasets (name, filepath, file_hash, total_samples, class_distribution, uploaded_at) VALUES ('d', 'p', 'hash_{mc_id}', 10, '{{}}', '2026-01-01')")
        d_id = cursor.lastrowid
        cursor.execute(f"INSERT INTO experiments (name, dataset_id, model_config_id, random_seed, environment_meta, created_at) VALUES ('e', {d_id}, {mc_id}, 42, '{{}}', '2026-01-01')")
        e_id = cursor.lastrowid
        cursor.execute(f"INSERT INTO experiment_jobs (experiment_id, status, started_at, progress, cancel_requested) VALUES ({e_id}, 'Training', '2026-01-01', 50, 0)")
        job_id = cursor.lastrowid
        conn.commit()

    assert not is_job_cancelled(job_id)

    # Cancel via task_manager
    res = cancel_training_job(job_id)
    assert res is True
    assert is_job_cancelled(job_id) is True

    # Cleanup
    with get_db_connection() as conn:
        conn.execute("DELETE FROM experiment_jobs WHERE id = ?", (job_id,))
        conn.commit()


def test_stale_job_recovery_on_init():
    """Verifies that init_db recovers zombie/interrupted training jobs."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO model_configs (name, model_type, parameters, created_at) VALUES ('mock2', 'svm', '{}', '2026-01-01')")
        mc_id = cursor.lastrowid
        cursor.execute(f"INSERT INTO datasets (name, filepath, file_hash, total_samples, class_distribution, uploaded_at) VALUES ('d2', 'p2', 'hash_stale_{mc_id}', 10, '{{}}', '2026-01-01')")
        d_id = cursor.lastrowid
        cursor.execute(f"INSERT INTO experiments (name, dataset_id, model_config_id, random_seed, environment_meta, created_at) VALUES ('e2', {d_id}, {mc_id}, 42, '{{}}', '2026-01-01')")
        e_id = cursor.lastrowid
        cursor.execute(f"INSERT INTO experiment_jobs (experiment_id, status, started_at, progress) VALUES ({e_id}, 'Training', '2026-01-01', 30)")
        stale_job_id = cursor.lastrowid
        conn.commit()

    # Run database initialization/recovery
    init_db()

    with get_db_connection() as conn:
        job = conn.execute("SELECT status, failure_reason FROM experiment_jobs WHERE id = ?", (stale_job_id,)).fetchone()
        assert job["status"] == "Failed"
        assert "Interrupted by server restart" in job["failure_reason"]
        conn.execute("DELETE FROM experiment_jobs WHERE id = ?", (stale_job_id,))
        conn.commit()

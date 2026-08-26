"""
Integration tests for Flask API endpoints
"""

import json
import pytest
from app import app


@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


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


def test_preprocess_api_endpoint(client):
    payload = {
        "text": "Pengiriman barang cepat banget dan rapih!"
    }
    res = client.post('/api/v1/preprocess', json=payload)
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["success"] is True
    assert "case_folded" in data["data"]


def test_preprocess_api_empty_text(client):
    payload = {
        "text": ""
    }
    res = client.post('/api/v1/preprocess', json=payload)
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


def test_get_datasets_endpoint(client):
    res = client.get('/api/v1/datasets')
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["success"] is True
    assert isinstance(data["data"], list)

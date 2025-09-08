"""
Fixed tests for FastAPI application endpoints.

Tests all API endpoints with various request scenarios.
"""

import pytest
from fastapi.testclient import TestClient
from verifier.app import app

client = TestClient(app)


class TestHealthEndpoint:
    """Test health check endpoint."""
    
    def test_health_check(self):
        """Test health check endpoint returns healthy status."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "ap-verifier"


class TestRootEndpoint:
    """Test root endpoint."""
    
    def test_root_endpoint(self):
        """Test root endpoint returns service information."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "AP Calculus Verifier"
        assert data["version"] == "0.1.0"
        assert "docs" in data
        assert "health" in data


class TestDerivativeEndpoint:
    """Test derivative verification endpoint."""
    
    def test_derivative_positive_case(self):
        """Test derivative endpoint with correct derivative."""
        request_data = {
            "expr": "x^2",
            "var": "x",
            "expected": "2*x"
        }
        response = client.post("/calc/derivative", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["equivalent"] is True
    
    def test_derivative_negative_case(self):
        """Test derivative endpoint with incorrect derivative."""
        request_data = {
            "expr": "x^2",
            "var": "x",
            "expected": "x"
        }
        response = client.post("/calc/derivative", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["equivalent"] is False
    
    def test_derivative_invalid_expression(self):
        """Test derivative endpoint with invalid expression."""
        request_data = {
            "expr": "invalid_syntax",
            "var": "x",
            "expected": "1"
        }
        response = client.post("/calc/derivative", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["equivalent"] is False
        # The function should handle errors gracefully
        assert 'details' in data


class TestIntegralEndpoint:
    """Test integral verification endpoint."""
    
    def test_integral_positive_case(self):
        """Test integral endpoint with correct integral."""
        request_data = {
            "expr": "2*x",
            "var": "x",
            "expected": "x^2"
        }
        response = client.post("/calc/integral", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["equivalent"] is True
    
    def test_integral_with_constants(self):
        """Test integral endpoint with constants of integration."""
        request_data = {
            "expr": "2*x",
            "var": "x",
            "expected": "x^2 + 5",
            "constant_free": True
        }
        response = client.post("/calc/integral", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["equivalent"] is True


class TestLimitEndpoint:
    """Test limit verification endpoint."""
    
    def test_limit_positive_case(self):
        """Test limit endpoint with existing limit."""
        request_data = {
            "expr": "x^2",
            "var": "x",
            "to": "0",
            "direction": "both"
        }
        response = client.post("/calc/limit", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["equivalent"] is True
        assert data["details"]["limit_exists"] is True
        assert data["details"]["finite"] is True
    
    def test_limit_infinite_case(self):
        """Test limit endpoint with infinite limit."""
        request_data = {
            "expr": "1/x",
            "var": "x",
            "to": "0",
            "direction": "right"
        }
        response = client.post("/calc/limit", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["equivalent"] is False
        assert data["details"]["limit_exists"] is True
        assert data["details"]["finite"] is False
    
    def test_limit_nonexistent_case(self):
        """Test limit endpoint with nonexistent limit."""
        request_data = {
            "expr": "1/x",
            "var": "x",
            "to": "0",
            "direction": "both"
        }
        response = client.post("/calc/limit", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["equivalent"] is False
        assert data["details"]["limit_exists"] is False


class TestAlgebraEndpoint:
    """Test algebra equivalence endpoint."""
    
    def test_algebra_positive_case(self):
        """Test algebra endpoint with equivalent expressions."""
        request_data = {
            "lhs": "x^2 + 2*x + 1",
            "rhs": "(x + 1)^2"
        }
        response = client.post("/calc/algebra", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["equivalent"] is True
    
    def test_algebra_negative_case(self):
        """Test algebra endpoint with non-equivalent expressions."""
        request_data = {
            "lhs": "x^2",
            "rhs": "x"
        }
        response = client.post("/calc/algebra", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["equivalent"] is False


class TestDimensionalEndpoint:
    """Test dimensional analysis endpoint."""
    
    def test_dimensional_positive_case(self):
        """Test dimensional endpoint with unit expression."""
        request_data = {
            "expr": "x*m",
            "expected_unit": "m"
        }
        response = client.post("/calc/dimensional", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert "equivalent" in data
        assert "details" in data


class TestNumericProbeEndpoint:
    """Test numeric probe endpoint."""
    
    def test_numeric_probe_positive_case(self):
        """Test numeric probe endpoint with valid expression."""
        request_data = {
            "expr": "x^2 + 1",
            "num_points": 5
        }
        response = client.post("/calc/numeric-probe", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["details"]["valid_evaluations"] > 0
    
    def test_numeric_probe_constant_expression(self):
        """Test numeric probe endpoint with constant expression."""
        request_data = {
            "expr": "5",
            "num_points": 3
        }
        response = client.post("/calc/numeric-probe", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["details"]["constant_value"] == 5.0

# AP Calculus Verifier

A FastAPI service for verifying AP Calculus problems with Computer Algebra System (CAS) and units checking.

## Features

- **Derivative Verification**: Check if derivatives match expected results
- **Integral Verification**: Verify integrals with optional constant handling
- **Limit Analysis**: Check if limits exist and are finite
- **Algebraic Equivalence**: Verify if expressions are algebraically equivalent
- **Dimensional Analysis**: Check units and dimensions
- **Numeric Probing**: Sanity checks with random point evaluation

## Installation

```bash
cd py/verifier
poetry install
```

## Running the Service

```bash
# Development
poetry run uvicorn src.verifier.app:app --reload

# Production
poetry run uvicorn src.verifier.app:app --host 0.0.0.0 --port 8000
```

## Docker

```bash
# Build image
docker build -t ap-verifier .

# Run container
docker run -p 8000:8000 ap-verifier
```

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Calculus Verification
- `POST /calc/derivative` - Verify derivatives
- `POST /calc/integral` - Verify integrals
- `POST /calc/limit` - Check limits
- `POST /calc/algebra` - Check algebraic equivalence
- `POST /calc/dimensional` - Check units/dimensions
- `POST /calc/numeric-probe` - Numeric sanity checks

## Testing

```bash
# Run all tests
poetry run pytest -q

# Run with coverage
poetry run pytest --cov=src/verifier --cov-report=html

# Run specific test file
poetry run pytest src/verifier/tests/test_calculus.py -v
```

## Security

The service uses strict parsing allowlists to prevent code injection:
- Only safe SymPy functions are allowed
- Symbol names must match safe patterns
- No evaluation of arbitrary code

## Examples

### Derivative Verification
```bash
curl -X POST "http://localhost:8000/calc/derivative" \
  -H "Content-Type: application/json" \
  -d '{"expr": "x^2", "var": "x", "expected": "2*x"}'
```

### Integral Verification
```bash
curl -X POST "http://localhost:8000/calc/integral" \
  -H "Content-Type: application/json" \
  -d '{"expr": "2*x", "var": "x", "expected": "x^2", "constant_free": true}'
```

### Limit Checking
```bash
curl -X POST "http://localhost:8000/calc/limit" \
  -H "Content-Type: application/json" \
  -d '{"expr": "x^2", "var": "x", "to": "0", "direction": "both"}'
```

## Development

The service follows strict coding standards:
- Type hints for all functions
- Comprehensive error handling
- Extensive test coverage
- Black code formatting
- isort import sorting

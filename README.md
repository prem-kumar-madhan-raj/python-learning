# StockFlow

A multi-tenant, GST-aware billing and inventory API, built with FastAPI, PostgreSQL, and SQLAlchemy — the backend for a small-business billing/warehouse SaaS.

**Status:** early development (Phase 2 of the build — auth, multi-tenancy, and core CRUD for products/customers). Not production-ready yet.

## Tech stack

- **API:** FastAPI
- **Database:** PostgreSQL
- **ORM / migrations:** SQLAlchemy + Alembic
- **Auth:** JWT (python-jose) + bcrypt password hashing (passlib)
- **Package management:** uv

## Project structure

```
test-project/
├── src/test_project/
│   ├── main.py              # FastAPI app, router registration
│   ├── auth.py               # password hashing, JWT, auth dependencies (get_current_user, require_role)
│   ├── routers/
│   │   ├── auth.py           # /auth/signup, /auth/login
│   │   ├── products.py       # /products CRUD
│   │   └── customers.py      # /customers CRUD
│   └── models/
│       ├── db_models.py      # SQLAlchemy ORM models (Tenant, User, Product, Customer)
│       └── models.py         # Pydantic request/response schemas
├── alembic/                  # database migrations
├── pyproject.toml
└── uv.lock
```

## Prerequisites

- Python 3.14+
- [uv](https://docs.astral.sh/uv/) installed
- PostgreSQL running locally (or accessible via a connection string)

## Setup

1. **Clone the repo and install dependencies:**
   ```bash
   git clone <your-repo-url>
   cd test-project
   uv sync
   ```

2. **Create a local Postgres database** (if you don't already have one):
   ```bash
   psql postgres -c "CREATE DATABASE stockflow;"
   ```

3. **Set up environment variables.** Copy the example file and fill in your own values:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env`:
   ```
   DATABASE_URL=postgresql://YOUR_USERNAME@localhost/stockflow
   SECRET_KEY=<generate a real random value — see note below>
   ```
   Generate a real secret key with:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```

4. **Run database migrations:**
   ```bash
   uv run alembic upgrade head
   ```

5. **Run the API:**
   ```bash
   uv run uvicorn test_project.main:app --reload
   ```

6. **Open the interactive docs:**
   ```
   http://localhost:8000/docs
   ```

## Running tests

```bash
uv run pytest -v
```

## Code quality

```bash
uv run ruff check .
uv run mypy .
```

## API overview

All endpoints except `/`, `/auth/signup`, and `/auth/login` require a `Bearer` token, obtained from signup/login. All data is scoped per-tenant — each business only ever sees its own products/customers.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | none | Health check |
| POST | `/auth/signup` | none | Create a new business (tenant) + admin user |
| POST | `/auth/login` | none | Log in, get a token |
| GET | `/products` | any logged-in role | List this tenant's products |
| GET | `/products/{id}` | any logged-in role | Get one product |
| POST | `/products` | admin | Create a product |
| PUT | `/products/{id}` | admin | Update a product (partial) |
| DELETE | `/products/{id}` | admin | Delete a product |
| GET | `/customers` | any logged-in role | List this tenant's customers |
| GET | `/customers/{id}` | admin, cashier | Get one customer |
| POST | `/customers` | admin, cashier | Create a customer |
| PUT | `/customers/{id}` | admin | Update a customer (partial) |
| DELETE | `/customers/{id}` | admin | Delete a customer |

## Roadmap

- [x] Multi-tenant auth (signup/login, JWT, RBAC)
- [x] Tenant-scoped product & customer CRUD
- [ ] GST billing engine + PDF invoices
- [ ] Real-time, concurrency-safe stock via WebSockets
- [ ] Warehouse module (stock ledger, transfers)
- [ ] Payments (Razorpay) + webhooks
- [ ] Background jobs (reports, alerts)
- [ ] Dockerized deployment (VPS + Nginx + HTTPS)

## Known limitations (in progress)

- Database session is currently a single shared instance, not yet request-scoped — fine for local single-user testing, needs fixing before concurrent load.
- No `.env`-based config loading wired into the app yet — see `.env.example`.
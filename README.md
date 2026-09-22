# StockFlow — Architecture & Implementation Guide

A complete reference for everything implemented so far: what each piece is, why it exists, and how it all connects. Read this whenever you need to re-orient yourself in the codebase.

---

## 1. What StockFlow Is

A **multi-tenant** GST-aware billing and inventory SaaS. "Multi-tenant" means one single deployment serves many independent businesses — each business (a **tenant**) signs up, and from that point on only ever sees its own products, customers, and invoices. No business can ever see another's data.

```mermaid
graph TB
    subgraph "Business A"
        A1[Admin] --> A2[Cashier]
    end
    subgraph "Business B"
        B1[Admin] --> B2[Cashier]
    end
    A1 -->|sees only| DA[(Business A's data)]
    A2 -->|sees only| DA
    B1 -->|sees only| DB[(Business B's data)]
    B2 -->|sees only| DB
    DA -.stored in.-> DB2[(One shared PostgreSQL database)]
    DB -.stored in.-> DB2
```

Both businesses' data lives in the **same** database and the **same** tables — isolation is enforced entirely in code (every row is tagged with a `tenant_id`, every query filters by it), not by separate databases per business. This is simpler to run than separate-database-per-tenant, and is the standard approach for SaaS at this scale.

---

## 2. High-Level Architecture

```mermaid
graph TD
    Browser["🖥️ Browser<br/>(React + TypeScript)"]
    API["⚙️ FastAPI App<br/>(Python)"]
    DB[("🗄️ PostgreSQL<br/>(hosted on Neon)")]
    Env["🔐 .env file<br/>(secrets, local only)"]

    Browser -- "HTTPS requests<br/>(JSON + Bearer token)" --> API
    API -- "SQL via SQLAlchemy" --> DB
    Env -. "read at startup" .-> API
```

- **Browser (React/TS):** everything the user sees and clicks — forms, tables, the billing screen. Talks to the backend only through HTTP requests to the API.
- **FastAPI app:** the backend. Validates requests, enforces auth/permissions, talks to the database, returns JSON (or a PDF, for invoices).
- **PostgreSQL (Neon):** where every table lives — tenants, users, products, customers, invoices. Hosted in the cloud so it's reachable from anywhere, not just your laptop.
- **.env file:** holds real secrets (database credentials, JWT signing key) — lives only on your machine (and later, your deployment server), **never** committed to Git.

---

## 3. Prerequisites

Before touching this project, make sure you have:

| Requirement | Why it's needed | Check with |
|---|---|---|
| **Python 3.14+** | The language everything is written in | `python --version` |
| **uv** | Manages dependencies and the virtual environment | `uv --version` |
| **A Neon account (free)** | Hosts the PostgreSQL database in the cloud | Sign up at neon.tech |
| **Git** | Version control, pushing to GitHub | `git --version` |
| **A code editor** (VS Code recommended) | Editing the code | — |
| **`psql` or a GUI DB client** (optional but recommended) | Inspecting the database directly when debugging | `psql --version` |

You do **not** need a local PostgreSQL install — this project connects to Neon (cloud) even during local development.

---

## 4. Tech Stack — What and Why

| Piece | What it is | Why this one |
|---|---|---|
| **FastAPI** | Python web framework | Automatic request validation from type hints, auto-generated `/docs`, native async support |
| **PostgreSQL** | Relational database | Enforces real foreign-key constraints, supports row-locking for safe concurrent writes (needed for invoice numbering, and later stock updates) |
| **Neon** | Cloud PostgreSQL host | Genuinely free tier, no credit card, doesn't pause/delete on inactivity, still just standard Postgres |
| **SQLAlchemy** | ORM (Object-Relational Mapper) | Lets database tables be defined and queried as Python classes/objects instead of raw SQL strings |
| **Alembic** | Migration tool | Tracks schema changes over time as versioned, replayable files — like Git history, but for your database structure |
| **Pydantic** | Data validation library | Defines the *shape* of incoming/outgoing JSON; FastAPI uses it to auto-reject malformed requests |
| **pydantic-settings** | Config loader | Reads `.env` into a typed, validated settings object — fails loudly at startup if a required secret is missing |
| **passlib + bcrypt** | Password hashing | Never store real passwords — store a one-way hash instead |
| **python-jose** | JWT library | Issues and verifies signed login tokens |
| **uv** | Python package/project manager | Fast, modern replacement for pip + venv, manages dependencies via `pyproject.toml` + `uv.lock` |
| **ReportLab** | PDF generation | Pure Python, no system-level dependencies (unlike WeasyPrint, which needs GTK — a real problem on Windows) |

---

## 5. Project Structure

```
test-project/
├── 📄 pyproject.toml          # project metadata + dependencies (uv-managed)
├── 📄 uv.lock                 # exact locked dependency versions
├── 📄 .env                    # REAL secrets — gitignored, never committed
├── 📄 .env.sample              # template showing what .env needs, safe to commit
├── 📄 .gitignore
├── 📁 alembic/                 # database migration history
│   ├── env.py                 # tells Alembic how to connect + what models exist
│   └── versions/               # one file per schema change, in order
└── 📁 src/test_project/
    ├── 📄 main.py               # creates the FastAPI app, registers all routers
    ├── 📄 auth.py                # password hashing, JWT create/verify, get_current_user, require_role
    ├── 📄 config.py              # reads .env into a validated Settings object
    ├── 📄 invoice.py             # PURE calculation logic — LineItem, Invoice, create_invoice (no DB, no HTTP)
    ├── 📄 billing.py             # DB-touching logic — get_next_invoice_number (safe sequential numbering)
    ├── 📄 pdf.py                 # generate_invoice_pdf — turns an Invoice into PDF bytes
    ├── 📁 routers/                # one file per group of API endpoints
    │   ├── auth.py               # /auth/signup, /auth/login
    │   ├── products.py           # /products CRUD
    │   ├── customers.py          # /customers CRUD
    │   └── invoice.py            # /invoices — create + PDF download
    └── 📁 models/
        ├── db_models.py          # SQLAlchemy ORM models = actual DB tables
        └── models.py              # Pydantic schemas = API request/response shapes
```

**Why `invoice.py` and `billing.py` are separate files, and why it matters:** `invoice.py` knows nothing about databases or HTTP — given a list of items, it just calculates totals. `billing.py` is the opposite: it exists specifically to talk to the database. This split means the calculation logic can be tested, reused, or even copied into a different project with zero changes — and it's *why* deferring tax logic (GST) was easy to decide: tax calculation will be its own similarly-decoupled module, plugged into `invoice.py`'s `Invoice.total`, without touching anything else.

---

## 6. File-by-File Reference

Click each file below to expand its full purpose, what it contains, and why it's built the way it is.

<details>
<summary><code>pyproject.toml</code></summary>

**What it is:** The project's core config file — lists dependencies, project metadata, and tool settings (Ruff, mypy) all in one place. This is the modern Python standard, replacing the old separate `requirements.txt` + `setup.py`.

**Why it matters:** `uv` reads this to know what to install. Anyone cloning the repo runs `uv sync` and gets an identical environment, dependency-for-dependency.
</details>

<details>
<summary><code>uv.lock</code></summary>

**What it is:** The exact, pinned versions of every dependency (including sub-dependencies you never installed directly) that were actually resolved and installed.

**Why it matters:** `pyproject.toml` says "I need `fastapi>=0.115`" (a range); `uv.lock` says "specifically `0.115.2`, and here's the exact version of every package it depends on too." This guarantees everyone working on the project — and later, your deployment server — gets byte-for-byte the same dependency tree, not just "something compatible." Never edit this file by hand.
</details>

<details>
<summary><code>.env</code> (never committed) / <code>.env.sample</code> (committed)</summary>

**What `.env` is:** Real secrets — your actual Neon connection string, your actual JWT signing key. Lives only on your machine (and later, your deployment server's environment). Excluded from Git via `.gitignore`.

**What `.env.sample` is:** A safe-to-commit template showing the *shape* of what's needed, with placeholder values, so anyone cloning the repo knows exactly what to create locally.

**Why this split exists:** the connection string contains a real database password. If it were hardcoded in a source file, pushing to GitHub — even a private repo — would expose it. Environment variables are the standard mechanism for keeping code shareable while keeping credentials private.
</details>

<details>
<summary><code>.gitignore</code></summary>

**What it is:** Tells Git which files/folders to never track — `.env` (secrets), `__pycache__/` (compiled bytecode, regenerated automatically), `.venv` (your local virtual environment, regenerated by `uv sync`), tool caches, and any stray `*.db` file (this project uses Postgres, never a local SQLite file).

**Why it matters:** without it, secrets and huge/irrelevant auto-generated files would get committed, bloating the repo and potentially leaking credentials.
</details>

<details>
<summary><code>alembic.ini</code> + <code>alembic/env.py</code></summary>

**What they are:** Alembic's configuration. `alembic.ini` is the top-level settings file; `alembic/env.py` is a Python script Alembic runs to know *how* to connect to the database and *which* models define the expected schema (`target_metadata = Base.metadata`).

**Why it matters:** this is what lets `alembic revision --autogenerate` compare your `db_models.py` classes against the real database and generate the exact SQL needed to reconcile any differences — the mechanism behind every schema change in this project.
</details>

<details>
<summary><code>alembic/versions/*.py</code></summary>

**What they are:** One file per schema change, in chronological order, each with an `upgrade()` function (apply this change) and a `downgrade()` function (undo it). Auto-generated by `alembic revision --autogenerate`, always reviewed by hand before being applied.

**Why it matters:** this is the database's own version history — exactly like Git commits, but for table structure instead of code. Running `alembic upgrade head` against a brand-new database replays every one of these in order, ending up with the exact current schema.
</details>

<details>
<summary><code>src/test_project/config.py</code></summary>

**What it is:** Defines a `Settings` class (`pydantic_settings.BaseSettings`) that reads `DATABASE_URL`, `SECRET_KEY`, and `ALGORITHM` from `.env`, validates them, and exposes them as a single `settings` object every other file imports from.

**Why it matters:** centralizes all config reading in one place. If a required value is missing from `.env`, the app fails immediately and loudly on startup — not confusingly, three requests later.
</details>

<details>
<summary><code>src/test_project/models/db_models.py</code></summary>

**What it is:** Every SQLAlchemy ORM model (`Tenant`, `User`, `Product`, `Customer`, `TenantInvoiceCounter`, `Invoice`, `InvoiceLineItem`) — each class maps directly to a real database table. Also defines the `engine`, `SessionLocal`, and the `get_db()` dependency used to hand every request its own database session.

**Why it matters:** this file is the single source of truth for what the database *should* look like — Alembic compares against it, and every query in the app goes through the models defined here.
</details>

<details>
<summary><code>src/test_project/models/models.py</code></summary>

**What it is:** Pydantic schemas (`SignUpRequest`, `ProductCreate`, `CustomerUpdate`, etc.) — these define the *shape* of data coming in through the API (request bodies) and, where used, going back out (responses).

**Why it matters:** FastAPI validates every incoming request against these automatically, rejecting malformed data with a clear `422` before your route code ever runs. Deliberately kept separate from `db_models.py` — an API input shape and a database table shape are related but not identical (e.g. a signup request never includes `tenant_id` or `role`, even though the `User` database model has both).
</details>

<details>
<summary><code>src/test_project/auth.py</code></summary>

**What it is:** Password hashing (`hash_password`, `verify_password`), JWT creation/verification (`create_access_token`), and the two core FastAPI dependencies: `get_current_user` (decodes the token, returns `{user_id, tenant_id, role}`) and `require_role(*roles)` (builds a dependency that additionally checks the role).

**Why it matters:** this is the security backbone of the whole app. Every protected route depends on `get_current_user` or `require_role` from here — it's the only place token verification logic lives, so it only needs to be gotten right once.
</details>

<details>
<summary><code>src/test_project/invoice.py</code></summary>

**What it is:** Pure calculation logic — `LineItem`, `Invoice` (dataclasses), and `create_invoice()`. Given a list of line items, computes `subtotal`/`total`. No database, no HTTP, no side effects.

**Why it matters:** kept deliberately decoupled so it can be tested and reasoned about in complete isolation, and so tax logic (GST, deferred to later) can be added here later — as one extra field/step — without touching any other file in the project.
</details>

<details>
<summary><code>src/test_project/billing.py</code></summary>

**What it is:** `get_next_invoice_number(db, tenant_id)` — generates the next sequential invoice number for a tenant, safely, even under concurrent requests, by locking that tenant's counter row (`with_for_update()`) during the update.

**Why it matters:** this is the first real concurrency-safety mechanism in the project — the same pattern (lock a row, read, modify, commit, release) that Phase 4's real-time stock deduction will reuse for a much higher-stakes case (preventing overselling).
</details>

<details>
<summary><code>src/test_project/pdf.py</code></summary>

**What it is:** `generate_invoice_pdf()` — takes an invoice number, customer name, and a calculated `Invoice`, and returns raw PDF bytes using ReportLab, built entirely in memory (`io.BytesIO`, no file ever written to disk).

**Why it matters:** isolates all PDF-rendering detail (fonts, table layout, styling) in one place, separate from the route that serves it — the route just asks for bytes and returns them.
</details>

<details>
<summary><code>src/test_project/main.py</code></summary>

**What it is:** Creates the `FastAPI()` app instance and registers every router (`auth`, `products`, `customers`, `invoice`) under its URL prefix and tag.

**Why it matters:** the single entry point — `uvicorn test_project.main:app` starts everything from here. Keeping it tiny (just wiring, no logic) means the actual behavior of each feature lives in its own router file, not tangled together in one giant file.
</details>

<details>
<summary><code>src/test_project/routers/auth.py</code></summary>

**What it is:** `POST /auth/signup` and `POST /auth/login`. Signup always creates a brand-new tenant + admin user (never joins an existing tenant by name); login verifies credentials and issues a fresh token.

**Why it matters:** the only two unauthenticated routes in the whole app — everything else requires a token obtained here first.
</details>

<details>
<summary><code>src/test_project/routers/products.py</code> / <code>customers.py</code></summary>

**What they are:** Full CRUD (`GET`/`POST`/`PUT`/`DELETE`) for products and customers, every route tenant-scoped via `current_user["tenant_id"]`, write operations further restricted by role via `require_role(...)`.

**Why it matters:** the reference pattern for tenant-scoped CRUD in this project — every future entity (invoices, stock transfers, etc.) follows the exact same shape: scoped lookup, `404` on cross-tenant access, role-gated writes.
</details>

<details>
<summary><code>src/test_project/routers/invoice.py</code></summary>

**What it is:** `POST /invoices` (validates the customer exists for this tenant, runs `create_invoice()` for the math, `get_next_invoice_number()` for the number, persists `Invoice` + `InvoiceLineItem` rows) and `GET /invoices/{id}/pdf` (re-fetches the invoice, regenerates the PDF on demand).

**Why it matters:** the clearest example in the codebase of orchestration-only route code — every actual piece of logic (calculation, numbering, PDF rendering) lives in its own dedicated module; this file just wires them together in the right order.
</details>

---

## 7. Database Schema

### Entity-Relationship Diagram

```mermaid
erDiagram
    TENANTS ||--o{ USERS : "has"
    TENANTS ||--o{ PRODUCTS : "owns"
    TENANTS ||--o{ CUSTOMERS : "owns"
    TENANTS ||--o{ INVOICES : "owns"
    TENANTS ||--|| TENANT_INVOICE_COUNTERS : "has one"
    CUSTOMERS ||--o{ INVOICES : "is billed"
    INVOICES ||--o{ INVOICE_LINE_ITEMS : "contains"

    TENANTS {
        int id PK
        string business_name
        timestamp created_at
    }
    USERS {
        int id PK
        string email UK
        string hashed_password
        int tenant_id FK
        string role
    }
    PRODUCTS {
        int id PK
        string name
        string description
        numeric price
        int qty
        int tenant_id FK
    }
    CUSTOMERS {
        int id PK
        string name
        string phone
        string gstin
        int tenant_id FK
    }
    TENANT_INVOICE_COUNTERS {
        int tenant_id PK
        int last_number
    }
    INVOICES {
        int id PK
        string invoice_number
        int tenant_id FK
        int customer_id FK
        numeric sub_total
        numeric total
        timestamp created_at
    }
    INVOICE_LINE_ITEMS {
        int id PK
        int invoice_id FK
        string description
        int quantity
        numeric unit_price
    }
```

### Table-by-table

**`tenants`** — one row per business using StockFlow. The root of everything; every other table (except `invoice_line_items`, which is scoped indirectly through its invoice) points back to a tenant.

**`users`** — login accounts. Each belongs to exactly one tenant (`tenant_id`), has a hashed password (never plaintext), and a `role` (`admin` or `cashier` so far) controlling what they're allowed to do. `email` is globally unique across the whole system (one email = one account = one tenant).

**`products`** — inventory items. Tenant-scoped: Business A's "Pen" and Business B's "Pen" are two completely separate rows, never confused.

**`customers`** — people/businesses a tenant sells to. Also tenant-scoped — the same real person buying from two different StockFlow businesses correctly shows up as two unrelated rows, one per tenant, since each business's record of that relationship is independently theirs.

**`tenant_invoice_counters`** — one row per tenant, tracking the last invoice number issued. `tenant_id` is *both* the primary key and a foreign key here (shown as `PK` in the diagram above — Mermaid doesn't support labeling a column as both `PK` and `FK` at once, but in the real schema it's declared with `ForeignKey("tenants.id")` and set as `primary_key=True`). This table exists specifically to make invoice numbering **safe under concurrency**: two simultaneous invoice-creation requests correctly get different, sequential numbers because this row gets locked (`with_for_update()`) while one request is using it, forcing the other to wait its turn rather than both reading the same "last number" and colliding.

**`invoices`** — one row per created invoice: which tenant, which customer, the generated `invoice_number`, and the calculated `sub_total`/`total`.

**`invoice_line_items`** — one row **per item** on an invoice (not a single JSON blob of items). Real, separate rows here mean you can later run reports like "what are my top-selling products this month" with a normal SQL aggregation — a JSON column would make that painful.

---

## 8. Configuration & Secrets — `.env` Explained

**The problem this solves:** your code needs to know two sensitive things — the database connection string (with real credentials) and the secret key used to sign login tokens. These must never appear as plain text inside a source file, because source files get committed to Git and potentially made public.

**The flow:**

```mermaid
graph LR
    EnvFile["📄 .env<br/>(real secrets, gitignored)"] --> Config["config.py<br/>(Settings class)"]
    Config --> DBModels["db_models.py<br/>settings.database_url"]
    Config --> Auth["auth.py<br/>settings.secret_key"]
```

`.env` (never committed):
```
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
SECRET_KEY=a-real-random-generated-value
```

`config.py` reads it into a validated object:
```python
class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    class Config:
        env_file = ".env"

settings = Settings()
```

If `.env` is missing or a required value isn't set, this **fails immediately at startup** with a clear error — not three requests later with a confusing crash. Every other file that needs a secret imports `settings` from here, never reads `.env` directly.

`.env.sample` is the **safe-to-commit** counterpart — it shows the shape of what's needed, with placeholder values, so anyone cloning the repo knows what to create in their own local `.env`.

---

## 9. Database Connection Lifecycle

**The problem this solves:** a single shared database connection reused across every request eventually causes hard-to-reproduce bugs once multiple requests happen close together. The fix is to hand each request its own, freshly created connection, and guarantee it's cleaned up afterward — success or failure.

```python
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine)

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

```mermaid
sequenceDiagram
    participant R as Route Handler
    participant D as get_db()
    participant S as New Session
    participant DB as PostgreSQL

    R->>D: Depends(get_db)
    D->>S: create SessionLocal()
    D-->>R: yield session
    R->>S: db.execute(...)
    S->>DB: SQL query
    DB-->>S: rows
    S-->>R: results
    R-->>D: handler finishes (or raises)
    D->>S: db.close()  (always runs, via finally)
```

Every route that touches the database declares `db: Session = Depends(get_db)` as a parameter — FastAPI calls `get_db()` fresh for every single incoming request, hands the route a brand-new session, and closes it automatically once the route is done, regardless of whether it succeeded or raised an error.

---

## 10. Authentication & Authorization Flow

**Signup:**
```mermaid
sequenceDiagram
    participant U as User
    participant A as /auth/signup
    participant DB as Database

    U->>A: business_name, email, password
    A->>DB: check if email already exists
    alt email exists
        A-->>U: 400 Email already registered
    else new email
        A->>DB: INSERT new Tenant (always brand-new, never joins existing)
        A->>DB: INSERT new User (role hardcoded "admin")
        A->>A: create signed JWT (user_id, tenant_id, role)
        A-->>U: {access_token, token_type}
    end
```

**A protected request, afterward:**
```mermaid
sequenceDiagram
    participant U as User
    participant API as Any protected route
    participant Auth as get_current_user
    participant DB as Database

    U->>API: request + "Authorization: Bearer <token>"
    API->>Auth: Depends(get_current_user)
    Auth->>Auth: decode + verify JWT signature
    alt invalid/expired token
        Auth-->>U: 401 Unauthorized
    else valid token
        Auth-->>API: {user_id, tenant_id, role}
        API->>DB: query WHERE tenant_id = current_user["tenant_id"]
        DB-->>API: only this tenant's rows
        API-->>U: 200 + data
    end
```

**Key rules enforced everywhere, no exceptions:**
- `tenant_id` and `role` are **only ever read from the verified JWT** (`current_user`), never trusted from anything the client sends in a request body
- A resource that exists but belongs to a different tenant returns **`404`, not `403`** — a `403` would confirm to an outsider that the ID exists at all, which is itself a small information leak
- **RBAC (`require_role`)** sits on top of `get_current_user`: some routes (like creating a product) additionally check `current_user["role"]` is in an allowed list, returning `403` if not

---

## 11. Invoice Creation Flow — All the Pieces Working Together

```mermaid
sequenceDiagram
    participant U as User
    participant R as POST /invoices
    participant Inv as invoice.py (pure calc)
    participant Bill as billing.py (DB)
    participant DB as Database

    U->>R: customer_id + line items
    R->>DB: find customer (tenant-scoped)
    alt customer not found
        R-->>U: 404
    end
    R->>Inv: create_invoice(items)
    alt invalid items (empty, negative qty/price)
        Inv-->>R: raises ValueError
        R-->>U: 422
    else valid
        Inv-->>R: Invoice(subtotal, total)
    end
    R->>Bill: get_next_invoice_number(tenant_id)
    Bill->>DB: lock counter row, increment, commit
    DB-->>Bill: next number
    Bill-->>R: "INVOICE-0001"
    R->>DB: INSERT Invoice row
    R->>DB: INSERT InvoiceLineItem rows
    R-->>U: {invoice_number, subtotal, total}
```

This is the clearest example in the whole codebase of the layered design: the **route** only orchestrates, **`invoice.py`** only calculates, **`billing.py`** only handles the DB-side numbering guarantee. Each piece is small enough to reason about on its own.

**PDF download** (`GET /invoices/{id}/pdf`) re-fetches the invoice + its line items from the database, re-runs them through the same `create_invoice()` calculation (so the PDF's numbers are always derived the same way as the original), and hands the result to `pdf.py`'s `generate_invoice_pdf`, which builds the PDF in memory (`io.BytesIO`) and returns raw PDF bytes — no file is ever written to disk.

---

## 12. How the Frontend Will Connect

The React/TypeScript app is a separate concern from everything above — it talks to the API purely over HTTP, the same way `/docs` or `curl` does.

```mermaid
graph LR
    subgraph "React App"
        Login[Login/Signup Page]
        Products[Products Page]
        Customers[Customers Page]
        Billing[Billing/Invoice Page]
    end
    Login -->|"POST /auth/login"| API
    Products -->|"GET/POST/PUT/DELETE /products"| API
    Customers -->|"GET/POST/PUT/DELETE /customers"| API
    Billing -->|"POST /invoices, GET /invoices/id/pdf"| API
    API[FastAPI Backend]
```

- After login, the JWT is stored client-side (in memory, or `localStorage`) and attached as `Authorization: Bearer <token>` on every subsequent request
- The UI should also hide actions a user's `role` doesn't permit (e.g. no "Add Product" button for a cashier) — even though the backend already rejects it, showing a button that always fails is a poor experience
- TypeScript types on the frontend should mirror the Pydantic schemas (`ProductCreate`, `CustomerCreate`, etc.) so a backend field rename is caught by the frontend's own type checker

---

## 13. Current Status

**Implemented:**
- ✅ Multi-tenant signup/login with JWT
- ✅ RBAC (`admin`, `cashier`)
- ✅ Tenant-scoped Product & Customer CRUD
- ✅ Per-request DB sessions (`get_db`)
- ✅ Cloud Postgres (Neon) + `.env`-based config
- ✅ Invoice creation (no tax yet) with safe sequential numbering
- ✅ PDF invoice generation

**Deferred, deliberately, to be added later:**
- ⏳ GST tax calculation (CGST/SGST/IGST + HSN codes)
- ⏳ Automated test suite for Phase 3 (invoice/billing/PDF) — to be done as one dedicated pass alongside GST
- ⏳ AI features (copilot, forecasting, OCR) — revisit after core product is complete

**Not yet built:**
- Real-time stock (WebSockets, concurrency-safe deduction)
- Warehouse/stock transfer module
- Payments (Razorpay) + webhooks
- Background jobs
- Frontend UI (React)
- Dockerized deployment

---

## 14. Running This Locally — Step by Step

Follow these in order. Each step says exactly what should happen and what you should see before moving to the next one — if what you see doesn't match, stop there and fix it before continuing, since later steps will fail confusingly otherwise.

### Step 0 — Prerequisites
You need:
- **Python 3.14+** installed
- **uv** installed — check with:
  ```bash
  uv --version
  ```
  **You should see:** something like `uv 0.x.x`. If you get "command not found," install uv first (see Day 6 setup) before continuing.
- A **Neon** (or other Postgres) database already created, with its connection string in hand (see Section 6)

### Step 1 — Get into the project folder
```bash
cd path\to\test-project
```
**You should see:** your prompt now shows you're inside `test-project` — the folder that directly contains `pyproject.toml`. **This is important**: almost every command below only works correctly from this exact folder, not from `src/test_project/` or anywhere else. If you're not sure, run:
```bash
dir        # Windows
ls         # Mac/Linux
```
**You should see** `pyproject.toml`, `uv.lock`, `alembic.ini`, and a `src/` folder listed. If you don't see `pyproject.toml`, you're in the wrong folder — navigate to the right one before continuing.

### Step 2 — Install dependencies
```bash
uv sync
```
**What happens:** uv reads `pyproject.toml` and `uv.lock`, creates a `.venv` folder inside your project (if one doesn't already exist), and installs every dependency (FastAPI, SQLAlchemy, etc.) into it — isolated from anything else on your machine.
**You should see:** a list of packages being installed/resolved, ending with something like `Installed XX packages` and no red error text. This can take 30 seconds to a couple of minutes the first time.
**Common issue:** if you see a warning like `VIRTUAL_ENV=... does not match the project environment path` — that's harmless (it just means some *other* virtual environment is currently active in your shell); it will not stop `uv sync` from working correctly, since `uv` always uses the project's own `.venv` regardless.

### Step 3 — Set up your environment variables
```bash
copy .env.sample .env      # Windows
cp .env.sample .env        # Mac/Linux
```
**What happens:** creates your real, local `.env` file as a copy of the template.
**You should see:** a new `.env` file now exists in the project root (check with `dir`/`ls` again).

**Now open `.env` in a text editor and fill in real values:**
```
DATABASE_URL=postgresql://YOUR_NEON_CONNECTION_STRING_HERE?sslmode=require
SECRET_KEY=<paste output of the command below>
```
Generate a real secret key:
```bash
uv run python -c "import secrets; print(secrets.token_hex(32))"
```
**You should see:** a long random string of letters/numbers printed — copy that entire string as your `SECRET_KEY` value in `.env`. **Do not** leave the placeholder text (`replace-me-with-a-real-generated-secret`) in place — the app will still start with the placeholder, but it means your tokens aren't actually secure.

### Step 4 — Apply database migrations
```bash
uv run alembic upgrade head
```
**What happens:** Alembic connects to the database specified in your `.env`'s `DATABASE_URL`, checks which migrations have already been applied (none, if this is a brand-new database), and runs every migration in order — creating the `tenants`, `users`, `products`, `customers`, `tenant_invoice_counters`, `invoices`, and `invoice_line_items` tables.
**You should see:** several lines like:
```
INFO  [alembic.runtime.migration] Running upgrade  -> xxxxxxxx, initial schema
INFO  [alembic.runtime.migration] Running upgrade xxxxxxxx -> yyyyyyyy, add sku to products
...
```
ending without any Python traceback/error. **No output at all, or an error mentioning `ModuleNotFoundError` or `could not connect`, means something's wrong** — see Troubleshooting below.

**Verify it actually worked** — connect to your database directly and check:
```bash
psql "YOUR_DATABASE_URL_HERE"
```
```sql
\dt
```
**You should see:** a list of tables including `tenants`, `users`, `products`, `customers`, `invoices`, `invoice_line_items`, `tenant_invoice_counters`, and `alembic_version`.

### Step 5 — Start the server
```bash
uv run uvicorn test_project.main:app --reload
```
**What happens:** starts your FastAPI app on your local machine, watching for file changes and auto-restarting when you edit code.
**You should see:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Application startup complete.
```
**If it crashes immediately** with a traceback instead of this — read the last few lines of the traceback carefully (it'll usually be an import error or a missing `.env` value) before assuming something bigger is broken.

### Step 6 — Confirm it's actually working
Open your browser and go to:
```
http://127.0.0.1:8000/docs
```
**You should see:** a page titled with your API's name, listing every endpoint grouped by tag (`auth`, `products`, `customers`, `invoices`) — this is FastAPI's interactive documentation, auto-generated from your code.

**Do one real end-to-end test right now, don't just admire the page:**
1. Expand `POST /auth/signup`, click "Try it out," fill in a test `business_name`/`email`/`password`, click Execute
2. **You should see:** a `200` response with `{"access_token": "...", "token_type": "bearer"}`
3. Copy that token, click the padlock/Authorize button near the top of the page, paste it in, confirm
4. Expand `GET /products`, Try it out, Execute
5. **You should see:** a `200` response with an empty list `[]` (since this is a fresh business with no products yet) — not an error

If all of that works, your local setup is fully confirmed end-to-end: environment variables loaded correctly, database connected, migrations applied, auth working.

### Step 7 — Stop the server
```
CTRL + C
```
in the terminal where it's running.

---

### Troubleshooting — matched to what's most likely to actually go wrong

| Symptom | Likely cause | Fix |
|---|---|---|
| `uv: command not found` | uv isn't installed, or not on PATH | Reinstall uv, restart your terminal afterward |
| `ModuleNotFoundError: No module named 'test_project'` | You're running a command from the wrong folder, or running a file directly instead of as a module | `cd` into the folder containing `pyproject.toml`; use `uv run python -m test_project.xxx`, never `python xxx.py` directly |
| Alembic: `could not connect to server` / `connection refused` | `DATABASE_URL` in `.env` is wrong, or missing `?sslmode=require` for Neon | Re-copy the exact connection string from your Neon dashboard |
| Alembic: `FATAL: password authentication failed` | Wrong credentials in `DATABASE_URL` | Regenerate/re-copy the connection string from Neon; check for stray spaces/line breaks when pasting |
| App starts, but every request returns a 500 error | `.env` wasn't loaded, or `SECRET_KEY`/`DATABASE_URL` missing | Confirm `.env` exists in the project root (not inside `src/`), confirm `config.py`'s `env_file = ".env"` path is correct relative to where you run `uvicorn` from |
| `/docs` loads, but every route 401s even right after login | Forgot to click "Authorize" and paste the token, or pasted it with an extra `Bearer ` prefix (the Authorize field wants just the raw token) | Re-click Authorize, paste only the token string itself |
| Alembic migration references a table/column that already exists | You've run `upgrade head` against a database that already has some tables from an earlier manual setup | Check `alembic_version` table / migration history matches what you expect before proceeding — don't guess, ask before forcing anything
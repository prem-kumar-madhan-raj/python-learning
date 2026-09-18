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

## 3. Tech Stack — What and Why

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

## 4. Project Structure

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

## 5. Database Schema

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
        int tenant_id PK_FK
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

**`tenant_invoice_counters`** — one row per tenant, tracking the last invoice number issued. `tenant_id` is *both* the primary key and a foreign key here — this table exists specifically to make invoice numbering **safe under concurrency**: two simultaneous invoice-creation requests correctly get different, sequential numbers because this row gets locked (`with_for_update()`) while one request is using it, forcing the other to wait its turn rather than both reading the same "last number" and colliding.

**`invoices`** — one row per created invoice: which tenant, which customer, the generated `invoice_number`, and the calculated `sub_total`/`total`.

**`invoice_line_items`** — one row **per item** on an invoice (not a single JSON blob of items). Real, separate rows here mean you can later run reports like "what are my top-selling products this month" with a normal SQL aggregation — a JSON column would make that painful.

---

## 6. Configuration & Secrets — `.env` Explained

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

## 7. Database Connection Lifecycle

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

## 8. Authentication & Authorization Flow

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

## 9. Invoice Creation Flow — All the Pieces Working Together

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

## 10. How the Frontend Will Connect

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

## 11. Current Status

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

## 12. Running This Locally

```bash
git clone <repo-url>
cd test-project
uv sync
cp .env.sample .env   # then fill in real DATABASE_URL and SECRET_KEY
uv run alembic upgrade head
uv run uvicorn test_project.main:app --reload
```
Visit `http://localhost:8000/docs` for the interactive API explorer.
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
# StockFlow — Full Learning Path

The complete day-by-day roadmap, as it currently stands. Two deliberate changes from the original plan: **testing is consolidated into one dedicated final phase** instead of spread through every day, and **GST tax calculation is pushed to the very last topic**, added back once everything else is real and working.

> Note on this ordering: deploying (Phase 8 below) with CI running a test suite that isn't written yet means that step's "run tests on every push" won't have much to actually run until the Testing phase is done. That's a known tradeoff of this ordering, not an oversight — flagged here so it's a conscious choice, not a surprise later.

---

## Phase 1 — Python Fundamentals (Days 1–12) ✅
Foundational Python, done day-by-day, including learning the *tools* of testing (pytest, TDD) — this is different from the later "Testing" phase, which is about writing tests *for this specific project's* untested code, not learning what pytest is.

1. Syntax, variables, data types, f-strings, operators
2. Control flow, functions, scope
3. Lists, dicts, sets, tuples, comprehensions
4. OOP: classes, inheritance, dunder methods
5. Error handling, file I/O
6. `pip`/`venv`, then `uv`
7. Decorators, generators, `*args`/`**kwargs`
8. Type hints
9. pytest basics (the tool itself)
10. `async`/`await` in Python
11. Ruff + mypy setup
12. Build a small CLI tool, TDD practice

---

## Phase 2 — FastAPI, Postgres, Multi-Tenant Design (Days 13–30) ✅
13–15. FastAPI basics: routes, Pydantic models, path/query params
16–18. PostgreSQL fundamentals: tables, relations, joins, indexes (raw SQL)
19–20. Multi-tenancy design: `tenant_id` scoping
21–23. SQLAlchemy + Alembic
24–26. Auth: signup, JWT, protected routes
27–28. RBAC: admin/cashier permissions
29–30. Product & customer CRUD, tenant-scoped

---

## Phase 3 — Billing Engine: Invoicing, no tax (Days 31–42) — in progress
Tax logic deliberately excluded here (see the GST phase at the very end). **No tests written yet in this phase** — deferred to the Testing phase.

31–33. Invoice core: `LineItem`, `Invoice`, `create_invoice` — pure calculation, no DB
34–36. Sequential invoice numbering (`billing.py`, concurrency-safe via row locking) + the actual `POST /invoices` route wiring it together
37–39. PDF generation (`pdf.py`, ReportLab)
40–42. Billing screen in React/TS: cart, checkout, PDF download link

---

## Phase 4 — Real-Time, Concurrency-Safe Stock (Days 43–56)
43–45. WebSockets in FastAPI: per-tenant connections, broadcasting
46–49. Concurrency-safe stock deduction (the same row-locking pattern from `billing.py`, applied to inventory — this is the project's core "hard problem")
50–52. Redis pub/sub across server instances
53–54. Live dashboard: stock updates without refresh
55–56. Low-stock threshold alerts via WebSocket

---

## Phase 5 — Warehouse Module: Ledger + Transfers (Days 57–66)
57–59. Append-only stock movement ledger
60–62. Transfers between warehouse locations
63–64. Reconciliation view (expected vs actual stock)
65–66. Warehouse UI: transfer form, ledger history

---

## Phase 6 — Payments: Razorpay + Webhooks (Days 67–76)
67–69. Razorpay integration: create order, checkout flow
70–72. Webhook handling: signature verification, idempotency
73–74. Payment success → finalize invoice → deduct stock
75–76. Failure/retry handling, basic refunds

---

## Phase 7 — Background Jobs (Days 77–84)
77–79. Celery/RQ + Redis setup, async report export
80–81. Scheduled jobs: daily sales summary, low-stock digest
82–84. Job failure handling: retries, dead-letter logging

---

## Phase 8 — Docker, Real Deployment, CI/CD (Days 85–98)
85–86. Coverage check (`pytest --cov`) — will be thin until the Testing phase below is done; that's expected at this point
87–89. Docker: Dockerfile + `docker-compose` for the full stack
90–91. Env/secrets management, dev/test/prod configs
92–93. Linux basics, spin up an Ubuntu VPS
94. Nginx as reverse proxy
95. HTTPS via Let's Encrypt/Certbot
96–98. GitHub Actions CI/CD, deploy frontend

---

## Phase 9 — Polish, Stretch Features (Days 99–112)
99–100. Basic monitoring: logs, uptime check
101–104. Stretch: barcode/QR scanning
105–108. Stretch: offline-first billing screen
109–112. README/architecture docs, demo video, seed data

---

## Phase 10 — AI Copilot, Forecasting & OCR (Days 113–128) — *tentative*
**Status: deferred**, revisit once the core product (Phases 1–9) is genuinely working end-to-end. Sketch only, not a locked plan:
- AI Copilot chat (natural-language, tenant-scoped queries)
- Demand forecasting (background job)
- Invoice OCR (vendor bill → auto-filled intake)
- Safety: prompt-injection awareness, per-tenant rate limiting, usage logging

---

## Phase 11 — Testing: the full, dedicated pass (final core topic)
**This is the real "last topic" of the core curriculum.** Everything built without a test during Phases 3–9 gets covered here, properly, in one focused pass — the intent being a genuine testing *deep-dive* (fixtures, mocking external services like Razorpay/Redis/Celery, testing WebSocket behavior, testing concurrency directly) rather than tests bolted on piecemeal.

**Coverage checklist for this phase:**
- [ ] `invoice.py` — `LineItem`/`Invoice`/`create_invoice`: normal case, empty items, bad quantity/price, the mutable-default-list check
- [ ] `billing.py` — `get_next_invoice_number`: sequential per tenant, independent across tenants, and — the important one — a **concurrency test**: fire multiple simultaneous calls at the same tenant, assert no duplicate numbers are issued
- [ ] `pdf.py` — PDF generates without error, contains expected totals
- [ ] `routers/invoice.py` — full endpoint test: valid creation, invalid items → `422`, cross-tenant customer → `404`
- [ ] Phase 4 — the concurrency-safe stock deduction: the single most important test in the whole project — two simultaneous "sell the last unit" requests, assert only one succeeds
- [ ] Phase 4 — WebSocket broadcast scoping: a tenant only receives their own tenant's broadcasts
- [ ] Phase 5 — ledger/transfer logic: derived quantity matches the sum of ledger entries, a transfer can't leave negative stock at the source
- [ ] Phase 6 — webhook idempotency: the same webhook payload processed twice only takes effect once
- [ ] Phase 7 — background job logic tested directly (Celery "eager" mode), retry behavior on failure
- [ ] Full multi-tenant isolation sweep — every endpoint in the app, tested once with two tenants' tokens, confirming zero cross-tenant leakage anywhere
- [ ] CI (`GitHub Actions`, Phase 8) re-run once this is done — now actually exercising something meaningful on every push

**Why this phase exists as its own dedicated block, rather than "go back and add tests everywhere":** treating it as one real, focused session (rather than a vague ongoing chore) is what makes it likely to actually get done thoroughly, and it doubles as a genuine testing-skills deep dive — the kind of concentrated practice that's harder to get from tests trickled in one at a time.

---

## Phase 12 — GST Tax Calculation (the final additional topic)
Added back in last, once the untaxed billing core has been running, tested, and proven for a while. Includes what was originally scoped for Days 31-33 before it was deferred, expanded to the full version:

- CGST/SGST vs IGST based on buyer/seller state (the core rule)
- HSN codes → tax rate lookup (the piece skipped in the simplified version)
- Wiring into `invoice.py`: `Invoice.total` changes from `return self.subtotal` to `self.subtotal + self.tax_breakdown.total_tax` — a small, isolated change, confirming the decoupled-module design paid off
- A `GET /invoices/{id}/pdf` update to show the tax breakdown on the actual PDF
- Full test coverage for the tax module itself (same rigor as Phase 11): intra-state split, inter-state IGST, unknown HSN code, zero-rate/exempt products, negative-value rejection

---

## Quick reference: what's deferred and why

| Deferred item | Moved to | Reason |
|---|---|---|
| Automated tests for invoice/billing/PDF (Phase 3) | Phase 11 (Testing) | One dedicated, thorough pass instead of thin coverage spread across every day |
| GST/HSN tax calculation | Phase 12 (final) | Kept as a decoupled module from the start specifically so it could be deferred without restructuring anything |
| AI Copilot / forecasting / OCR | Phase 10 (tentative) | Revisit with real product experience before committing scope |
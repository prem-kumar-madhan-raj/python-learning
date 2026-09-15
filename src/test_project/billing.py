from sqlalchemy import select
from sqlalchemy.orm import Session
from test_project.models.db_models import TenantInvoiceCounter

def get_next_invoice_number(db: Session, tenant_id: int) -> int:
    counter = db.execute(
        select(TenantInvoiceCounter).where(TenantInvoiceCounter.tenant_id == tenant_id).with_for_update()
    ).scalar_one_or_none()
    if not counter:
        counter = TenantInvoiceCounter(tenant_id=tenant_id, last_number=0)
        db.add(counter)
        db.flush()
    counter.last_number += 1
    db.commit()
    return f"INVOICE-{counter.last_number:04d}"
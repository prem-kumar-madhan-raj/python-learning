from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from test_project.auth import get_current_user
from test_project.models.db_models import Invoice, InvoiceLineItem, Customer, get_db
from test_project.invoice import create_invoice, LineItem
from test_project.billing import get_next_invoice_number
from pydantic import BaseModel


class LineItemRequest(BaseModel):
    description: str
    quantity: int
    unit_price: float

class InvoiceCreateRequest(BaseModel):
    customer_id: int
    items: list[LineItemRequest]


router = APIRouter()

@router.post("/")
async def create_invoice_route(request: InvoiceCreateRequest, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    customer = db.execute(
        select(Customer).where(
            Customer.id == request.customer_id,
            Customer.tenant_id == current_user["tenant_id"],
        )
    ).scalar_one_or_none()

    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")

    line_items = [
        LineItem(
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price
        )
        for item in request.items
    ]

    try:
        calculated = create_invoice(line_items)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    invoice_number = get_next_invoice_number(db, current_user["tenant_id"])

    db_invoice = Invoice(
        invoice_number=invoice_number,
        tenant_id=current_user["tenant_id"],
        customer_id=customer.id,
        sub_total=calculated.subtotal,
        total=calculated.total,
    )
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)

    for item in line_items:
        db.add(InvoiceLineItem(
            invoice_id=db_invoice.id,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price
        ))
    db.commit()

    return {"invoice_number": invoice_number, "subtotal": calculated.subtotal, "total": calculated.total}

@router.get("/{invoice_number}/pdf")
async def get_invoice_pdf(invoice_number: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    pass
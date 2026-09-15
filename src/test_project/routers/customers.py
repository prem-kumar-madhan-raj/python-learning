from fastapi import APIRouter, Depends, HTTPException
from test_project.auth import get_current_user, require_role
from sqlalchemy import select
from sqlalchemy.orm import Session
from test_project.models.db_models import Customer, get_db
from test_project.models.models import CustomerCreate, CustomerUpdate

router = APIRouter()

@router.get("/")
def get_customers(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    customers = db.execute(select(Customer).where(Customer.tenant_id == current_user["tenant_id"])).scalars().all()
    return customers

@router.post("/")
def create_customer(customer: CustomerCreate, current_user: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    new_customer = Customer(
        name=customer.name,
        phone=customer.phone,
        gstin=customer.gstin or None,
        tenant_id=current_user["tenant_id"]
    )
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    return new_customer

@router.get("/{customer_id}")
def get_customer(customer_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    customer = db.execute(
        select(Customer).where(Customer.id == customer_id, Customer.tenant_id == current_user["tenant_id"])
    ).scalar_one_or_none()
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.put("/{customer_id}")
def update_customer(customer_id: int, customer_update: CustomerUpdate, current_user: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    customer = db.execute(
        select(Customer).where(Customer.id == customer_id, Customer.tenant_id == current_user["tenant_id"])
    ).scalar_one_or_none()
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    for key, value in customer_update.model_dump(exclude_unset=True).items():
        setattr(customer, key, value)
    db.commit()
    return customer

@router.delete("/{customer_id}")
def delete_customer(customer_id: int, current_user: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    customer = db.execute(
        select(Customer).where(Customer.id == customer_id, Customer.tenant_id == current_user["tenant_id"])
    ).scalar_one_or_none()
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(customer)
    db.commit()
    return None

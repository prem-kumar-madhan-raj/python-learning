from fastapi import APIRouter, Depends, HTTPException
from test_project.auth import get_current_user, require_role
from sqlalchemy import select
from sqlalchemy.orm import Session
from test_project.models.db_models import Product, get_db
from test_project.models.models import ProductCreate, ProductUpdate

router = APIRouter()

@router.get("/")
def get_products(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    products = db.execute(
        select(Product).where(Product.tenant_id == current_user["tenant_id"])
    ).scalars().all()
    return products

@router.post("/")
def create_product(product: ProductCreate, current_user: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    db_product = Product(
        name=product.name or "",
        description=product.description or "",
        price=product.price if product.price is not None else 0,
        qty=int(product.qty) if product.qty else 0,
        tenant_id=current_user["tenant_id"]
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@router.get("/{product_id}")
def get_product(product_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    product = db.execute(
        select(Product).where(Product.id == product_id, Product.tenant_id == current_user["tenant_id"])
    ).scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.put("/{product_id}")
def update_product(product_id: int, product_update: ProductUpdate, current_user: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    product = db.execute(
        select(Product).where(Product.id == product_id, Product.tenant_id == current_user["tenant_id"])
    ).scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    for key, value in product_update.model_dump(exclude_unset=True).items():
        setattr(product, key, value)
    db.commit()
    return product

@router.delete("/{product_id}")
def delete_product(product_id: int, current_user: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    product = db.execute(
        select(Product).where(Product.id == product_id, Product.tenant_id == current_user["tenant_id"])
    ).scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return None


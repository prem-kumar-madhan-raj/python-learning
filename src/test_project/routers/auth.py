from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select
from test_project.models.db_models import Tenant, User, get_db
from test_project.models.models import LoginRequest, SignUpRequest
from test_project.auth import create_access_token, verify_password, hash_password

router = APIRouter()

@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.execute(
        select(User).where(User.email == request.email)
    ).scalar_one_or_none()

    if user is None or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user.id, user.tenant_id, user.role)
    return {"access_token": token, "token_type": "bearer"}

@router.post("/signup")
def signup(request: SignUpRequest, db: Session = Depends(get_db)): 
    user = db.execute(
        select(User).where(User.email == request.email)
    ).scalar_one_or_none()

    if user is not None:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_tenant = Tenant(business_name=request.business_name)
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)

    new_user = User(
        email=request.email,
        hashed_password=hash_password(request.password),
        tenant_id=new_tenant.id,
        role="admin"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(new_user.id, new_user.tenant_id, new_user.role)
    return {"access_token": token, "token_type": "bearer"}


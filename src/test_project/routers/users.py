from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from test_project.auth import get_current_user, hash_password
from test_project.models.db_models import User, get_db
from test_project.models.models import InviteUserRequest, UserList

router = APIRouter()

allowed_roles = ["admin", "cashier", "manager"]

@router.get("/", response_model=list[UserList])
def read_users(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    users = db.execute(
        select(User).where(current_user["tenant_id"] == User.tenant_id)
    ).scalars().all()
    return users

@router.get("/{user_id}", response_model=UserList)
def read_user(user_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.execute(
        select(User).where(
            User.id == user_id,
            User.tenant_id == current_user["tenant_id"]
        )
    ).scalar_one_or_none()
    
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/invite", response_model=UserList)
def invite_user(invite_request: InviteUserRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    
    existing_user = db.execute(
        select(User).where(
            User.email == invite_request.email,
            User.tenant_id == current_user["tenant_id"]
        )
    ).scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    if invite_request.role not in allowed_roles:
        raise HTTPException(status_code=400, detail=f"Role must be one of {allowed_roles}")
    
    new_user = User(
        email=invite_request.email,
        name=invite_request.name,
        hashed_password=hash_password(invite_request.password),  # In a real application, hash the password
        role=invite_request.role,
        tenant_id=current_user["tenant_id"]
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/{user_id}/role", response_model=UserList)
def update_user_role(user_id: int, role_update: InviteUserRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.execute(
        select(User).where(
            User.id == user_id,
            User.tenant_id == current_user["tenant_id"]
        )
    ).scalar_one_or_none()
    
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    if role_update.role not in allowed_roles:
        raise HTTPException(status_code=400, detail=f"Role must be one of {allowed_roles}")
    
    user.role = role_update.role
    db.commit()
    db.refresh(user)
    return user

from pydantic import BaseModel

class SignUpRequest(BaseModel):
    business_name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    qty: int

class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    price: float | None = None
    qty: int | None = None

class CustomerCreate(BaseModel):
    name: str
    phone: str
    gstin: str | None = None

class CustomerUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    gstin: str | None = None

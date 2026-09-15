from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker, Mapped, mapped_column
from sqlalchemy import create_engine, String, Integer, Numeric, ForeignKey, DateTime, func
from test_project.config import settings
from typing import Generator

class Base(DeclarativeBase):
    pass

class Tenant(Base):
    __tablename__ = "tenants"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())

class Product(Base):
    __tablename__ = "products"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(1000), nullable=False, default="")
    price: Mapped[Numeric] = mapped_column(Numeric(10, 2), nullable=False)
    qty: Mapped[int] = mapped_column(Integer, nullable=False)
    tenant_id: Mapped[int] = mapped_column(Integer, ForeignKey("tenants.id"))

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    tenant_id: Mapped[int] = mapped_column(Integer, ForeignKey("tenants.id"))
    role: Mapped[str] = mapped_column(String, nullable=False, default="user")

class Customer(Base):
    __tablename__ = "customers"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    phone: Mapped[str] = mapped_column(String, nullable=False)
    gstin: Mapped[str | None] = mapped_column(String, nullable=True)
    tenant_id: Mapped[int] = mapped_column(Integer, ForeignKey("tenants.id"))

class TenantInvoiceCounter(Base):
    __tablename__ = "tenant_invoice_counters"
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), primary_key=True)
    last_number: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

class Invoice(Base):
    __tablename__ = "invoices"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(Integer, ForeignKey("tenants.id"))
    customer_id: Mapped[int] = mapped_column(Integer, ForeignKey("customers.id"))
    invoice_number: Mapped[str] = mapped_column(String, nullable=False)
    sub_total: Mapped[Numeric] = mapped_column(Numeric(10, 2), nullable=False)
    total: Mapped[Numeric] = mapped_column(Numeric(10, 2), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())

class InvoiceLineItem(Base):
    __tablename__ = "invoice_line_items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    invoice_id: Mapped[int] = mapped_column(Integer, ForeignKey("invoices.id"))
    description: Mapped[str] = mapped_column(String, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Numeric] = mapped_column(Numeric(10, 2), nullable=False)

DATABASE_URL = settings.database_url
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
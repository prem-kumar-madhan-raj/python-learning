from fastapi import FastAPI
from test_project.routers import auth, products, customers, invoice, users
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],   # your Vite dev server's origin, exactly
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,prefix="/auth", tags=["auth"])
app.include_router(products.router,prefix="/products", tags=["products"])
app.include_router(customers.router,prefix="/customers", tags=["customers"])
app.include_router(invoice.router,prefix="/invoices", tags=["invoices"])
app.include_router(users.router,prefix="/users", tags=["users"])

@app.get("/")
def main():
    return {"message": "Hello! My Python function is running in the browser."}
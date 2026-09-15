from fastapi import FastAPI
from test_project.routers import auth, products, customers

app = FastAPI()

app.include_router(auth.router,prefix="/auth", tags=["auth"])
app.include_router(products.router,prefix="/products", tags=["products"])
app.include_router(customers.router,prefix="/customers", tags=["customers"])

@app.get("/")
def main():
    return {"message": "Hello! My Python function is running in the browser."}
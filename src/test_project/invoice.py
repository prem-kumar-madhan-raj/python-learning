from dataclasses import dataclass, field

@dataclass
class LineItem:
    description:str
    quantity: int
    unit_price: float

    @property
    def total(self) -> float:
        return round(self.quantity * self.unit_price, 2)

@dataclass
class Invoice:
    line_items: list[LineItem] = field(default_factory=list)

    @property
    def subtotal(self) -> float:
        return round(sum(item.total for item in self.line_items), 2)

    @property
    def total(self) -> float:
        return round(self.subtotal, 2)

def create_invoice(items: list[LineItem]) -> Invoice:
    if not items:
        raise ValueError("Invoice must have at least one line item")
    for item in items:
        if item.quantity <= 0:
            raise ValueError("Line item quantity must be greater than zero")
        if item.unit_price < 0:
            raise ValueError("Line item unit price must be non-negative")
    return Invoice(items)
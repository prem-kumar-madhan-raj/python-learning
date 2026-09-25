import io
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

from test_project.invoice import Invoice as CalculatedInvoice

def generate_invoice_pdf(invoice_number: str, customer_name: str, calculated: CalculatedInvoice) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph(f"Invoice {invoice_number}", styles["Title"]))
    elements.append(Paragraph(f"Billed to: {customer_name}", styles["Normal"]))
    elements.append(Spacer(1, 20))

    table_data = [["Description", "Qty", "Unit Price", "Total"]]
    for item in calculated.line_items:
        table_data.append([
            item.description,
            str(item.quantity),
            f"{item.unit_price:.2f}",
            f"{item.total:.2f}",
        ])
    table_data.append(["", "", "Total", f"{calculated.total:.2f}"])

    table = Table(table_data, colWidths=[220, 60, 100, 100])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
    ]))
    elements.append(table)

    doc.build(elements)
    return buffer.getvalue()
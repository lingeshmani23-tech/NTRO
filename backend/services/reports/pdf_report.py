import io
import json
import os
from typing import List
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)
from reportlab.pdfgen import canvas
from backend.models.schemas import ComplianceResult


class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Header
        self.drawString(36, 810, "LEGAL METROLOGY PACKAGED COMMODITIES COMPLIANCE REPORT (SIH26034)")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 804, 559, 804)

        # Footer
        self.line(36, 45, 559, 45)
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(559, 32, page_text)
        self.drawString(36, 32, "CONFIDENTIAL & OFFICIAL COMPLIANCE INSPECTION AUDIT")
        self.restoreState()


def generate_pdf_report(result: ComplianceResult) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=54,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#1E293B"),
    )

    h1_style = ParagraphStyle(
        "SectionH1",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=12,
        spaceAfter=6,
    )

    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#334155"),
    )

    cell_bold = ParagraphStyle(
        "CellBold",
        parent=body_style,
        fontName="Helvetica-Bold",
        textColor=colors.HexColor("#0F172A"),
    )

    story = []

    # Title Banner
    story.append(Paragraph("Legal Metrology Compliance Audit Report", title_style))
    story.append(Paragraph("Rule 6 Inspection under Legal Metrology (Packaged Commodities) Rules, 2011", body_style))
    story.append(Spacer(1, 10))

    # Meta Box
    meta_data = [
        [Paragraph("<b>Inspection ID:</b>", cell_bold), Paragraph(result.analysis_id, body_style), Paragraph("<b>Status:</b>", cell_bold), Paragraph(result.status.upper(), body_style)],
        [Paragraph("<b>Date & Time:</b>", cell_bold), Paragraph(result.created_at, body_style), Paragraph("<b>Data Source:</b>", cell_bold), Paragraph(result.data_source, body_style)],
        [Paragraph("<b>Package Image:</b>", cell_bold), Paragraph(result.file.name, body_style), Paragraph("<b>Compliance Score:</b>", cell_bold), Paragraph(f"<b>{result.score.score} / 100 ({result.score.rating})</b>", cell_bold)],
    ]
    meta_table = Table(meta_data, colWidths=[90, 170, 90, 170])
    meta_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#E2E8F0")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ])
    )
    story.append(meta_table)
    story.append(Spacer(1, 12))

    # Executive Summary Box
    story.append(Paragraph("Executive Summary & Posture Rating", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2563EB"), spaceAfter=6))
    story.append(Paragraph(result.ai_assessment.executive_summary, body_style))
    story.append(Spacer(1, 6))
    story.append(Paragraph(f"<b>Why It Matters:</b> {result.ai_assessment.why_it_matters}", body_style))
    story.append(Spacer(1, 12))

    # Mandatory Declarations Extracted Table
    story.append(Paragraph("Extracted Mandatory Declarations (Rule 6)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2563EB"), spaceAfter=6))

    ext = result.extracted_data
    declarations_data = [
        [Paragraph("<b>Mandatory Field</b>", cell_bold), Paragraph("<b>Extracted Declaration Text</b>", cell_bold), Paragraph("<b>Status</b>", cell_bold)],
        [Paragraph("Maximum Retail Price (MRP)", body_style), Paragraph(ext.mrp or "<i>NOT DECLARED</i>", body_style), Paragraph("PASS" if ext.mrp and "tax" in ext.mrp.lower() else ("WARNING" if ext.mrp else "FAIL"), body_style)],
        [Paragraph("Net Quantity", body_style), Paragraph(ext.net_quantity or "<i>NOT DECLARED</i>", body_style), Paragraph("PASS" if ext.net_quantity else "FAIL", body_style)],
        [Paragraph("Manufacturer / Packer", body_style), Paragraph(ext.manufacturer_details or "<i>NOT DECLARED</i>", body_style), Paragraph("PASS" if ext.manufacturer_details and len(ext.manufacturer_details) > 15 else "FAIL", body_style)],
        [Paragraph("Date of Mfg / Packing", body_style), Paragraph(ext.packing_date or "<i>NOT DECLARED</i>", body_style), Paragraph("PASS" if ext.packing_date else "FAIL", body_style)],
        [Paragraph("Consumer Care Helpline", body_style), Paragraph(ext.consumer_care_details or "<i>NOT DECLARED</i>", body_style), Paragraph("PASS" if ext.consumer_care_details else "FAIL", body_style)],
        [Paragraph("Country of Origin", body_style), Paragraph(ext.country_of_origin or "<i>NOT DECLARED</i>", body_style), Paragraph("PASS" if ext.country_of_origin else "FAIL", body_style)],
    ]

    dec_table = Table(declarations_data, colWidths=[140, 300, 80])
    dec_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EFF6FF")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(dec_table)
    story.append(Spacer(1, 14))

    # Detailed Rule Checks Table
    story.append(Paragraph("Legal Metrology Compliance Rule Checks", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2563EB"), spaceAfter=6))

    checks_rows = [
        [Paragraph("<b>Rule ID</b>", cell_bold), Paragraph("<b>Title & Description</b>", cell_bold), Paragraph("<b>Status</b>", cell_bold), Paragraph("<b>Recommendation</b>", cell_bold)]
    ]

    for check in result.checks:
        status_color = "#16A34A" if check.status == "PASS" else ("#D97706" if check.status == "WARNING" else "#DC2626")
        status_p = Paragraph(f"<b><font color='{status_color}'>{check.status}</font></b><br/><font size=7 color='#64748B'>{check.severity}</font>", body_style)
        title_p = Paragraph(f"<b>[{check.rule_id}] {check.title}</b><br/>{check.message}", body_style)
        rec_p = Paragraph(check.recommendation, body_style)

        checks_rows.append([
            Paragraph(check.rule_id, cell_bold),
            title_p,
            status_p,
            rec_p,
        ])

    checks_table = Table(checks_rows, colWidths=[65, 195, 65, 195])
    checks_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(checks_table)
    story.append(Spacer(1, 14))

    # Top Remediation Priorities
    if result.ai_assessment.top_priorities:
        story.append(Paragraph("Actionable Remediation Priorities", h1_style))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2563EB"), spaceAfter=6))
        for idx, pri in enumerate(result.ai_assessment.top_priorities, 1):
            story.append(Paragraph(f"<b>{idx}.</b> {pri}", body_style))
            story.append(Spacer(1, 3))

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer.getvalue()

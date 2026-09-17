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
from backend.models.schemas import AnalysisResult


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
        self.drawString(36, 810, "SECUREMAILSCOPE — PASSIVE EMAIL CRYPTOGRAPHIC ASSESSMENT")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 804, 559, 804)

        # Footer
        self.line(36, 45, 559, 45)
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(559, 32, page_text)
        self.drawString(36, 32, "CONFIDENTIAL & OFFICIAL CRYPTOGRAPHIC AUDIT REPORT")
        self.restoreState()


def generate_pdf_report(result: AnalysisResult) -> bytes:
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
    story.append(Paragraph("SecureMailScope Security Assessment Report", title_style))
    story.append(Paragraph("Passive Email Cryptographic Transport Inspection (SMTP, IMAP, POP3)", body_style))
    story.append(Spacer(1, 10))

    # Meta Table
    meta_data = [
        [Paragraph("<b>Analysis ID:</b>", cell_bold), Paragraph(result.analysis_id, body_style), Paragraph("<b>Status:</b>", cell_bold), Paragraph(result.status.upper(), body_style)],
        [Paragraph("<b>Date & Time:</b>", cell_bold), Paragraph(result.created_at, body_style), Paragraph("<b>Data Source:</b>", cell_bold), Paragraph(result.data_source, body_style)],
        [Paragraph("<b>Capture File:</b>", cell_bold), Paragraph(result.file.name, body_style), Paragraph("<b>Security Score:</b>", cell_bold), Paragraph(f"<b>{result.score.score} / 100 ({result.score.rating})</b>", cell_bold)],
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
    story.append(Paragraph("1. Executive Summary & Security Posture", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2563EB"), spaceAfter=6))
    story.append(Paragraph(result.ai.executive_summary, body_style))
    story.append(Spacer(1, 6))
    story.append(Paragraph(f"<b>Why It Matters:</b> {result.ai.why_it_matters}", body_style))
    story.append(Spacer(1, 12))

    # Verified Findings Table
    story.append(Paragraph("2. Verified Cryptographic Security Findings", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2563EB"), spaceAfter=6))

    findings_rows = [
        [Paragraph("<b>Rule ID</b>", cell_bold), Paragraph("<b>Title & Description</b>", cell_bold), Paragraph("<b>Severity</b>", cell_bold), Paragraph("<b>Evidence & Session</b>", cell_bold)]
    ]

    for f in result.findings:
        sev_color = "#DC2626" if f.severity == "CRITICAL" else ("#EA580C" if f.severity == "HIGH" else ("#D97706" if f.severity == "MEDIUM" else "#2563EB"))
        sev_p = Paragraph(f"<b><font color='{sev_color}'>{f.severity}</font></b>", body_style)
        title_p = Paragraph(f"<b>[{f.rule_id}] {f.title}</b><br/>{f.impact}", body_style)
        ev_p = Paragraph(f"<b>Session:</b> {f.session_id}<br/><b>Pkt:</b> #{f.evidence.packet_number or 'N/A'}<br/><b>Value:</b> {f.evidence.observed_value}", body_style)

        findings_rows.append([
            Paragraph(f.rule_id, cell_bold),
            title_p,
            sev_p,
            ev_p,
        ])

    findings_table = Table(findings_rows, colWidths=[65, 195, 65, 195])
    findings_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(findings_table)
    story.append(Spacer(1, 14))

    # Remediation Priorities
    if result.ai.top_priorities:
        story.append(Paragraph("3. Actionable Remediation Priorities", h1_style))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2563EB"), spaceAfter=6))
        for idx, pri in enumerate(result.ai.top_priorities, 1):
            story.append(Paragraph(f"<b>{idx}.</b> {pri}", body_style))
            story.append(Spacer(1, 3))

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer.getvalue()

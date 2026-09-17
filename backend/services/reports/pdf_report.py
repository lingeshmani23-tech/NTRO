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
    PageBreak,
    KeepTogether,
    HRFlowable,
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
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Header
        self.drawString(36, 810, "SECUREMAILSCOPE — Passive Email Security Assessment Report")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 802, 559, 802)

        # Footer
        self.line(36, 45, 559, 45)
        self.setFont("Helvetica", 8)
        self.drawString(36, 30, "CONFIDENTIAL & PROPRIETARY — FOR AUTHORIZED AUDIT USE ONLY")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(559, 30, page_text)

        # DEMO DATA Watermark if synthetic
        if getattr(self, "is_synthetic", True):
            self.setFont("Helvetica-Bold", 60)
            self.setFillColor(colors.HexColor("#E2E8F0"))
            self.saveState()
            self.translate(300, 420)
            self.rotate(45)
            self.drawCentredString(0, 0, "DEMO DATA")
            self.restoreState()

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

    is_synthetic = result.data_source == "synthetic"

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0B1220"),
        spaceAfter=6,
    )

    h1_style = ParagraphStyle(
        "Heading1_Custom",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#0B1220"),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True,
    )

    h2_style = ParagraphStyle(
        "Heading2_Custom",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#2563EB"),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        "Body_Custom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#1E293B"),
        spaceAfter=4,
    )

    mono_style = ParagraphStyle(
        "Mono_Custom",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0F172A"),
    )

    story = []

    # Title Banner
    story.append(Paragraph("PASSIVE EMAIL SECURITY ASSESSMENT REPORT", title_style))
    meta_text = (
        f"<b>Target Capture File:</b> {result.file.name} ({result.file.packet_count:,} packets, "
        f"{result.file.size_bytes / 1024:.1f} KB, SHA-256: {result.file.sha256[:24]}...)<br/>"
        f"<b>Data Source Mode:</b> {'DEMO / SYNTHETIC DATA' if is_synthetic else 'LIVE NETWORK CAPTURE'} &nbsp;|&nbsp; "
        f"<b>Assessment Timestamp:</b> {result.created_at[:19]}Z"
    )
    story.append(Paragraph(meta_text, body_style))
    story.append(Spacer(1, 10))

    # 1. Executive Summary
    story.append(Paragraph("1. Executive Summary", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2563EB"), spaceAfter=6))
    exec_summary_text = (
        f"This passive network security audit analyzed electronic mail traffic across Simple Mail Transfer Protocol (SMTP), "
        f"Internet Message Access Protocol (IMAP), and Post Office Protocol 3 (POP3) network sessions. The automated assessment "
        f"evaluated transport layer encryption parameters, cipher suite strengths, STARTTLS capability negotiations, X.509 server "
        f"certificate validity, and potential credential exposures outside active TLS tunnels.<br/><br/>"
        f"<b>Executive Summary Verdict:</b> {result.ai.executive_summary}<br/><br/>"
        f"<b>Business & Security Risk Impact:</b> {result.ai.why_it_matters}<br/><br/>"
        f"<b>Passive Monitoring Methodology:</b> Network packet captures were parsed deterministically without active probes or "
        f"traffic modification. Security findings are strictly tied to observed packet evidence. Unobserved security fields are "
        f"treated as null values and do not produce speculative security deductions."
    )
    story.append(Paragraph(exec_summary_text, body_style))
    story.append(Spacer(1, 10))

    # 2. Security Score & Risk Ledger
    story.append(Paragraph("2. Security Score & Rationale", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2563EB"), spaceAfter=6))

    score_color = colors.HexColor("#16A34A")
    if result.score.score < 50:
        score_color = colors.HexColor("#DC2626")
    elif result.score.score < 75:
        score_color = colors.HexColor("#EA580C")
    elif result.score.score < 90:
        score_color = colors.HexColor("#F59E0B")

    score_summary = (
        f"<b>Overall Risk Rating:</b> <font color='{score_color.hexval()}'><b>{result.score.score} / 100 — "
        f"{result.score.rating}</b></font><br/>"
        f"<b>Risk Calculation Rationale:</b> Starting from a baseline score of 100 points, deductions are calculated purely from distinct "
        f"finding rules observed across network sessions (CRITICAL: -30 pts, HIGH: -20 pts, MEDIUM: -10 pts, LOW: -5 pts, INFO: 0 pts). "
        f"Multiple occurrences of the same rule across different sessions do not multiply penalty points.<br/>"
        f"<b>Total Deductions Applied:</b> {result.score.total_penalty} points."
    )
    story.append(Paragraph(score_summary, body_style))
    story.append(Spacer(1, 6))

    # Ledger Table
    ledger_data = [["Rule ID", "Severity", "Penalty Weight", "Occurrences", "Impact Rationale"]]
    for item in result.score.ledger:
        impact_desc = "Penalized deduction applied to risk score" if item.penalty > 0 else "Informational posture baseline"
        ledger_data.append([
            item.rule_id,
            item.severity,
            f"-{item.penalty} points" if item.penalty > 0 else "0 points (INFO)",
            str(item.occurrences),
            impact_desc,
        ])

    ledger_table = Table(ledger_data, colWidths=[70, 75, 85, 75, 218])
    ledger_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0B1220")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
        ('TOPPADDING', (0, 0), (-1, 0), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#F8FAFC"), colors.white]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
    ]))
    story.append(ledger_table)
    story.append(Spacer(1, 10))

    # 3. Protocol Analysis
    story.append(Paragraph("3. Protocol Analysis & Session Inventory", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2563EB"), spaceAfter=6))
    proto_data = [["Protocol", "Total Sessions", "Encrypted Tunnels", "Plaintext Streams", "Traffic Share"]]
    tot = result.totals
    for proto in ["SMTP", "IMAP", "POP3"]:
        proto_sessions = [s for s in result.sessions if s.protocol == proto]
        p_count = len(proto_sessions)
        p_enc = sum(1 for s in proto_sessions if s.encryption is True)
        p_plain = sum(1 for s in proto_sessions if s.encryption is False)
        pct = f"{(p_count / tot.email_sessions * 100):.1f}%" if tot.email_sessions > 0 else "0%"
        proto_data.append([proto, str(p_count), str(p_enc), str(p_plain), pct])

    proto_table = Table(proto_data, colWidths=[90, 100, 110, 110, 113])
    proto_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E293B")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
    ]))
    story.append(proto_table)
    story.append(Spacer(1, 6))

    # Detailed Session Inventory Table
    story.append(Paragraph("<b>Detailed Session Stream Breakdown:</b>", h2_style))
    sess_table_data = [["Session ID", "Proto", "Source IP", "Destination Host / IP", "Port", "Encryption", "TLS Version"]]
    for s in result.sessions:
        dest_display = f"{s.destination_host}\n({s.destination})" if s.destination_host else s.destination
        enc_display = "TLS Encrypted" if s.encryption is True else ("Plaintext" if s.encryption is False else "Unknown")
        sess_table_data.append([
            s.session_id,
            s.protocol,
            s.source,
            Paragraph(dest_display, body_style),
            str(s.port),
            enc_display,
            s.tls_version or "N/A",
        ])

    sess_table = Table(sess_table_data, colWidths=[65, 45, 80, 140, 40, 75, 78])
    sess_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#334155")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTSIZE', (0, 0), (-1, -1), 7.5),
    ]))
    story.append(sess_table)
    story.append(Spacer(1, 10))

    # 4. TLS Analysis
    story.append(Paragraph("4. Transport Layer Security (TLS) Cryptographic Analysis", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2563EB"), spaceAfter=6))

    tls_text = (
        "Passive inspection of TLS ClientHello and ServerHello handshakes evaluated protocol versions and cipher suites:<br/>"
        "• <b>TLS Protocol Versions:</b> Deprecated versions (TLS 1.0 and TLS 1.1) lack support for modern authenticated encryption (AEAD) and forward secrecy, leaving sessions vulnerable to POODLE and BEAST attacks.<br/>"
        "• <b>Cipher Suite Evaluation:</b> Cipher suites are categorized into AEAD Forward-Secrecy (ECDHE/DHE with GCM/ChaCha20), Legacy CBC suites, and Weak/Broken ciphers."
    )
    story.append(Paragraph(tls_text, body_style))
    story.append(Spacer(1, 6))

    tls_table_data = [["Session ID", "TLS Version", "Cipher Suite Hex", "Cipher Suite IANA Name", "Security Grade"]]
    for s in result.sessions:
        if s.encryption is True:
            grade = "SECURE" if s.tls_version in ("TLS 1.2", "TLS 1.3") and s.cipher_suite and ("GCM" in s.cipher_suite or "TLS_AES" in s.cipher_suite) else "WEAK / DEPRECATED"
            tls_table_data.append([
                s.session_id,
                s.tls_version or "Unknown",
                s.cipher_hex or "N/A",
                Paragraph(s.cipher_suite or "Unknown / Unmapped", body_style),
                grade,
            ])
    if len(tls_table_data) > 1:
        tls_table = Table(tls_table_data, colWidths=[65, 65, 65, 230, 98])
        tls_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E293B")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
        ]))
        story.append(tls_table)
    story.append(Spacer(1, 10))

    # 5. Certificate Analysis
    story.append(Paragraph("5. X.509 Digital Certificate Analysis", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2563EB"), spaceAfter=6))
    cert_text = (
        "Digital certificate parameters captured from ServerHello certificate messages were validated for expiration, "
        "RSA key length, signature digest algorithm, and Subject Alternative Name (SAN) match:"
    )
    story.append(Paragraph(cert_text, body_style))
    story.append(Spacer(1, 6))

    cert_summary = []
    for s in result.sessions:
        if s.certificate and s.certificate.present:
            cert_summary.append([
                s.session_id,
                s.certificate.subject_cn or "Unknown",
                f"{s.certificate.key_size or 'Unknown'} bits",
                "Expired" if s.certificate.expired else "Valid",
                s.certificate.signature_algorithm or "Unknown",
                s.certificate.not_after[:10] if s.certificate.not_after else "N/A",
            ])

    if cert_summary:
        c_table_data = [["Session", "Subject Common Name (CN)", "RSA Key Size", "Validity", "Signature Algorithm", "Expiration Date"]] + cert_summary
        c_table = Table(c_table_data, colWidths=[60, 160, 70, 60, 100, 73])
        c_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E293B")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
        ]))
        story.append(c_table)
    else:
        story.append(Paragraph("No X.509 certificate handshakes observed.", body_style))
    story.append(Spacer(1, 10))

    # 6. Security Findings
    story.append(Paragraph("6. Security Findings & Detailed Vulnerabilities", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2563EB"), spaceAfter=6))
    for sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]:
        sev_findings = [f for f in result.findings if f.severity == sev]
        if not sev_findings:
            continue
        story.append(Paragraph(f"<b>{sev} Severity Findings ({len(sev_findings)} instances)</b>", h2_style))
        for f in sev_findings:
            f_card = [
                [Paragraph(f"<b>[{f.rule_id}] {f.title}</b>", ParagraphStyle("FHeader", parent=body_style, fontName="Helvetica-Bold", textColor=colors.HexColor("#0B1220"))), f.session_id],
                [Paragraph(f"<b>Description:</b> {f.description}", body_style), ""],
                [Paragraph(f"<b>Observed Impact:</b> {f.impact}", body_style), ""],
                [Paragraph(f"<b>Recommended Action:</b> {f.recommendation}", body_style), ""],
                [Paragraph(f"<b>Reference Standard:</b> {f.reference}", body_style), ""],
            ]
            f_card_table = Table(f_card, colWidths=[420, 103])
            f_card_table.setStyle(TableStyle([
                ('SPAN', (0, 1), (1, 1)),
                ('SPAN', (0, 2), (1, 2)),
                ('SPAN', (0, 3), (1, 3)),
                ('SPAN', (0, 4), (1, 4)),
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ]))
            story.append(f_card_table)
            story.append(Spacer(1, 4))
        story.append(Spacer(1, 6))

    # 7. Evidence
    story.append(Paragraph("7. Observed Evidence Ledger", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2563EB"), spaceAfter=6))
    ev_data = [["Rule ID", "Session ID", "Packet #", "Field Name", "Observed Network Value"]]
    for f in result.findings:
        ev_data.append([
            f.rule_id,
            f.evidence.session_id,
            str(f.evidence.packet_number),
            f.evidence.field,
            Paragraph(str(f.evidence.observed_value), mono_style),
        ])
    ev_table = Table(ev_data, colWidths=[65, 65, 55, 145, 193])
    ev_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E293B")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
    ]))
    story.append(ev_table)
    story.append(Spacer(1, 10))

    # 8. Risk Prioritization
    story.append(Paragraph("8. Risk Prioritization Matrix", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2563EB"), spaceAfter=6))
    for idx, tp in enumerate(result.ai.top_priorities, 1):
        story.append(Paragraph(f"<b>Priority {idx}:</b> {tp}", body_style))
        story.append(Paragraph("<i>Remediation required to eliminate critical exploitability and posture vulnerability.</i>", body_style))
        story.append(Spacer(1, 2))
    story.append(Spacer(1, 10))

    # 9. Remediation
    story.append(Paragraph("9. Remediation Roadmap & Action Items", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2563EB"), spaceAfter=6))
    rem_data = [["Priority", "Action Plan & Technical Guidance", "Associated Rule IDs"]]
    for r in result.ai.remediation:
        rem_data.append([
            f"P{r.priority}",
            Paragraph(r.action, body_style),
            ", ".join(r.rule_ids),
        ])
    rem_table = Table(rem_data, colWidths=[45, 335, 140])
    rem_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E293B")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
    ]))
    story.append(rem_table)
    story.append(Spacer(1, 10))

    # 10. Standards & References
    story.append(Paragraph("10. Regulatory Standards & Reference Documents", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2563EB"), spaceAfter=6))
    refs = [
        "<b>RFC 8314:</b> Cleartext Considered Obsolete: Use of Transport Layer Security (TLS) for Email Submission and Access. Mandates implicit TLS or mandatory STARTTLS for all email submission (587/465) and retrieval (993/995) ports.",
        "<b>NIST SP 800-52 Rev. 2:</b> Guidelines for the Selection, Configuration, and Use of Transport Layer Security (TLS) Implementations in Federal Environments. Recommends minimum TLS 1.2, AEAD cipher suites (AES-GCM, ChaCha20-Poly1305), and minimum 2048-bit RSA key length.",
        "<b>RFC 8996:</b> Deprecating TLS 1.0 and TLS 1.1. Officially prohibits negotiation of TLS 1.0 and 1.1 due to cryptographic vulnerabilities including BEAST, POODLE, and LUCKY13.",
        "<b>RFC 7525:</b> Recommendations for Secure Use of Transport Layer Security (TLS) and Datagram Transport Layer Security (DTLS). Establishes operational best practices for cipher selection, DH key exchange parameters, and session resumption security.",
        "<b>RFC 3207:</b> SMTP Service Extension for Secure SMTP over Transport Layer Security. Defines opportunistic encryption negotiation via the STARTTLS ESMTP extension.",
        "<b>RFC 8461:</b> SMTP MTA Strict Transport Security (MTA-STS). Enables mail service providers to declare explicit TLS requirements and certificate validation parameters to prevent STARTTLS stripping attacks.",
        "<b>RFC 6125:</b> Representation and Verification of Domain-Based Application Service Identity in Transport Layer Security (TLS). Defines rules for Subject Alternative Name (SAN) matching.",
        "<b>RFC 5280:</b> Internet X.509 Public Key Infrastructure Certificate and Certificate Revocation List (CRL) Profile.",
    ]
    for ref in refs:
        story.append(Paragraph(f"• {ref}", body_style))
        story.append(Spacer(1, 3))

    # Appendix A: Security Rule Engine Catalog
    story.append(Spacer(1, 10))
    story.append(Paragraph("Appendix A: Complete Security Rule Engine Catalog & Technical Details", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2563EB"), spaceAfter=6))

    rules_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "rules", "security_rules.json")
    if os.path.exists(rules_path):
        with open(rules_path, "r", encoding="utf-8") as rf:
            all_rules = json.load(rf)

        for r_def in all_rules:
            r_box = [
                [Paragraph(f"<b>[{r_def['id']}] {r_def['title']}</b> ({r_def['severity']})", ParagraphStyle("RTitle", parent=body_style, fontName="Helvetica-Bold", textColor=colors.HexColor("#2563EB")))],
                [Paragraph(f"<b>Description:</b> {r_def['description']}", body_style)],
                [Paragraph(f"<b>Impact:</b> {r_def['impact']}", body_style)],
                [Paragraph(f"<b>Recommendation:</b> {r_def['recommendation']}", body_style)],
                [Paragraph(f"<b>Reference:</b> {r_def['reference']}", body_style)],
            ]
            r_box_table = Table(r_box, colWidths=[523])
            r_box_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F8FAFC")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ('TOPPADDING', (0, 0), (-1, -1), 2),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ]))
            story.append(r_box_table)
            story.append(Spacer(1, 4))

    # Appendix B: Protocol Specifications
    story.append(Spacer(1, 10))
    story.append(Paragraph("Appendix B: Email Protocol Security Baseline Specifications", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2563EB"), spaceAfter=6))

    appendix_text = (
        "<b>Simple Mail Transfer Protocol (SMTP):</b><br/>"
        "• Port 25: Relaying/MTA transport. Supports STARTTLS negotiation. Plaintext submission prohibited.<br/>"
        "• Port 587: Submission port for mail clients. Mandates TLS encryption and SASL authentication.<br/>"
        "• Port 465: Implicit TLS submission (SMTPS). Tunnels all SMTP traffic within TLS from connection start.<br/><br/>"
        "<b>Internet Message Access Protocol (IMAP):</b><br/>"
        "• Port 143: Plaintext IMAP retrieval. Supports STARTTLS extension.<br/>"
        "• Port 993: Implicit TLS IMAP (IMAPS). Mandatory encryption prior to authentication.<br/><br/>"
        "<b>Post Office Protocol version 3 (POP3):</b><br/>"
        "• Port 110: Plaintext POP3 retrieval. Supports STLS extension.<br/>"
        "• Port 995: Implicit TLS POP3 (POP3S). Mandatory encryption prior to USER/PASS commands."
    )
    story.append(Paragraph(appendix_text, body_style))

    # Build canvas with canvasmaker
    canvas_maker = lambda *args, **kwargs: NumberedCanvas(*args, **kwargs)
    doc.build(story, canvasmaker=canvas_maker)

    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes

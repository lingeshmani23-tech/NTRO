import re
from typing import Optional, Tuple, Dict, Any
from backend.models.schemas import NormalizedSession

WEAK_CIPHER_KEYWORDS = ["NULL", "EXPORT", "ANON", "RC4", "DES", "3DES", "IDEA", "SEED", "MD5"]


def is_weak_cipher(cipher: Optional[str]) -> bool:
    if not cipher:
        return False
    cipher_upper = cipher.upper()
    return any(keyword in cipher_upper for keyword in WEAK_CIPHER_KEYWORDS)


def is_legacy_cbc_cipher(cipher: Optional[str]) -> bool:
    if not cipher:
        return False
    cipher_upper = cipher.upper()
    return "CBC" in cipher_upper and not is_weak_cipher(cipher)


def is_strong_cipher(cipher: Optional[str], tls_version: Optional[str]) -> bool:
    if tls_version == "TLS 1.3":
        return True
    if not cipher:
        return False
    cipher_upper = cipher.upper()
    if is_weak_cipher(cipher):
        return False
    has_kex = "ECDHE" in cipher_upper or "DHE" in cipher_upper
    has_aead = "GCM" in cipher_upper or "CHACHA20" in cipher_upper or "CCM" in cipher_upper
    return has_kex and has_aead


# Predicates: return (bool_result, evidence_field, evidence_packet, observed_value) or None
def tls_1_0_negotiated(session: NormalizedSession) -> Optional[Tuple[str, int, Any]]:
    if session.tls_version == "TLS 1.0":
        pkt = session.first_packet
        for item in session.evidence:
            if item.field in ("tls.handshake.version", "tls.record.version"):
                pkt = item.packet_number
                break
        return ("tls.handshake.version", pkt, "TLS 1.0")
    return None


def tls_1_1_negotiated(session: NormalizedSession) -> Optional[Tuple[str, int, Any]]:
    if session.tls_version == "TLS 1.1":
        pkt = session.first_packet
        for item in session.evidence:
            if item.field in ("tls.handshake.version", "tls.record.version"):
                pkt = item.packet_number
                break
        return ("tls.handshake.version", pkt, "TLS 1.1")
    return None


def legacy_cbc_negotiated(session: NormalizedSession) -> Optional[Tuple[str, int, Any]]:
    if (
        session.encryption is True
        and session.tls_version in ("TLS 1.0", "TLS 1.1")
        and is_legacy_cbc_cipher(session.cipher_suite)
    ):
        pkt = session.first_packet
        for item in session.evidence:
            if item.field == "tls.handshake.ciphersuite":
                pkt = item.packet_number
                break
        return ("tls.handshake.ciphersuite", pkt, session.cipher_suite)
    return None


def weak_cipher_negotiated(session: NormalizedSession) -> Optional[Tuple[str, int, Any]]:
    if session.cipher_suite and is_weak_cipher(session.cipher_suite):
        pkt = session.first_packet
        for item in session.evidence:
            if item.field == "tls.handshake.ciphersuite":
                pkt = item.packet_number
                break
        return ("tls.handshake.ciphersuite", pkt, session.cipher_suite)
    return None


def unencrypted_email_session(session: NormalizedSession) -> Optional[Tuple[str, int, Any]]:
    if session.protocol in ("SMTP", "IMAP", "POP3") and session.encryption is False:
        return ("session.encryption", session.first_packet, "False (Plaintext)")
    return None


def starttls_offered_not_issued(session: NormalizedSession) -> Optional[Tuple[str, int, Any]]:
    st = session.starttls
    if st and getattr(st, 'offered', False) is True and getattr(st, 'accepted', False) is False and getattr(st, 'issued', False) is False:
        pkt = session.first_packet
        for item in session.evidence:
            if "starttls" in item.field.lower() or "smtp" in item.field.lower():
                pkt = item.packet_number or item.frame_number or session.first_packet
                break
        return ("starttls.issued", pkt, "False")
    return None


def starttls_downgrade_detected(session: NormalizedSession) -> Optional[Tuple[str, int, Any]]:
    st = session.starttls
    if st and (getattr(st, 'downgrade_indicator', False) is True or getattr(st, 'downgrade_suspected', False) is True):
        pkt = session.first_packet
        for item in session.evidence:
            if "starttls" in item.field.lower() or "downgrade" in item.field.lower():
                pkt = item.packet_number or item.frame_number or session.first_packet
                break
        return ("starttls.downgrade_indicator", pkt, "True")
    return None


def cert_expired(session: NormalizedSession) -> Optional[Tuple[str, int, Any]]:
    if session.certificate and getattr(session.certificate, 'expired', False) is True:
        pkt = session.first_packet
        for item in session.evidence:
            if item.field == "x509af.notAfter":
                pkt = item.packet_number or item.frame_number or session.first_packet
                break
        return ("x509af.notAfter", pkt, f"Expired ({session.certificate.not_after})")
    return None


def cert_not_yet_valid(session: NormalizedSession) -> Optional[Tuple[str, int, Any]]:
    if session.certificate and session.certificate.not_before and session.start_time:
        if session.certificate.not_before > session.start_time:
            pkt = session.first_packet
            for item in session.evidence:
                if item.field == "x509af.notBefore":
                    pkt = item.packet_number or item.frame_number or session.first_packet
                    break
            return ("x509af.notBefore", pkt, f"Not yet valid ({session.certificate.not_before})")
    return None


def cert_hostname_mismatch(session: NormalizedSession) -> Optional[Tuple[str, int, Any]]:
    if session.certificate and (getattr(session.certificate, 'hostname_mismatch', False) is True or getattr(session.certificate, 'hostname_valid', True) is False):
        pkt = session.first_packet
        for item in session.evidence:
            if "hostname" in item.field.lower() or "dnsname" in item.field.lower():
                pkt = item.packet_number or item.frame_number or session.first_packet
                break
        return ("certificate.hostname_mismatch", pkt, f"Mismatch (CN={session.certificate.subject_cn})")
    return None


def cert_weak_key_size(session: NormalizedSession) -> Optional[Tuple[str, int, Any]]:
    if session.certificate and session.certificate.key_size is not None and session.certificate.key_size < 2048:
        pkt = session.first_packet
        for item in session.evidence:
            if item.field == "pkcs1.modulus":
                pkt = item.packet_number or item.frame_number or session.first_packet
                break
        return ("pkcs1.modulus", pkt, f"{session.certificate.key_size} bits")
    return None


def cert_weak_signature_algorithm(session: NormalizedSession) -> Optional[Tuple[str, int, Any]]:
    if session.certificate and session.certificate.signature_algorithm:
        sig_alg = session.certificate.signature_algorithm.upper()
        if "MD5" in sig_alg or "SHA1" in sig_alg or "SHA-1" in sig_alg:
            pkt = session.first_packet
            for item in session.evidence:
                if item.field == "x509af.algorithm.id":
                    pkt = item.packet_number or item.frame_number or session.first_packet
                    break
            return ("x509af.algorithm.id", pkt, session.certificate.signature_algorithm)
    return None


def auth_plaintext_exposed(session: NormalizedSession) -> Optional[Tuple[str, int, Any]]:
    auth = session.auth_summary or getattr(session, 'authentication', None)
    if auth and (getattr(auth, 'unencrypted_exposure', False) is True or getattr(auth, 'plaintext_exposed', False) is True):
        pkt = getattr(auth, 'evidence_packet', None) or session.first_packet
        mech = getattr(auth, 'mechanism', None) or "Plaintext Credentials"
        return ("smtp.auth.username", pkt, f"Exposed credentials via {mech}")
    return None


def tls_modern_negotiated(session: NormalizedSession) -> Optional[Tuple[str, int, Any]]:
    if session.tls_version in ("TLS 1.2", "TLS 1.3"):
        pkt = session.first_packet
        for item in session.evidence:
            if item.field in ("tls.handshake.version", "tls.record.version"):
                pkt = item.packet_number
                break
        return ("tls.handshake.version", pkt, session.tls_version)
    return None


def strong_cipher_negotiated(session: NormalizedSession) -> Optional[Tuple[str, int, Any]]:
    if is_strong_cipher(session.cipher_suite, session.tls_version):
        pkt = session.first_packet
        for item in session.evidence:
            if item.field == "tls.handshake.ciphersuite":
                pkt = item.packet_number
                break
        return ("tls.handshake.ciphersuite", pkt, session.cipher_suite or "TLS 1.3 Cipher")
    return None


PREDICATE_MAP = {
    "tls_1_0_negotiated": tls_1_0_negotiated,
    "tls_1_1_negotiated": tls_1_1_negotiated,
    "legacy_cbc_negotiated": legacy_cbc_negotiated,
    "weak_cipher_negotiated": weak_cipher_negotiated,
    "unencrypted_email_session": unencrypted_email_session,
    "starttls_offered_not_issued": starttls_offered_not_issued,
    "starttls_downgrade_detected": starttls_downgrade_detected,
    "cert_expired": cert_expired,
    "cert_not_yet_valid": cert_not_yet_valid,
    "cert_hostname_mismatch": cert_hostname_mismatch,
    "cert_weak_key_size": cert_weak_key_size,
    "cert_weak_signature_algorithm": cert_weak_signature_algorithm,
    "auth_plaintext_exposed": auth_plaintext_exposed,
    "tls_modern_negotiated": tls_modern_negotiated,
    "strong_cipher_negotiated": strong_cipher_negotiated,
}

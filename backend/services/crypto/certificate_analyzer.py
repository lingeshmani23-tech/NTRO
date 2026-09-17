from datetime import datetime, timezone
from typing import Optional, List
from backend.models.schemas import CertificateInfo


def parse_iso_or_asn1_time(time_str: Optional[str]) -> Optional[datetime]:
    if not time_str:
        return None
    time_clean = time_str.strip()

    # Try ISO 8601 format
    try:
        if time_clean.endswith("Z"):
            time_clean = time_clean[:-1] + "+00:00"
        return datetime.fromisoformat(time_clean)
    except Exception:
        pass

    # Try YYMMDDHHMMSSZ (UTCTime) or YYYYMMDDHHMMSSZ (GeneralizedTime)
    for fmt in ("%y%m%d%H%M%SZ", "%Y%m%d%H%M%SZ"):
        try:
            return datetime.strptime(time_str.strip(), fmt).replace(tzinfo=timezone.utc)
        except Exception:
            pass

    return None


def calculate_key_size_from_modulus(modulus_hex: Optional[str]) -> Optional[int]:
    if not modulus_hex:
        return None
    cleaned = modulus_hex.replace(":", "").replace(" ", "").replace("0x", "").strip()
    if not cleaned:
        return None
    try:
        # Number of bits in hex modulus
        num_bits = int(cleaned, 16).bit_length()
        # Round to common RSA key lengths
        if 900 <= num_bits <= 1100:
            return 1024
        elif 1900 <= num_bits <= 2100:
            return 2048
        elif 3900 <= num_bits <= 4100:
            return 4096
        return num_bits
    except Exception:
        return None


def analyze_certificate(
    subject_cn: Optional[str] = None,
    issuer_cn: Optional[str] = None,
    not_before: Optional[str] = None,
    not_after: Optional[str] = None,
    modulus_hex: Optional[str] = None,
    signature_alg: Optional[str] = None,
    destination_host: Optional[str] = None,
    capture_end_time: Optional[str] = None,
    san_list: Optional[List[str]] = None,
) -> CertificateInfo:
    if not (subject_cn or not_before or not_after or modulus_hex):
        return CertificateInfo(present=False)

    key_size = calculate_key_size_from_modulus(modulus_hex)

    # Expiry relative to capture end time
    expired = None
    if not_after and capture_end_time:
        na_dt = parse_iso_or_asn1_time(not_after)
        cap_dt = parse_iso_or_asn1_time(capture_end_time)
        if na_dt and cap_dt:
            expired = na_dt < cap_dt

    # Hostname validation (only when both destination_host and CN/SAN observed)
    hostname_valid = None
    if destination_host and (subject_cn or san_list):
        all_hosts = set()
        if subject_cn:
            all_hosts.add(subject_cn.lower())
        if san_list:
            for san in san_list:
                all_hosts.add(san.lower())

        dh_lower = destination_host.lower()
        if dh_lower in all_hosts:
            hostname_valid = True
        else:
            # Check wildcard match (e.g. *.example.com)
            hostname_valid = any(
                h.startswith("*.") and dh_lower.endswith(h[1:]) for h in all_hosts
            )

    return CertificateInfo(
        present=True,
        subject_cn=subject_cn,
        issuer_cn=issuer_cn,
        not_before=not_before,
        not_after=not_after,
        expired=expired,
        hostname_valid=hostname_valid,
        key_size=key_size,
        signature_algorithm=signature_alg,
    )

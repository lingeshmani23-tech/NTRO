from typing import Optional, Dict

IANA_CIPHER_MAP: Dict[str, str] = {
    # TLS 1.3 Suites
    "0x1301": "TLS_AES_128_GCM_SHA256",
    "0x1302": "TLS_AES_256_GCM_SHA384",
    "0x1303": "TLS_CHACHA20_POLY1305_SHA256",
    # TLS 1.2 ECDHE Suites
    "0xc02b": "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256",
    "0xc02c": "TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384",
    "0xc02f": "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256",
    "0xc030": "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
    "0xc013": "TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA",
    "0xc014": "TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA",
    "0xc027": "TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256",
    "0xc028": "TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384",
    # DHE Suites
    "0x009e": "TLS_DHE_RSA_WITH_AES_128_GCM_SHA256",
    "0x009f": "TLS_DHE_RSA_WITH_AES_256_GCM_SHA384",
    "0x0033": "TLS_DHE_RSA_WITH_AES_128_CBC_SHA",
    "0x0039": "TLS_DHE_RSA_WITH_AES_256_CBC_SHA",
    # RSA Suites
    "0x002f": "TLS_RSA_WITH_AES_128_CBC_SHA",
    "0x0035": "TLS_RSA_WITH_AES_256_CBC_SHA",
    "0x009c": "TLS_RSA_WITH_AES_128_GCM_SHA256",
    "0x009d": "TLS_RSA_WITH_AES_256_GCM_SHA384",
    # Weak / Deprecated Suites
    "0x000a": "TLS_RSA_WITH_3DES_EDE_CBC_SHA",
    "0x0005": "TLS_RSA_WITH_RC4_128_SHA",
    "0x0004": "TLS_RSA_WITH_RC4_128_MD5",
    "0x0003": "TLS_RSA_EXPORT_WITH_RC4_40_MD5",
    "0x0001": "TLS_RSA_WITH_NULL_MD5",
    "0x0002": "TLS_RSA_WITH_NULL_SHA",
}


def map_tls_version(raw_version: Optional[str]) -> Optional[str]:
    if not raw_version:
        return None
    ver_clean = raw_version.strip()
    if ver_clean in ("0x0301", "TLS 1.0"):
        return "TLS 1.0"
    elif ver_clean in ("0x0302", "TLS 1.1"):
        return "TLS 1.1"
    elif ver_clean in ("0x0303", "TLS 1.2"):
        return "TLS 1.2"
    elif ver_clean in ("0x0304", "TLS 1.3"):
        return "TLS 1.3"
    elif "1.0" in ver_clean:
        return "TLS 1.0"
    elif "1.1" in ver_clean:
        return "TLS 1.1"
    elif "1.2" in ver_clean:
        return "TLS 1.2"
    elif "1.3" in ver_clean:
        return "TLS 1.3"
    return None


def map_cipher_suite(cipher_hex: Optional[str]) -> Optional[str]:
    if not cipher_hex:
        return None
    hex_clean = cipher_hex.strip().lower()
    if not hex_clean.startswith("0x"):
        hex_clean = "0x" + hex_clean
    return IANA_CIPHER_MAP.get(hex_clean)

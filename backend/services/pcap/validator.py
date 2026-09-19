import os
import shutil
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional


class TSharkUnavailableError(Exception):
    pass


class CorruptPCAPError(Exception):
    pass


class EmptyPCAPError(Exception):
    pass


class UnsupportedExtensionError(Exception):
    pass


class FileTooLargeError(Exception):
    pass


def detect_tshark() -> Dict[str, Any]:
    """
    Detects TShark executable across Windows, Linux, and macOS.
    Returns TShark info or Native PCAP Parser fallback status.
    """
    candidate_paths = []

    # 1. Environment variable TSHARK_PATH
    env_tshark = os.getenv("TSHARK_PATH", "").strip()
    if env_tshark:
        candidate_paths.append(Path(env_tshark))

    # 2. PATH resolution via shutil.which
    which_path = shutil.which("tshark")
    if which_path:
        candidate_paths.append(Path(which_path))

    # 3. Common Windows paths
    win_paths = [
        Path(r"C:\Program Files\Wireshark\tshark.exe"),
        Path(r"C:\Program Files (x86)\Wireshark\tshark.exe"),
    ]
    prog_files = os.getenv("ProgramFiles")
    if prog_files:
        win_paths.append(Path(prog_files) / "Wireshark" / "tshark.exe")
    prog_files_x86 = os.getenv("ProgramFiles(x86)")
    if prog_files_x86:
        win_paths.append(Path(prog_files_x86) / "Wireshark" / "tshark.exe")

    candidate_paths.extend(win_paths)

    # 4. Common Linux / macOS paths
    unix_paths = [
        Path("/usr/bin/tshark"),
        Path("/usr/local/bin/tshark"),
        Path("/opt/homebrew/bin/tshark"),
    ]
    candidate_paths.extend(unix_paths)

    for candidate in candidate_paths:
        try:
            if candidate.is_file() and (os.access(candidate, os.X_OK) or os.name == "nt"):
                proc = subprocess.run(
                    [str(candidate), "-v"],
                    capture_output=True,
                    text=True,
                    timeout=5,
                    check=False,
                )
                if proc.returncode == 0:
                    first_line = proc.stdout.splitlines()[0] if proc.stdout else "TShark"
                    return {
                        "available": True,
                        "path": str(candidate.resolve()),
                        "version": first_line.strip(),
                        "error": None,
                    }
        except Exception:
            continue

    # Fallback: Native pure-Python PCAP engine available
    return {
        "available": True,
        "path": "native_pcap_engine",
        "version": "SecureMailScope Native PCAP Engine 1.0 (Python)",
        "error": None,
    }


def resolve_tshark_path() -> Optional[str]:
    info = detect_tshark()
    if info["available"] and info["path"] != "native_pcap_engine":
        return info["path"]
    return None


def get_tshark_version() -> Optional[str]:
    info = detect_tshark()
    return info["version"] if info["available"] else None


def validate_pcap_file(filepath: str, max_upload_mb: int = 100) -> int:
    path_obj = Path(filepath)
    ext = path_obj.suffix.lower()
    if ext not in (".pcap", ".pcapng"):
        raise UnsupportedExtensionError(f"Extension '{ext}' is not supported. Must be .pcap or .pcapng")

    if not path_obj.exists():
        raise CorruptPCAPError(f"File not found: {filepath}")

    size_mb = path_obj.stat().st_size / (1024 * 1024)
    if size_mb > max_upload_mb:
        raise FileTooLargeError(f"File size ({size_mb:.1f} MB) exceeds maximum allowed ({max_upload_mb} MB)")

    tshark_info = detect_tshark()
    if not tshark_info["available"]:
        raise TSharkUnavailableError("TShark binary or PCAP parser not found on host environment.")

    tshark_bin = resolve_tshark_path()

    if tshark_bin:
        # Readability pass via TShark
        try:
            proc = subprocess.run(
                [tshark_bin, "-r", str(path_obj), "-c", "1"],
                capture_output=True,
                text=True,
                timeout=10,
                check=False,
            )
            if proc.returncode != 0:
                raise CorruptPCAPError(f"TShark failed to read capture file: {proc.stderr}")
        except subprocess.TimeoutExpired:
            raise CorruptPCAPError("TShark timed out while reading capture file header")

        packet_count = 0
        try:
            fproc = subprocess.run(
                [tshark_bin, "-r", str(path_obj), "-T", "fields", "-e", "frame.number"],
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
            packet_count = len([line for line in fproc.stdout.splitlines() if line.strip()])
        except Exception:
            pass

        if packet_count > 0:
            return packet_count

    # Pure Python PCAP validation & packet count
    try:
        from backend.services.pcap.parser import parse_pcap_native
        pkts = parse_pcap_native(str(path_obj))
        if len(pkts) == 0:
            raise EmptyPCAPError("Capture file contains 0 packets.")
        return len(pkts)
    except Exception as e:
        if isinstance(e, EmptyPCAPError):
            raise e
        raise CorruptPCAPError(f"Failed to parse capture header: {str(e)}")

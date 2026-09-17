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
    Returns:
    {
        "available": bool,
        "path": Optional[str],
        "version": Optional[str],
        "error": Optional[str]
    }
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

    return {
        "available": False,
        "path": None,
        "version": None,
        "error": (
            "TShark was not found in PATH or standard installation locations "
            "(e.g., C:\\Program Files\\Wireshark\\tshark.exe, /usr/bin/tshark). "
            "Please install Wireshark or set TSHARK_PATH."
        ),
    }


def resolve_tshark_path() -> Optional[str]:
    info = detect_tshark()
    return info["path"] if info["available"] else None


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
    if not tshark_info["available"] or not tshark_info["path"]:
        raise TSharkUnavailableError("TShark binary not found on host environment.")

    tshark_bin = tshark_info["path"]

    # Readability pass
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

    # Packet count check via capinfos or tshark
    packet_count = 0
    capinfos_bin = shutil.which("capinfos")
    if not capinfos_bin and Path(r"C:\Program Files\Wireshark\capinfos.exe").is_file():
        capinfos_bin = r"C:\Program Files\Wireshark\capinfos.exe"

    if capinfos_bin:
        try:
            cproc = subprocess.run(
                [capinfos_bin, "-c", "-M", str(path_obj)],
                capture_output=True,
                text=True,
                timeout=10,
                check=False,
            )
            for line in cproc.stdout.splitlines():
                if "Number of packets" in line:
                    parts = line.split(":")
                    if len(parts) > 1:
                        packet_count = int(parts[1].strip())
                        break
        except Exception:
            pass

    if packet_count == 0:
        # Fallback packet count
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

    if packet_count == 0:
        raise EmptyPCAPError("Capture file contains 0 packets.")

    return packet_count


#!/usr/bin/env python3
"""Security regression: bridge URL policy blocks SSRF targets."""
from __future__ import annotations

import importlib.util
import os
import sys
from pathlib import Path


def load_bridge_module():
    bridge_path = Path(__file__).resolve().parents[2] / 'src' / 'lib' / 'memvid-bridge.py'
    spec = importlib.util.spec_from_file_location('memvid_bridge_policy', bridge_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f'Could not load bridge module from {bridge_path}')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def expect_rejected(validate_url, url: str, label: str) -> None:
    try:
        validate_url(url)
    except ValueError:
        return
    raise AssertionError(f'should reject {label}: {url}')


def main() -> int:
    bridge = load_bridge_module()
    validate_url = bridge._validate_url
    errors: list[str] = []

    os.environ.pop('MEMVID_ALLOW_URL_SOURCES', None)
    try:
        expect_rejected(validate_url, 'https://169.254.169.254/', 'URL sources disabled')
    except AssertionError as exc:
        errors.append(str(exc))

    os.environ['MEMVID_ALLOW_URL_SOURCES'] = 'true'

    for label, url in (
        ('non-HTTPS scheme', 'http://169.254.169.254/'),
        ('AWS metadata IP', 'https://169.254.169.254/latest/meta-data/'),
        ('loopback hostname', 'https://127.0.0.1/'),
        ('localhost hostname', 'https://localhost/'),
        ('GCP metadata host', 'https://metadata.google.internal/'),
    ):
        try:
            expect_rejected(validate_url, url, label)
        except AssertionError as exc:
            errors.append(str(exc))

    if errors:
        for message in errors:
            print(f'FAIL: {message}', file=sys.stderr)
        return 1

    print('SSRF probe security checks passed.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

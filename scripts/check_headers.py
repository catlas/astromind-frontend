#!/usr/bin/env python3
"""
Проверка на HTTP заглавията на сайта (R09). Не променя нищо, само чете.

  python3 scripts/check_headers.py https://astromind-web.onrender.com/
  python3 scripts/check_headers.py http://localhost:4173/ --local

Излиза с код 1, ако липсва задължително заглавие. HSTS се изисква само за https.
Заглавията се задават от собственика в Render: Static Site -> Settings -> Headers (виж README.md, „Заглавия за сигурност“).
"""
import sys
import urllib.request

REQUIRED = [
    ("x-frame-options", lambda v: v.strip().upper() == "DENY", "X-Frame-Options: DENY"),
    ("content-security-policy", lambda v: "frame-ancestors 'none'" in v, "Content-Security-Policy: frame-ancestors 'none'"),
    ("referrer-policy", lambda v: v.strip().lower() in {"strict-origin-when-cross-origin", "same-origin", "strict-origin", "no-referrer"},
     "Referrer-Policy: strict-origin-when-cross-origin"),
    ("x-content-type-options", lambda v: v.strip().lower() == "nosniff", "X-Content-Type-Options: nosniff"),
]
HTTPS_ONLY = [("strict-transport-security", lambda v: "max-age=" in v, "Strict-Transport-Security: max-age=31536000; includeSubDomains")]


def evaluate(headers, https):
    """headers: речник с имена в малки букви. Връща списък от липсващите или грешните заглавия."""
    missing = []
    for name, ok, expected in REQUIRED + (HTTPS_ONLY if https else []):
        value = headers.get(name)
        if value is None or not ok(value):
            missing.append(f"{expected} (получено: {value!r})")
    return missing


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    url = argv[1]
    request = urllib.request.Request(url, method="GET", headers={"User-Agent": "astromind-header-check"})
    with urllib.request.urlopen(request, timeout=30) as response:
        headers = {k.lower(): v for k, v in response.headers.items()}
    missing = evaluate(headers, https=url.startswith("https://"))
    for line in missing:
        print("ЛИПСВА:", line)
    if not missing:
        print("Всички задължителни заглавия са налични.")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

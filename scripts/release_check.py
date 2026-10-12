#!/usr/bin/env python3
"""
Проверка преди ПЛАТЕН старт (R12). Не е част от build и не спира деплоя на бетата: само казва кое още пречи на таксуването.

  python3 scripts/release_check.py              # проверява изходния код (Legal.jsx)
  python3 scripts/release_check.py --live URL   # допълнително чете GET URL/version от сървъра и показва какво работи

Отказва (код 1), ако:
  - LEGAL_DRAFT е true (правните текстове още са чернова);
  - в COMPANY има непопълнено поле в [СКОБИ];
  - PROCESSORS_VERIFIED не е true (списъкът на обработващите не е потвърден).
Юридическата квалификация, лицензът на Swiss Ephemeris и Stripe остават решения на собственика.
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

LEGAL = Path(__file__).resolve().parent.parent / "src" / "pages" / "Legal.jsx"


def blockers(source):
    found = []
    draft = re.search(r"const\s+LEGAL_DRAFT\s*=\s*(true|false)\s*;", source)
    if not draft:
        found.append("в Legal.jsx не е намерена константата LEGAL_DRAFT")
    elif draft.group(1) == "true":
        found.append("LEGAL_DRAFT=true: правните текстове са чернова")
    company = re.search(r"const\s+COMPANY\s*=\s*\{(.*?)\n\};", source, re.S)
    if not company:
        found.append("в Legal.jsx не е намерен обектът COMPANY")
    else:
        for key, value in re.findall(r"(\w+)\s*:\s*'([^']*)'", company.group(1)):
            if not value.strip() or re.search(r"\[[^\]]*\]", value):
                found.append(f"COMPANY.{key} е непопълнено: {value or '(празно)'}")
    verified = re.search(r"const\s+PROCESSORS_VERIFIED\s*=\s*(true|false)\s*;", source)
    if not verified or verified.group(1) != "true":
        found.append("PROCESSORS_VERIFIED не е true: списъкът на обработващите не е потвърден")
    return found


def main(argv):
    source = LEGAL.read_text(encoding="utf-8")
    problems = blockers(source)
    if "--live" in argv:
        url = argv[argv.index("--live") + 1].rstrip("/") + "/version"
        with urllib.request.urlopen(url, timeout=30) as response:
            print("Работи на сървъра:", json.dumps(json.load(response), ensure_ascii=False))
    for line in problems:
        print("ПРЕЧИ НА ПЛАТЕН СТАРТ:", line)
    if not problems:
        print("Няма блокери в правните текстове.")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

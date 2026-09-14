"""Import/sync employee list from database/people.csv.
Run from backend virtual environment:
    python -m database.import_people
The script generates a new 6-digit PIN only for new employees and prints it once.
It does not store clear PINs in the database.
"""
from pathlib import Path
import csv
import secrets
import sys

ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(ROOT))

from app.db import get_db
from app.models import Person
from app.security import hash_password
from sqlalchemy import select

CSV_PATH = ROOT / "database" / "import" / "people.csv"


def new_pin():
    return f"{secrets.randbelow(1_000_000):06d}"


def parse_date(value):
    value = (value or "").strip()
    if not value:
        return None
    from datetime import date
    try:
        y,m,d = value.split("-")
        return date(int(y), int(m), int(d))
    except ValueError:
        return None


def main():
    if not CSV_PATH.exists():
        raise SystemExit(f"Không tìm thấy {CSV_PATH}")
    created=[]
    updated=[]
    with CSV_PATH.open("r",encoding="utf-8-sig",newline="") as f:
        rows=list(csv.DictReader(f))
    with get_db() as db:
        for row in rows:
            code=row["code"].strip()
            name=row["name"].strip()
            person=db.scalar(select(Person).where(Person.code==code))
            if person:
                person.name=name
                person.birth_date=parse_date(row.get("birth_date"))
                person.title=row.get("title") or None
                person.role=row.get("role") or None
                updated.append(code)
            else:
                pin=new_pin()
                person=Person(name=name,code=code,phone=None,
                              birth_date=parse_date(row.get("birth_date")),
                              title=row.get("title") or None,
                              role=row.get("role") or None,
                              access_pin_hash=hash_password(pin))
                db.add(person)
                db.flush()
                created.append((code,name,pin))
        print(f"Đã đồng bộ {len(rows)} nhân viên: {len(created)} mới, {len(updated)} cập nhật.")
        if created:
            print("\\nMÃ XÁC THỰC 6 SỐ — CHỈ HIỂN THỊ LẦN NÀY:")
            for code,name,pin in created:
                print(f"{code}\t{name}\t{pin}")
        else:
            print("Không có nhân viên mới; không tạo mã mới.")

if __name__ == "__main__":
    main()

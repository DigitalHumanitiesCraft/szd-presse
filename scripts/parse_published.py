"""Deterministic parser for the free-text publication reference bibl[@type='published'].

Turns "Neue Freie Presse, Wien, 3. 5. 1911, S. 2" into periodical, place, date and page.
Every result keeps the original text and a status:
  periodical  periodical reference with a readable date
  book        monograph or anthology reference (publisher colon or editor marker)
  unread      neither pattern applies; kept visible, never guessed
"""

import re

MONTHS = {
    "januar": 1, "jänner": 1, "februar": 2, "märz": 3, "april": 4, "mai": 5, "juni": 6,
    "juli": 7, "august": 8, "september": 9, "oktober": 10, "november": 11, "dezember": 12,
}
_MONTH_ALT = "|".join(MONTHS)

# A book reference names a publisher after "Place:", a publisher word or an editor marker.
BOOK = re.compile(r"(?:\b[A-ZÄÖÜ][\wäöüß./ -]+:\s*\S)|\b[Hh]rsg\.|\bHerausgegeben\b|\bVerlag\b|\bPrivatdruck\b|\bjun\.")
PAGES = re.compile(r",?\s*(?:S\.|Sp\.|Seite|Spalten?)\s*([\d\s–\-.f]+?)\.?\s*$")
# Trailing edition note such as "(Abendblatt)" or "(erstes Beiblatt)"; kept as issue.
EDITION = re.compile(r"\s*\(([^()]*[A-Za-zäöü][^()]*)\)\s*$")
# Volume and issue designation, optionally with the date in parentheses:
# "Jg. 20, Nr. 8 (August 1908)" or "Heft 25, 1927".
ISSUE = re.compile(r",\s*((?:\d+\.\s*)?(?:Jg\.?|Heft|Nr\.)[^,(]*(?:,\s*(?:Heft|Nr\.)[^,(]*)?)(?:\s*\(([^()]*)\))?\s*,?\s*(\d{4})?\s*$")
DATE_NUMERIC = re.compile(r"(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\s*$")
DATE_MONTHNAME = re.compile(rf"(?:(\d{{1,2}})\.\s*)?({_MONTH_ALT})(?:[/–](?:{_MONTH_ALT}))*\s+(\d{{4}})\s*$", re.IGNORECASE)
DATE_YEAR = re.compile(r"\b(\d{4})\s*$")


def _parse_date(text: str) -> tuple[dict | None, str]:
    """Return (date, text before the date) for a date at the end of text."""
    if m := DATE_NUMERIC.search(text):
        day, month, year = int(m[1]), int(m[2]), int(m[3])
        if 1 <= month <= 12 and 1 <= day <= 31:
            return {"year": year, "month": month, "day": day}, text[: m.start()]
    if m := DATE_MONTHNAME.search(text):
        date = {"year": int(m[3]), "month": MONTHS[m[2].lower()]}
        if m[1]:
            date["day"] = int(m[1])
        return date, text[: m.start()]
    if m := DATE_YEAR.search(text):
        return {"year": int(m[1])}, text[: m.start()]
    return None, text


def _date_text(date: dict) -> str:
    """Render a parsed date back into the numeric form _parse_date reads."""
    if "day" in date:
        return f"{date['day']}. {date['month']}. {date['year']}"
    if "month" in date:
        month = next(name for name, num in MONTHS.items() if num == date["month"])
        return f"{month} {date['year']}"
    return str(date["year"])


def parse(raw: str) -> dict:
    text = " ".join(raw.split()).rstrip(" .")
    result = {"raw": raw, "status": "unread", "periodical": None, "place": None, "date": None,
              "pages": None, "issue": None}
    if not text:
        return result
    if BOOK.search(text):
        result["status"] = "book"
        return result
    if m := PAGES.search(text):
        result["pages"] = m[1].strip(" .")
        text = text[: m.start()]
    text = text.rstrip(" ,")
    if (m := ISSUE.search(text)) and (m[2] or m[3]):
        inner, _ = _parse_date(m[2]) if m[2] else ({"year": int(m[3])}, "")
        if inner:
            result["issue"] = m[1].strip()
            text = text[: m.start()] + ", " + _date_text(inner)
    elif m := EDITION.search(text):
        result["issue"] = m[1]
        text = text[: m.start()].rstrip(" ,")
    date, head = _parse_date(text.rstrip(" ,"))
    parts = [p.strip() for p in head.rstrip(" ,").split(",") if p.strip()]
    # A dash before the date is a range ("14.–19. April 1918"); a bare year without an issue
    # cannot tell a periodical from a yearbook. Both stay unread rather than guessed.
    open_range = head.rstrip().endswith("–")
    year_only = date is not None and "month" not in date and result["issue"] is None
    if date is None or not parts or len(parts) > 2 or open_range or year_only:
        result.update(pages=None, issue=None)
        return result
    result.update(status="periodical", periodical=parts[0], date=date,
                  place=parts[1] if len(parts) == 2 else None)
    return result

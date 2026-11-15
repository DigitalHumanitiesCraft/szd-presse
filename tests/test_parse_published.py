import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from parse_published import parse  # noqa: E402

# Examples taken verbatim from the Aufsatzablage TEI.


def test_full_reference():
    r = parse("Neue Freie Presse, Wien, 26. 4. 1911, S. 2")
    assert (r["status"], r["periodical"], r["place"], r["pages"]) == ("periodical", "Neue Freie Presse", "Wien", "2")
    assert r["date"] == {"year": 1911, "month": 4, "day": 26}


def test_without_place():
    r = parse("Frankfurter Zeitung, 25. 3. 1911")
    assert (r["periodical"], r["place"], r["date"]["year"]) == ("Frankfurter Zeitung", None, 1911)


def test_month_name_and_page_range():
    r = parse("Der Lesezirkel, Zürich, 20. Februar 1929, S. 55–59")
    assert r["date"] == {"year": 1929, "month": 2, "day": 20}
    assert r["pages"] == "55–59"


def test_month_only():
    r = parse("Vom Fels zum Meer, Berlin, September 1902, S. 119–123")
    assert r["date"] == {"year": 1902, "month": 9}


def test_books_are_not_periodicals():
    assert parse("Ausstellung Gustinus Ambrosi im Kunstmuseum. August–September 1923. "
                 "St. Gallen: H.Tschudy & Co., 1923. S.7–9")["status"] == "book"
    assert parse("Die Ausfahrt. Ein Buch deutscher Dichtung, Reihe 1, hrsg. von Otto Heuschele, "
                 "Stuttgart: Silberburg, 1927. S. 5-8.")["status"] == "book"


def test_unreadable_stays_unread():
    r = parse("Zeitung unbekannt")
    assert r["status"] == "unread" and r["periodical"] is None
    assert parse("")["status"] == "unread"


def test_issue_with_date_in_parentheses():
    r = parse("Die Neue Rundschau, Berlin, Jg. 20, Nr. 8 (August 1908), S. 1229–1230")
    assert (r["periodical"], r["issue"], r["pages"]) == ("Die Neue Rundschau", "Jg. 20, Nr. 8", "1229–1230")
    assert r["date"] == {"year": 1908, "month": 8}


def test_edition_note_and_columns():
    assert parse("Vossische Zeitung, Berlin, 9. 11. 1912 (Abendblatt)")["issue"] == "Abendblatt"
    r = parse("Das literarische Echo, Berlin, 15. 6. 1904, Spalte 1258")
    assert (r["status"], r["pages"]) == ("periodical", "1258")


def test_typos_and_ranges_stay_unread():
    for raw in ("Frankfurter Zeitung, Frankfurt a. M., 17. 10 1920",
                "Pester Lloyd, Budapest, 17. 10. – 8. 11. 1936",
                "Münchner Allgemeine Zeitung, München, o. D."):
        assert parse(raw)["status"] == "unread", raw

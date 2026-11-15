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


def test_publisher_forms_are_books():
    for raw in ("Privatdruck, München 1936", "Philipp Reclam jun. 1924",
                "Gewalt oder Verständigung? Wien, Verlag des Allgemeinen Österreichischen Frauenvereins, 1917, S. 1"):
        assert parse(raw)["status"] == "book", raw


def test_month_range_and_day_range():
    r = parse("La Belgique artistique et littéraire, Januar–März 1910, S. 7–15")
    assert (r["status"], r["place"], r["date"]) == ("periodical", None, {"year": 1910, "month": 1})
    assert parse("Stimmen zur Internationalen Frauenkonferenz in Bern 14.–19. April 1918, S. 3–4")["status"] == "unread"


def test_bare_year_is_not_enough():
    assert parse("Das Buch des Gesamtverbandes Schaffender Künstler Österreichs, Wien, 1929")["status"] == "unread"
    assert parse("Die Dame, Berlin, Heft 25, 1927, S. 8–9")["status"] == "periodical"

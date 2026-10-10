"""
Security & behaviour tests for the Supabase migrations — run on a throwaway
local PostgreSQL (no Supabase account needed).

    python3 -m venv .venv && .venv/bin/pip install pgserver psycopg2-binary
    .venv/bin/python supabase/tests/run_security_tests.py

It creates a temporary database, applies local_supabase_shim.sql + every
migration in order, then exercises the database as three identities:
an anonymous visitor, a signed-in user who is NOT staff, and the admin.
Exit code 0 = all checks passed.
"""
import datetime as dt
import pathlib
import sys
import tempfile
import uuid

import pgserver
import psycopg2

HERE = pathlib.Path(__file__).resolve().parent
MIGRATIONS = sorted((HERE.parent / "migrations").glob("*.sql"))

ADMIN = str(uuid.uuid4())
OUTSIDER = str(uuid.uuid4())
results = []


def check(name, ok, detail=""):
    results.append((name, ok))
    print(("  PASS  " if ok else "  FAIL  ") + name + (f"  [{detail}]" if detail and not ok else ""))


class DB:
    def __init__(self, conn):
        self.conn = conn
        self.conn.autocommit = True

    def as_(self, who):
        cur = self.conn.cursor()
        cur.execute("reset role")
        sub = {"anon": "", "outsider": OUTSIDER, "admin": ADMIN, "super": ""}[who]
        cur.execute("select set_config('request.jwt.claim.sub', %s, false)", (sub,))
        if who == "anon":
            cur.execute("set role anon")
        elif who in ("outsider", "admin"):
            cur.execute("set role authenticated")
        return cur

    def run(self, who, sql, params=None):
        cur = self.as_(who)
        try:
            cur.execute(sql, params)
            rows = cur.fetchall() if cur.description else None
            return True, rows, cur.rowcount
        except psycopg2.Error as e:
            return False, (e.pgerror or str(e)).strip().splitlines()[0], None
        finally:
            self.conn.cursor().execute("reset role")

    def expect_error(self, name, who, sql, needle, params=None):
        ok, info, _ = self.run(who, sql, params)
        check(name, (not ok) and needle in str(info), str(info))

    def expect_rows(self, name, who, sql, predicate, params=None):
        ok, rows, _ = self.run(who, sql, params)
        check(name, ok and predicate(rows), str(rows)[:200])

    def expect_affected(self, name, who, sql, n, params=None):
        ok, _, count = self.run(who, sql, params)
        check(name, ok and count == n, f"ok={ok} affected={count}")


def next_weekday(weekday, min_days=2):
    """Next date (clinic-local approx.) with Python weekday (Mon=0) at least min_days ahead."""
    d = dt.date.today() + dt.timedelta(days=min_days)
    while d.weekday() != weekday:
        d += dt.timedelta(days=1)
    return d


def booking(**over):
    payload = {
        "name": "Test Patient", "phone": "8 701 123 45 67", "date": str(next_weekday(0)),
        "window": "morning", "method": "call", "comment": "test", "language": "ru", "consent": True,
    }
    payload.update(over)
    import json
    return json.dumps(payload)


def main():
    tmp = tempfile.mkdtemp(prefix="dental-pg-")
    srv = pgserver.get_server(tmp, cleanup_mode="delete")
    conn = psycopg2.connect(srv.get_uri())
    db = DB(conn)
    cur = db.as_("super")
    cur.execute((HERE / "local_supabase_shim.sql").read_text())
    for m in MIGRATIONS:
        cur.execute(m.read_text())
        print(f"applied {m.name}")
    cur.execute("insert into auth.users (id, email) values (%s, 'owner@clinic.test'), (%s, 'stranger@example.test')", (ADMIN, OUTSIDER))
    # First admin — exactly as SETUP.md instructs (run once, as the database owner).
    cur.execute((HERE.parent / "create_first_admin.sql").read_text().replace("owner@example.com", "owner@clinic.test"))

    doc = db.run("super", "select id from public.doctors where slug = 'doctor-1'")[1][0][0]
    doc2 = db.run("super", "select id from public.doctors where slug = 'doctor-2'")[1][0][0]
    svc_general = db.run("super", "select id from public.services where slug = 'general'")[1][0][0]
    svc_ortho = db.run("super", "select id from public.services where slug = 'orthodontics'")[1][0][0]
    monday = next_weekday(0)
    sunday = next_weekday(6)

    print("\n— Anonymous visitor")
    db.expect_rows("anon reads active doctors", "anon", "select count(*) from public.doctors", lambda r: r[0][0] == 4)
    db.expect_rows("anon reads settings", "anon", "select name from public.clinic_settings", lambda r: len(r) == 1)
    db.expect_rows("anon reads published gallery", "anon", "select count(*) from public.gallery_images", lambda r: r[0][0] == 8)
    db.expect_error("anon cannot read appointments", "anon", "select * from public.appointments", "permission denied")
    db.expect_error("anon cannot insert appointments directly", "anon",
                    "insert into public.appointments (reference, preferred_date, patient_name, patient_phone, consent) values ('X', current_date, 'Ab', '+77011234567', true)",
                    "permission denied")
    db.expect_error("anon cannot read staff list", "anon", "select * from public.staff_users", "permission denied")
    db.expect_error("anon cannot read doctor schedules", "anon", "select * from public.doctor_schedules", "permission denied")
    db.expect_error("anon cannot change prices", "anon", "update public.prices set price = 1", "permission denied")
    db.expect_error("anon cannot add doctors", "anon", "insert into public.doctors (slug) values ('hacker')", "permission denied")
    db.expect_error("anon cannot upload files", "anon",
                    "insert into storage.objects (bucket_id, name) values ('media', 'x.webp')", "row-level security")

    print("\n— Appointment submission (server-side validation)")
    db.expect_rows("valid request is accepted", "anon", "select public.submit_appointment(%s::jsonb)",
                   lambda r: r[0][0]["reference"].startswith("REQ-") and r[0][0]["status"] == "new",
                   (booking(doctor_id=str(doc), service_id=str(svc_general)),))
    db.expect_rows("phone normalised to +7…", "super", "select patient_phone from public.appointments limit 1",
                   lambda r: r[0][0] == "+77011234567")
    db.expect_error("missing consent rejected", "anon", "select public.submit_appointment(%s::jsonb)", "CONSENT_REQUIRED", (booking(consent=False),))
    db.expect_error("non-KZ phone rejected", "anon", "select public.submit_appointment(%s::jsonb)", "INVALID_PHONE", (booking(phone="+1 202 555 0100"),))
    db.expect_error("name with digits rejected", "anon", "select public.submit_appointment(%s::jsonb)", "INVALID_NAME", (booking(name="Bob123"),))
    db.expect_error("past date rejected", "anon", "select public.submit_appointment(%s::jsonb)", "INVALID_DATE", (booking(date="2020-01-01"),))
    db.expect_error("closed day (Sunday) rejected", "anon", "select public.submit_appointment(%s::jsonb)", "DATE_CLOSED", (booking(date=str(sunday)),))
    db.expect_error("service not offered by doctor rejected", "anon", "select public.submit_appointment(%s::jsonb)", "SERVICE_NOT_OFFERED",
                    (booking(doctor_id=str(doc), service_id=str(svc_ortho)),))
    db.expect_error("unknown doctor rejected", "anon", "select public.submit_appointment(%s::jsonb)", "INVALID_DOCTOR",
                    (booking(doctor_id=str(uuid.uuid4())),))
    db.expect_error("overlong comment rejected", "anon", "select public.submit_appointment(%s::jsonb)", "COMMENT_TOO_LONG", (booking(comment="x" * 501),))
    db.run("anon", "select public.submit_appointment(%s::jsonb)", (booking(phone="+77011112233"),))
    db.run("anon", "select public.submit_appointment(%s::jsonb)", (booking(phone="+77011112233"),))
    db.run("anon", "select public.submit_appointment(%s::jsonb)", (booking(phone="+77011112233"),))
    db.expect_error("4th request from one phone within an hour is rate-limited", "anon",
                    "select public.submit_appointment(%s::jsonb)", "RATE_LIMITED", (booking(phone="+77011112233"),))

    print("\n— Signed-in user who is NOT staff (privilege escalation attempts)")
    db.expect_rows("outsider sees no appointments", "outsider", "select count(*) from public.appointments", lambda r: r[0][0] == 0)
    db.expect_affected("outsider cannot change prices", "outsider", "update public.prices set price = 1", 0)
    db.expect_affected("outsider cannot deactivate doctors", "outsider", "update public.doctors set is_active = false", 0)
    db.expect_error("outsider cannot make themselves admin", "outsider",
                    "insert into public.staff_users (user_id, role) values (%s, 'admin')", "row-level security", (OUTSIDER,))
    db.expect_rows("outsider is not admin", "outsider", "select public.is_admin()", lambda r: r[0][0] is False)
    db.expect_error("outsider cannot upload files", "outsider",
                    "insert into storage.objects (bucket_id, name) values ('media', 'x.webp')", "row-level security")
    db.expect_affected("outsider cannot edit settings", "outsider", "update public.clinic_settings set name = 'pwned'", 0)

    print("\n— Administrator")
    db.expect_rows("admin is recognised", "admin", "select public.is_admin()", lambda r: r[0][0] is True)
    db.expect_rows("admin reads all appointments", "admin", "select count(*) from public.appointments", lambda r: r[0][0] == 4)
    db.expect_affected("admin changes a price", "admin", "update public.prices set price = 6000 where slug = 'consult'", 1)
    db.expect_rows("price change is publicly visible", "anon", "select price from public.prices where slug = 'consult'", lambda r: r[0][0] == 6000)
    db.expect_affected("admin uploads to storage", "admin", "insert into storage.objects (bucket_id, name) values ('media', 'doctors/a.webp')", 1)
    db.expect_affected("admin deactivates a doctor", "admin", "update public.doctors set is_active = false where slug = 'doctor-4'", 1)
    db.expect_rows("inactive doctor hidden from public", "anon", "select count(*) from public.doctors", lambda r: r[0][0] == 3)
    db.expect_rows("inactive doctor still visible to admin", "admin", "select count(*) from public.doctors", lambda r: r[0][0] == 4)
    for i in range(7):
        db.run("admin", "insert into public.doctors (slug, name) values (%s, '{}')", (f"extra-{i}",))
    db.expect_rows("10 active doctors reached", "admin", "select count(*) from public.doctors where is_active", lambda r: r[0][0] == 10)
    db.expect_error("11th active doctor blocked", "admin", "insert into public.doctors (slug) values ('eleventh')", "MAX_ACTIVE_DOCTORS")
    db.expect_error("re-activating beyond limit blocked", "admin", "update public.doctors set is_active = true where slug = 'doctor-4'", "MAX_ACTIVE_DOCTORS")
    db.expect_error("admin cannot deactivate own account", "admin", "update public.staff_users set is_active = false where user_id = %s", "CANNOT_DEMOTE_SELF", (ADMIN,))
    db.expect_error("real case cannot be published without consent", "admin",
                    "insert into public.gallery_images (kind, before_path, after_path, is_published) values ('case', 'a', 'b', true)",
                    "gallery_case_requires_consent")
    db.expect_affected("real case with recorded consent can be published", "admin",
                       "insert into public.gallery_images (kind, before_path, after_path, is_published, consent_obtained, consent_scope) values ('case', 'a', 'b', true, true, '{website}')", 1)
    db.expect_affected("unpublished interior image", "admin",
                       "insert into public.gallery_images (kind, image_path, is_published) values ('interior', 'secret.webp', false)", 1)
    db.expect_rows("unpublished image hidden from public", "anon",
                   "select count(*) from public.gallery_images where image_path = 'secret.webp'", lambda r: r[0][0] == 0)

    print("\n— Real-time scheduling")
    db.run("admin", "update public.clinic_settings set booking_mode = 'realtime', slot_step_minutes = 30, min_lead_minutes = 0")
    slots = db.run("anon", "select s from public.get_available_slots(%s, %s, %s) s", (doc, svc_general, monday))[1]
    times = [s[0].astimezone(dt.timezone(dt.timedelta(hours=5))).strftime("%H:%M") for s in slots]
    check("slots generated for a working day", len(times) > 5, str(times))
    check("no slot overlaps the 13:00–14:00 break (60-min service)", "12:30" not in times and "13:00" not in times and "12:00" in times and "14:00" in times, str(times))
    check("last slot ends by 18:00", times and times[-1] == "17:00", str(times[-3:]))
    db.expect_rows("no slots on Sunday", "anon", "select count(*) from public.get_available_slots(%s, %s, %s)", lambda r: r[0][0] == 0, (doc, svc_general, sunday))
    db.expect_rows("no slots for a service the doctor does not offer", "anon", "select count(*) from public.get_available_slots(%s, %s, %s)",
                   lambda r: r[0][0] == 0, (doc, svc_ortho, monday))
    first = slots[0][0].isoformat()
    db.expect_rows("booking a free slot holds it (awaiting confirmation)", "anon", "select public.submit_appointment(%s::jsonb)",
                   lambda r: r[0][0]["status"] == "awaiting_confirmation",
                   (booking(phone="+77770000001", doctor_id=str(doc), service_id=str(svc_general), date=str(monday), slot_start=first),))
    db.expect_error("same slot cannot be booked twice", "anon", "select public.submit_appointment(%s::jsonb)", "SLOT_UNAVAILABLE",
                    (booking(phone="+77770000002", doctor_id=str(doc), service_id=str(svc_general), date=str(monday), slot_start=first),))
    db.expect_rows("held slot disappears from availability", "anon", "select count(*) from public.get_available_slots(%s, %s, %s) s where s = %s",
                   lambda r: r[0][0] == 0, (doc, svc_general, monday, first))
    db.expect_error("invented slot time rejected", "anon", "select public.submit_appointment(%s::jsonb)", "SLOT_UNAVAILABLE",
                    (booking(phone="+77770000003", doctor_id=str(doc), service_id=str(svc_general), date=str(monday),
                             slot_start=f"{monday}T13:15:00+05:00"),))
    db.expect_error("admin cannot confirm an overlapping appointment", "admin",
                    "insert into public.appointments (reference, status, doctor_id, preferred_date, slot_start, slot_end, patient_name, patient_phone, consent) "
                    "values ('MANUAL-1', 'confirmed', %s, %s, %s::timestamptz + interval '15 minutes', %s::timestamptz + interval '45 minutes', 'Walk In', '+77770000009', true)",
                    "SLOT_CONFLICT", (doc, monday, first, first))
    db.expect_affected("other doctors are unaffected by the hold", "admin",
                       "insert into public.appointments (reference, status, doctor_id, preferred_date, slot_start, slot_end, patient_name, patient_phone, consent) "
                       "values ('MANUAL-2', 'confirmed', %s, %s, %s::timestamptz, %s::timestamptz + interval '30 minutes', 'Walk In', '+77770000009', true)",
                       1, (doc2, monday, first, first))
    db.expect_affected("admin cancels the held appointment", "admin",
                       "update public.appointments set status = 'cancelled' where slot_start = %s and doctor_id = %s", 1, (first, doc))
    db.expect_rows("cancelled slot becomes available again", "anon", "select count(*) from public.get_available_slots(%s, %s, %s) s where s = %s",
                   lambda r: r[0][0] == 1, (doc, svc_general, monday, first))
    db.expect_affected("admin reschedules (moves) an appointment to a free slot", "admin",
                       "update public.appointments set status = 'confirmed', slot_start = slot_start + interval '1 hour', slot_end = slot_end + interval '1 hour' where reference = 'MANUAL-2'", 1)

    conn.close()
    srv.cleanup()
    failed = [n for n, ok in results if not ok]
    print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()

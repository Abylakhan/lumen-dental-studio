-- =============================================================================
-- Grant administrator access to the clinic owner — run ONCE.
--
-- 1. Supabase dashboard → Authentication → Users → "Add user" → "Create new user"
--    with the owner's email and a strong password (tick "Auto Confirm User").
--    Supabase stores only a bcrypt hash of the password.
-- 2. Replace the email below, then run this in the SQL Editor.
--
-- Only users listed in public.staff_users can open /admin/. Signing up is
-- disabled, and nobody can add themselves to this table.
-- =============================================================================
insert into public.staff_users (user_id, role, display_name)
select id, 'admin', 'Clinic owner'
from auth.users
where lower(email) = lower('owner@example.com')
on conflict (user_id) do update set role = 'admin', is_active = true;

-- Verify: should return exactly one row.
select s.user_id, u.email, s.role, s.is_active
from public.staff_users s join auth.users u on u.id = s.user_id;

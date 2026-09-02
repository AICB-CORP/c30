-- Test the exact query the signup route makes
select id, code, role, uses_count, max_uses, first_used_at
from public.invites
where code = 'BESTIE';
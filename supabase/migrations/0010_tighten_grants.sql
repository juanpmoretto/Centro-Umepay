-- 0009 accidentally granted anon base SELECT on booking_requests (organizer
-- PII: name, email, phone). RLS already blocks it in practice (there is no
-- anon SELECT policy on this table, only INSERT), so this was not an actual
-- exposure -- but the base grant should match intent for defense in depth,
-- so a future policy change can't silently reintroduce a leak.
revoke select on booking_requests from anon;

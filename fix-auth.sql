-- This query disables email confirmation requirement for all users in the project (run in SQL editor)
UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL;

-- Run this in your Supabase SQL Editor to add the password column
ALTER TABLE schools ADD COLUMN IF NOT EXISTS admin_password VARCHAR(255);

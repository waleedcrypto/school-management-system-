-- Run this script in your Supabase SQL Editor

-- 1. Automatically find all foreign keys pointing to core tables and make them ON DELETE CASCADE
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tc.table_schema, tc.constraint_name, tc.table_name, kcu.column_name, 
           ccu.table_schema AS foreign_table_schema,
           ccu.table_name AS foreign_table_name,
           ccu.column_name AS foreign_column_name 
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name IN ('students', 'subjects', 'teachers', 'classes', 'sections', 'academic_sessions', 'profiles')
  ) LOOP
    -- Drop the existing constraint
    EXECUTE 'ALTER TABLE ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name) || 
            ' DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    
    -- Recreate it with ON DELETE CASCADE
    EXECUTE 'ALTER TABLE ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name) || 
            ' ADD CONSTRAINT ' || quote_ident(r.constraint_name) || 
            ' FOREIGN KEY (' || quote_ident(r.column_name) || ') ' ||
            ' REFERENCES ' || quote_ident(r.foreign_table_schema) || '.' || quote_ident(r.foreign_table_name) || 
            ' (' || quote_ident(r.foreign_column_name) || ') ON DELETE CASCADE';
  END LOOP;
END $$;

-- 2. Add a blanket DELETE policy for all tables so authenticated users can delete records
DO $$
DECLARE
  row record;
BEGIN
  FOR row IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', row.tablename);
    EXECUTE format('DROP POLICY IF EXISTS "Allow delete to authenticated" ON public.%I;', row.tablename);
    EXECUTE format('CREATE POLICY "Allow delete to authenticated" ON public.%I FOR DELETE USING (auth.role() = ''authenticated'');', row.tablename);
  END LOOP;
END;
$$;

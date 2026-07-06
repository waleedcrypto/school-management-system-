-- 1. Create the storage bucket for school documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('school_documents', 'school_documents', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up Storage Policies for 'school_documents'
-- Allow public access to view/download files
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'school_documents' );

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'school_documents' AND auth.role() = 'authenticated' );

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'school_documents' AND auth.role() = 'authenticated' );

-- 3. Fix unverified users (fixes the login issue)
UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL;

ALTER TABLE school_documents ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'all';
ALTER TABLE school_documents ADD COLUMN IF NOT EXISTS assigned_teachers UUID[] DEFAULT '{}';

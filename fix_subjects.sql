-- Fix RLS Policies for subject related tables
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage subjects" ON subjects;
CREATE POLICY "Authenticated users can manage subjects" ON subjects FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage class_subjects" ON class_subjects;
CREATE POLICY "Authenticated users can manage class_subjects" ON class_subjects FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage teacher_subjects" ON teacher_subjects;
CREATE POLICY "Authenticated users can manage teacher_subjects" ON teacher_subjects FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Ensure ON DELETE CASCADE is properly set for all related tables
ALTER TABLE class_subjects DROP CONSTRAINT IF EXISTS class_subjects_subject_id_fkey;
ALTER TABLE class_subjects ADD CONSTRAINT class_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;

ALTER TABLE teacher_subjects DROP CONSTRAINT IF EXISTS teacher_subjects_subject_id_fkey;
ALTER TABLE teacher_subjects ADD CONSTRAINT teacher_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;

ALTER TABLE timetables DROP CONSTRAINT IF EXISTS timetables_subject_id_fkey;
ALTER TABLE timetables ADD CONSTRAINT timetables_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;

ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_subject_id_fkey;
ALTER TABLE assignments ADD CONSTRAINT assignments_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;

ALTER TABLE marks DROP CONSTRAINT IF EXISTS marks_subject_id_fkey;
ALTER TABLE marks ADD CONSTRAINT marks_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;

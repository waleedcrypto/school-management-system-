-- Run this in your Supabase SQL Editor

-- 1. Enable RLS and add DELETE policies for all tables
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow delete subjects" ON subjects;
CREATE POLICY "Allow delete subjects" ON subjects FOR DELETE USING (auth.role() = 'authenticated');

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow delete students" ON students;
CREATE POLICY "Allow delete students" ON students FOR DELETE USING (auth.role() = 'authenticated');

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow delete teachers" ON teachers;
CREATE POLICY "Allow delete teachers" ON teachers FOR DELETE USING (auth.role() = 'authenticated');

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow delete classes" ON classes;
CREATE POLICY "Allow delete classes" ON classes FOR DELETE USING (auth.role() = 'authenticated');

ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow delete sections" ON sections;
CREATE POLICY "Allow delete sections" ON sections FOR DELETE USING (auth.role() = 'authenticated');

-- Sub-tables policies
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow delete class_subjects" ON class_subjects;
CREATE POLICY "Allow delete class_subjects" ON class_subjects FOR DELETE USING (auth.role() = 'authenticated');

ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow delete teacher_subjects" ON teacher_subjects;
CREATE POLICY "Allow delete teacher_subjects" ON teacher_subjects FOR DELETE USING (auth.role() = 'authenticated');

ALTER TABLE student_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow delete student_sections" ON student_sections;
CREATE POLICY "Allow delete student_sections" ON student_sections FOR DELETE USING (auth.role() = 'authenticated');

ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow delete timetables" ON timetables;
CREATE POLICY "Allow delete timetables" ON timetables FOR DELETE USING (auth.role() = 'authenticated');

-- 2. Make sure Foreign Keys have ON DELETE CASCADE
-- For subjects
ALTER TABLE class_subjects DROP CONSTRAINT IF EXISTS class_subjects_subject_id_fkey;
ALTER TABLE class_subjects ADD CONSTRAINT class_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;

ALTER TABLE teacher_subjects DROP CONSTRAINT IF EXISTS teacher_subjects_subject_id_fkey;
ALTER TABLE teacher_subjects ADD CONSTRAINT teacher_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;

-- For students
ALTER TABLE student_sections DROP CONSTRAINT IF EXISTS student_sections_student_id_fkey;
ALTER TABLE student_sections ADD CONSTRAINT student_sections_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_id_fkey;
ALTER TABLE attendance ADD CONSTRAINT attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE marks DROP CONSTRAINT IF EXISTS marks_student_id_fkey;
ALTER TABLE marks ADD CONSTRAINT marks_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

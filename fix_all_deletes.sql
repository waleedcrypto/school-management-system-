-- Run this in your Supabase SQL Editor

-- 1. Enable RLS and add DELETE policies for all tables
DO $$ 
DECLARE
  t text;
  tables text[] := ARRAY['subjects', 'students', 'teachers', 'classes', 'sections', 'class_subjects', 'teacher_subjects', 'student_sections', 'timetables', 'attendance', 'marks', 'student_fees', 'assignments', 'assignment_submissions', 'exams'];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow delete on %I" ON %I;', t, t);
    EXECUTE format('CREATE POLICY "Allow delete on %I" ON %I FOR DELETE USING (auth.role() = ''authenticated'');', t, t);
  END LOOP;
END $$;

-- 2. Add ON DELETE CASCADE to student relationships
ALTER TABLE student_sections DROP CONSTRAINT IF EXISTS student_sections_student_id_fkey;
ALTER TABLE student_sections ADD CONSTRAINT student_sections_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_id_fkey;
ALTER TABLE attendance ADD CONSTRAINT attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE marks DROP CONSTRAINT IF EXISTS marks_student_id_fkey;
ALTER TABLE marks ADD CONSTRAINT marks_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE student_fees DROP CONSTRAINT IF EXISTS student_fees_student_id_fkey;
ALTER TABLE student_fees ADD CONSTRAINT student_fees_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE assignment_submissions DROP CONSTRAINT IF EXISTS assignment_submissions_student_id_fkey;
ALTER TABLE assignment_submissions ADD CONSTRAINT assignment_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

-- 3. Add ON DELETE CASCADE to subject relationships
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

-- 4. Add ON DELETE CASCADE to teacher relationships
ALTER TABLE teacher_subjects DROP CONSTRAINT IF EXISTS teacher_subjects_teacher_id_fkey;
ALTER TABLE teacher_subjects ADD CONSTRAINT teacher_subjects_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE;

ALTER TABLE timetables DROP CONSTRAINT IF EXISTS timetables_teacher_id_fkey;
ALTER TABLE timetables ADD CONSTRAINT timetables_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE;


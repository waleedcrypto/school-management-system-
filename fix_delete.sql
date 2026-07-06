-- Run this in your Supabase SQL Editor to fix the DELETE issues

-- 1. Subjects and related tables
CREATE POLICY "Allow delete subjects" ON subjects FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow delete class_subjects" ON class_subjects FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow delete teacher_subjects" ON teacher_subjects FOR DELETE USING (auth.role() = 'authenticated');

-- 2. Students and related tables
CREATE POLICY "Allow delete students" ON students FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow delete student_sections" ON student_sections FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow delete attendance" ON attendance FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow delete marks" ON marks FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow delete student_fees" ON student_fees FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow delete assignment_submissions" ON assignment_submissions FOR DELETE USING (auth.role() = 'authenticated');

-- 3. Others
CREATE POLICY "Allow delete teachers" ON teachers FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow delete classes" ON classes FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow delete sections" ON sections FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow delete timetables" ON timetables FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow delete assignments" ON assignments FOR DELETE USING (auth.role() = 'authenticated');

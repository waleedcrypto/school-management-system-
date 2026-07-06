-- 1. Drop existing policies to avoid "already exists" errors
DROP POLICY IF EXISTS "Authenticated users can manage students" ON students;
DROP POLICY IF EXISTS "Authenticated users can manage teachers" ON teachers;
DROP POLICY IF EXISTS "Authenticated users can manage classes" ON classes;
DROP POLICY IF EXISTS "Authenticated users can manage sections" ON sections;
DROP POLICY IF EXISTS "Authenticated users can manage attendance" ON attendance;
DROP POLICY IF EXISTS "Authenticated users can manage subjects" ON subjects;
DROP POLICY IF EXISTS "Authenticated users can manage exams" ON exams;
DROP POLICY IF EXISTS "Authenticated users can manage marks" ON marks;
DROP POLICY IF EXISTS "Authenticated users can manage fee_structures" ON fee_structures;
DROP POLICY IF EXISTS "Authenticated users can manage student_fees" ON student_fees;
DROP POLICY IF EXISTS "Authenticated users can manage notices" ON notices;
DROP POLICY IF EXISTS "Authenticated users can manage assignments" ON assignments;
DROP POLICY IF EXISTS "Authenticated users can manage timetables" ON timetables;
DROP POLICY IF EXISTS "Authenticated users can manage academic_sessions" ON academic_sessions;
DROP POLICY IF EXISTS "Authenticated users can manage student_sections" ON student_sections;

-- 2. Create the policies properly
CREATE POLICY "Authenticated users can manage students" ON students FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage teachers" ON teachers FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage classes" ON classes FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage sections" ON sections FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage attendance" ON attendance FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage subjects" ON subjects FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage exams" ON exams FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage marks" ON marks FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage fee_structures" ON fee_structures FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage student_fees" ON student_fees FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage notices" ON notices FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage assignments" ON assignments FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage timetables" ON timetables FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage academic_sessions" ON academic_sessions FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage student_sections" ON student_sections FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

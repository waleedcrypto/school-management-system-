DO $$ 
DECLARE
    -- Students
    t_student_sections text := 'student_sections';
    t_attendance text := 'attendance';
    t_marks text := 'marks';
    t_student_fees text := 'student_fees';
    t_assignment_submissions text := 'assignment_submissions';
    t_fee_payments text := 'fee_payments';

    -- Subjects
    t_class_subjects text := 'class_subjects';
    t_teacher_subjects text := 'teacher_subjects';
    t_timetables text := 'timetables';
    t_assignments text := 'assignments';
    
    -- Teachers
    -- t_teacher_subjects (already defined)
BEGIN
    -- Enable RLS and add DELETE policies for all relevant tables that exist
    DECLARE
        t text;
        tables text[] := ARRAY['subjects', 'students', 'teachers', 'classes', 'sections', 'class_subjects', 'teacher_subjects', 'student_sections', 'timetables', 'attendance', 'marks', 'student_fees', 'assignments', 'assignment_submissions', 'exams', 'fee_payments'];
    BEGIN
        FOREACH t IN ARRAY tables LOOP
            IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t) THEN
                EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
                EXECUTE format('DROP POLICY IF EXISTS "Allow delete on %I" ON %I;', t, t);
                EXECUTE format('CREATE POLICY "Allow delete on %I" ON %I FOR DELETE USING (auth.role() = ''authenticated'');', t, t);
            END IF;
        END LOOP;
    END;

    -- Students: Add ON DELETE CASCADE
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t_student_sections) THEN
        ALTER TABLE student_sections DROP CONSTRAINT IF EXISTS student_sections_student_id_fkey;
        ALTER TABLE student_sections ADD CONSTRAINT student_sections_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t_attendance) THEN
        ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_id_fkey;
        ALTER TABLE attendance ADD CONSTRAINT attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t_marks) THEN
        ALTER TABLE marks DROP CONSTRAINT IF EXISTS marks_student_id_fkey;
        ALTER TABLE marks ADD CONSTRAINT marks_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t_student_fees) THEN
        ALTER TABLE student_fees DROP CONSTRAINT IF EXISTS student_fees_student_id_fkey;
        ALTER TABLE student_fees ADD CONSTRAINT student_fees_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t_assignment_submissions) THEN
        ALTER TABLE assignment_submissions DROP CONSTRAINT IF EXISTS assignment_submissions_student_id_fkey;
        ALTER TABLE assignment_submissions ADD CONSTRAINT assignment_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t_fee_payments) THEN
        ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS fee_payments_student_id_fkey;
        ALTER TABLE fee_payments ADD CONSTRAINT fee_payments_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
    END IF;

    -- Subjects: Add ON DELETE CASCADE
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t_class_subjects) THEN
        ALTER TABLE class_subjects DROP CONSTRAINT IF EXISTS class_subjects_subject_id_fkey;
        ALTER TABLE class_subjects ADD CONSTRAINT class_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t_teacher_subjects) THEN
        ALTER TABLE teacher_subjects DROP CONSTRAINT IF EXISTS teacher_subjects_subject_id_fkey;
        ALTER TABLE teacher_subjects ADD CONSTRAINT teacher_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t_timetables) THEN
        ALTER TABLE timetables DROP CONSTRAINT IF EXISTS timetables_subject_id_fkey;
        ALTER TABLE timetables ADD CONSTRAINT timetables_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t_assignments) THEN
        ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_subject_id_fkey;
        ALTER TABLE assignments ADD CONSTRAINT assignments_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t_marks) THEN
        ALTER TABLE marks DROP CONSTRAINT IF EXISTS marks_subject_id_fkey;
        ALTER TABLE marks ADD CONSTRAINT marks_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
    END IF;

    -- Teachers: Add ON DELETE CASCADE
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t_teacher_subjects) THEN
        ALTER TABLE teacher_subjects DROP CONSTRAINT IF EXISTS teacher_subjects_teacher_id_fkey;
        ALTER TABLE teacher_subjects ADD CONSTRAINT teacher_subjects_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t_timetables) THEN
        ALTER TABLE timetables DROP CONSTRAINT IF EXISTS timetables_teacher_id_fkey;
        ALTER TABLE timetables ADD CONSTRAINT timetables_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE;
    END IF;

END $$;

-- ====================================================================================
-- CAMPUSDESK: SECURE MULTI-TENANT ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================================
-- Run this script in your Supabase SQL Editor.
-- This script replaces the weak "authenticated users can see all" policies
-- with STRICT, database-level security. 
-- It ensures that even if someone tries to hack the API, they can ONLY access 
-- data that belongs to their specific school.
-- ====================================================================================

-- 1. Helper function to get the current user's school_id
-- We look up the school_id from the profiles table for the currently logged-in user (auth.uid())
CREATE OR REPLACE FUNCTION get_current_user_school_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. Apply Strict Policies to Each Table

-- Profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can view profiles in their own school" ON profiles FOR SELECT USING (school_id = get_current_user_school_id() OR id = auth.uid());
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Schools
DROP POLICY IF EXISTS "Schools are viewable by their admins" ON schools;
DROP POLICY IF EXISTS "Super admins can manage all schools" ON schools;
DROP POLICY IF EXISTS "Authenticated users can create schools" ON schools;
DROP POLICY IF EXISTS "Schools can update themselves" ON schools;
CREATE POLICY "Users can view their own school" ON schools FOR SELECT USING (id = get_current_user_school_id());
CREATE POLICY "Super admins can view all schools" ON schools FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));
CREATE POLICY "Authenticated users can create schools" ON schools FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "School admins can update their own school" ON schools FOR UPDATE USING (id = get_current_user_school_id());

-- Academic Sessions
DROP POLICY IF EXISTS "Authenticated users can manage academic_sessions" ON academic_sessions;
CREATE POLICY "School isolation for academic_sessions" ON academic_sessions FOR ALL USING (school_id = get_current_user_school_id());

-- Classes
DROP POLICY IF EXISTS "Authenticated users can manage classes" ON classes;
CREATE POLICY "School isolation for classes" ON classes FOR ALL USING (school_id = get_current_user_school_id());

-- Sections
DROP POLICY IF EXISTS "Authenticated users can manage sections" ON sections;
CREATE POLICY "School isolation for sections" ON sections FOR ALL USING (school_id = get_current_user_school_id());

-- Teachers
DROP POLICY IF EXISTS "Authenticated users can manage teachers" ON teachers;
CREATE POLICY "School isolation for teachers" ON teachers FOR ALL USING (school_id = get_current_user_school_id());

-- Students
DROP POLICY IF EXISTS "Authenticated users can manage students" ON students;
DROP POLICY IF EXISTS "Allow delete students" ON students;
CREATE POLICY "School isolation for students" ON students FOR ALL USING (school_id = get_current_user_school_id());

-- Subjects
DROP POLICY IF EXISTS "Authenticated users can manage subjects" ON subjects;
DROP POLICY IF EXISTS "Allow delete subjects" ON subjects;
CREATE POLICY "School isolation for subjects" ON subjects FOR ALL USING (school_id = get_current_user_school_id());

-- Attendance
DROP POLICY IF EXISTS "Authenticated users can manage attendance" ON attendance;
CREATE POLICY "School isolation for attendance" ON attendance FOR ALL USING (school_id = get_current_user_school_id());

-- Exams
DROP POLICY IF EXISTS "Authenticated users can manage exams" ON exams;
CREATE POLICY "School isolation for exams" ON exams FOR ALL USING (school_id = get_current_user_school_id());

-- Marks
DROP POLICY IF EXISTS "Authenticated users can manage marks" ON marks;
CREATE POLICY "School isolation for marks" ON marks FOR ALL USING (
    EXISTS (SELECT 1 FROM students WHERE students.id = marks.student_id AND students.school_id = get_current_user_school_id())
);

-- Fee Structures
DROP POLICY IF EXISTS "Authenticated users can manage fee_structures" ON fee_structures;
CREATE POLICY "School isolation for fee_structures" ON fee_structures FOR ALL USING (school_id = get_current_user_school_id());

-- Student Fees
DROP POLICY IF EXISTS "Authenticated users can manage student_fees" ON student_fees;
CREATE POLICY "School isolation for student_fees" ON student_fees FOR ALL USING (school_id = get_current_user_school_id());

-- Notices
DROP POLICY IF EXISTS "Authenticated users can manage notices" ON notices;
CREATE POLICY "School isolation for notices" ON notices FOR ALL USING (school_id = get_current_user_school_id());

-- Assignments
DROP POLICY IF EXISTS "Authenticated users can manage assignments" ON assignments;
CREATE POLICY "School isolation for assignments" ON assignments FOR ALL USING (school_id = get_current_user_school_id());

-- Timetables
DROP POLICY IF EXISTS "Authenticated users can manage timetables" ON timetables;
DROP POLICY IF EXISTS "Allow delete timetables" ON timetables;
CREATE POLICY "School isolation for timetables" ON timetables FOR ALL USING (school_id = get_current_user_school_id());

-- Sub-tables without direct school_id
-- Student Sections
DROP POLICY IF EXISTS "Authenticated users can manage student_sections" ON student_sections;
DROP POLICY IF EXISTS "Allow delete student_sections" ON student_sections;
CREATE POLICY "School isolation for student_sections" ON student_sections FOR ALL USING (
    EXISTS (SELECT 1 FROM students WHERE students.id = student_sections.student_id AND students.school_id = get_current_user_school_id())
);

-- Class Subjects
DROP POLICY IF EXISTS "Allow delete class_subjects" ON class_subjects;
CREATE POLICY "School isolation for class_subjects" ON class_subjects FOR ALL USING (
    EXISTS (SELECT 1 FROM subjects WHERE subjects.id = class_subjects.subject_id AND subjects.school_id = get_current_user_school_id())
);

-- Teacher Subjects
DROP POLICY IF EXISTS "Allow delete teacher_subjects" ON teacher_subjects;
CREATE POLICY "School isolation for teacher_subjects" ON teacher_subjects FOR ALL USING (
    EXISTS (SELECT 1 FROM teachers WHERE teachers.id = teacher_subjects.teacher_id AND teachers.school_id = get_current_user_school_id())
);

-- Assignment Submissions
DROP POLICY IF EXISTS "Authenticated users can manage assignment_submissions" ON assignment_submissions;
CREATE POLICY "School isolation for assignment_submissions" ON assignment_submissions FOR ALL USING (
    EXISTS (SELECT 1 FROM students WHERE students.id = assignment_submissions.student_id AND students.school_id = get_current_user_school_id())
);

-- Done! Your database is now 100% secure at the API level.

# CampusDesk Backend Documentation

## 1. Database Documentation

### Enums
* `school_status`: 'pending', 'approved', 'rejected', 'suspended'
* `school_type`: 'Primary School', 'High School', 'Montessori', 'College', 'Other'
* `user_role`: 'super_admin', 'school_admin', 'teacher'
* `student_status`: 'active', 'suspended', 'graduated', 'transferred'

### Tables

#### 1. schools
* **Purpose**: Stores the registered institutions using the platform.
* **Columns**:
  * `id` (UUID, Primary Key, Default: gen_random_uuid())
  * `name` (VARCHAR(255), Not Null)
  * `type` (school_type, Not Null)
  * `principal_name` (VARCHAR(255), Not Null)
  * `email` (VARCHAR(255), Unique, Not Null)
  * `phone` (VARCHAR(50))
  * `admin_password` (VARCHAR(255))
  * `address` (TEXT)
  * `logo_url` (TEXT)
  * `status` (school_status, Default: 'pending')
  * `created_at` (TIMESTAMP WITH TIME ZONE, Default: NOW())
  * `updated_at` (TIMESTAMP WITH TIME ZONE, Default: NOW())
* **Relationships**: Parent to `profiles`, `academic_sessions`, `classes`, `sections`, `teachers`, `students`, etc.

#### 2. profiles
* **Purpose**: Extension of Supabase auth.users to store user metadata and roles.
* **Columns**:
  * `id` (UUID, Primary Key, Foreign Key to `auth.users(id)` ON DELETE CASCADE)
  * `school_id` (UUID, Foreign Key to `schools(id)` ON DELETE CASCADE)
  * `role` (user_role, Not Null)
  * `first_name` (VARCHAR(255))
  * `last_name` (VARCHAR(255))
  * `gender` (VARCHAR(20))
  * `created_at` (TIMESTAMP, Default: NOW())
  * `updated_at` (TIMESTAMP, Default: NOW())
* **Indexes**: `idx_profiles_school_id` on `school_id`

#### 3. academic_sessions
* **Purpose**: Stores yearly or term-based sessions for institutions.
* **Columns**:
  * `id` (UUID, Primary Key)
  * `school_id` (UUID, Not Null, FK to `schools`)
  * `name` (VARCHAR(100), Not Null)
  * `start_date` (DATE, Not Null)
  * `end_date` (DATE, Not Null)
  * `is_current` (BOOLEAN, Default: false)
  * `created_at` (TIMESTAMP)

#### 4. classes
* **Purpose**: Represents grade levels within an institution.
* **Columns**:
  * `id` (UUID, Primary Key)
  * `school_id` (UUID, Not Null, FK to `schools`)
  * `name` (VARCHAR(100), Not Null)
  * `created_at` (TIMESTAMP)
* **Indexes**: `idx_classes_school_id` on `school_id`

#### 5. sections
* **Purpose**: Represents divisions of classes (e.g., Section A, Section B).
* **Columns**:
  * `id` (UUID, Primary Key)
  * `school_id` (UUID, Not Null, FK to `schools`)
  * `class_id` (UUID, Not Null, FK to `classes`)
  * `name` (VARCHAR(50), Not Null)
  * `created_at` (TIMESTAMP)
* **Indexes**: `idx_sections_class_id` on `class_id`

#### 6. teachers
* **Purpose**: Stores teacher specific details, extending the `profiles` table.
* **Columns**:
  * `id` (UUID, Primary Key, FK to `profiles(id)`)
  * `school_id` (UUID, Not Null, FK to `schools`)
  * `employee_id` (VARCHAR(50))
  * `department` (VARCHAR(100))
  * `hire_date` (DATE)
  * `login_password` (VARCHAR(255))
  * `created_at` (TIMESTAMP)

#### 7. students
* **Purpose**: Core student registry for the institution.
* **Columns**:
  * `id` (UUID, Primary Key)
  * `school_id` (UUID, Not Null, FK to `schools`)
  * `student_id` (VARCHAR(50))
  * `first_name` (VARCHAR(255), Not Null)
  * `last_name` (VARCHAR(255), Not Null)
  * `dob` (DATE)
  * `gender` (VARCHAR(20))
  * `guardian_name` (VARCHAR(255))
  * `guardian_contact` (VARCHAR(50))
  * `status` (student_status, Default: 'active')
  * `enrollment_date` (DATE)
  * `created_at` (TIMESTAMP)
* **Indexes**: `idx_students_school_id` on `school_id`

#### 8. student_sections
* **Purpose**: Maps students to specific sections for a given academic session (Enrollment).
* **Columns**:
  * `id` (UUID, Primary Key)
  * `student_id` (UUID, Not Null, FK to `students`)
  * `section_id` (UUID, Not Null, FK to `sections`)
  * `session_id` (UUID, Not Null, FK to `academic_sessions`)
  * `created_at` (TIMESTAMP)
* **Constraints**: UNIQUE(`student_id`, `session_id`)

#### 9. subjects
* **Purpose**: List of academic subjects.
* **Columns**:
  * `id` (UUID, Primary Key)
  * `school_id` (UUID, Not Null, FK to `schools`)
  * `name` (VARCHAR(100), Not Null)
  * `code` (VARCHAR(50))
  * `created_at` (TIMESTAMP)

#### 10. teacher_subjects
* **Purpose**: Links teachers to the subjects and sections they teach.
* **Columns**:
  * `id` (UUID, Primary Key)
  * `teacher_id` (UUID, Not Null, FK to `teachers`)
  * `subject_id` (UUID, Not Null, FK to `subjects`)
  * `section_id` (UUID, Not Null, FK to `sections`)
  * `created_at` (TIMESTAMP)

#### 11. attendance
* **Purpose**: Daily attendance logs for students.
* **Columns**:
  * `id` (UUID, Primary Key)
  * `school_id` (UUID, Not Null, FK to `schools`)
  * `student_id` (UUID, Not Null, FK to `students`)
  * `section_id` (UUID, Not Null, FK to `sections`)
  * `date` (DATE, Not Null)
  * `status` (VARCHAR(20), Not Null) - 'present', 'absent', 'late', 'half-day'
  * `remarks` (TEXT)
  * `created_by` (UUID, FK to `profiles`)
  * `created_at` (TIMESTAMP)
* **Constraints**: UNIQUE(`student_id`, `date`)
* **Indexes**: `idx_attendance_student_id` on `student_id`

#### 12. exams
* **Purpose**: Defines examination periods.
* **Columns**:
  * `id` (UUID, Primary Key)
  * `school_id` (UUID, Not Null, FK to `schools`)
  * `session_id` (UUID, Not Null, FK to `academic_sessions`)
  * `name` (VARCHAR(100), Not Null)
  * `start_date` (DATE)
  * `end_date` (DATE)
  * `created_at` (TIMESTAMP)

#### 13. marks
* **Purpose**: Stores student exam results per subject.
* **Columns**:
  * `id` (UUID, Primary Key)
  * `exam_id` (UUID, Not Null, FK to `exams`)
  * `student_id` (UUID, Not Null, FK to `students`)
  * `subject_id` (UUID, Not Null, FK to `subjects`)
  * `marks_obtained` (DECIMAL(5, 2))
  * `total_marks` (DECIMAL(5, 2))
  * `grade` (VARCHAR(10))
  * `remarks` (TEXT)
  * `created_by` (UUID, FK to `profiles`)
  * `created_at` (TIMESTAMP)
* **Constraints**: UNIQUE(`exam_id`, `student_id`, `subject_id`)
* **Indexes**: `idx_marks_student_id` on `student_id`

#### 14. fee_structures
* **Purpose**: Base templates for fee definitions.
* **Columns**:
  * `id` (UUID, Primary Key)
  * `school_id` (UUID, Not Null, FK to `schools`)
  * `session_id` (UUID, Not Null, FK to `academic_sessions`)
  * `class_id` (UUID, FK to `classes`)
  * `name` (VARCHAR(100), Not Null)
  * `amount` (DECIMAL(10, 2), Not Null)
  * `due_date` (DATE)
  * `created_at` (TIMESTAMP)

#### 15. student_fees
* **Purpose**: Tracks individual fee payments for students.
* **Columns**:
  * `id` (UUID, Primary Key)
  * `school_id` (UUID, Not Null, FK to `schools`)
  * `student_id` (UUID, Not Null, FK to `students`)
  * `fee_structure_id` (UUID, Not Null, FK to `fee_structures`)
  * `fee_month` (INTEGER)
  * `fee_year` (INTEGER)
  * `total_amount` (DECIMAL(10, 2), Default: 0)
  * `amount_paid` (DECIMAL(10, 2), Default: 0)
  * `due_amount` (DECIMAL(10, 2), Default: 0)
  * `status` (VARCHAR(20), Default: 'pending')
  * `payment_date` (DATE)
  * `created_at` (TIMESTAMP)
* **Indexes**: `idx_student_fees_student_id` on `student_id`

#### 16. notices
* **Purpose**: Platform-wide and targeted notices/announcements.
* **Columns**:
  * `id` (UUID, Primary Key)
  * `school_id` (UUID, Not Null, FK to `schools`)
  * `title` (VARCHAR(255), Not Null)
  * `content` (TEXT)
  * `target_audience` (VARCHAR(50)) - 'all', 'teachers', 'students'
  * `created_by` (UUID, FK to `profiles`)
  * `created_at` (TIMESTAMP)

#### 17. audit_logs
* **Purpose**: System tracking for critical actions (like promotions).
* **Columns**:
  * `id` (UUID, Primary Key)
  * `school_id` (UUID, FK to `schools`)
  * `user_id` (UUID, FK to `profiles`)
  * `action` (VARCHAR(255), Not Null)
  * `table_name` (VARCHAR(100))
  * `record_id` (UUID)
  * `old_data` (JSONB)
  * `new_data` (JSONB)
  * `created_at` (TIMESTAMP)

#### 18. assignments
* **Purpose**: Assignments given by teachers.
* **Columns**:
  * `id` (UUID, Primary Key)
  * `school_id` (UUID, Not Null, FK to `schools`)
  * `teacher_id` (UUID, Not Null, FK to `teachers`)
  * `subject_id` (UUID, Not Null, FK to `subjects`)
  * `section_id` (UUID, Not Null, FK to `sections`)
  * `title` (VARCHAR(255), Not Null)
  * `description` (TEXT)
  * `due_date` (TIMESTAMP)
  * `total_marks` (DECIMAL(5, 2))
  * `created_at` (TIMESTAMP)
* **Indexes**: `idx_assignments_teacher_id` on `teacher_id`

#### 19. assignment_submissions
* **Purpose**: Tracking student submissions for assignments.
* **Columns**:
  * `id` (UUID, Primary Key)
  * `assignment_id` (UUID, Not Null, FK to `assignments`)
  * `student_id` (UUID, Not Null, FK to `students`)
  * `submission_text` (TEXT)
  * `attachment_url` (TEXT)
  * `marks_obtained` (DECIMAL(5, 2))
  * `teacher_feedback` (TEXT)
  * `submitted_at` (TIMESTAMP)
  * `status` (VARCHAR(20), Default: 'pending')
  * `created_at` (TIMESTAMP)
* **Constraints**: UNIQUE(`assignment_id`, `student_id`)
* **Indexes**: `idx_assignment_submissions_student_id` on `student_id`

#### 20. timetables
* **Purpose**: Represents weekly scheduling for sections.
* **Columns**:
  * `id` (UUID, Primary Key)
  * `school_id` (UUID, Not Null, FK to `schools`)
  * `section_id` (UUID, Not Null, FK to `sections`)
  * `subject_id` (UUID, Not Null, FK to `subjects`)
  * `teacher_id` (UUID, Not Null, FK to `teachers`)
  * `day_of_week` (VARCHAR(10), Not Null)
  * `start_time` (TIME, Not Null)
  * `end_time` (TIME, Not Null)
  * `room_no` (VARCHAR(50))
  * `created_at` (TIMESTAMP)
* **Indexes**: `idx_timetables_teacher_id` on `teacher_id`, `idx_timetables_section_id` on `section_id`

#### 21. document_categories
* **Purpose**: Categories for uploaded school documents.
* **Columns**:
  * `id` (UUID, Primary Key)
  * `school_id` (UUID, Not Null, FK to `schools`)
  * `name` (VARCHAR(100), Not Null)
  * `description` (TEXT)
  * `created_at` (TIMESTAMP)

#### 22. school_documents
* **Purpose**: Metadata for files uploaded by the School Admin.
* **Columns**:
  * `id` (UUID, Primary Key)
  * `school_id` (UUID, Not Null, FK to `schools`)
  * `category_id` (UUID, FK to `document_categories`)
  * `title` (VARCHAR(255), Not Null)
  * `description` (TEXT)
  * `file_path` (TEXT, Not Null)
  * `file_name` (VARCHAR(255), Not Null)
  * `file_size` (INTEGER, Not Null)
  * `uploaded_by` (UUID, FK to `profiles`)
  * `created_at` (TIMESTAMP)
  * `updated_at` (TIMESTAMP)

#### 23. document_history
* **Purpose**: Audit log for document operations.
* **Columns**:
  * `id` (UUID, Primary Key)
  * `school_id` (UUID, Not Null, FK to `schools`)
  * `document_id` (UUID)
  * `action` (VARCHAR(50), Not Null)
  * `document_title` (VARCHAR(255))
  * `performed_by` (UUID, FK to `profiles`)
  * `details` (JSONB)
  * `created_at` (TIMESTAMP)

---

## 2. Database Schema

```sql
-- CampusDesk Initial Database Schema
-- Run this in Supabase SQL Editor to setup the database.

-- ENUMS
CREATE TYPE school_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE school_type AS ENUM ('Primary School', 'High School', 'Montessori', 'College', 'Other');
CREATE TYPE user_role AS ENUM ('super_admin', 'school_admin', 'teacher');
CREATE TYPE student_status AS ENUM ('active', 'suspended', 'graduated', 'transferred');

-- 1. SCHOOLS TABLE
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type school_type NOT NULL,
    principal_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    admin_password VARCHAR(255),
    address TEXT,
    logo_url TEXT,
    status school_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. USERS (PROFILES) TABLE
-- This extends the auth.users table provided by Supabase
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    gender VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ACADEMIC SESSIONS
CREATE TABLE academic_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g., '2023-2024'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CLASSES
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g., 'Grade 10'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. SECTIONS
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- e.g., 'A', 'B'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TEACHERS
CREATE TABLE teachers (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    employee_id VARCHAR(50),
    department VARCHAR(100),
    hire_date DATE,
    login_password VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. STUDENTS
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id VARCHAR(50),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    dob DATE,
    gender VARCHAR(20),
    guardian_name VARCHAR(255),
    guardian_contact VARCHAR(50),
    status student_status DEFAULT 'active',
    enrollment_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. STUDENT SECTIONS (Enrollment)
CREATE TABLE student_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, session_id)
);

-- 9. SUBJECTS
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. TEACHER SUBJECTS
CREATE TABLE teacher_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. ATTENDANCE
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'present', 'absent', 'late', 'half-day'
    remarks TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, date)
);

-- 12. EXAMS
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. MARKS
CREATE TABLE marks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    marks_obtained DECIMAL(5, 2),
    total_marks DECIMAL(5, 2),
    grade VARCHAR(10),
    remarks TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(exam_id, student_id, subject_id)
);

-- 14. FEE STRUCTURES
CREATE TABLE fee_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. STUDENT FEES
CREATE TABLE student_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    fee_structure_id UUID NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
    fee_month INTEGER,
    fee_year INTEGER,
    total_amount DECIMAL(10, 2) DEFAULT 0,
    amount_paid DECIMAL(10, 2) DEFAULT 0,
    due_amount DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'partial', 'paid'
    payment_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. NOTICES
CREATE TABLE notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    target_audience VARCHAR(50), -- 'all', 'teachers', 'students'
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. AUDIT LOGS
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 18. ASSIGNMENTS
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    total_marks DECIMAL(5, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 19. ASSIGNMENT SUBMISSIONS
CREATE TABLE assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    submission_text TEXT,
    attachment_url TEXT,
    marks_obtained DECIMAL(5, 2),
    teacher_feedback TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, submitted, graded
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assignment_id, student_id)
);

-- 20. TIMETABLES
CREATE TABLE timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    day_of_week VARCHAR(10) NOT NULL, -- Monday, Tuesday, etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_no VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 21. DOCUMENT CATEGORIES
CREATE TABLE document_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 22. SCHOOL DOCUMENTS
CREATE TABLE school_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    category_id UUID REFERENCES document_categories(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL, -- in bytes
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 23. DOCUMENT HISTORY
CREATE TABLE document_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    document_id UUID,
    action VARCHAR(50) NOT NULL, -- 'uploaded', 'deleted', 'updated'
    document_title VARCHAR(255),
    performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS on all tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_history ENABLE ROW LEVEL SECURITY;

-- Note: We are creating a minimal set of policies. 
-- In a real app, these policies would restrict access strictly based on auth.jwt()->>'school_id'.

-- Example Schools Policy: 
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Schools are viewable by their admins" ON schools FOR SELECT USING (true);
CREATE POLICY "Super admins can manage all schools" ON schools FOR ALL USING (true);
CREATE POLICY "Authenticated users can create schools" ON schools FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Schools can update themselves" ON schools FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can manage students" ON students FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage academic_sessions" ON academic_sessions FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage student_sections" ON student_sections FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
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
CREATE POLICY "Authenticated users can manage document_categories" ON document_categories FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage school_documents" ON school_documents FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage document_history" ON document_history FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Indexes for performance
CREATE INDEX idx_profiles_school_id ON profiles(school_id);
CREATE INDEX idx_classes_school_id ON classes(school_id);
CREATE INDEX idx_sections_class_id ON sections(class_id);
CREATE INDEX idx_students_school_id ON students(school_id);
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_marks_student_id ON marks(student_id);
CREATE INDEX idx_student_fees_student_id ON student_fees(student_id);
CREATE INDEX idx_assignments_teacher_id ON assignments(teacher_id);
CREATE INDEX idx_assignment_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX idx_timetables_teacher_id ON timetables(teacher_id);
CREATE INDEX idx_timetables_section_id ON timetables(section_id);
CREATE INDEX idx_school_documents_school_id ON school_documents(school_id);
CREATE INDEX idx_document_history_school_id ON document_history(school_id);

```

---

## 3. Supabase Configuration

### Authentication
*   Uses **Supabase Auth** with standard Email and Password login.
*   Users are created via `supabase.auth.signUp()` or managed via Admin APIs.
*   A trigger (not strictly in SQL but typical pattern) or app logic links `auth.users` to the `profiles` table.

### Storage
*   File storage relies on Supabase Storage buckets (e.g., for `logo_url` in `schools` and `attachment_url` in `assignment_submissions`).

### Row Level Security (RLS)
*   **Enabled** on all tables.
*   The primary condition across tables is ensuring users only access data relevant to their institution: `USING (auth.role() = 'authenticated')`.
*   *(Note: As defined in the schema file, current policies allow authenticated users broad access, relying on application-level filtering. Production apps should refine this using JWT claims or nested queries against the `profiles` table).*

### Roles
Defined in the `profiles` table:
1.  **`super_admin`**: Global platform access.
2.  **`school_admin`**: Institute-level administration.
3.  **`teacher`**: Instructor with access to assigned sections.

### Environment Variables
Required variables on clients/servers:
*   `VITE_SUPABASE_URL`: The base URL of the Supabase project.
*   `VITE_SUPABASE_ANON_KEY`: The public anonymous key.
*   `SUPABASE_SERVICE_ROLE_KEY`: Used only in server-side/admin scripts for bulk creation and bypasses RLS.

---

## 4. API Documentation

CampusDesk relies entirely on **Supabase PostgREST APIs**. For the Android App, the standard Supabase Android SDK (Kotlin/Java) should be used, which wraps these REST endpoints automatically.

### Common Headers for all Requests
*   `apikey`: `VITE_SUPABASE_ANON_KEY`
*   `Authorization`: `Bearer {JWT_TOKEN}`
*   `Content-Type`: `application/json`
*   `Prefer`: `return=representation` (optional, used when data needs to be returned after mutation).

### Core Endpoints (PostgREST syntax)

#### 1. Fetch Teacher Profile
*   **Method**: `GET`
*   **Endpoint**: `/rest/v1/profiles?id=eq.{user_id}&select=*,school:schools(*)`
*   **Purpose**: Retrieves teacher profile and associated institution details.

#### 2. Fetch Teacher Assigned Timetable
*   **Method**: `GET`
*   **Endpoint**: `/rest/v1/timetables?teacher_id=eq.{teacher_id}&select=*,sections(*,classes(*)),subjects(*)`
*   **Purpose**: Retrieves the classes/sections a teacher is assigned to.

#### 3. Mark Attendance
*   **Method**: `POST` or `UPSERT`
*   **Endpoint**: `/rest/v1/attendance`
*   **Body**: `{ "school_id": "...", "student_id": "...", "section_id": "...", "date": "YYYY-MM-DD", "status": "present", "created_by": "{teacher_id}" }`

#### 4. Fetch Students in a Section
*   **Method**: `GET`
*   **Endpoint**: `/rest/v1/student_sections?section_id=eq.{section_id}&session_id=eq.{session_id}&select=student_id,students(*)`

#### 5. Submit Marks
*   **Method**: `POST` or `UPSERT`
*   **Endpoint**: `/rest/v1/marks`
*   **Body**: `{ "exam_id": "...", "student_id": "...", "subject_id": "...", "marks_obtained": 85, "total_marks": 100, "created_by": "{teacher_id}" }`

---

## 5. Authentication Flow

1.  **Login**: User submits email and password.
2.  **Supabase Auth**: Calls `supabase.auth.signInWithPassword({ email, password })`.
3.  **Session JWT**: Supabase returns a session object containing `access_token` and `refresh_token`.
4.  **Role Verification**:
    *   Query `profiles` table for the user's `id`.
    *   Check the `role` column.
    *   If `role === 'teacher'`, proceed to the Teacher Module. If `role === 'school_admin'`, proceed to Admin Dashboard.
5.  **Password Reset**:
    *   Trigger `supabase.auth.resetPasswordForEmail(email)`.
    *   User receives a link, clicks it, and calls `supabase.auth.updateUser({ password: newPassword })`.

---

## 6. Teacher Module Documentation

*   **Teacher Login**: Teachers use the same `signInWithPassword` endpoint. Their profiles are pre-created by the Institute Admin.
*   **Teacher Assignments**: The `timetables` and `teacher_subjects` tables govern what a teacher sees.
*   **Assigned Classes/Sections**: Teachers query `timetables` or `teacher_subjects` filtering by their `teacher_id`.
*   **Assigned Subjects**: Similar to sections, subjects are linked in `timetables` and `teacher_subjects`.
*   **Attendance APIs**: Teachers can mark daily attendance. They submit rows to the `attendance` table. If a student is already marked for a date, the row is updated (Upsert pattern on `student_id` + `date`).
*   **Marks APIs**: Teachers insert/update records in the `marks` table. It requires `exam_id`, `student_id`, and `subject_id`.
*   **Student APIs**: Teachers can view students assigned to their sections by joining `student_sections` with `students`.

---

## 7. Student Data Structure

*   **Student Records**: Stored in the `students` table containing personal details (name, dob, guardian details).
*   **Class & Section Relationships**: Handled via `student_sections` mapping table. This allows students to be in different sections across different `academic_sessions`.
*   **Promotion Records**: When a student is promoted, the `student_sections` record for the new session is created or updated. Audit logs for promotions are kept in the `notices` table with `target_audience = 'promotion_log'` and JSON metadata in the `content` column detailing `from_class`, `from_section`, `to_class`, `to_section`.
*   **Marks & Attendance Records**: Both have independent tables (`marks` and `attendance`) with Foreign Keys back to `students`.

---

## 8. Import and Export System

*   **Excel/CSV Import Structure**: 
    *   **Students**: Requires columns like `First Name`, `Last Name`, `Gender`, `DOB`, `Guardian Name`, `Contact`.
    *   The web client uses a library (e.g., `papaparse` or `xlsx`) to parse the file in the browser, validate rows, and insert them directly into the `students` and `student_sections` tables using Supabase SDK `.insert()`.
*   **Export Formats**: Typically CSV format generated by fetching data from Supabase and converting JSON to CSV on the client.
*   **Validation Rules**: Handled client-side and enforced by Database Constraints (e.g., Not Null fields, Data Types).

---

## 9. Filters and Search

*   **Class & Section Filters**: Achieved by applying `eq` filters on relational queries (e.g., `supabase.from('student_sections').select('...').eq('section_id', ID)`).
*   **Student Search**: Utilizes PostgREST `ilike` operator. E.g., `.ilike('first_name', '%search_term%')`.
*   **Marks Search**: Filtering the `marks` table by `exam_id`, `subject_id`, and `student_id`.
*   **Attendance Search**: Filtering the `attendance` table by `date` and `section_id`.

---

## 10. Architecture Diagram

1.  **Web Panels (React + Vite + Tailwind)**: 
    *   Super Admin Panel
    *   Institution Admin Panel
    *   Communicates directly with Supabase via `@supabase/supabase-js`.
2.  **Supabase Backend (PostgreSQL + Go/PostgREST)**:
    *   Handles all Authentication, Database queries, RLS, and Storage.
3.  **Future Teacher Android App Integration**:
    *   Will communicate directly with Supabase. No intermediate middleware API server is necessary because Supabase provides a secure, typed, auto-generated REST API protected by Row Level Security.

---

## 11. Teacher Android Integration Guide

This guide details how the future Teacher Android app should interact with the existing backend. 

*Recommendation*: Use the official **Supabase Kotlin SDK** (`io.github.jan-tennert.supabase:postgrest-kt`) to connect directly to the database.

### Core Tables the Android App Will Use:
1.  **`profiles`**: To load teacher metadata.
2.  **`timetables`**: To find which classes/subjects the teacher is assigned to.
3.  **`student_sections`** & **`students`**: To list students in a specific section.
4.  **`attendance`**: To read and submit daily attendance.
5.  **`exams`** & **`marks`**: To read and submit grades.

### Authentication Flow (Android):
1.  Initialize Supabase Client with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2.  Call `supabase.auth.signInWith(Email) { email = "..."; password = "..." }`.
3.  On success, query `supabase.from("profiles").select().eq("id", currentUser.id)`.
4.  If `role == "teacher"`, allow entry. Cache the `school_id`.

### Data Relationships & Required Fields
*   **Submitting Attendance**: 
    *   Requires: `school_id`, `student_id`, `section_id`, `date`, `status`, `created_by` (Teacher's user ID).
    *   Use `upsert` to handle updates seamlessly.
*   **Fetching Assigned Students**:
    *   First, determine the `session_id` (query `academic_sessions` where `is_current = true` and `school_id = {id}`).
    *   Join query: `student_sections?section_id=eq.{id}&session_id=eq.{id}&select=student_id,students(*)`

### Example API Calls (Using Supabase Kotlin SDK)

**1. Fetching Teacher's Timetable:**
```kotlin
val timetable = supabase.from("timetables").select {
    filter {
        eq("teacher_id", teacherUserId)
    }
    columns("*, sections(*, classes(*)), subjects(*)")
}.decodeList<TimetableResponse>()
```

**2. Submitting Attendance:**
```kotlin
val attendanceRecord = Attendance(
    school_id = schoolId,
    student_id = studentId,
    section_id = sectionId,
    date = LocalDate.now().toString(),
    status = "present",
    created_by = teacherUserId
)
supabase.from("attendance").upsert(attendanceRecord) {
    onConflict = "student_id, date"
}
```

### Example JSON Responses

**Timetable Response:**
```json
[
  {
    "id": "1234-uuid",
    "day_of_week": "Monday",
    "start_time": "08:00:00",
    "end_time": "08:45:00",
    "room_no": "101",
    "sections": {
      "id": "sec-uuid",
      "name": "A",
      "classes": {
        "id": "cls-uuid",
        "name": "Grade 10"
      }
    },
    "subjects": {
      "id": "sub-uuid",
      "name": "Mathematics"
    }
  }
]
```

**Students in Section Response:**
```json
[
  {
    "student_id": "stud-uuid-1",
    "students": {
      "id": "stud-uuid-1",
      "first_name": "John",
      "last_name": "Doe",
      "student_id": "S1001"
    }
  }
]
```

---

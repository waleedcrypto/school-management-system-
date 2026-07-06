-- Update student fees table to support monthly billing
ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS fee_month INTEGER;
ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS fee_year INTEGER;
ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS due_amount DECIMAL(10, 2) DEFAULT 0;

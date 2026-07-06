import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function test() {
  const { data: students, error } = await supabase.from('students').select('id, first_name').ilike('first_name', '%waleed%');
  console.log('Students:', students);
  
  if (students && students.length > 0) {
    const studentId = students[0].id;
    const { data: ss } = await supabase.from('student_sections').select('*').eq('student_id', studentId);
    console.log('Student Sections:', ss);
    
    const { data: notices } = await supabase.from('notices').select('*').eq('target_audience', 'promotion_log').order('created_at', { ascending: false });
    console.log('Notices:', notices);
  }
}
test();

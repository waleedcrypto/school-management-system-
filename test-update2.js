import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function test() {
  const email = 'aitezazurrehman495@gmail.com';
  // authenticate first
  const { data: { user }, error: authErr } = await supabase.auth.signInWithPassword({
    email: email,
    password: 'password123' // Try default password if possible, or we can't test
  });
  
  if (authErr) {
    console.log("Auth failed, can't test RLS:", authErr.message);
    return;
  }
  
  console.log("User:", user.id);
  // Get a school
  const { data: schools } = await supabase.from('schools').select('*').limit(1);
  const school = schools[0];
  
  // Get a session
  const { data: sessions } = await supabase.from('academic_sessions').select('*').eq('school_id', school.id).eq('is_current', true).limit(1);
  const session = sessions[0];
  
  const { data: students } = await supabase.from('students').select('*, student_sections(*)').eq('school_id', school.id).limit(1);
  console.log("Student:", students[0]);
  
  if (!students || students.length === 0) return;
  
  const { data: sections } = await supabase.from('sections').select('*').limit(2);
  
  const res = await supabase.from('student_sections')
    .update({ section_id: sections[1].id })
    .eq('student_id', students[0].id)
    .eq('session_id', session.id)
    .select();
    
  console.log("Update res:", res);
}
test();

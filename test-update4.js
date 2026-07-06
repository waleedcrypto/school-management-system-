import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function test() {
  const { data: schools } = await supabase.from('schools').select('id').limit(1);
  if (!schools.length) return console.log("No schools");
  const schoolId = schools[0].id;
  
  const { data: session } = await supabase.from('academic_sessions').insert({
    school_id: schoolId,
    year: 'Test Session',
    start_date: '2025-01-01',
    end_date: '2025-12-31'
  }).select('id').single();
  const sessionId = session.id;
  
  const { data: classes } = await supabase.from('classes').insert([
    { school_id: schoolId, name: 'TClass1', order_index: 1 }
  ]).select('id');
  
  const { data: sections } = await supabase.from('sections').insert([
    { class_id: classes[0].id, name: 'Sec1' },
    { class_id: classes[0].id, name: 'Sec2' }
  ]).select('id');
  
  const sec1 = sections[0].id;
  
  const { data: student } = await supabase.from('students').insert({
    school_id: schoolId,
    first_name: 'Test Undo Student',
    last_name: 'Test'
  }).select('id').single();
  
  const { data: ss } = await supabase.from('student_sections').insert({
    student_id: student.id,
    section_id: sec1,
    session_id: sessionId
  }).select('id').single();
  
  console.log("Created", { student: student.id, ss: ss.id });
  
  const { data: up, error } = await supabase.from('student_sections')
    .update({ section_id: sections[1].id })
    .eq('student_id', student.id)
    .eq('session_id', sessionId)
    .select();
    
  console.log("Update via eq:", up);
}
test();

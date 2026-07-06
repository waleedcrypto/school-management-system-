import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from('student_sections').select('id, student_id, section_id, session_id');
  console.log('student_sections:', data);
  const { data: notices } = await supabase.from('notices').select('*').eq('target_audience', 'promotion_log');
  console.log('notices:', notices);
}
test();

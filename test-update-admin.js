import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function test() {
  const { data: sections } = await supabase.from('student_sections').select('*').limit(1);
  console.log("Section to update:", sections[0]);
  if (!sections || sections.length === 0) return;
  
  const { data, error } = await supabase.from('student_sections')
    .update({ section_id: sections[0].section_id })
    .eq('id', sections[0].id)
    .select();
    
  console.log("Update result:", { data, error });
}
test();

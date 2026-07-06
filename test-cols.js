import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from('school_documents').select('*').limit(1);
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
  } else {
    // If no data, try to insert a dummy to get the keys back
    const { data: iData, error: iErr } = await supabase.from('school_documents').insert({title: 'x', file_path: 'x', file_size: 1}).select('*');
    if (iData && iData.length > 0) console.log(Object.keys(iData[0]));
    else console.log("iErr", iErr);
  }
}
test();

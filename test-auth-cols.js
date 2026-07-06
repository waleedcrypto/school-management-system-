import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
  await supabase.auth.signInWithPassword({ email: 'aitezazurrehman495@gmail.com', password: 'password123' });
  const { data, error } = await supabase.from('school_documents').select('*').limit(1);
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
  } else {
    console.log(error);
  }
}
test();

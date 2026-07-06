import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function test() {
  const { data, error } = await supabase.rpc('exec_sql', { query: "ALTER TABLE school_documents ADD COLUMN IF NOT EXISTS file_url TEXT;" });
  console.log(data, error);
}
test();

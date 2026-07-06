import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function test() {
  const { data: notices } = await supabase.from('notices').select('*').eq('target_audience', 'promotion_log').order('created_at', { ascending: false }).limit(5);
  console.log('Notices:', notices);
}
test();

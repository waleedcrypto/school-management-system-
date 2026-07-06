import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function test() {
  const { data: { user }, error } = await supabase.auth.signInWithPassword({
    email: 'aitezazurrehman495@gmail.com',
    password: 'password123'
  });
  console.log("Sign in test:", { user, error });
}
test();

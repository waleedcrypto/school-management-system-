import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function fixUrls() {
  const { data: docs, error } = await supabase.from('school_documents').select('id, file_path');
  if (error) { console.error(error); return; }
  
  for (const doc of docs) {
     const publicUrl = supabase.storage.from('school_documents').getPublicUrl(doc.file_path).data.publicUrl;
     await supabase.from('school_documents').update({ file_url: publicUrl }).eq('id', doc.id);
     console.log('Updated', doc.id);
  }
}
fixUrls();

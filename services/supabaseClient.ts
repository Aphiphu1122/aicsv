import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client using process.env injected by Vite config
// This avoids "import.meta.env is undefined" errors in some runtime environments
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

// Create a single instance of the client if configuration exists
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;
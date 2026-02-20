import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nazpsycnpuzhwfxspyrn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5henBzeWNucHV6aHdmeHNweXJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0OTA0MzAsImV4cCI6MjA4NjA2NjQzMH0.W-F2Lk4T1MzFf6vIJCOBCO9ERBCpN1UiPxVCSyUGMnQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

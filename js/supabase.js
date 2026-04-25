const SUPABASE_URL = 'https://ufchdlfsmqoxqxogxjuf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmY2hkbGZzbXFveHF4b2d4anVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NTEyNDIsImV4cCI6MjA5MjAyNzI0Mn0.kzgybSG9AtXm_A4SU2JFJGRMNvHkyYovf7eHyu-3zLs';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = sb;

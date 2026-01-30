// Supabase Real Client Initialization
// ATENÇÃO: Como este é um projeto estático no Vercel sem build step, 
// você deve atualizar as chaves abaixo manualmente se mudar de projeto.

const SUPABASE_URL = 'https://rkkyffxxbxqhweperfyj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJra3lmZnh4YnhxaHdlcGVyZnlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTMxMjIsImV4cCI6MjA4NTM2OTEyMn0.wFtCsO1zDtKw_hXcE9eKYEJLBCBbq0bv5yDKeOldAXU';

// Initialize the Supabase client
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("Supabase Client inicializado para:", SUPABASE_URL);

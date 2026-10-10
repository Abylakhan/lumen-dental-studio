/**
 * Backend connection — the ONLY file to edit when connecting Supabase.
 *
 * Supabase dashboard → Project Settings → API:
 *   supabaseUrl     = "Project URL"
 *   supabaseAnonKey = "anon public" key
 *
 * The anon key is designed to be public: it only grants what the Row Level
 * Security policies in /supabase/migrations allow (read published content,
 * submit appointment requests). NEVER put the service_role key here.
 *
 * Leave both empty to run the site from config.js only (no admin panel).
 */
export default {
  supabaseUrl: '',
  supabaseAnonKey: '',
  // Media bucket created by the migrations.
  bucket: 'media',
};

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
  supabaseUrl: 'https://totavvulyzxbsqtnwhwq.supabase.co',
  // Public anon key (role: anon) — safe to publish; RLS limits what it can do.
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvdGF2dnVseXp4YnNxdG53aHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2MzM4ODAsImV4cCI6MjEwNzIwOTg4MH0.hsJdNl3qsezog-MC8ePs-73CRAm4xIE65CKBRcW773w',
  // Media bucket created by the migrations.
  bucket: 'media',
};

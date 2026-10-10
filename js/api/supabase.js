/**
 * Supabase implementation of the data API.
 * Uses ONLY the public anon key; every permission is enforced by Row Level
 * Security and the SECURITY DEFINER functions in /supabase/migrations.
 */
const SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

function fail(error) {
  if (error) throw new Error(error.message || String(error));
}

function applyFilters(q, { eq, neq, gte, lte, in: inList, order, limit } = {}) {
  Object.entries(eq || {}).forEach(([k, v]) => { q = q.eq(k, v); });
  Object.entries(neq || {}).forEach(([k, v]) => { q = q.neq(k, v); });
  Object.entries(gte || {}).forEach(([k, v]) => { q = q.gte(k, v); });
  Object.entries(lte || {}).forEach(([k, v]) => { q = q.lte(k, v); });
  Object.entries(inList || {}).forEach(([k, v]) => { q = q.in(k, v); });
  (order || []).forEach(([col, asc = true]) => { q = q.order(col, { ascending: asc }); });
  if (limit) q = q.limit(limit);
  return q;
}

export async function createSupabaseApi(cfg) {
  const { createClient } = await import(SDK);
  const sb = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'lumen-admin-auth' },
  });

  const api = {
    mode: 'supabase',

    /* ---- Public ------------------------------------------------------- */
    async fetchPublic() {
      // Explicit filters: a signed-in admin can see drafts through RLS, but
      // the public website must only ever show published content.
      const [settings, hours, doctors, services, prices, links, gallery] = await Promise.all([
        sb.from('clinic_settings').select('*').eq('id', 1).maybeSingle(),
        sb.from('clinic_hours').select('*'),
        sb.from('doctors').select('*').eq('is_active', true).order('sort_order'),
        sb.from('services').select('*').eq('is_active', true).order('sort_order'),
        sb.from('prices').select('*').eq('is_active', true).order('sort_order'),
        sb.from('doctor_services').select('*'),
        sb.from('gallery_images').select('*').eq('is_published', true).order('sort_order'),
      ]);
      [settings, hours, doctors, services, prices, links, gallery].forEach((r) => fail(r.error));
      return {
        settings: settings.data, hours: hours.data, doctors: doctors.data, services: services.data,
        prices: prices.data, doctorServices: links.data, gallery: gallery.data,
      };
    },

    async availableSlots(doctorId, serviceId, date) {
      const { data, error } = await sb.rpc('get_available_slots', { p_doctor: doctorId, p_service: serviceId, p_date: date });
      fail(error);
      return (data || []).map((row) => (typeof row === 'string' ? row : row.get_available_slots));
    },

    async submitAppointment(payload) {
      const { data, error } = await sb.rpc('submit_appointment', { p: payload });
      fail(error);
      return data;
    },

    /* ---- Auth --------------------------------------------------------- */
    async getSession() {
      const { data } = await sb.auth.getSession();
      return data.session;
    },
    async signIn(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      fail(error);
      return data.session;
    },
    async signOut(scope = 'local') {
      await sb.auth.signOut({ scope });
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_event, session) => cb(session));
      return () => data.subscription.unsubscribe();
    },
    async isAdmin() {
      const { data, error } = await sb.rpc('is_admin');
      if (error) return false;
      return data === true;
    },
    /** Re-verifies the current password before setting a new one. */
    async changePassword(currentPassword, newPassword) {
      const session = await api.getSession();
      if (!session) throw new Error('NOT_SIGNED_IN');
      const check = await sb.auth.signInWithPassword({ email: session.user.email, password: currentPassword });
      if (check.error) throw new Error('WRONG_PASSWORD');
      const { error } = await sb.auth.updateUser({ password: newPassword });
      fail(error);
    },

    /* ---- Tables ------------------------------------------------------- */
    async select(table, opts = {}) {
      const { data, error } = await applyFilters(sb.from(table).select(opts.columns || '*'), opts);
      fail(error);
      return data;
    },
    async insert(table, row) {
      const { data, error } = await sb.from(table).insert(row).select().single();
      fail(error);
      return data;
    },
    async update(table, match, patch) {
      const { data, error } = await applyFilters(sb.from(table).update(patch), { eq: match }).select();
      fail(error);
      if (!data || !data.length) throw new Error('NOT_UPDATED');
      return data;
    },
    async remove(table, match) {
      const { error } = await applyFilters(sb.from(table).delete(), { eq: match });
      fail(error);
    },
    /** Insert or update rows by their unique key column(s). */
    async upsert(table, rows, onConflict) {
      const { error } = await sb.from(table).upsert(rows, { onConflict });
      fail(error);
    },
    /** Replace all rows matching `match` with `rows` (used for doctor links/schedules). */
    async replace(table, match, rows) {
      if (!match || !Object.keys(match).length) throw new Error('REPLACE_NEEDS_FILTER');
      await api.remove(table, match);
      if (rows.length) {
        const { error } = await sb.from(table).insert(rows);
        fail(error);
      }
    },

    /* ---- Storage ------------------------------------------------------ */
    async upload(blob, folder) {
      const ext = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await sb.storage.from(cfg.bucket).upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false });
      fail(error);
      return path;
    },
    async removeFile(path) {
      if (!path || path.startsWith('assets/') || /^(https?:|data:)/.test(path)) return;
      const { error } = await sb.storage.from(cfg.bucket).remove([path]);
      fail(error);
    },
  };
  return api;
}

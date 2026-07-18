import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Server-side klient s anon kľúčom — všetky verejné operácie idú cez RLS.
// Keď env premenné chýbajú (lokálny náhľad bez backendu), vracia null
// a stránky sa vykreslia zo seed dát v src/data/parte-seed.json.
const url = import.meta.env.PUBLIC_SUPABASE_URL;
const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

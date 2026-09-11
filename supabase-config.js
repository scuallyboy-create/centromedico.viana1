/* VIANA I — configuração pública do Supabase.
   Nunca coloque uma chave service_role neste ficheiro.
*/
window.VIANA_SUPABASE_URL = "https://atxqweinmcpsraienagg.supabase.co";
window.VIANA_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_69RC5-HGQN_gKs6f7-r8g_SqVo1oYa";

window.vianaSupabase = window.supabase.createClient(
  window.VIANA_SUPABASE_URL,
  window.VIANA_SUPABASE_PUBLISHABLE_KEY
);

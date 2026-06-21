/* ============================================================
   backend.js — CONFIG BACKEND EXTERNE (Supabase)
   ------------------------------------------------------------
   ⚠️ SÉCURITÉ
   - Mettez ICI uniquement votre clé ANON PUBLIQUE (anon/public).
     Elle est conçue pour le front et doit être protégée par des
     règles RLS (Row Level Security) côté Supabase.
   - NE JAMAIS coller la clé "service_role" : elle donnerait un
     accès total et resterait visible dans le navigateur.
   ------------------------------------------------------------
   À REMPLIR :
============================================================ */
window.VITA_BACKEND = {
  supabaseUrl:      "https://VOTRE-PROJET.supabase.co",   // ← votre URL
  supabaseAnonKey:  "VOTRE_CLE_ANON_PUBLIQUE",            // ← votre clé anon
  translationsTable:"translations",                       // nom de la table
  // Optionnel : Edge Function qui proxifie l'API de traduction côté serveur.
  // Laissez "" pour utiliser l'appel direct (interface Claude.ai).
  translateFunction:""                                    // ex: ".../functions/v1/translate"
};

/* ------------------------------------------------------------
   SQL à exécuter une fois dans Supabase (éditeur SQL) :

   create table if not exists translations (
     lang text not null,
     page int  not null,
     title text,
     narration text,
     updated_at timestamptz default now(),
     primary key (lang, page)
   );
   alter table translations enable row level security;
   create policy "read"  on translations for select using (true);
   create policy "write" on translations for insert with check (true);
   create policy "update" on translations for update using (true);
------------------------------------------------------------ */

window.VITABackend = {
  ready(){
    const c = window.VITA_BACKEND;
    return !!(c && c.supabaseUrl && !c.supabaseUrl.includes("VOTRE")
              && c.supabaseAnonKey && !c.supabaseAnonKey.includes("VOTRE"));
  },

  _headers(){
    const c = window.VITA_BACKEND;
    return {
      "apikey": c.supabaseAnonKey,
      "Authorization": "Bearer " + c.supabaseAnonKey,
      "Content-Type": "application/json"
    };
  },

  /* Lire une traduction en cache */
  async getCached(lang, page){
    const c = window.VITA_BACKEND;
    const url = `${c.supabaseUrl}/rest/v1/${c.translationsTable}`
              + `?lang=eq.${encodeURIComponent(lang)}&page=eq.${page}`
              + `&select=title,narration`;
    const r = await fetch(url, { headers: this._headers() });
    if(!r.ok) return null;
    const rows = await r.json();
    return (rows && rows[0]) ? rows[0] : null;
  },

  /* Sauvegarder une traduction (upsert sur clé lang+page) */
  async saveCached(lang, page, title, narration){
    const c = window.VITA_BACKEND;
    const url = `${c.supabaseUrl}/rest/v1/${c.translationsTable}`;
    const h = this._headers();
    h["Prefer"] = "resolution=merge-duplicates";
    return fetch(url, {
      method: "POST", headers: h,
      body: JSON.stringify({ lang, page, title, narration })
    });
  },

  /* Traduction via Edge Function (si configurée) */
  async translate(lang, langName, title, narration){
    const c = window.VITA_BACKEND;
    const r = await fetch(c.translateFunction, {
      method: "POST", headers: this._headers(),
      body: JSON.stringify({ lang, langName, title, narration })
    });
    if(!r.ok) throw new Error("translateFunction error");
    return await r.json(); // attendu : { title, narration }
  }
};

import { supabase } from "./supabase";

// Mapeia nome exibido (coluna crm.deals.captador, texto livre) -> uuid real do usuário
// (public.captadores). Usado nos 3 lugares que ainda gravam só o nome: importador de
// CSV, criação manual de negócio e edição de negócio — todos precisam também gravar
// captador_user_id, que é o que a RLS por captador realmente usa pra restringir acesso.
let _cache = null;

export async function getCaptadorUserIdMap({ fresh = false } = {}) {
  if (_cache && !fresh) return _cache;
  const { data } = await supabase.from("captadores").select("name,user_id");
  _cache = {};
  (data || []).forEach((r) => { _cache[r.name] = r.user_id; });
  return _cache;
}

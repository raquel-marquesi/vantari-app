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

// Lista de nomes pra selects/filtros (Kanban de Negociações, detalhe do negócio).
// Fonte única em public.captadores — nunca mais hardcodear a lista no componente.
export async function getCaptadorNames({ fresh = false } = {}) {
  const map = await getCaptadorUserIdMap({ fresh });
  return Object.keys(map).sort();
}

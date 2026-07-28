import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ════════════════════════════════════════════════════════════════
// Edge Function: /run-automations
// ────────────────────────────────────────────────────────────────
// Motor de execução das automações (Automação de Marketing → Builder).
// Chamada periodicamente (cron via pg_cron+pg_net, configurado à parte —
// ver instruções no chat). Também pode ser chamada manualmente pra testar.
//
// ESCOPO DESTA VERSÃO (Etapa 1):
//   - Gatilho suportado: "Pertence à Segmentação", só pra segmentações
//     ESTÁTICAS (rules = [{field:"id", op:"in", value:[person_id,...]}]).
//     Segmentações dinâmicas (por regra) ainda não são recalculadas aqui —
//     ficam registradas no log como "ignorada nesta versão".
//   - Ações reais: Adicionar Tag / Remover Tag (core.persons.tags) e
//     Espera (pausa e retoma sozinho). Enviar Email / Webhook POST /
//     Mudar Etapa ainda não têm efeito real — ficam no log como
//     "não suportada nesta versão", sem travar o resto do fluxo.
//   - Condição: só o campo "tag" é avaliado de verdade. Qualquer outro
//     campo é tratado como "não avaliável ainda" e deixa passar (log claro).
//   - Cada pessoa passa por um mesmo fluxo no máximo 1 vez (flow_runs tem
//     unique(flow_id, person_id)).
//   - Cada chamada avança CADA run pendente em NO MÁXIMO 1 nó — assim o
//     motor é seguro contra loop infinito e o cron natural (a cada poucos
//     minutos) vai puxando o fluxo adiante aos poucos.
// ════════════════════════════════════════════════════════════════

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Node = { id: string; type: string; cfg?: Record<string, any> };
type Edge = { src: string; tgt: string };
type FlowDef = { nodes: Node[]; edges: Edge[] };

function nowIso() { return new Date().toISOString(); }

function logEntry(msg: string) {
  return { ts: nowIso(), msg };
}

const UNIT_MS: Record<string, number> = {
  minutes: 60_000, hours: 3_600_000, days: 86_400_000, weeks: 7 * 86_400_000,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const summary = {
      flows_checked: 0,
      runs_created: 0,
      runs_advanced: 0,
      runs_completed: 0,
      errors: [] as string[],
    };

    /* ── 1. carrega todos os fluxos (pra ter a definição de qualquer run
       pendente, mesmo que o fluxo tenha sido pausado depois) ── */
    const { data: flows, error: flowsErr } = await supabase
      .from("automation_flows")
      .select("id, name, status, definition");
    if (flowsErr) throw flowsErr;

    const flowsById = new Map<string, { name: string; status: string; def: FlowDef }>();
    for (const f of flows || []) {
      const def: FlowDef = f.definition || { nodes: [], edges: [] };
      flowsById.set(f.id, { name: f.name, status: f.status, def });
    }

    /* ── 2. gatilho "Pertence à Segmentação" — só fluxos ATIVOS criam runs novos ── */
    for (const f of flows || []) {
      if (f.status !== "active") continue;
      summary.flows_checked++;
      const def: FlowDef = f.definition || { nodes: [], edges: [] };
      const trigger = (def.nodes || []).find((n) => n.type === "trigger");
      if (!trigger || trigger.cfg?.trigger !== "Pertence à Segmentação") continue;
      const segmentId = trigger.cfg?.segment_id;
      if (!segmentId) continue;

      const { data: segment, error: segErr } = await supabase
        .from("segments")
        .select("id, name, rules")
        .eq("id", segmentId)
        .single();
      if (segErr || !segment) {
        summary.errors.push(`Fluxo "${f.name}": segmentação ${segmentId} não encontrada.`);
        continue;
      }

      const staticRule = (Array.isArray(segment.rules) ? segment.rules : [])
        .find((r: any) => r.field === "id" && r.op === "in" && Array.isArray(r.value));
      if (!staticRule) {
        // segmentação dinâmica (por regra) — fora do escopo desta versão
        continue;
      }

      const candidateIds: string[] = staticRule.value;
      if (candidateIds.length === 0) continue;

      const { data: existingRuns } = await supabase
        .from("flow_runs")
        .select("person_id")
        .eq("flow_id", f.id)
        .in("person_id", candidateIds);
      const already = new Set((existingRuns || []).map((r: any) => r.person_id));
      const newIds = candidateIds.filter((id) => !already.has(id));
      if (newIds.length === 0) continue;

      const rows = newIds.map((personId) => ({
        flow_id: f.id,
        person_id: personId,
        status: "running",
        current_node_id: trigger.id,
        log: [logEntry(`Entrou na segmentação "${segment.name}" — fluxo iniciado.`)],
      }));
      const { error: insErr } = await supabase.from("flow_runs").insert(rows);
      if (insErr) {
        summary.errors.push(`Fluxo "${f.name}": falha ao criar runs — ${insErr.message}`);
      } else {
        summary.runs_created += rows.length;
      }
    }

    /* ── 3. avança runs pendentes (running, ou waiting já vencido) ── */
    const { data: pending, error: pendErr } = await supabase
      .from("flow_runs")
      .select("id, flow_id, person_id, status, current_node_id, log, resume_at")
      .or(`status.eq.running,and(status.eq.waiting,resume_at.lte.${nowIso()})`)
      .limit(200);
    if (pendErr) throw pendErr;

    for (const run of pending || []) {
      const flow = flowsById.get(run.flow_id);
      if (!flow) continue;
      const { nodes, edges } = flow.def;
      const nodesById = new Map(nodes.map((n) => [n.id, n]));

      const edge = edges.find((e) => e.src === run.current_node_id);
      const log: any[] = Array.isArray(run.log) ? [...run.log] : [];

      if (!edge) {
        await supabase.from("flow_runs").update({
          status: "completed", log: [...log, logEntry("Fluxo concluído — não há mais etapas.")], updated_at: nowIso(),
        }).eq("id", run.id);
        summary.runs_completed++;
        continue;
      }

      const next = nodesById.get(edge.tgt);
      if (!next) {
        await supabase.from("flow_runs").update({
          status: "failed", log: [...log, logEntry("Próxima etapa não encontrada no fluxo (nó removido?).")], updated_at: nowIso(),
        }).eq("id", run.id);
        continue;
      }

      let personTags: string[] = [];
      if (next.type === "condition" && next.cfg?.field === "tag") {
        const { data: person } = await supabase.schema("core").from("persons").select("tags").eq("id", run.person_id).single();
        personTags = person?.tags || [];
      }

      let update: Record<string, any> = { current_node_id: next.id, updated_at: nowIso() };

      switch (next.type) {
        case "condition": {
          if (next.cfg?.field === "tag") {
            const has = personTags.includes(next.cfg.value);
            const met = next.cfg.op === "≠" ? !has : has;
            if (!met) {
              log.push(logEntry(`Condição "tag ${next.cfg.op === "≠" ? "diferente de" : "igual a"} ${next.cfg.value}" não atendida — fluxo encerrado.`));
              update.status = "completed";
              summary.runs_completed++;
            } else {
              log.push(logEntry(`Condição de tag atendida.`));
            }
          } else {
            log.push(logEntry(`Condição de campo "${next.cfg?.field || "?"}" ainda não é avaliada nesta versão do motor — seguindo em frente.`));
          }
          break;
        }
        case "action": {
          const action = next.cfg?.action;
          if (action === "Adicionar Tag" && next.cfg?.tag) {
            const { data: person } = await supabase.schema("core").from("persons").select("tags").eq("id", run.person_id).single();
            const tags = new Set(person?.tags || []);
            tags.add(next.cfg.tag);
            await supabase.schema("core").from("persons").update({ tags: [...tags] }).eq("id", run.person_id);
            log.push(logEntry(`Tag "${next.cfg.tag}" adicionada.`));
          } else if (action === "Remover Tag" && next.cfg?.tag) {
            const { data: person } = await supabase.schema("core").from("persons").select("tags").eq("id", run.person_id).single();
            const tags = new Set(person?.tags || []);
            tags.delete(next.cfg.tag);
            await supabase.schema("core").from("persons").update({ tags: [...tags] }).eq("id", run.person_id);
            log.push(logEntry(`Tag "${next.cfg.tag}" removida.`));
          } else {
            log.push(logEntry(`Ação "${action || "?"}" ainda não é executada nesta versão do motor — pulada.`));
          }
          break;
        }
        case "delay": {
          const amount = Number(next.cfg?.amount) || 0;
          const unit = next.cfg?.unit || "days";
          const ms = amount * (UNIT_MS[unit] || UNIT_MS.days);
          update.status = "waiting";
          update.resume_at = new Date(Date.now() + ms).toISOString();
          log.push(logEntry(`Aguardando ${amount} ${unit}.`));
          break;
        }
        default:
          log.push(logEntry(`Nó do tipo "${next.type}" ignorado.`));
      }

      if (!update.status) update.status = "running";
      update.log = log;
      await supabase.from("flow_runs").update(update).eq("id", run.id);
      if (update.status === "running" || update.status === "waiting") summary.runs_advanced++;
    }

    return new Response(JSON.stringify(summary), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: CORS });
  }
});

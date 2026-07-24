-- Editor de Pipelines (/settings → Pipelines): cor e probabilidade % por estágio,
-- hoje hardcoded no front (STAGE_ACCENTS em vantari-crm.jsx) e nunca persistidos.

alter table crm.stages
  add column if not exists color text,
  add column if not exists probability int not null default 0 check (probability >= 0 and probability <= 100);

-- Seed dos 6 estágios padrão da "Esteira de Aquisição" com os valores já documentados
-- em CLAUDE.md/FLOW_SPEC.md e as cores já usadas visualmente no Kanban.
update crm.stages set color = '#0D7491', probability = 10  where name = 'Novos Leads'                 and color is null;
update crm.stages set color = '#7C5CFF', probability = 25  where name = 'Análise Processual'          and color is null;
update crm.stages set color = '#F59E0B', probability = 40  where name = 'Interesse Futuro'            and color is null;
update crm.stages set color = '#FF6B5E', probability = 55  where name = 'Negociação/Proposta Enviada' and color is null;
update crm.stages set color = '#14A273', probability = 100 where kind = 'won'  and color is null;
update crm.stages set color = '#FF6B5E', probability = 0   where kind = 'lost' and color is null;

-- Pop-ups (Etapa 5, parte 1) — reaproveita os formulários que já existem em
-- /landing → Formulários, mostrados numa caixa flutuante sobre a página
-- rastreada. Configuração fica por página em /settings → Lead Tracking.
alter table public.tracked_pages
  add column if not exists popup_enabled boolean not null default false,
  add column if not exists popup_form_slug text,
  add column if not exists popup_trigger text not null default 'time_delay'
    check (popup_trigger in ('time_delay', 'exit_intent')),
  add column if not exists popup_trigger_value integer not null default 15,
  add column if not exists popup_frequency_days integer not null default 7;

comment on column public.tracked_pages.popup_enabled is
  'Mostra pop-up de formulário nessa página (Etapa 5 — Pop-ups)';
comment on column public.tracked_pages.popup_form_slug is
  'Slug do formulário (mkt.forms ou public.forms) mostrado no pop-up, embutido via /f/:slug num iframe';
comment on column public.tracked_pages.popup_trigger is
  'time_delay = abre depois de N segundos; exit_intent = abre quando o mouse sai pelo topo da janela (só desktop)';
comment on column public.tracked_pages.popup_trigger_value is
  'Segundos de espera quando popup_trigger = time_delay (ignorado em exit_intent)';
comment on column public.tracked_pages.popup_frequency_days is
  'Dias sem mostrar de novo pro mesmo visitante depois que ele vê ou envia o pop-up (guardado em localStorage no navegador dele)';

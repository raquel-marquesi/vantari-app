-- ════════════════════════════════════════════════════════════════
-- Validador de Email (Etapa 10 do roadmap RD Station)
-- ────────────────────────────────────────────────────────────────
-- Validação heurística (sem custo, sem serviço terceiro pago): sintaxe +
-- domínio descartável conhecido (mailinator, yopmail etc.) + prefixo
-- genérico/role-based (contato@, suporte@, noreply@ etc.). Não faz lookup
-- de MX/SMTP (isso exigiria uma Edge Function com DNS/rede — deixado como
-- possível evolução futura, não bloqueia o valor de hoje).
--
-- core.persons.email_status: 'valid' | 'invalid' | 'risky' | null (sem email)
--   - invalid → sintaxe quebrada ou domínio descartável conhecido. Nunca
--     deveria receber campanha (só desperdiça e machuca reputação de envio).
--   - risky  → email genérico/role-based (contato@, suporte@...). Provavelmente
--     é uma caixa compartilhada, não uma pessoa — mantido no envio, só marcado.
--   - valid  → passou em todas as checagens heurísticas.
--
-- Classificação roda automaticamente via trigger sempre que primary_email
-- muda (INSERT ou UPDATE) — não precisa de job nem de chamada manual.
-- ════════════════════════════════════════════════════════════════

alter table core.persons
  add column if not exists email_status text check (email_status in ('valid','invalid','risky')),
  add column if not exists email_checked_at timestamptz;

create or replace function core.classify_email(p_email text)
returns text
language plpgsql
immutable
as $$
declare
  v_email    text := lower(trim(p_email));
  v_local    text;
  v_domain   text;
  v_disposable text[] := array[
    'mailinator.com','guerrillamail.com','10minutemail.com','yopmail.com','trashmail.com',
    'temp-mail.org','tempmail.com','throwawaymail.com','getnada.com','maildrop.cc',
    'sharklasers.com','dispostable.com','mintemail.com','mailnesia.com','fakeinbox.com',
    'spam4.me','mytemp.email','moakt.com','emailondeck.com','mohmal.com','tempinbox.com',
    'discard.email','spamgourmet.com','trbvm.com','emailfake.com'
  ];
  v_role text[] := array[
    'info','contato','contact','suporte','support','admin','administrador','sac',
    'atendimento','noreply','no-reply','naoresponda','vendas','comercial','financeiro',
    'rh','marketing','faturamento','cobranca','ouvidoria','imprensa','webmaster',
    'postmaster','abuse','compras','juridico','financas'
  ];
begin
  if v_email is null or v_email = '' then
    return null;
  end if;

  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    return 'invalid';
  end if;

  v_domain := lower(split_part(v_email, '@', 2));
  v_local  := lower(split_part(split_part(v_email, '@', 1), '+', 1)); -- remove +tag (nome+campanha@gmail.com)

  if v_domain = any(v_disposable) then
    return 'invalid';
  end if;

  if v_local = any(v_role) then
    return 'risky';
  end if;

  return 'valid';
end;
$$;

create or replace function core.trg_classify_person_email()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' or new.primary_email is distinct from old.primary_email then
    new.email_status := core.classify_email(new.primary_email);
    new.email_checked_at := case when new.primary_email is not null then now() else null end;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_classify_email on core.persons;
create trigger trg_classify_email
before insert or update on core.persons
for each row execute function core.trg_classify_person_email();

-- backfill: classifica quem já tem email hoje e ainda não foi classificado
update core.persons
   set email_status = core.classify_email(primary_email),
       email_checked_at = now()
 where primary_email is not null
   and email_status is null;

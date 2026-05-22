# Integrações Meta e Google — Checklist OAuth

Base já implementada: migration `010_integration_credentials.sql`, Edge Function `oauth-callback` (deployada) e tela `/integrations → Meta/Google → Configuração` com formulário que persiste credenciais no Supabase.

Falta a parte externa (criação de apps Meta e Google) que só você consegue fazer.

## 1. Aplicar a migration `010_integration_credentials.sql`

A migration tracking do projeto está dessincronizada (nomes timestamp-based no remoto vs `0NN_*` local), então não dá pra rodar `supabase db push` direto.

**Aplicar via SQL Editor:**

1. Abrir [Supabase Dashboard → SQL Editor](https://supabase.com/dashboard/project/ejhrlrasepowdcdnggmv/sql/new)
2. Colar o conteúdo de `supabase/migrations/010_integration_credentials.sql`
3. Run

Isso cria a tabela `integration_credentials` + seed dos 4 providers.

## 2. Configurar env vars do Edge Function

```bash
supabase secrets set APP_URL=https://vantari-app.vercel.app --project-ref ejhrlrasepowdcdnggmv
```

(`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já estão setadas automaticamente.)

## 3. Meta (Facebook/Instagram Ads)

### 3.1. Criar o app
1. [developers.facebook.com/apps](https://developers.facebook.com/apps) → "Create App"
2. Tipo: **Business**
3. Adicionar produtos: **Marketing API** + **Facebook Login for Business**

### 3.2. Configurar OAuth
Em **Facebook Login → Settings**:
- Valid OAuth Redirect URIs:
  ```
  https://ejhrlrasepowdcdnggmv.supabase.co/functions/v1/oauth-callback?provider=meta
  ```
- Client OAuth Login: ON
- Web OAuth Login: ON

### 3.3. Permissions / Scopes
Solicitar via App Review:
- `ads_read` — ler campanhas
- `ads_management` — gerenciar
- `leads_retrieval` — pegar leads do Lead Ads
- `pages_show_list`, `pages_read_engagement` — listar páginas

(Em modo Dev/Test funciona com o admin do app sem App Review.)

### 3.4. Pegar credenciais
**Settings → Basic** → copiar:
- App ID → cola em "App ID" no Vantari
- App Secret → cola em "App Secret"
- "Salvar credenciais"
- "Conectar via OAuth" → popup do Meta abre → autoriza → callback redireciona para `/integrations?connected=meta`

## 4. Google Ads

### 4.1. Criar projeto + app OAuth
1. [console.cloud.google.com](https://console.cloud.google.com) → criar projeto "Vantari"
2. APIs & Services → **Library** → habilitar **Google Ads API**
3. APIs & Services → **OAuth consent screen**:
   - User type: External
   - Scopes: `https://www.googleapis.com/auth/adwords`
   - Test users: adicionar seu email
4. APIs & Services → **Credentials** → "Create credentials" → "OAuth client ID"
   - Application type: Web application
   - Authorized redirect URIs:
     ```
     https://ejhrlrasepowdcdnggmv.supabase.co/functions/v1/oauth-callback?provider=google
     ```

### 4.2. Pegar credenciais
- Client ID → cola em "OAuth Client ID" no Vantari
- Client Secret → cola em "OAuth Client Secret"
- Customer ID → o ID da conta Google Ads (xxx-xxx-xxxx)
- "Salvar credenciais"
- "Conectar via OAuth" → fluxo OAuth Google → callback

### 4.3. Developer Token (para chamar a API depois)
Para fazer chamadas reais à Google Ads API, é necessário:
- Solicitar Developer Token em [ads.google.com/aw/apicenter](https://ads.google.com/aw/apicenter)
- Approval inicial demora alguns dias (Google revisa o uso)
- Status "Test access" funciona com sua própria conta Google Ads enquanto espera

## 5. O que ainda precisa ser implementado depois

A base agora apenas **armazena tokens**. Para usar de verdade:

- [ ] **Sync de leads do Meta Lead Ads**: Edge Function que lê `access_token` da tabela, chama `https://graph.facebook.com/v19.0/{form_id}/leads`, insere em `leads` (campos `cf_fb_forms_*` já existem)
- [ ] **Refresh token automatico**: Edge Function cron que renova `access_token` antes do `expires_at`
- [ ] **Sync de conversões Google Ads**: usar Customer ID + Developer Token + access_token
- [ ] **Audiências customizadas**: push de segmentos para Meta Custom Audiences e Google Customer Match
- [ ] **Migrar tokens para Vault**: hoje `access_token`/`client_secret` estão em texto na tabela (RLS protege, mas idealmente em [Supabase Vault](https://supabase.com/docs/guides/database/vault))

## 6. Como testar

1. Aplicar migration 010 (SQL Editor)
2. Setar `APP_URL` no Supabase
3. Criar app Meta em modo Dev — pegar App ID/Secret
4. Em [vantari-app.vercel.app/integrations](https://vantari-app.vercel.app/integrations) → Meta → Configuração
5. Preencher App ID + Secret → "Salvar credenciais"
6. Clicar "Conectar via OAuth" → popup → autorizar
7. Voltar para `/integrations` deve mostrar banner verde "Meta conectado" e status badge mudou para "Conectado"
8. Verificar no SQL Editor: `select * from integration_credentials where provider='meta';` — deve ter `access_token` e `status='connected'`

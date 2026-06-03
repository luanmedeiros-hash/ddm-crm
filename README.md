# CRM Baldada

Sistema de gestão e acompanhamento diário da equipe **Baldada** (DDM).

> Fork do CRM Baldada (DDM) adaptado para a equipe da Matheus Baldini.
> Identidade visual: bordô `#4a90c8`, dourado `#F59E0B`, creme `#1E293B`.

## Stack

- **Next.js 14** (App Router)
- **Supabase** (Postgres + Auth + RLS)
- **Vercel** (deploy contínuo)
- **Google OAuth** + Calendar API (read-only)

## Equipe

**Líder:** Matheus Baldini (`matheus.baldini@w1partner.com.br`)

**Consultores (10):**
- Guilherme Scafi
- Luiza Vilela
- Maria Júlia Maral
- Tamires Oliveira
- Viviane Dornelas
- Erika Carvalho
- Amanda Lara
- Letícia Castro
- Paulo Vítor Cezario
- Flávia Viliotti

## Setup local

```bash
git clone https://github.com/luanmedeiros-hash/ddm-crm.git
cd ddm-crm
npm install
cp .env.local.example .env.local
# preencha .env.local com as credenciais reais
npm run dev
```

## Setup do Supabase

No projeto Supabase do Baldada:

1. SQL Editor → rodar na ordem:
   - `db/001_migration.sql` — cria tabelas `profiles`, `registros_daily` e trigger de criação de profile
   - `db/002_lideres_e_consultores.sql` — define os líderes e mapeia os 15 consultores
   - `db/003_google_tokens.sql` — tabela `google_tokens`
   - `db/004_calendar_mvp.sql` — tabelas `calendar_events` e `calendar_sync_log`
   - `db/005_fix_synclog_rls.sql` — corrige RLS do log de sync

2. Authentication → Providers → Google → ativar e colar **Client ID** e **Client Secret** (do Google Cloud).

3. Authentication → URL Configuration → Site URL = `https://ddm-crm-1um3.vercel.app` (ou seu domínio Vercel).

## Variáveis de ambiente (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
```

## Google Cloud Console

No projeto Google Cloud (existente ou novo):

1. **APIs & Services → Library**: habilitar Google Calendar API
2. **OAuth consent screen**: adicionar scope `.../auth/calendar.readonly`
3. **OAuth consent screen → Test users**: adicionar os 11 e-mails da equipe
4. **Credentials → OAuth 2.0 Client ID**:
   - Authorized JavaScript origins: `https://ddm-crm-1um3.vercel.app`
   - Authorized redirect URIs:
     - `https://SEU-PROJETO.supabase.co/auth/v1/callback` (Supabase OAuth)
     - `https://ddm-crm-1um3.vercel.app/auth/callback` (callback do app)

## Deploy

```bash
git add . && git commit -m "msg" && git push
# Vercel rebuilda automaticamente em ~2min
```

## Perfis DISC

Marcelo e Zonaro estão atualmente como **placeholder 'D'** em `lib/disc.ts`.
Atualize cada um após a aplicação do teste comportamental.

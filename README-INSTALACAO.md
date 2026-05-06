# CRM Baldada — Instalação

Guia passo a passo para subir a versão nova em produção.

---

## 1. Substituir os arquivos no repo

```bash
cd /caminho/para/ddm-crm

# Backup do estado atual (segurança)
git checkout -b backup-pre-baldada
git checkout main

# Apaga conteúdo antigo das pastas que vão mudar
rm -rf app/dashboard app/daily app/login lib components

# Copia tudo do ZIP para o repo (mantém .git, etc)
cp -r /caminho/onde/extraiu/ddm-crm-v3/* .
cp /caminho/onde/extraiu/ddm-crm-v3/.gitignore .
cp /caminho/onde/extraiu/ddm-crm-v3/.env.local.example .
```

> ⚠️ Se você tem um `.env.local` antigo, **não substitua**. As chaves continuam as mesmas, mas verifique se tem `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## 2. Instalar dependências novas

```bash
npm install
```

Pacotes adicionados:
- `@supabase/ssr` — cookies em Server Components
- `chart.js` + `react-chartjs-2` — gráficos do dashboard

---

## 3. Rodar a migration no Supabase

Abre o **SQL Editor** do Supabase: https://supabase.com/dashboard/project/bjntkpqfybmbhidgmnmu/sql

Cola **todo** o conteúdo de `db/001_migration.sql` e roda.

A migration faz:
- Adiciona 18 colunas novas em `registros_daily` (CA/SA/EA/AF/CF/SF/EF/AP, ctt_quente, bloqueio, big_points, prioridade, confiança, etc.)
- Cria índices para performance
- Cria políticas RLS (linha-a-linha por usuário)
- Cria trigger `handle_new_user` que gera profile automaticamente quando usuário é criado em `auth.users`
- Promove `igorfloriano.w1@gmail.com` e `luanmedeiros.w1@gmail.com` a líderes

> ✅ A migration usa `ADD COLUMN IF NOT EXISTS`, então é idempotente — pode rodar várias vezes sem erro.

---

## 4. Criar usuários para os 13 consultores

No Supabase: **Authentication → Users → Add user → Create new user**.

Crie 13 usuários, um para cada consultor:

| Email sugerido                 | Nome a usar em `consultor_nome` |
|--------------------------------|----------------------------------|
| bruno.w1@gmail.com             | Bruno                            |
| danilo.w1@gmail.com            | Danilo                           |
| davi.w1@gmail.com              | Davi                             |
| duarte.w1@gmail.com            | Duarte                           |
| eric.w1@gmail.com              | Eric                             |
| faria.w1@gmail.com             | Faria                            |
| julio.w1@gmail.com             | Júlio                            |
| mel.w1@gmail.com               | Mel                              |
| pedro.w1@gmail.com             | Pedro                            |
| ph.w1@gmail.com                | PH                               |
| salgado.w1@gmail.com           | Salgado                          |
| shoji.w1@gmail.com             | Shoji                            |

> O 13º é você (Luan), que já é líder.

Pra cada usuário criado, depois rode no SQL Editor:

```sql
-- Substitua o email e o nome
UPDATE profiles
SET role = 'liderado',
    consultor_nome = 'Bruno'
WHERE id = (SELECT id FROM auth.users WHERE email = 'bruno.w1@gmail.com');
```

Repita pros 12 consultores.

> 💡 Dica: o trigger `handle_new_user` já cria o profile com `role='liderado'` por padrão. Você só precisa setar o `consultor_nome`.

---

## 5. Build local antes de deployar

```bash
npm run build
```

Se passar sem erro → segue. Se quebrar → me chama com o erro.

---

## 6. Commit e push

```bash
git add .
git commit -m "feat: redesign CRM Baldada com Supabase real"
git push origin main
```

A Vercel vai detectar o push e deployar automaticamente em https://ddm-crm-1um3.vercel.app.

---

## Estrutura do projeto

```
ddm-crm-v3/
├── app/
│   ├── layout.tsx              ← root, importa globals.css
│   ├── page.tsx                ← redireciona conforme role
│   ├── globals.css             ← todo o estilo (slate-900)
│   ├── login/
│   │   └── page.tsx            ← tela de login
│   ├── daily/                  ← formulário diário (liderados)
│   │   ├── layout.tsx
│   │   ├── page.tsx            ← Server Component, busca registro de hoje
│   │   └── DailyForm.tsx       ← Client Component, formulário
│   └── dashboard/              ← painel (líderes)
│       ├── layout.tsx          ← bloqueia liderados
│       ├── page.tsx            ← Server Component, busca 60 dias
│       ├── DashboardClient.tsx ← orquestrador principal
│       ├── Charts.tsx          ← Chart.js
│       ├── ModalConsultor.tsx
│       ├── components/         ← Avatar, StatusPill, etc.
│       └── secoes/             ← 9 seções (Dashboard, Conversao, Alertas...)
├── components/
│   ├── Icon.tsx                ← 24 ícones SVG
│   └── Sidebar.tsx
├── lib/
│   ├── supabase.ts             ← client (browser)
│   ├── supabase-server.ts      ← client (server)
│   ├── types.ts                ← Etapa, RegistroDaily, Profile, etc.
│   ├── constants.ts            ← CONSULTORES, ETAPAS, METRICAS_4
│   └── calculos.ts             ← toRegInterno, calcConversoes, calcIndice...
├── db/
│   └── 001_migration.sql       ← roda 1x no SQL Editor do Supabase
├── middleware.ts               ← refresh de sessão Supabase
├── next.config.js
├── tsconfig.json
├── package.json
└── .env.local.example
```

---

## Troubleshooting

**"Module not found: Can't resolve '@/lib/...'"**
→ Confere se `tsconfig.json` tem `"paths": { "@/*": ["./*"] }`.

**Login funciona mas dashboard fica em branco**
→ É esperado se ninguém preencheu nada ainda. Crie 1 registro de teste:
```sql
INSERT INTO registros_daily (user_id, data, aa_meta, aa_real, af_meta, af_real, ap_meta, ap_real)
VALUES ((SELECT id FROM auth.users WHERE email = 'bruno.w1@gmail.com'),
        CURRENT_DATE, 5, 4, 3, 2, 2, 1);
```

**"new row violates row-level security policy"**
→ A migration não rodou completa. Reabre o SQL e roda de novo.

**Liderado consegue ver o dashboard**
→ A `layout.tsx` do dashboard deveria ter bloqueado. Confere se o profile dele tem `role='liderado'` (não `lider`).

---

## Próximos passos depois do deploy

1. Cada consultor faz login e preenche o daily pelo menos 1x para gerar dado.
2. Você (líder) acessa o dashboard e vê os 4 cards de conversão começando a se popular.
3. Conforme tiver 5+ dias de dados, as tendências (setas ↑↓) ficam confiáveis.

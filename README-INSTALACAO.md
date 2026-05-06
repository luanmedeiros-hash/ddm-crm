# CRM Baldada — Instalação

Guia passo a passo para subir a versão nova em produção.

---

## 1. Substituir os arquivos no repo

```bash
cd /caminho/para/ddm-crm
git checkout -b backup-pre-baldada
git checkout main
remove app/dashboard app/daily app/login lib components
```

---

## 2. Instalar dependências
```bash
npm install
```

---

## 3. Build e deploy
```bash
npm run build
git add .
git commit -m "v3: redesign Baldada"
git push
```

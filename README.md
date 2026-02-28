# Vassouras — Netlify DB (Postgres)

## Variáveis (Netlify)
- APP_KEY = sua senha (o que você digita no login)
- NETLIFY_DATABASE_URL = criado automaticamente quando você conecta o Netlify DB ao site.

## Como conectar o Netlify DB
No painel do site: Data & storage → Netlify DB → Create / Connect.
Depois disso, faça um redeploy.

## Teste rápido
Abra no navegador: `/.netlify/functions/load`
- Deve responder `{"error":"unauthorized"}` (isso é bom).

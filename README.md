# Projeto pronto (layout original) + sincronização entre PCs

## O que mudou
- Mantém layout original.
- Agora carrega/salva no Postgres (Netlify DB) via Functions:
  - /.netlify/functions/load
  - /.netlify/functions/save

## Passos
1) Suba tudo no GitHub.
2) Netlify: Data & Storage → Netlify DB → Connect/Create.
3) Trigger deploy.
4) Teste: /.netlify/functions/load deve retornar JSON.

Obs: Mantém cache local para abrir rápido/offline, mas a nuvem é a verdade oficial.

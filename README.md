# Deploy (Netlify DB + layout original)

## 1) Suba tudo no GitHub (raiz do repo)
- index.html
- netlify.toml
- package.json
- netlify/functions/load.js
- netlify/functions/save.js

## 2) Netlify
- Add new site -> Import from Git
- Depois: Data & Storage -> Netlify DB -> Create/Connect database
- Aguarde criar a variável NETLIFY_DATABASE_URL
- Trigger deploy

## 3) Teste
- / .netlify/functions/load deve retornar JSON com {data,...}

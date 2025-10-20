# EcoHome Tuya Backend

Next.js (App Router) API that proxies OAuth authentication and device control requests to Tuya Cloud.

## Configuração

1. Crie um arquivo `.env` na pasta `backend` com base no `.env.example` na raiz do monorepo.
2. Preencha os valores fornecidos pelo Tuya IoT Platform:
   - `TUYA_CLIENT_ID` e `TUYA_CLIENT_SECRET`
   - `TUYA_REGION_BASE_URL` (ex.: `https://openapi.tuyaus.com` para Western America)
   - `TUYA_CALLBACK_URL` apontando para a rota `/api/tuya/auth/callback` do seu deploy na Vercel.
   - Opcional: `TUYA_APP_DEEP_LINK` (ex.: `myapp://tuya/callback`) para redirecionar direto de volta ao app móvel.
   - `TUYA_H5_LOGIN_URL` com a URL H5 de login fornecida pela Tuya (ex.: `https://app-h5.iot787.com/d/login`).
   - `BACKEND_URL` com a URL pública do deploy.

> Os tokens são mantidos em memória durante a execução. Para produção, implemente um adaptador que siga a interface exportada em `lib/tokenStore.ts` (ex.: usando MySQL).

## Rodando localmente

```bash
cd backend
npm install
npm run dev
```

A API ficará disponível em `http://localhost:3000/api/tuya/*`.

## Deploy na Vercel

1. Execute `npm install` e confirme que o build funciona com `npm run build`.
2. Suba o diretório `backend` para um projeto na Vercel (framework **Next.js**).
3. Configure todas as variáveis de ambiente na Vercel (versão de produção e preview).
4. Ajuste as regras de redirecionamento do app móvel para a URL final do deploy.

## Rotas disponíveis

- `GET /api/tuya/login` — redireciona para o H5 de OAuth da Tuya.
- `GET /api/tuya/auth/callback` — troca o `code` por tokens e redireciona para o app/página de confirmação.
- `GET /api/tuya/devices` — lista dispositivos do usuário (usa `uid` automático ou `?uid=`).
- `GET /api/tuya/status/:deviceId` — busca o estado ligado/desligado.
- `GET /api/tuya/energy/:deviceId` — retorna métricas de consumo (ou mock com header `x-tuya-energy-source: mock`).
- `POST /api/tuya/command/:deviceId` — envia comandos (`{ switch: "on" | "off" }` ou `{ value, code }`).

Cada rota aceita o header `x-tuya-uid` ou query `?uid=` para escolher o usuário quando múltiplos logins existirem.

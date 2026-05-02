# ProjSaude - Frontend + Backend Local

Este projeto possui:
- Frontend React (Vite)
- Backend Node.js/Express
- Persistencia em MySQL (Workbench)
- JWT para autenticacao

## 1) Configurar banco no MySQL Workbench

Abra o Workbench e execute o script:

`backend/sql/init.sql`

## 2) Configurar variaveis de ambiente

Crie um arquivo `.env` na raiz com:

```env
PORT=3333
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=Gil404040@
DB_NAME=projsaude
JWT_SECRET=troque_esta_chave_em_producao
VITE_API_BASE_URL=http://localhost:3333/api
```

## 3) Instalar dependencias

```bash
npm install
```

## 4) Rodar backend e frontend

Terminal 1:

```bash
npm run dev:server
```

Terminal 2:

```bash
npm run dev:client
```

## Endpoints
- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

## Fluxo Atual
- Cadastro com validacao de email e senha forte.
- Login que retorna token JWT.
- Dashboard protegido em `/dashboard`.

## Erro "Failed to fetch"
- Garanta que o backend esteja ativo com `npm run dev:server`.
- Se o frontend abrir em `127.0.0.1`, agora o CORS ja aceita essa origem.
- Se mudar porta/API, ajuste `VITE_API_BASE_URL` no `.env`.

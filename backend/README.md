# Backend Share+

Express 5, TypeScript 6, ESLint e Prisma 7 com SQLite. Requer Node.js >=24.

## Iniciar

```sh
cd backend
npm ci
npm run db:generate
npm run dev
```

O comando `dev` usa `tsx watch` para reiniciar o servidor ao alterar as fontes.
`GET http://localhost:3000/health` responde `{"status":"ok"}`.

Não é necessário criar `.env` para começar. Se desejar personalizar, crie
manualmente `backend/.env` com:

```dotenv
PORT=3000
DATABASE_URL="file:./prisma/dev.db"
```

Execute os comandos a partir de `backend/` (ou com `npm --prefix backend`
na raiz) para manter os caminhos relativos do SQLite consistentes.
O `.env` e o banco local não devem ser versionados.

## Comandos

```sh
npm run lint
npm run typecheck
npm run build
npm start
npm run db:validate
npm run db:generate
npm run db:studio
```

Execute `db:generate` antes de verificar os tipos em uma instalação nova.
O build já gera o cliente antes de compilar para `dist/`.

## Prisma

O schema em `prisma/schema.prisma` contém somente o generator e o datasource
SQLite: **nenhum model, tabela ou migration foi criado**.
O cliente compartilhado fica em `src/db/prisma.ts`; importe-o nas futuras
camadas de persistência. O servidor HTTP não conecta ao banco automaticamente
e `/health` não verifica a persistência.

Depois de adicionar os modelos necessários, crie a primeira migration:

```sh
npm run db:migrate -- --name init
npm run db:generate
```

O primeiro comando aplica a migration; o segundo regenera o cliente. Não edite manualmente
`src/generated/`, `node_modules/` ou `dist/`.

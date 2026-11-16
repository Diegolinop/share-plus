# Backend Share+

Express 5, TypeScript 6, ESLint e Prisma 7 com SQLite. Requer Node.js >=24.

## Iniciar

```sh
cd backend
npm ci
npm run db:deploy
npm run db:generate
npm run db:seed
npm run dev
```

O comando `dev` usa `tsx watch` para reiniciar o servidor ao alterar as fontes.
`GET http://localhost:3000/health` responde `{"status":"ok"}`.

Não é necessário criar `.env` para começar. Se desejar personalizar, crie
manualmente `backend/.env` com:

```dotenv
PORT=3000
DATABASE_URL="file:./prisma/dev.db"
CORS_ORIGIN="http://localhost:5173"
```

Execute os comandos a partir de `backend/` (ou com `npm --prefix backend`
na raiz) para manter os caminhos relativos do SQLite consistentes.
`db:deploy` prepara o arquivo SQLite vazio quando necessário antes de aplicar
as migrations, inclusive no Windows.
O `.env` e o banco local não devem ser versionados.

## Comandos

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
npm run db:validate
npm run db:generate
npm run db:deploy
npm run db:seed
npm run db:studio
```

Execute `db:generate` antes de verificar os tipos em uma instalação nova.
O build já gera o cliente antes de compilar para `dist/`.

## Prisma

O schema em `prisma/schema.prisma` define `Usuario`, `Assinatura`, `Grupo` e
`Participacao`. A migration inicial está versionada em `prisma/migrations/`.
`db:deploy` cria o banco em um ambiente novo e aplica somente as migrations
versionadas; pode ser executado novamente sem apagar dados.

O cliente compartilhado fica em `src/db/prisma.ts`:

```ts
import { prisma } from './db/prisma.js'

const usuarios = await prisma.usuario.findMany()
```

O servidor HTTP não conecta ao banco automaticamente e `/health` não verifica
a persistência.

### API de cadastro (UC-001)

`POST /api/assinaturas` recebe JSON com `servico` (texto não vazio),
`valorTotal` (valor em reais positivo, com até duas casas decimais),
`periodicidade` (`MENSAL` ou `ANUAL`), `diaVencimento` (1 a 31) e `vagas`
(inteiro positivo). O máximo de `valorTotal` é R$ 21.474.836,47, limite do
campo `Int` em centavos no banco.

```sh
curl -X POST http://localhost:3000/api/assinaturas \
  -H 'Content-Type: application/json' \
  -H 'x-user-id: 1' \
  -d '{"servico":"Netflix","valorTotal":59.90,"periodicidade":"MENSAL","diaVencimento":15,"vagas":4}'
```

Resposta `201`:

```json
{"id":1,"servico":"Netflix","grupo":{"id":1,"status":"ATIVO","administradorId":1}}
```

Para esta entrega acadêmica, a autenticação é **simulada** pelo cabeçalho
`x-user-id`: informe o ID de um usuário previamente cadastrado, como o criado
por `db:seed`. A API consulta esse usuário no banco e exige `papel` igual a
`Administrador`. Um ID ausente, inválido ou inexistente recebe `401`; um usuário
com outro papel recebe `403`. Esse cabeçalho pode ser falsificado e **não é
autenticação real**; substitua-o antes de expor a API publicamente.

Dados inválidos recebem `400` com `error` e `detalhes`; JSON malformado recebe
`400`; falhas inesperadas recebem `500` sem expor detalhes internos. A criação
de assinatura, grupo `ATIVO` e participação inicial `ATIVO` ocorre em uma
transação Prisma. O valor em reais é convertido em centavos inteiros. O CORS
aceita por padrão `http://localhost:5173`; `CORS_ORIGIN` permite trocar essa
origem.

### Contrato dos dados

- IDs inteiros autoincrementais e campos escalares obrigatórios.
- `Usuario`: `nome`, `email` único e `papel`.
- `Assinatura`: `servico`, `valor_total_centavos`, `periodicidade`,
  `dia_vencimento` e `vagas`. **3999 representa R$ 39,99**; não envie valores
  fracionários em reais para esse campo.
- `Grupo`: `assinatura_id` único, `administrador_id` e `status`.
- `Participacao`: `grupo_id`, `usuario_id` e `status`, com unicidade do par
  `(grupo_id, usuario_id)`.
- Um usuário administra vários grupos e participa de vários grupos. Um grupo
  tem uma assinatura e um administrador obrigatórios e várias participações.
- Chaves estrangeiras são verificadas pelo SQLite. Exclusões de registros
  referenciados são bloqueadas (`Restrict`), sem exclusões em cascata;
  atualizações das chaves são propagadas (`Cascade`). Para excluir um conjunto,
  remova participações antes do grupo e depois assinatura/usuários, em transação.
- A migration contém `CHECK`s SQL: valor em centavos inteiro positivo (até
  2147483647, limite de `Int` do Prisma), vencimento inteiro de 1 a 31 e vagas
  inteiras positivas (até 2147483647). O Prisma não representa esses `CHECK`s
  no schema: preserve-os ao revisar futuras migrations.
- `papel`, `status` e `periodicidade` são textos obrigatórios, sem enums ou
  defaults: os domínios completos ainda precisam ser acordados com o backend.
  `Administrador`, `Membro`, `Ativo` e `Mensal` são valores usados nos exemplos
  e testes, não uma lista fechada de valores válidos.
- O e-mail único usa a comparação padrão do SQLite (sensível a maiúsculas).
  Normalização e validação de formato devem ser definidas na camada de entrada.

### Criação atômica do UC-001

`Grupo.assinatura_id` garante que uma assinatura não seja usada em dois grupos.
O lado inverso `Assinatura.grupo` é opcional no Prisma: a chave estrangeira não
impede uma assinatura isolada. Para cumprir o UC-001, crie assinatura, grupo e
participação do administrador na mesma escrita aninhada (transacional):

```ts
const assinatura = await prisma.assinatura.create({
  data: {
    servico: 'Serviço de teste',
    valor_total_centavos: 3999,
    periodicidade: 'Mensal',
    dia_vencimento: 10,
    vagas: 4,
    grupo: {
      create: {
        status: 'Ativo',
        administrador: { connect: { id: administradorId } },
        participacoes: {
          create: {
            status: 'Ativo',
            usuario: { connect: { id: administradorId } },
          },
        },
      },
    },
  },
  include: { grupo: { include: { participacoes: true } } },
})
```

`administradorId` deve identificar o usuário autenticado autorizado pelo backend.
A FK armazena o administrador, mas não implementa autorização: a verificação
do papel e a RN-004 pertencem à camada de aplicação. Limites de ocupação e
transições de status também não são implementados nesta entrega de persistência.

### Seed local

Execute `npm run db:seed` após aplicar a migration e gerar o cliente.
O seed cria `admin@shareplus.test`, nome `Administrador de teste`, papel
`Administrador`. Ele é idempotente: não duplica nem altera um usuário existente
com esse e-mail. Não há senha ou mecanismo de login; é apenas um registro fictício
para desenvolvimento. Não use o seed para provisionar ambientes de produção.

### Evoluir o schema

Após editar o schema, crie e revise uma nova migration em desenvolvimento:

```sh
npm run db:migrate -- --name nome_da_alteracao
npm run db:generate
```

O primeiro comando cria/aplica a migration; o segundo regenera o cliente.
Para personalizar SQL antes de aplicar, use `--create-only` no primeiro comando,
revise a migration e depois execute `db:deploy`. Não modifique migrations já
aplicadas, não use `db push` como substituto e não versione o banco local.
`prisma/*.db*` e `src/generated/` estão no `.gitignore`.
Não edite manualmente `src/generated/`, `node_modules/` ou `dist/`.

### Testes de persistência

`npm test` gera o cliente e executa testes de integração com o runner nativo do
Node e `tsx`, sem instalar outra biblioteca. Os testes criam um SQLite temporário,
aplicam a migration real e removem somente esse banco ao terminar; não usam o
`DATABASE_URL` local. Cobrem seed idempotente, criação/consulta/atualização/exclusão,
relações, unicidades, chaves estrangeiras, `CHECK`s e rollback de escrita aninhada.
`npm run typecheck` também verifica os testes, o seed e a configuração Prisma.

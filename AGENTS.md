# Instruções de desenvolvimento — Share+

Estas instruções se aplicam a todo o repositório. Mantenha-as atualizadas quando
alterar scripts, arquitetura ou fluxos de desenvolvimento. Confira sempre os
manifests e o código atual antes de assumir que uma funcionalidade existe.

## Produto e escopo

- O Share+ é um projeto acadêmico para organização e compartilhamento de
  assinaturas digitais. O foco declarado é o **UC-001: Cadastrar Assinatura**.
- Consulte o `README.md` da raiz para a visão do produto e o link para a
  documentação anterior. Essa visão não é uma lista de funcionalidades prontas.
- Não invente campos, regras financeiras, permissões ou contratos do caso de uso.
  Consulte os requisitos e esclareça ambiguidades antes de implementar.
- Marketplace, pagamentos, reputação e outras evoluções não devem ampliar
  automaticamente o escopo de uma tarefa.

## Mapa e estado atual

| Caminho | Responsabilidade e estado |
| --- | --- |
| `frontend/` | React 19 + Vite 8 + TypeScript 6; interface ainda é o template com contador. |
| `frontend/src/main.tsx` | Inicialização React com `StrictMode` e CSS global. |
| `frontend/src/App.tsx` | Componente principal; ainda sem fluxo do domínio ou chamadas à API. |
| `backend/` | Node.js + Express 5 + TypeScript 6; scaffold HTTP e configuração inicial Prisma. |
| `backend/src/app.ts` | Cria/exporta o app, configura JSON e registra `GET /health`. |
| `backend/src/index.ts` | Carrega dotenv, valida `PORT` e inicia o listener. |
| `backend/src/db/prisma.ts` | Exporta o cliente Prisma compartilhado com adaptador SQLite. |
| `backend/prisma.config.ts` | Configura schema, migrations e URL do banco para a CLI. |
| `backend/prisma/schema.prisma` | Define generator e datasource, ainda sem modelos de domínio. |
| `backend/README.md` | Detalha instalação, ambiente e fluxo de desenvolvimento do backend. |
| `README.md` | Contexto de negócio, objetivo acadêmico e participantes. |

Prisma 7 e o adaptador SQLite estão configurados em `backend/prisma.config.ts`,
`backend/prisma/schema.prisma` e `backend/src/db/prisma.ts`. O schema contém
somente generator e datasource: não há modelos, tabelas ou migrations.
dotenv é carregado explicitamente; `.env` é opcional e deve ser criado manualmente.
Isso é configuração inicial, não persistência do domínio implementada.

Os dois pacotes npm são independentes: **não existe `package.json` nem workspace
na raiz**. Não execute comandos npm de pacote sem indicar o diretório correto.

## Ambiente e instalação

- Use Node.js compatível com `engines` e os lockfiles; o backend exige **Node >=24**.
- Use npm e preserve os `package-lock.json` de cada pacote.
- Para instalar versões reproduzíveis, execute na raiz:

  ```sh
  npm --prefix frontend ci
  npm --prefix backend ci
  ```

- Ao alterar dependências, atualize o manifest e o lockfile do mesmo pacote.
  Não atualize versões fora do escopo nem substitua os lockfiles por outro gerenciador.
- TypeScript está fixado em `6.0.3` no backend e em `~6.0.3` no frontend.
  Não use `latest` sem avaliar compatibilidade com ESLint e o restante do toolchain.

## Comandos disponíveis

Todos os comandos abaixo são executados **na raiz do repositório**:

| Objetivo | Frontend | Backend |
| --- | --- | --- |
| Desenvolvimento | `npm --prefix frontend run dev` | `npm --prefix backend run dev` |
| Lint | `npm --prefix frontend run lint` | `npm --prefix backend run lint` |
| Verificar tipos | Incluído no build | `npm --prefix backend run typecheck` |
| Build | `npm --prefix frontend run build` | `npm --prefix backend run build` |
| Executar build | `npm --prefix frontend run preview` | `npm --prefix backend start` |

- Faça build antes de `preview` ou `start`. O preview Vite não é o servidor da API.
- O backend também oferece `npm --prefix backend run lint:fix`; ele modifica
  arquivos, portanto revise o diff e evite correções indiscriminadas.
- Comandos Prisma disponíveis na raiz:
  ```sh
  npm --prefix backend run db:validate
  npm --prefix backend run db:generate
  npm --prefix backend run db:migrate
  npm --prefix backend run db:studio
  ```
  Em instalação nova, execute `db:generate` antes de `dev` e `typecheck`.
  O build gera o cliente automaticamente antes de compilar. Use `db:migrate`
  apenas após definir modelos e revisar a alteração de schema; ele modifica o banco.
- O backend usa porta `3000` por padrão; `PORT` deve ser inteiro entre 1 e 65535.
  Exemplo: `PORT=3001 npm --prefix backend run dev`.
- `GET /health` responde `{"status":"ok"}`. Ele não verifica banco ou serviços
  externos; não o trate como prova de prontidão da persistência.

## Convenções compartilhadas

- Siga o estilo dos arquivos existentes: dois espaços, aspas simples e sem
  ponto e vírgula. Os pacotes usam ESLint flat config; não há Prettier configurado.
- Preserve ESM (`"type": "module"`). Não introduza CommonJS como padrão.
- Prefira tipos explícitos nas fronteiras, `unknown` em vez de `any`, validação
  de entrada e tratamento de erros sem expor informações sensíveis.
- Use `import type` para imports exclusivamente de tipos quando necessário por
  `verbatimModuleSyntax`.
- Mantenha funções e módulos coesos, dependências explícitas e regras de negócio
  separadas de HTTP e renderização. Evite abstrações sem necessidade concreta.
- Comente decisões e restrições relevantes, não operações óbvias.

### Frontend

- Use componentes funcionais e respeite as regras de Hooks e React Refresh
  presentes em `frontend/eslint.config.js`.
- React Compiler já está configurado em `vite.config.ts` via Babel/Rolldown.
  Não remova essa configuração nem adicione memoização sem justificativa.
- O código da aplicação usa resolução `bundler`, JSX `react-jsx` e `noEmit`.
  Imports com `.tsx`, como em `main.tsx`, são suportados nesse pacote.
- Respeite `erasableSyntaxOnly`: evite enums e parameter properties. O TypeScript
  6.0.3 habilita as verificações strict por padrão, mesmo sem `strict` explícito
  no frontend. Escreva código compatível e não desative essas verificações para
  contornar erros de tipos.
- Os estilos são CSS comum, com variáveis, nesting, responsividade e tema escuro.
  Preserve acessibilidade, HTML semântico, labels e navegação por teclado.
- Não há roteador, biblioteca de estado global, cliente API ou proxy Vite
  configurados. Avalie a necessidade antes de introduzir novas dependências.
- `frontend/README.md` ainda descreve o template, não uma arquitetura do produto.

### Backend

- Preserve a separação: `app.ts` configura/exporta o Express; `index.ts` inicia
  o servidor. Importar o app não deve abrir uma porta automaticamente.
- TypeScript usa `NodeNext`, `strict` e `noUncheckedIndexedAccess`, com emissão
  de `src/` para `dist/`. Trate acessos que possam resultar em `undefined`.
- Nos imports relativos entre módulos TypeScript emitidos, use extensão `.js`
  (exemplo: `import { app } from './app.js'`), não copie o padrão `.tsx` do frontend.
- Os tipos Node do backend são da linha 26, mas o runtime mínimo é 24: confira
  a disponibilidade de APIs no runtime suportado antes de utilizá-las.
- O carregamento de ambiente usa `import 'dotenv/config'` em `src/index.ts`,
  `src/db/prisma.ts` e `prisma.config.ts`. Preserve o carregamento explícito.
  As variáveis atuais são `PORT` e `DATABASE_URL`; valide novas configurações.
- O cliente Prisma compartilhado está em `src/db/prisma.ts` e usa o adapter
  SQLite. `DATABASE_URL` sobrescreve o padrão `file:./prisma/dev.db`, relativo
  ao diretório de trabalho. Execute a partir de `backend/` ou via
  `npm --prefix backend` para manter o caminho consistente. Não adicione modelos
  ou migrations sem requisitos do domínio.
- Não há CORS, autenticação ou tratamento customizado de erros configurados.
  Defina contratos e políticas explicitamente ao implementar a integração/API.

## Segurança e arquivos gerados

- Nunca versione credenciais, tokens, dados pessoais reais, `.env` ou bancos locais.
  Não exponha segredos em logs, respostas HTTP ou código enviado ao navegador.
- Não edite `node_modules/`, `dist/` ou `backend/src/generated/` como solução;
  altere a fonte ou configuração que os produz.
- `.tmp/` contém artefatos locais e efêmeros: não dependa deles nas instruções
  permanentes ou no funcionamento da aplicação.
- Se adicionar exemplos de ambiente, use valores fictícios e confira o Git:
  `backend/.gitignore` ignora `.env.*`, inclusive um eventual `.env.example`.

## Validação e entrega

- Antes de alterar arquivos, confira `git status` e preserve mudanças existentes,
  inclusive arquivos não rastreados. Limite o diff ao escopo solicitado.
- Para frontend, execute lint e build; o build roda `tsc -b` antes do Vite.
- Para backend, em instalação nova gere primeiro o cliente com
  `npm --prefix backend run db:generate`; depois execute lint, typecheck e build.
  Valide alterações Prisma com `npm --prefix backend run db:validate`.
  Mudanças em contratos compartilhados exigem verificar os dois pacotes.
- Não há runner ou script `test` em nenhum pacote, nem CI configurada. Não
  invente `npm test` nem apresente lint/build como testes de comportamento.
- Para novas regras de negócio, inclua testes com infraestrutura adequada ao
  escopo; se a configuração estiver ausente, explicite essa necessidade.
- Relate os comandos executados, falhas e verificações não realizadas. Em caso
  de falha, informe a causa e proponha o próximo passo antes de ampliar o escopo.
- Revise o diff e os arquivos staged antes de qualquer commit. Use commits
  pequenos e descritivos, seguindo o padrão observado `feat(escopo): ...` e
  `chore(escopo): ...`. Não faça commit, push ou reescrita de histórico sem solicitação.
- Atualize estas instruções junto com mudanças que tornem seu conteúdo obsoleto.

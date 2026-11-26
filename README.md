# Share+

## Executar o UC-001 localmente

Use Node.js 24.15 ou superior da linha 24, ou Node.js 26, e npm. Execute na raiz:

```sh
npm --prefix frontend ci
npm --prefix backend ci
npm --prefix backend run db:deploy
npm --prefix backend run db:generate
npm --prefix backend run db:seed
```

O Prisma aplica as migrations versionadas ao SQLite. O seed cria o administrador
fictício `admin@shareplus.test` e imprime a linha `VITE_USER_ID=...`.
Copie essa linha para `frontend/.env.local`. A identidade enviada no cabeçalho
`x-user-id` é simulada para uso local. Variáveis Vite são públicas.

| Arquivo | Variável | Configuração |
| --- | --- | --- |
| frontend/.env.local | VITE_USER_ID | ID impresso pelo seed |
| frontend/.env.local | VITE_API_URL | Origem da API, padrão http://localhost:3000 |
| backend/.env | PORT | Porta da API, padrão 3000 |
| backend/.env | DATABASE_URL | Padrão file:./prisma/dev.db, relativo a backend/ |
| backend/.env | CORS_ORIGIN | Origem do frontend, padrão http://localhost:5173 |

Em dois terminais, execute `npm --prefix backend run dev` e
`npm --prefix frontend run dev -- --port 5173 --strictPort`. Abra
[Share+ local](http://localhost:5173), cadastre a assinatura e selecione
**Meus grupos**. A listagem consulta os grupos administrados pela identidade
configurada, do mais recente ao mais antigo. Reinicie o Vite ao alterar o ambiente.

### Estrutura e API

- `frontend/src/pages/` contém o formulário React e a listagem. Vite, TypeScript
  e Tailwind CSS compõem o frontend.
- `frontend/src/services/` contém os tipos e o cliente HTTP.
- `backend/src/` contém a API Express em TypeScript, a validação Zod e a persistência Prisma.
- `backend/prisma/` contém schema, migrations SQLite e seed.
- `backend/tests/` contém os testes HTTP e de persistência com banco temporário.

`POST /api/assinaturas` recebe JSON com `servico` (texto obrigatório),
`valorTotal` (R$ 0,01 a 21.474.836,47, até duas casas decimais),
`periodicidade` (MENSAL ou ANUAL), `diaVencimento` (inteiro de 1 a 31) e
`vagas` (inteiro de 1 a 2.147.483.647). O retorno 201 contém o ID da assinatura,
serviço e grupo criado. Erros retornam `error`: 400 para dados inválidos,
401 para identidade ausente ou desconhecida e 403 para cadastro por membro.
Com o cabeçalho opcional `Idempotency-Key`, repetir o envio com os mesmos dados
recupera o cadastro original. Usar a mesma chave com dados diferentes para o
mesmo administrador retorna 409. O formulário reenvia a chave até obter a confirmação.
`GET /api/grupos` usa `x-user-id` e retorna uma lista de grupos com
ID, status e nome do serviço. Consulte o [contrato completo](backend/README.md).

### Verificar o cadastro

Execute `npm --prefix frontend test` e `npm --prefix backend test`.
Os testes da API aplicam migrations reais em um banco temporário e consultam
as três tabelas após os pedidos. Para conferir o banco de desenvolvimento
manualmente, execute `npm --prefix backend run db:studio`.

| Cenário | Evidência verificada pelos testes |
| --- | --- |
| Cadastro válido | HTTP 201, valor em centavos, grupo ATIVO e participação ATIVO do administrador |
| FE01 | Omissão de serviço, valor ou vencimento retorna 400 |
| FE02 | Valor zero ou negativo retorna 400 |
| Periodicidade ou vagas inválidas | HTTP 400 e tabelas sem registros parciais |
| RN-004 | Membro recebe 403; interface apresenta a mensagem retornada |
| Falha ao criar a participação | A transação reverte também assinatura e grupo |
| Listagem | O grupo criado aparece para o administrador e a consulta de outro usuário retorna lista vazia |

### Evidências de execução

Passaram 23 testes de interface e 17 de API e persistência. Em uma execução
local no Edge, o formulário enviou um plano mensal de R$ 39,90 à API e o
grupo continuou visível após recarregar a listagem. Capturas dessa execução:

- [FE01 — campos obrigatórios ausentes](docs/evidencias/fe01.png)
- [FE02 — valor igual a zero](docs/evidencias/fe02.png)
- [Confirmação do cadastro](docs/evidencias/cadastro.png)
- [Grupo persistido após recarregar a página](docs/evidencias/grupos.png)

## Descrição do Projeto
Implementação do UC-001: "Cadastrar Assinatura" da documentação feita para a primeira entrega do trabalho da disciplina de Análise de Sistemas de Software. Documentação anterior disponível em: https://github.com/brsctoo/Trabalho_Choma

Plataforma voltada à organização e ao compartilhamento de assinaturas digitais entre titulares e participantes. O sistema reúne, em um único ambiente, a criação de grupos, o preenchimento de vagas, a divisão de custos, o acompanhamento de pagamentos e a gestão do acesso ao serviço.

A proposta é reduzir a dependência de conversas informais, planilhas e cobranças manuais, oferecendo mais previsibilidade para quem administra uma assinatura e mais segurança para quem participa de um grupo. Em uma evolução do produto, o Share+ também pode atuar como marketplace, conectando usuários a vagas compatíveis de forma automatizada.

### Objetivo principal
Facilitar o compartilhamento de assinaturas recorrentes, mantendo o divisão transparente, os pagamentos organizados e o acesso ao serviço estável para todos os membros do grupo.

## Diferenciais
**Compatibilidade por serviço e plano**\
O sistema pode manter regras específicas de cada assinatura e impedir ou sinalizar combinações incompatíveis antes da entrada no grupo.\
\
**Proteção de acesso e pagamento**\
Pagamentos ficam condicionados à confirmação de ativação, com possibilidade de estorno se o acesso não for entregue.\
\
**Reputação e saúde do grupo**\
Administradores e grupos recebem uma pontuação baseada em tempo de atividade, velocidade de ativação, incidentes, avaliações e históricos, possibilitando pessoas interessadas analisarem como é a convivência no grupo.\
\
**Matching e fila de espera global**\
Administradores e grupos recebem uma pontuação baseada em tempo de atividade, velocidade de ativação, incidentes, avaliações e históricos, possibilitando pessoas interessadas analisarem como é a convivência no grupo.\
\
**Gestão de incidentes**\
Problemas relacionados com remoção de membros dos grupos, convites expirados ou assinaturas interrompidas geram fluxos próprios de resolução.\
\
**Gestão e otimização de assinaturas**\
O usuário pode acompanhar seus gastos, visualizar sua economia com base no preço dos planos e comparar alternativas de planos, inclusive quando compartilhar não for a opção mais vantajosa.\
\
**Círculos privados**\
Famílias, repúblicas, casais, equipes e grupos de amigos podem administrar assinaturas entre pessoas conhecidas sem depender do marketplace público.
\

## Partipantes
**Bruno Rafael Comin Scheffel** - ra145098\
**Felipe Almeida Gomes** - ra145088\
**Diego Pimenta Suárez** - ra145094\
**José Luís Peres de Sousa** - ra145095

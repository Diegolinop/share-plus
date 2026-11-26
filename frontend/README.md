# Frontend Share+

React 19, Vite 8, TypeScript 6 e Tailwind CSS 4. A página inicial implementa
UC-001 — Cadastrar Assinatura. A paleta violeta é uma proposta visual local:
não há guia formal de identidade visual versionado no repositório.

## Executar (na raiz do repositório)

```sh
npm --prefix frontend ci
npm --prefix frontend run dev
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run build
```

Use Node.js >=24, compatível com o ambiente do projeto.

## Integração local

Configure `frontend/.env.local` com o ID exibido pelo seed. O serviço
`src/services/assinaturaService.ts` envia o cadastro e consulta os grupos
em `/grupos`. Consulte o [guia da raiz](../README.md) para preparar o banco
e iniciar os dois servidores. Os erros da API aparecem no formulário, que
preserva os campos para uma nova tentativa.

## Contrato consultado

Fonte: `backend/src/controllers/assinaturas.ts` e
`backend/src/services/assinaturas.ts` na branch `develop` usada como base.
O endpoint é `POST /api/assinaturas` e responde com `201`.

| Campo JSON | Tipo e regra |
| --- | --- |
| `servico` | string não vazia após trim |
| `valorTotal` | number em reais: 0,01 a 21.474.836,47, até 2 casas decimais |
| `periodicidade` | `MENSAL` ou `ANUAL` |
| `diaVencimento` | inteiro de 1 a 31 |
| `vagas` | inteiro de 1 a 2.147.483.647 |

O valor aceita vírgula ou ponto decimal no formulário, sem separador de milhar,
e é convertido para número no envio. Não se calcula preço por vaga porque a
regra de divisão não faz parte deste formulário.

Resposta de sucesso:

```json
{
  "id": 1,
  "servico": "Spotify",
  "grupo": { "id": 1, "status": "ATIVO", "administradorId": 1 }
}
```

## Validação visual

Os testes jsdom não medem layout. Conferir também em navegador com larguras
360, 768 e 1440 px: ausência de rolagem horizontal, legibilidade dos erros,
foco por teclado e estados de envio/sucesso.

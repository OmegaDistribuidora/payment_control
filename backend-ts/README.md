# Backend TypeScript (migracao inicial)

Esta pasta contem a primeira etapa da migracao do backend Java para Node.js + TypeScript.

## Implementado nesta etapa

- Autenticacao `Basic` com os mesmos usuarios/senhas do backend Java.
- `GET /ping`
- Endpoints de referencias:
  - `GET /api/referencias/setores`
  - `GET /api/referencias/todas`
  - `GET /api/referencias/dspcentros`
  - `GET /api/referencias/despesas`
  - `GET /api/referencias/empresas`
  - `GET /api/referencias/fornecedores`
  - `GET /api/referencias/sedes`
  - `GET /api/referencias/dotacoes`
  - `GET /api/referencias/colaboradores`
  - `POST /api/referencias/cache/clear`
  - `POST /api/referencias/setores/config`
  - `POST /api/referencias/despesas/config`
- Endpoints de pagamentos (leitura):
  - `GET /api/pagamentos/meus`
  - `GET /api/pagamentos/meus/total`
  - `GET /api/pagamentos/:id`
  - `GET /api/pagamentos/:id/historico`
- Endpoints de pagamentos (escrita):
  - `POST /api/pagamentos`
  - `PUT /api/pagamentos/:id`
  - `DELETE /api/pagamentos/:id`
  - `POST /api/pagamentos/normalize`

## Como rodar

1. Copie `.env.example` para `.env` e ajuste variaveis.
2. Instale dependencias:
   - `npm install`
3. Rode em dev:
   - `npm run dev`
4. Build:
   - `npm run build`

## Observacoes

- Timezone alvo: `America/Fortaleza`.
- O frontend atual pode apontar para este backend via `VITE_API_BASE_URL`.
- O backend TS nao cria nem remove tabelas de pagamentos; usa o schema existente.
- Para rollout seguro no Railway, comece com `APP_READ_ONLY=true` e valide login/listagem.

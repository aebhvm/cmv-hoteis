# CMV Hoteis

Aplicacao web de controle de insumos, movimentacoes, fichas tecnicas, vendas e CMV para AeB Villa Mayor e VM Cumbuco.

## Desenvolvimento local

1. Instale o Node.js LTS.
2. Execute `npm install`.
3. Copie `.env.example` para `.env.local` e configure `DATABASE_URL` apenas localmente ou na Vercel.
4. Execute `npm run dev`.

## Estrutura

- `src/`: interface React, contexto de dados, tipos e componentes por modulo.
- `api/`: funcoes serverless da Vercel; a connection string do Neon nunca vai para o cliente.
- `database/`: referencia do schema do Neon.
- `backups/`: backups locais ignorados pelo Git, quando necessarios para recuperacao.

## Validacao

- `npm run lint`
- `npm run build`

O estado operacional fica na tabela `app_state` do Neon. A API aplica limite de payload, validacao estrutural, controle de revisao e respostas genericas para nao expor detalhes internos.

## Seguranca operacional

Nunca versione `.env.local`, connection strings, senhas reais ou backups com credenciais. Configure segredos nas variaveis de ambiente da Vercel e mantenha o acesso ao projeto restrito.

# Trust Center — homologação

Página estática para capturar o RUT e abrir um Trust Center OneTrust embutido na própria página.

## Executar localmente com Node.js

Os valores do tenant de homologação já estão em `config.js`. Para executar a aplicação:

1. Configure no ambiente do servidor `ONETRUST_PRIVATE_KEY` com a chave privada correspondente à chave pública cadastrada no OneTrust. Consulte `.env.example` para o formato. Não coloque essa chave em `config.js`, no HTML ou no navegador.
2. Execute `node server.js` e abra `http://localhost:3000`.

O endpoint implementado `POST /api/onetrust/token` recebe JSON `{ "id": "<RUT>" }` e responde `{ "token": "<JWT>" }`. O JWT usa assinatura RS256, inclui `sub` igual ao RUT e expira em cinco minutos. A documentação exige que `sub` corresponda ao identificador do titular e que a chave de verificação esteja cadastrada no OneTrust. A chave pública que você compartilhou não pode ser usada para assinar o token; o servidor precisa da chave privada correspondente.

`tenantId`, `portalId`, `blobUrl`, `workerUrl` e o endpoint já estão configurados em `config.js`. Se a aplicação usar outro backend, altere `tokenEndpoint` para sua URL.

## Testar na Vercel

A aplicação usa arquivos estáticos na raiz e uma Vercel Function em `api/onetrust/token.js`. A Vercel publica essa função automaticamente em `POST /api/onetrust/token`; `server.js` continua servindo apenas para execução local com Node.js.

1. Envie este projeto para um repositório Git e importe o repositório no painel da Vercel. Não configure um framework nem uma pasta de saída de build; a página estática fica na raiz.
2. Nas configurações do projeto Vercel, adicione `ONETRUST_PRIVATE_KEY` como variável de ambiente para Preview (e Development, se for usar `vercel dev`). Cole o conteúdo da chave privada PEM correspondente à chave pública cadastrada no OneTrust. Não use a chave pública e não coloque a chave em `config.js`.
3. Faça o deploy de Preview e abra a URL gerada. `config.js` já aponta para `/api/onetrust/token`, então a página e a função usam o mesmo domínio.
4. Para executar com o ambiente Vercel localmente, instale o CLI com `npm i -g vercel`, autentique com `vercel login`, vincule o diretório com `vercel link` e execute `vercel dev`. Configure a variável `ONETRUST_PRIVATE_KEY` no projeto Vercel no ambiente Development; `vercel dev` carrega essas variáveis vinculadas.
5. Envie um RUT de homologação e confira as requisições em DevTools → Network. A rota deve responder HTTP 200 com `{ "token": "..." }`. Se retornar 503, a chave privada não está configurada ou não é PEM válido; se o token sair com 200 e a área continuar vazia, investigue as requisições do SDK ao OneTrust.

Não publique a chave em Git nem em variáveis `NEXT_PUBLIC_*`/`VITE_*`; ela precisa ficar somente no ambiente do servidor. A chave privada correspondente deve estar cadastrada/correlacionada à chave pública no OneTrust.

O RUT digitado é guardado no `localStorage` do navegador sob a chave `trust-center-rut`. Esta página não valida o formato do RUT. O endpoint de demonstração apenas assina o identificador recebido: não comprova que a pessoa que o digitou é titular daquele RUT. Use somente no fluxo simulado de homologação; a autenticação real depende do mecanismo de identidade da aplicação.

## Referência oficial

[Embedding the Trust Center on an existing webpage](https://developer.onetrust.com/onetrust/reference/embedding-the-trust-center-on-an-existing-webpage)
# bupa_trust_center

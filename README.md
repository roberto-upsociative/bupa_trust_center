# Trust Center — pruebas

Aplicación de dos pantallas: `index.html` solicita el RUT y, después de emitir el JWT, abre `trust.html`, donde se muestra el Trust Center en una página independiente y amplia.

## Ejecución local con Node.js

Los datos del tenant de pruebas ya están en `config.js`.

1. Configura `ONETRUST_PRIVATE_KEY` en el entorno del servidor. Debe ser la clave privada correspondiente a la clave pública registrada en OneTrust. Consulta `.env.example` para ver el formato. No incluyas la clave en `config.js`, HTML ni en el navegador.
2. Ejecuta `node server.js` y abre `http://localhost:3000`.

El endpoint `POST /api/onetrust/token` recibe JSON `{ "id": "<RUT>" }` y responde `{ "token": "<JWT>" }`. El JWT se firma con RS256, incluye `sub` con el RUT y vence en cinco minutos. La clave pública registrada en OneTrust debe corresponder a la clave privada del servidor.

Los valores de `tenantId`, `portalId`, `blobUrl`, `workerUrl` y la ruta del endpoint ya están configurados en `config.js`. Si utilizas otro backend, cambia `tokenEndpoint`.

## Pruebas en Vercel

Los archivos estáticos están en la raíz del proyecto y la función de Vercel está en `api/onetrust/token.js`. Vercel publica esa función en `POST /api/onetrust/token`. `server.js` se usa para ejecutar la aplicación localmente con Node.js.

1. Envía el proyecto a un repositorio Git e impórtalo en Vercel. No selecciones un framework ni una carpeta de salida de build; la página estática está en la raíz.
2. En la configuración del proyecto Vercel, agrega `ONETRUST_PRIVATE_KEY` como variable de entorno para Preview y, si usarás `vercel dev`, también para Development. Pega el contenido de la clave privada PEM correspondiente a la clave pública registrada en OneTrust.
3. Haz un deploy de Preview y abre la URL generada. `config.js` apunta a `/api/onetrust/token`, por lo que la página y la función usan el mismo dominio.
4. Para ejecutar localmente con el entorno Vercel, instala el CLI con `npm i -g vercel`, autentícate con `vercel login`, vincula el directorio con `vercel link` y ejecuta `vercel dev`. Configura la variable `ONETRUST_PRIVATE_KEY` para el entorno Development del proyecto.
5. Ingresa un RUT de pruebas y revisa las solicitudes en DevTools → Network. La ruta debe responder HTTP 200 con `{ "token": "..." }`. Un error 503 indica que la clave privada no está configurada o no es un PEM válido. Si el token responde 200 y el Trust Center no carga, revisa las solicitudes del SDK a OneTrust.

No publiques la clave en Git ni en variables `NEXT_PUBLIC_*` o `VITE_*`; debe permanecer solo en el entorno del servidor. El endpoint de pruebas firma el identificador recibido, pero no verifica que quien lo ingresa sea su titular. La autenticación real depende del mecanismo de identidad de la aplicación.

El RUT se guarda en el `localStorage` del navegador con la clave `trust-center-rut`. El JWT se mantiene en el `sessionStorage` de la pestaña actual para navegar entre las pantallas.

## Documentación oficial

[Incorporar Trust Center en una página existente](https://developer.onetrust.com/onetrust/reference/embedding-the-trust-center-on-an-existing-webpage)

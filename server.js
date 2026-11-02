const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = __dirname;

function loadEnvFile() {
  let contents;
  try {
    contents = fs.readFileSync(path.join(root, ".env"), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }

  const entries = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:"([\s\S]*?)"|'([\s\S]*?)'|([^#\r\n]*))\s*(?:#.*)?$/gm;
  for (const match of contents.matchAll(entries)) {
    const [, name, doubleQuoted, singleQuoted, plain] = match;
    if (process.env[name] !== undefined) continue;
    const value = doubleQuoted ?? singleQuoted ?? plain ?? "";
    process.env[name] = doubleQuoted !== undefined ? value.replace(/\\n/g, "\n") : value.trim();
  }
}

loadEnvFile();
const port = Number(process.env.PORT || 3000);
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(body));
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function createOneTrustToken(subject) {
  const privateKey = (process.env.ONETRUST_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!privateKey.trim()) {
    const error = new Error("JWT signing key is not configured.");
    error.statusCode = 503;
    throw error;
  }
  if (!/-----BEGIN (?:RSA )?PRIVATE KEY-----/.test(privateKey)) {
    const error = new Error("A private PEM key is required to sign OneTrust tokens.");
    error.statusCode = 503;
    throw error;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({ sub: subject, iat: now, exp: now + 300 }));
  const unsignedToken = `${header}.${payload}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsignedToken), privateKey).toString("base64url");
  return `${unsignedToken}.${signature}`;
}

async function readJson(request) {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 4096) {
      const error = new Error("Request body too large.");
      error.statusCode = 413;
      throw error;
    }
  }
  try {
    return JSON.parse(raw || "{}");
  } catch {
    const error = new Error("Invalid JSON request body.");
    error.statusCode = 400;
    throw error;
  }
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  if (request.method === "POST" && requestUrl.pathname === "/api/onetrust/token") {
    try {
      if (!request.headers["content-type"]?.includes("application/json")) {
        return sendJson(response, 415, { error: "Content-Type must be application/json." });
      }
      const body = await readJson(request);
      const id = typeof body.id === "string" ? body.id.trim() : "";
      if (!id) return sendJson(response, 400, { error: "A non-empty id is required." });

      // Este fluxo é apenas para homologação: o endpoint assina o RUT informado,
      // mas não comprova a identidade de quem o digitou.
      return sendJson(response, 200, { token: createOneTrustToken(id) });
    } catch (error) {
      const status = error.statusCode || 500;
      const message = status === 500
        ? "Unable to issue OneTrust token. Check the server signing key."
        : error.message;
      return sendJson(response, status, { error: message });
    }
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return sendJson(response, 405, { error: "Method not allowed." });
  }

  const pathname = requestUrl.pathname === "/" ? "/index.html" : decodeURIComponent(requestUrl.pathname);
  const filePath = path.resolve(root, `.${pathname}`);
  if (!filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403);
    return response.end("Forbidden");
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return response.end("Not found");
    }
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store"
    });
    response.end(request.method === "HEAD" ? undefined : data);
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Homologation app listening on port ${port}`);
});

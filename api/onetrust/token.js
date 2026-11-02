const crypto = require("node:crypto");

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function createOneTrustToken(subject) {
  const privateKey = (process.env.ONETRUST_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!privateKey.trim() || !/-----BEGIN (?:RSA )?PRIVATE KEY-----/.test(privateKey)) {
    const error = new Error("A valid ONETRUST_PRIVATE_KEY is not configured.");
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

module.exports = (request, response) => {
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  if (!request.headers["content-type"]?.includes("application/json")) {
    return response.status(415).json({ error: "Content-Type must be application/json." });
  }

  const id = typeof request.body?.id === "string" ? request.body.id.trim() : "";
  if (!id) return response.status(400).json({ error: "A non-empty id is required." });

  try {
    return response.status(200).json({ token: createOneTrustToken(id) });
  } catch (error) {
    console.error("Failed to issue OneTrust token:", error.message);
    return response.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : "Unable to issue OneTrust token. Check the server logs."
    });
  }
};

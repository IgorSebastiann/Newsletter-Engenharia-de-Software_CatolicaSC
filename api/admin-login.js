const { parseJsonBody } = require("./_lib/body");
const { buildSessionCookie, createSessionValue } = require("./_lib/session");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const body = await parseJsonBody(req);
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!expectedUser || !expectedPassword || !secret) {
    return res.status(500).json({ error: "Variáveis do admin não configuradas." });
  }

  if (body.username !== expectedUser || body.password !== expectedPassword) {
    return res.status(401).json({ error: "Usuário ou senha inválidos." });
  }

  res.setHeader("Set-Cookie", buildSessionCookie(createSessionValue(body.username)));
  return res.status(200).json({ ok: true });
};

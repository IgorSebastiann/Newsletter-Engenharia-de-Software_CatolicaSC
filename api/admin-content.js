const fs = require("fs/promises");
const path = require("path");
const { parseJsonBody } = require("./_lib/body");
const { getSessionFromRequest } = require("./_lib/session");

const REPO = "IgorSebastiann/Newsletter-Engenharia-de-Software_CatolicaSC";
const BRANCH = process.env.GITHUB_CONTENT_BRANCH || "main";
const CONTENT_PATH = "content/site.json";

async function readLocalContent() {
  const filePath = path.join(process.cwd(), CONTENT_PATH);
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function fetchGithubContent(token) {
  const response = await fetch(`https://api.github.com/repos/${REPO}/contents/${CONTENT_PATH}?ref=${BRANCH}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });

  if (!response.ok) {
    throw new Error(`Falha ao ler o GitHub: ${response.status}`);
  }

  const payload = await response.json();
  return {
    sha: payload.sha,
    content: JSON.parse(Buffer.from(payload.content, "base64").toString("utf8"))
  };
}

async function saveGithubContent(token, content) {
  const current = await fetchGithubContent(token);
  const encoded = Buffer.from(JSON.stringify(content, null, 2), "utf8").toString("base64");

  const response = await fetch(`https://api.github.com/repos/${REPO}/contents/${CONTENT_PATH}`, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    body: JSON.stringify({
      message: "Update newsletter content via admin panel",
      content: encoded,
      sha: current.sha,
      branch: BRANCH
    })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || `Falha ao salvar no GitHub: ${response.status}`);
  }

  return response.json();
}

module.exports = async (req, res) => {
  if (!getSessionFromRequest(req)) {
    return res.status(401).json({ error: "Sessão inválida." });
  }

  if (req.method === "GET") {
    try {
      const token = process.env.GITHUB_CONTENT_TOKEN;
      const content = token ? (await fetchGithubContent(token)).content : await readLocalContent();
      return res.status(200).json({ content });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "PUT") {
    if (!process.env.GITHUB_CONTENT_TOKEN) {
      return res.status(500).json({ error: "GITHUB_CONTENT_TOKEN não configurado." });
    }

    try {
      const body = await parseJsonBody(req);

      if (!body.content || typeof body.content !== "object") {
        return res.status(400).json({ error: "Conteúdo inválido." });
      }

      await saveGithubContent(process.env.GITHUB_CONTENT_TOKEN, body.content);
      return res.status(200).json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: "Método não permitido." });
};

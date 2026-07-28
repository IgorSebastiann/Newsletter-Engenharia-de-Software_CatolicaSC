const crypto = require("crypto");

const COOKIE_NAME = "newsletter_admin_session";

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET || "";
}

function createSignature(payload) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function createSessionValue(username) {
  const expires = Date.now() + 1000 * 60 * 60 * 12;
  const payload = `${username}.${expires}`;
  return `${payload}.${createSignature(payload)}`;
}

function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separator = entry.indexOf("=");
        return [entry.slice(0, separator), decodeURIComponent(entry.slice(separator + 1))];
      })
  );
}

function verifySessionValue(value) {
  if (!value || !getSecret()) {
    return false;
  }

  const parts = value.split(".");

  if (parts.length < 3) {
    return false;
  }

  const signature = parts.pop();
  const expires = Number(parts.pop());
  const username = parts.join(".");

  if (!username || Number.isNaN(expires) || expires < Date.now()) {
    return false;
  }

  const payload = `${username}.${expires}`;
  const expected = createSignature(payload);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function getSessionFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  return verifySessionValue(cookies[COOKIE_NAME]);
}

function buildSessionCookie(value) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200${secure}`;
}

function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

module.exports = {
  buildSessionCookie,
  clearSessionCookie,
  createSessionValue,
  getSessionFromRequest
};

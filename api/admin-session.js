const { getSessionFromRequest } = require("./_lib/session");

module.exports = async (req, res) => {
  return res.status(200).json({ authenticated: getSessionFromRequest(req) });
};

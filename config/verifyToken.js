const jose = require("jose-cjs");
const { jwtVerify } = require("jose-cjs");

const JWKS = jose.createRemoteJWKSet(
  new URL(`${process.env.JWKS_CLIENT_URL}/api/auth/jwks`),
);

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers?.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "Unauthorized: No token" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Invalid token format" });
    }

    try {
      const { payload } = await jwtVerify(token, JWKS);
      req.user = payload;
      next();
    } catch (err) {
      return res.status(401).json({
        message: "Unauthorized: Token invalid or expired",
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: "Server error in auth middleware",
    });
  }
};

module.exports = verifyToken;

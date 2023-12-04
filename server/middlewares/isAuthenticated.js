import verifyJWT from "../utils/verifyJWT.js";

export async function isAuthenticated(req, res, next) {
  try {
    const tokenInHeaders = req.get("Authorization");
    const token = tokenInHeaders
      ? tokenInHeaders.replace("Bearer ", "").trim()
      : req.cookies.jwtToken;

    const decoded = await verifyJWT(token);
    req.user = decoded;

    if (req.user) {
      next();
    }
  } catch (err) {
    if (err instanceof Error) {
      const redirectUrl = encodeURIComponent(req.originalUrl);
      res.redirect(`/signin?redirect=${redirectUrl}`);
      return;
    }
    res.status(401).json({ errors: "authenticate failed" });
  }
}

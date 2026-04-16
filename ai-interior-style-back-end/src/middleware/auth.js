import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

export const requireRole = (role) => {
  return (req, res, next) => {
    if (req.user && req.user.role === role) {
      next();
    } else {
      res.status(403).json({ error: 'Access denied: insufficient permissions' });
    }
  };
};

export const requireVerifiedDesigner = (req, res, next) => {
  if (req.user && req.user.role === 'designer') {
    if (req.user.is_verified) {
      next();
    } else {
      res.status(403).json({ error: 'Access denied: designer account not verified' });
    }
  } else {
    res.status(403).json({ error: 'Access denied: must be a designer' });
  }
};

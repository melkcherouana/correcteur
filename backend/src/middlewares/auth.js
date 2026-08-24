import jwt from 'jsonwebtoken';

export const verifierToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];
  try {
    req.utilisateur = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Session expirée, veuillez vous reconnecter'
      : 'Token invalide';
    return res.status(401).json({ message });
  }
};

// Usage : autoriser('ADMIN', 'ENSEIGNANT')
export const autoriser = (...roles) => (req, res, next) => {
  if (!req.utilisateur) {
    return res.status(401).json({ message: 'Non authentifié' });
  }
  if (!roles.includes(req.utilisateur.role)) {
    return res.status(403).json({ message: 'Accès interdit : rôle insuffisant' });
  }
  next();
};


export const isSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentification requise' });
  }

  if (!req.user.actif) {
    return res.status(403).json({ message: 'Compte inactif' });
  }

  if (req.user.rôle === 'admin') {
    return next();
  }

  return res.status(403).json({ message: 'Accès refusé : réservé aux administrateurs' });
};
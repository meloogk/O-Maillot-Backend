
export const isSuperAdmin = (req, res, next) => {
    
  if (req.user && req.user.rôle === "admin") {
    return next();
  } else {
    return res.status(403).json({ message: "Accès refusé : réservé à l'administrateur principal" });
  }
};

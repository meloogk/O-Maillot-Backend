import { adminAuth } from '../Firebase/firebase_admin.mjs';
import { UtilisateurSchemaModel } from '../Models/utilisateur.model.mjs';

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Token manquant ou invalide dans l’en-tête Authorization');
      return res.status(401).json({ message: 'Token manquant ou invalide' });
    }

    const token = authHeader.split(' ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
      console.log('Token vérifié avec succès, uidFirebase:', decodedToken.uid);
    } catch (error) {
      console.error('Erreur vérification token:', error.code, error.message);
      if (error.code === 'auth/id-token-expired') {
        return res.status(401).json({ message: 'Token expiré' });
      }
      if (error.code === 'auth/id-token-revoked') {
        return res.status(401).json({ message: 'Token révoqué' });
      }
      return res.status(401).json({ message: 'Token Firebase invalide' });
    }

    const utilisateur = await UtilisateurSchemaModel.findOne({ uidFirebase: decodedToken.uid }).lean();
    if (!utilisateur) {
      console.log(`Utilisateur non trouvé dans MongoDB pour uidFirebase: ${decodedToken.uid}`);
      return res.status(404).json({ message: 'Utilisateur non trouvé dans MongoDB' });
    }

    if (!utilisateur.actif) {
      console.log(`Compte inactif pour uidFirebase: ${decodedToken.uid}`);
      return res.status(403).json({ message: 'Compte inactif' });
    }

    req.user = {
      id: utilisateur._id.toString(),
      uidFirebase: utilisateur.uidFirebase,
      rôle: utilisateur.rôle,
      actif: utilisateur.actif,
      email: utilisateur.email,
      typeConnexion: utilisateur.typeConnexion,
    };
    console.log(`Utilisateur authentifié: ${utilisateur.email}, ID: ${req.user.id}`);

    next();
  } catch (error) {
    if (res.headersSent) {
      console.error('Headers already sent in verifyToken, skipping error response:', error.message);
      return next(error);
    }
    console.error('Erreur dans verifyToken:', error.message);
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
import { UtilisateurSchemaModel } from "../Models/utilisateur.model.mjs";
import { DefiSchemaModel } from "../Models/defi.model.mjs";



export const CreerDefi = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Token invalide ou manquant' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId);
    if (!utilisateur || utilisateur.rôle !== 'admin') {
      return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    }

    const { nom, description, points, critere } = req.body;
    if (!nom || !description || !points || !critere || !critere.type || !critere.valeur) {
      return res.status(400).json({ message: 'Veuillez fournir tous les champs requis' });
    }

    const defi = new DefiSchemaModel({
      nom,
      description,
      points,
      critere,
    });

    await defi.save();

    return res.status(201).json({
      message: 'Défi créé avec succès',
      defi,
    });
  } catch (error) {
    console.error('Erreur dans CreerDefi:', error);
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const ObtenirDefis = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Token invalide ou manquant' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId).lean();
    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (!utilisateur.actif) {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    const defis = await DefiSchemaModel.find({ actif: true }).lean();
    return res.status(200).json(defis.map(d => ({
      _id: d._id.toString(),
      nom: d.nom,
      description: d.description,
      points: d.points,
      critere: d.critere,
      crééLe: d.crééLe.toISOString(),
    })));
  } catch (error) {
    console.error('Erreur dans ObtenirDefis:', error);
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
import mongoose from 'mongoose';
import { MongoConnected } from "../Database/database.mjs";
import { UtilisateurSchemaModel } from '../Models/utilisateur.model.mjs';
import { POINTS_PARRAIN, POINTS_FILLEUL } from '../utils/recompenses.mjs';

export const UtiliserCodeParrainage = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== 'ok') {
      return res.status(500).json({ message: 'Erreur de connexion à la base de données' });
    }

    const userId = req.user?.id;
    const { codeParrainage } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Token invalide ou manquant' });
    }

    if (!codeParrainage) {
      return res.status(400).json({ message: 'Code de parrainage requis' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId);
    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (!utilisateur.actif) {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    if (utilisateur.codeParrainUtilise) {
      return res.status(400).json({ message: 'Vous avez déjà utilisé un code de parrainage' });
    }

    const parrain = await UtilisateurSchemaModel.findOne({ codeParrainage });
    if (!parrain) {
      return res.status(400).json({ message: 'Code de parrainage invalide' });
    }

    if (parrain._id.equals(userId)) {
      return res.status(400).json({ message: 'Vous ne pouvez pas utiliser votre propre code' });
    }

    if (parrain.personnesParrainees.includes(userId)) {
      return res.status(400).json({ message: 'Vous êtes déjà parrainé par cet utilisateur' });
    }

    // Ajout des points pour le parrain
    parrain.personnesParrainees.push(userId);
    parrain.pointsParrainage += POINTS_PARRAIN;
    parrain.pointsFidélité += POINTS_PARRAIN;
    parrain.totalEarned += POINTS_PARRAIN;
    await parrain.save();

    // Ajout des points pour le filleul (utilisateur qui utilise le code)
    utilisateur.pointsFidélité += POINTS_FILLEUL;
    utilisateur.totalEarned += POINTS_FILLEUL;
    utilisateur.codeParrainUtilise = codeParrainage;
    await utilisateur.save();

    return res.status(200).json({
      message: 'Code de parrainage utilisé avec succès',
      pointsParrain: POINTS_PARRAIN,
      pointsFilleul: POINTS_FILLEUL,
    });
  } catch (error) {
    console.error('Erreur dans UtiliserCodeParrainage:', error);
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
import mongoose from 'mongoose';
import { MongoConnected } from '../Database/database.mjs';
import { UtilisateurSchemaModel } from '../Models/utilisateur.model.mjs';
import { CommandeSchemaModel } from '../models/Commande.model.mjs';
import { DefiSchemaModel } from '../Models/defi.model.mjs';

import { convertCurrency } from '../config/exchangerate.mjs';
import { calculerNiveau } from '../utils/recompenses.mjs';

export const getUserRewards = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== 'ok') {
      return res.status(500).json({ message: 'Erreur de connexion à la base de données' });
    }

    const userId = req.user?.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Utilisateur non connecté' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId)
      .populate('badges.badgeId', 'nom description image icon color rarity niveau')
      .populate('achievements.defiId', 'nom description points critere')
      .lean();
    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (!utilisateur.actif) {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    const orders = await CommandeSchemaModel.find({ userId }).lean();
    const totalOrders = orders.length;
    const totalSpentInXOF = orders.reduce((sum, order) => sum + order.total, 0);
    const totalSpent = await convertCurrency(totalSpentInXOF, 'XOF', 'XOF');

    const niveauInfo = calculerNiveau(utilisateur.pointsFidélité);

    // Vérifier les achievements
    const defis = await DefiSchemaModel.find({ actif: true }).lean();
    const achievements = await Promise.all(defis.map(async (defi) => {
      let progress = 0;
      let completed = false;
      if (defi.critere.type === 'achat') {
        progress = totalSpent;
        completed = progress >= defi.critere.valeur;
      } else if (defi.critere.type === 'parrainage') {
        progress = utilisateur.personnesParrainees.length;
        completed = progress >= defi.critere.valeur;
      } else if (defi.critere.type === 'connexion') {
        progress = utilisateur.streaks.currentLoginStreak || 0;
        completed = progress >= defi.critere.valeur;
      }

      const userAchievement = utilisateur.achievements.find(a => a.defiId.toString() === defi._id.toString()) || {};
      return {
        id: defi._id.toString(),
        name: defi.nom,
        description: defi.description,
        icon: 'Trophy', // À adapter selon le design
        progress,
        target: defi.critere.valeur,
        completed,
        completedAt: userAchievement.completedAt,
        claimed: userAchievement.claimed || false,
        reward: { points: defi.points },
      };
    }));

    const rewardsData = {
      points: utilisateur.pointsFidélité || 0,
      level: niveauInfo.niveauActuel,
      totalSpent,
      totalOrders,
      badges: utilisateur.badges.map(b => ({
        id: b.badgeId._id.toString(),
        name: b.badgeId.nom,
        description: b.badgeId.description,
        icon: b.badgeId.icon,
        color: b.badgeId.color,
        rarity: b.badgeId.rarity,
        unlockedAt: b.unlockedAt,
      })) || [],
      streaks: utilisateur.streaks || {
        currentLoginStreak: 0,
        longestLoginStreak: 0,
        lastLoginDate: null,
      },
      achievements,
      referrals: {
        code: utilisateur.codeParrainage || '',
        referredUsers: utilisateur.personnesParrainees.map(id => id.toString()) || [],
        totalEarned: utilisateur.totalEarned || 0,
      },
      niveauInfo,
    };

    res.status(200).json(rewardsData);
  } catch (error) {
    console.error('Erreur dans getUserRewards:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const claimAchievement = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== 'ok') {
      return res.status(500).json({ message: 'Erreur de connexion à la base de données' });
    }

    const userId = req.user?.id;
    const { defiId } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Utilisateur non connecté' });
    }
    if (!defiId || !mongoose.Types.ObjectId.isValid(defiId)) {
      return res.status(400).json({ message: 'ID de défi invalide' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId);
    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    if (!utilisateur.actif) {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    const defi = await DefiSchemaModel.findById(defiId);
    if (!defi) {
      return res.status(404).json({ message: 'Défi non trouvé' });
    }

    const achievement = utilisateur.achievements.find(a => a.defiId.toString() === defiId);
    if (!achievement) {
      return res.status(404).json({ message: 'Achievement non trouvé' });
    }

    if (!achievement.completed) {
      return res.status(400).json({ message: 'Achievement non complété' });
    }

    if (achievement.claimed) {
      return res.status(400).json({ message: 'Récompense déjà réclamée' });
    }

    utilisateur.pointsFidélité += defi.points;
    achievement.claimed = true;
    achievement.completedAt = new Date();

    await utilisateur.save();
    res.status(200).json({ message: 'Récompense réclamée avec succès', pointsAjoutés: defi.points });
  } catch (error) {
    console.error('Erreur dans claimAchievement:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
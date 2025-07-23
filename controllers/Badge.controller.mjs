import mongoose from 'mongoose';
import { MongoConnected } from '../Database/database.mjs';
import { BadgeSchemaModel } from '../models/Badge.model.mjs';
import { UtilisateurSchemaModel } from '../Models/utilisateur.model.mjs';
import cloudinary from '../config/cloudinary.mjs';

export const getBadges = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== 'ok') {
      return res.status(500).json({ message: 'Erreur de connexion à la base de données' });
    }

    const { search } = req.query;
    const query = {};
    if (search) query.nom = { $regex: search, $options: 'i' };

    const badges = await BadgeSchemaModel.find(query).lean();
    res.status(200).json(badges);
  } catch (error) {
    console.error('Erreur dans getBadges:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const getBadgeById = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== 'ok') {
      return res.status(500).json({ message: 'Erreur de connexion à la base de données' });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de badge invalide' });
    }
    const badge = await BadgeSchemaModel.findById(id).lean();
    if (!badge) return res.status(404).json({ message: 'Badge non trouvé' });
    res.status(200).json(badge);
  } catch (error) {
    console.error('Erreur dans getBadgeById:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const createBadge = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== 'ok') {
      return res.status(500).json({ message: 'Erreur de connexion à la base de données' });
    }

    const userId = req.user?.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Utilisateur non connecté' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId).lean();
    if (!utilisateur || utilisateur.rôle !== 'admin' || !utilisateur.actif) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const { nom, description, icon, color, rarity, niveau } = req.body;
    const file = req.file;

    if (!nom || !description || !icon || !color || !rarity || !niveau) {
      return res.status(400).json({ message: 'Champs requis manquants' });
    }

    let image = '';
    if (file) {
      const result = await cloudinary.uploader.upload(file.path);
      image = result.secure_url;
    }

    const badge = new BadgeSchemaModel({
      nom,
      description,
      image,
      icon,
      color,
      rarity,
      niveau,
    });

    await badge.save();
    res.status(201).json({ message: 'Badge créé', badge });
  } catch (error) {
    console.error('Erreur dans createBadge:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
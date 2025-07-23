import mongoose from 'mongoose';
import { MongoConnected } from "../Database/database.mjs";
import { UtilisateurSchemaModel } from "../Models/utilisateur.model.mjs";
import { ProduitSchemaModel } from "../models/Produit.model.mjs";

export const GetUtilisateurConnecte = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== "ok") {
      return res.status(500).json({ message: "Erreur de connexion à la base de données" });
    }

    const userId = req.user?.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: "Token invalide ou manquant" });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId)
      .select("-motDePasse")
      .populate('favoris', 'nom prix discount tailles')
      .populate('badges.badgeId', 'nom description image icon color rarity niveau')
      .populate('achievements.defiId', 'nom description points critere')
      .lean();
    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    if (!utilisateur.actif) {
      return res.status(403).json({ message: "Compte inactif" });
    }

    res.status(200).json({
      id: utilisateur._id,
      nom: utilisateur.nom,
      email: utilisateur.email,
      typeConnexion: utilisateur.typeConnexion,
      uidFirebase: utilisateur.uidFirebase || null,
      rôle: utilisateur.rôle,
      adresse: utilisateur.adresse || { rue: "", ville: "", codePostal: "", pays: "" },
      telephone: utilisateur.telephone || "",
      photo: utilisateur.photo || null,
      favoris: utilisateur.favoris || [],
      pointsFidélité: utilisateur.pointsFidélité,
      codeParrainage: utilisateur.codeParrainage,
      personnesParrainees: utilisateur.personnesParrainees || [],
      pointsParrainage: utilisateur.pointsParrainage,
      totalEarned: utilisateur.totalEarned || 0,
      reductionAppliquée: utilisateur.reductionAppliquée || 0,
      badges: utilisateur.badges || [],
      achievements: utilisateur.achievements || [],
      streaks: utilisateur.streaks || {
        currentLoginStreak: 0,
        longestLoginStreak: 0,
        lastLoginDate: null,
      },
      createdAt: utilisateur.createdAt,
      updatedAt: utilisateur.updatedAt,
    });
  } catch (error) {
    console.error("Erreur dans GetUtilisateurConnecte:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

export const UpdateUtilisateur = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== "ok") {
      return res.status(500).json({ message: "Erreur de connexion à la base de données" });
    }

    const userId = req.user?.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: "Token invalide ou manquant" });
    }

    const { nom, email, telephone, adresse, photo } = req.body;
    const updates = {};
    if (nom) updates.nom = nom;
    if (email) updates.email = email;
    if (telephone) updates.telephone = telephone;
    if (adresse) updates.adresse = adresse;
    if (photo) updates.photo = photo;

    const utilisateur = await UtilisateurSchemaModel.findById(userId);
    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    if (!utilisateur.actif) {
      return res.status(403).json({ message: "Compte inactif" });
    }

    Object.assign(utilisateur, updates);
    await utilisateur.save();

    const updatedUtilisateur = await UtilisateurSchemaModel.findById(userId)
      .select("-motDePasse")
      .populate('favoris', 'nom prix discount tailles')
      .populate('badges.badgeId', 'nom description image icon color rarity niveau')
      .populate('achievements.defiId', 'nom description points critere')
      .lean();

    res.status(200).json({
      message: "Utilisateur mis à jour",
      utilisateur: {
        id: updatedUtilisateur._id,
        nom: updatedUtilisateur.nom,
        email: updatedUtilisateur.email,
        typeConnexion: updatedUtilisateur.typeConnexion,
        uidFirebase: updatedUtilisateur.uidFirebase || null,
        rôle: updatedUtilisateur.rôle,
        adresse: updatedUtilisateur.adresse || { rue: "", ville: "", codePostal: "", pays: "" },
        telephone: updatedUtilisateur.telephone || "",
        photo: updatedUtilisateur.photo || null,
        favoris: updatedUtilisateur.favoris || [],
        pointsFidélité: updatedUtilisateur.pointsFidélité,
        codeParrainage: updatedUtilisateur.codeParrainage,
        personnesParrainees: updatedUtilisateur.personnesParrainees || [],
        pointsParrainage: updatedUtilisateur.pointsParrainage,
        totalEarned: updatedUtilisateur.totalEarned || 0,
        reductionAppliquée: updatedUtilisateur.reductionAppliquée || 0,
        badges: updatedUtilisateur.badges || [],
        achievements: updatedUtilisateur.achievements || [],
        streaks: updatedUtilisateur.streaks || {
          currentLoginStreak: 0,
          longestLoginStreak: 0,
          lastLoginDate: null,
        },
        createdAt: updatedUtilisateur.createdAt,
        updatedAt: updatedUtilisateur.updatedAt,
      },
    });
  } catch (error) {
    console.error("Erreur dans UpdateUtilisateur:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

export const AddFavori = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== "ok") {
      return res.status(500).json({ message: "Erreur de connexion à la base de données" });
    }

    const userId = req.user?.id;
    const { produitId } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: "Token invalide ou manquant" });
    }
    if (!produitId || !mongoose.Types.ObjectId.isValid(produitId)) {
      return res.status(400).json({ message: "ID de produit invalide" });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId);
    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    if (!utilisateur.actif) {
      return res.status(403).json({ message: "Compte inactif" });
    }

    const produit = await ProduitSchemaModel.findById(produitId).lean();
    if (!produit) {
      return res.status(404).json({ message: "Produit non trouvé" });
    }

    if (!utilisateur.favoris.includes(produitId)) {
      utilisateur.favoris.push(produitId);
      await utilisateur.save();
    }

    const updatedUtilisateur = await UtilisateurSchemaModel.findById(userId)
      .select("-motDePasse")
      .populate('favoris', 'nom prix discount tailles')
      .populate('badges.badgeId', 'nom description image icon color rarity niveau')
      .populate('achievements.defiId', 'nom description points critere')
      .lean();

    res.status(200).json({
      message: "Produit ajouté aux favoris",
      utilisateur: {
        id: updatedUtilisateur._id,
        nom: updatedUtilisateur.nom,
        email: updatedUtilisateur.email,
        typeConnexion: updatedUtilisateur.typeConnexion,
        uidFirebase: updatedUtilisateur.uidFirebase || null,
        rôle: updatedUtilisateur.rôle,
        adresse: updatedUtilisateur.adresse || { rue: "", ville: "", codePostal: "", pays: "" },
        telephone: updatedUtilisateur.telephone || "",
        photo: updatedUtilisateur.photo || null,
        favoris: updatedUtilisateur.favoris || [],
        pointsFidélité: updatedUtilisateur.pointsFidélité,
        codeParrainage: updatedUtilisateur.codeParrainage,
        personnesParrainees: updatedUtilisateur.personnesParrainees || [],
        pointsParrainage: updatedUtilisateur.pointsParrainage,
        totalEarned: updatedUtilisateur.totalEarned || 0,
        reductionAppliquée: updatedUtilisateur.reductionAppliquée || 0,
        badges: updatedUtilisateur.badges || [],
        achievements: updatedUtilisateur.achievements || [],
        streaks: updatedUtilisateur.streaks || {
          currentLoginStreak: 0,
          longestLoginStreak: 0,
          lastLoginDate: null,
        },
        createdAt: updatedUtilisateur.createdAt,
        updatedAt: updatedUtilisateur.updatedAt,
      },
    });
  } catch (error) {
    console.error("Erreur dans AddFavori:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

export const RemoveFavori = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== "ok") {
      return res.status(500).json({ message: "Erreur de connexion à la base de données" });
    }

    const userId = req.user?.id;
    const { produitId } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: "Token invalide ou manquant" });
    }
    if (!produitId || !mongoose.Types.ObjectId.isValid(produitId)) {
      return res.status(400).json({ message: "ID de produit invalide" });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId);
    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    if (!utilisateur.actif) {
      return res.status(403).json({ message: "Compte inactif" });
    }

    utilisateur.favoris = utilisateur.favoris.filter(id => id.toString() !== produitId);
    await utilisateur.save();

    const updatedUtilisateur = await UtilisateurSchemaModel.findById(userId)
      .select("-motDePasse")
      .populate('favoris', 'nom prix discount tailles')
      .populate('badges.badgeId', 'nom description image icon color rarity niveau')
      .populate('achievements.defiId', 'nom description points critere')
      .lean();

    res.status(200).json({
      message: "Produit retiré des favoris",
      utilisateur: {
        id: updatedUtilisateur._id,
        nom: updatedUtilisateur.nom,
        email: updatedUtilisateur.email,
        typeConnexion: updatedUtilisateur.typeConnexion,
        uidFirebase: updatedUtilisateur.uidFirebase || null,
        rôle: updatedUtilisateur.rôle,
        adresse: updatedUtilisateur.adresse || { rue: "", ville: "", codePostal: "", pays: "" },
        telephone: updatedUtilisateur.telephone || "",
        photo: updatedUtilisateur.photo || null,
        favoris: updatedUtilisateur.favoris || [],
        pointsFidélité: updatedUtilisateur.pointsFidélité,
        codeParrainage: updatedUtilisateur.codeParrainage,
        personnesParrainees: updatedUtilisateur.personnesParrainees || [],
        pointsParrainage: updatedUtilisateur.pointsParrainage,
        totalEarned: updatedUtilisateur.totalEarned || 0,
        reductionAppliquée: updatedUtilisateur.reductionAppliquée || 0,
        badges: updatedUtilisateur.badges || [],
        achievements: updatedUtilisateur.achievements || [],
        streaks: updatedUtilisateur.streaks || {
          currentLoginStreak: 0,
          longestLoginStreak: 0,
          lastLoginDate: null,
        },
        createdAt: updatedUtilisateur.createdAt,
        updatedAt: updatedUtilisateur.updatedAt,
      },
    });
  } catch (error) {
    console.error("Erreur dans RemoveFavori:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
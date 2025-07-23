import mongoose from 'mongoose';
import { MongoConnected } from "../Database/database.mjs";
import { UtilisateurSchemaModel } from "../Models/utilisateur.model.mjs";
import { ProduitSchemaModel } from "../models/Produit.model.mjs";
import { convertCurrency } from '../config/exchangerate.mjs';
import { calculerNiveau } from '../utils/recompenses.mjs';

export const getFavoris = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== "ok") {
      return res.status(500).json({ message: "Erreur de connexion à la base de données" });
    }

    const userId = req.user?.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: "Utilisateur non connecté" });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId)
      .select('favoris pointsFidélité createdAt updatedAt')
      .populate('favoris', 'nom prix discount tailles')
      .lean();
    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    if (!utilisateur.actif) {
      return res.status(403).json({ message: "Compte inactif" });
    }

    const reduction = calculerNiveau(utilisateur.pointsFidélité).recompenses.reduction;
    const favorisWithDetails = {
      utilisateur: userId,
      produits: await Promise.all(
        (utilisateur.favoris || []).map(async (produit) => {
          if (!produit) return null;
          const prixXOF = produit.prix * (1 - (produit.discount || 0) / 100);
          const prixXOFApresReduction = prixXOF * (1 - reduction / 100);
          return {
            ...produit,
            price: {
              XOF: prixXOFApresReduction,
              EUR: await convertCurrency(prixXOFApresReduction, 'XOF', 'EUR'),
              USD: await convertCurrency(prixXOFApresReduction, 'XOF', 'USD'),
            },
          };
        })
      ).then(produits => produits.filter(p => p !== null)),
      reductionAppliquée: reduction,
      createdAt: utilisateur.createdAt,
      updatedAt: utilisateur.updatedAt,
    };

    res.status(200).json(favorisWithDetails);
  } catch (error) {
    console.error("Erreur dans getFavoris:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

export const addFavori = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== "ok") {
      return res.status(500).json({ message: "Erreur de connexion à la base de données" });
    }

    const userId = req.user?.id;
    const { produitId } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: "Utilisateur non connecté" });
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

    if (utilisateur.favoris.includes(produitId)) {
      return res.status(400).json({ message: "Produit déjà dans les favoris" });
    }

    utilisateur.favoris.push(produitId);
    await utilisateur.save();

    const updatedUtilisateur = await UtilisateurSchemaModel.findById(userId)
      .select('favoris pointsFidélité createdAt updatedAt')
      .populate('favoris', 'nom prix discount tailles')
      .lean();

    const reduction = calculerNiveau(updatedUtilisateur.pointsFidélité).recompenses.reduction;
    const favorisWithDetails = {
      utilisateur: userId,
      produits: await Promise.all(
        (updatedUtilisateur.favoris || []).map(async (produit) => {
          if (!produit) return null;
          const prixXOF = produit.prix * (1 - (produit.discount || 0) / 100);
          const prixXOFApresReduction = prixXOF * (1 - reduction / 100);
          return {
            ...produit,
            price: {
              XOF: prixXOFApresReduction,
              EUR: await convertCurrency(prixXOFApresReduction, 'XOF', 'EUR'),
              USD: await convertCurrency(prixXOFApresReduction, 'XOF', 'USD'),
            },
          };
        })
      ).then(produits => produits.filter(p => p !== null)),
      reductionAppliquée: reduction,
      createdAt: updatedUtilisateur.createdAt,
      updatedAt: updatedUtilisateur.updatedAt,
    };

    res.status(200).json({ message: "Produit ajouté aux favoris", favoris: favorisWithDetails });
  } catch (error) {
    console.error("Erreur dans addFavori:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

export const removeFavori = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== "ok") {
      return res.status(500).json({ message: "Erreur de connexion à la base de données" });
    }

    const userId = req.user?.id;
    const { produitId } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: "Utilisateur non connecté" });
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

    const produitIndex = utilisateur.favoris.findIndex(p => p.toString() === produitId);
    if (produitIndex < 0) {
      return res.status(404).json({ message: "Produit non trouvé dans les favoris" });
    }

    utilisateur.favoris.splice(produitIndex, 1);
    await utilisateur.save();

    const updatedUtilisateur = await UtilisateurSchemaModel.findById(userId)
      .select('favoris pointsFidélité createdAt updatedAt')
      .populate('favoris', 'nom prix discount tailles')
      .lean();

    const reduction = calculerNiveau(updatedUtilisateur.pointsFidélité).recompenses.reduction;
    const favorisWithDetails = {
      utilisateur: userId,
      produits: await Promise.all(
        (updatedUtilisateur.favoris || []).map(async (produit) => {
          if (!produit) return null;
          const prixXOF = produit.prix * (1 - (produit.discount || 0) / 100);
          const prixXOFApresReduction = prixXOF * (1 - reduction / 100);
          return {
            ...produit,
            price: {
              XOF: prixXOFApresReduction,
              EUR: await convertCurrency(prixXOFApresReduction, 'XOF', 'EUR'),
              USD: await convertCurrency(prixXOFApresReduction, 'XOF', 'USD'),
            },
          };
        })
      ).then(produits => produits.filter(p => p !== null)),
      reductionAppliquée: reduction,
      createdAt: updatedUtilisateur.createdAt,
      updatedAt: updatedUtilisateur.updatedAt,
    };

    res.status(200).json({ message: "Produit supprimé des favoris", favoris: favorisWithDetails });
  } catch (error) {
    console.error("Erreur dans removeFavori:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
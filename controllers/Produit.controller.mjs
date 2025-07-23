import mongoose from 'mongoose';
import { MongoConnected } from '../Database/database.mjs';
import { ProduitSchemaModel } from '../models/Produit.model.mjs';
import { UtilisateurSchemaModel } from '../Models/utilisateur.model.mjs';
import { CategorieSchemaModel } from '../models/Categorie.model.mjs';
import { EquipeSchemaModel } from '../models/Equipe.model.mjs';
import { LigueSchemaModel } from '../models/Ligue.model.mjs';
import cloudinary from '../config/cloudinary.mjs';
import { convertCurrency } from '../config/exchangerate.mjs';
import { calculerNiveau } from '../utils/recompenses.mjs';

async function buildProduitDetails(produit, reduction = 0) {
  const prixXOF = produit.prix * (1 - (produit.discount || 0) / 100);
  const prixXOFApresReduction = prixXOF * (1 - reduction / 100);
  return {
    ...produit,
    price: {
      XOF: prixXOFApresReduction,
      EUR: await convertCurrency(prixXOFApresReduction, 'XOF', 'EUR'),
      USD: await convertCurrency(prixXOFApresReduction, 'XOF', 'USD'),
    },
    reductionAppliquée: reduction,
  };
}

export const addProduit = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== "ok") {
      return res.status(500).json({ message: "Erreur de connexion à la base de données" });
    }

    const {
      titre,
      description,
      prix,
      catégorie,
      équipe,
      ligue,
      stock,
      tailles,
      season,
      isHome,
      discount,
      enVedette,
    } = req.body;
    const files = req.files;
    const userId = req.user?.id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Utilisateur non connecté' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId).lean();
    if (!utilisateur || utilisateur.rôle !== 'admin' || !utilisateur.actif) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    if (!titre || !prix || !catégorie || !équipe || !ligue || !stock || !tailles) {
      return res.status(400).json({ message: 'Champs requis manquants' });
    }

    // Validation des références
    if (!mongoose.Types.ObjectId.isValid(catégorie)) {
      return res.status(400).json({ message: 'ID de catégorie invalide' });
    }
    if (!mongoose.Types.ObjectId.isValid(équipe)) {
      return res.status(400).json({ message: 'ID d\'équipe invalide' });
    }
    if (!mongoose.Types.ObjectId.isValid(ligue)) {
      return res.status(400).json({ message: 'ID de ligue invalide' });
    }

    const [categorieExists, equipeExists, ligueExists] = await Promise.all([
      CategorieSchemaModel.findById(catégorie).lean(),
      EquipeSchemaModel.findById(équipe).lean(),
      LigueSchemaModel.findById(ligue).lean(),
    ]);

    if (!categorieExists) return res.status(404).json({ message: 'Catégorie non trouvée' });
    if (!equipeExists) return res.status(404).json({ message: 'Équipe non trouvée' });
    if (!ligueExists) return res.status(404).json({ message: 'Ligue non trouvée' });

    let images = [];
    if (files && files.length > 0) {
      images = await Promise.all(
        files.map(async file => {
          const result = await cloudinary.uploader.upload(file.path);
          return result.secure_url;
        })
      );
    }

    const produit = new ProduitSchemaModel({
      titre,
      description,
      prix: Number(prix),
      catégorie,
      équipe,
      ligue,
      stock: Number(stock),
      tailles: Array.isArray(tailles) ? tailles : JSON.parse(tailles),
      images,
      season,
      isHome: Boolean(isHome),
      discount: Number(discount) || 0,
      enVedette: Boolean(enVedette),
      avis: [],
    });

    await produit.save();
    const produitWithPrice = await buildProduitDetails(produit.toObject(), 0);

    res.status(201).json({ message: 'Produit ajouté', produit: produitWithPrice });
  } catch (error) {
    console.error('Erreur dans addProduit:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const getProduits = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== "ok") {
      return res.status(500).json({ message: "Erreur de connexion à la base de données" });
    }

    const {
      search,
      ligue,
      équipe,
      catégorie,
      minPrice,
      maxPrice,
      sort,
      enVedette,
      discount,
      minStock,
    } = req.query;
    const userId = req.user?.id;

    let reduction = 0;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      const utilisateur = await UtilisateurSchemaModel.findById(userId).lean();
      if (utilisateur && utilisateur.actif) {
        reduction = calculerNiveau(utilisateur.pointsFidélité).recompenses.reduction;
      }
    }

    const query = {};
    if (search) query.titre = { $regex: search, $options: 'i' };
    if (ligue && ligue !== 'all') query.ligue = ligue;
    if (équipe && équipe !== 'all') query.équipe = équipe;
    if (catégorie && catégorie !== 'all') query.catégorie = catégorie;
    if (minStock) query.stock = { $gte: Number(minStock) };
    if (enVedette === 'true') query.enVedette = true;
    if (discount === 'true') query.discount = { $gt: 0 };
    if (minPrice || maxPrice) {
      query.prix = { $gte: Number(minPrice) || 0, $lte: Number(maxPrice) || Infinity };
    }

    const sortOptions = {};
    if (sort === 'newest') sortOptions.createdAt = -1;
    else if (sort === 'price-asc') sortOptions.prix = 1;
    else if (sort === 'price-desc') sortOptions.prix = -1;

    const produits = await ProduitSchemaModel.find(query).sort(sortOptions).lean();

    const produitsWithPrices = await Promise.all(
      produits.map(async produit => await buildProduitDetails(produit, reduction))
    );

    res.status(200).json(produitsWithPrices);
  } catch (error) {
    console.error('Erreur dans getProduits:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const getProduitById = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== "ok") {
      return res.status(500).json({ message: "Erreur de connexion à la base de données" });
    }

    const { id } = req.params;
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de produit invalide' });
    }

    let reduction = 0;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      const utilisateur = await UtilisateurSchemaModel.findById(userId).lean();
      if (utilisateur && utilisateur.actif) {
        reduction = calculerNiveau(utilisateur.pointsFidélité).recompenses.reduction;
      }
    }

    const produit = await ProduitSchemaModel.findById(id).lean();
    if (!produit) return res.status(404).json({ message: 'Produit non trouvé' });

    const produitWithPrice = await buildProduitDetails(produit, reduction);

    res.status(200).json(produitWithPrice);
  } catch (error) {
    console.error('Erreur dans getProduitById:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const updateProduit = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== "ok") {
      return res.status(500).json({ message: "Erreur de connexion à la base de données" });
    }

    const { id } = req.params;
    const {
      titre,
      description,
      prix,
      catégorie,
      équipe,
      ligue,
      stock,
      tailles,
      season,
      isHome,
      discount,
      enVedette,
    } = req.body;
    const files = req.files;
    const userId = req.user?.id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Utilisateur non connecté' });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de produit invalide' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId).lean();
    if (!utilisateur || utilisateur.rôle !== 'admin' || !utilisateur.actif) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    // Validation des références
    if (catégorie && !mongoose.Types.ObjectId.isValid(catégorie)) {
      return res.status(400).json({ message: 'ID de catégorie invalide' });
    }
    if (équipe && !mongoose.Types.ObjectId.isValid(équipe)) {
      return res.status(400).json({ message: 'ID d\'équipe invalide' });
    }
    if (ligue && !mongoose.Types.ObjectId.isValid(ligue)) {
      return res.status(400).json({ message: 'ID de ligue invalide' });
    }

    const [categorieExists, equipeExists, ligueExists] = await Promise.all([
      catégorie ? CategorieSchemaModel.findById(catégorie).lean() : true,
      équipe ? EquipeSchemaModel.findById(équipe).lean() : true,
      ligue ? LigueSchemaModel.findById(ligue).lean() : true,
    ]);

    if (catégorie && !categorieExists) return res.status(404).json({ message: 'Catégorie non trouvée' });
    if (équipe && !equipeExists) return res.status(404).json({ message: 'Équipe non trouvée' });
    if (ligue && !ligueExists) return res.status(404).json({ message: 'Ligue non trouvée' });

    const produit = await ProduitSchemaModel.findById(id);
    if (!produit) return res.status(404).json({ message: 'Produit non trouvé' });

    // Supprimer les anciennes images si de nouvelles sont fournies
    let images = produit.images;
    if (files && files.length > 0) {
      if (produit.images.length > 0) {
        await Promise.all(
          produit.images.map(async url => {
            const publicId = url.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(publicId);
          })
        );
      }
      images = await Promise.all(
        files.map(async file => {
          const result = await cloudinary.uploader.upload(file.path);
          return result.secure_url;
        })
      );
    }

    // Mettre à jour les champs
    produit.titre = titre || produit.titre;
    produit.description = description || produit.description;
    produit.prix = prix ? Number(prix) : produit.prix;
    produit.catégorie = catégorie || produit.catégorie;
    produit.équipe = équipe || produit.équipe;
    produit.ligue = ligue || produit.ligue;
    produit.stock = stock !== undefined ? Number(stock) : produit.stock;
    produit.tailles = tailles ? (Array.isArray(tailles) ? tailles : JSON.parse(tailles)) : produit.tailles;
    produit.images = images;
    produit.season = season || produit.season;
    produit.isHome = isHome !== undefined ? Boolean(isHome) : produit.isHome;
    produit.discount = discount !== undefined ? Number(discount) : produit.discount;
    produit.enVedette = enVedette !== undefined ? Boolean(enVedette) : produit.enVedette;

    await produit.save();
    const produitWithPrice = await buildProduitDetails(produit.toObject(), 0);

    res.status(200).json({ message: 'Produit mis à jour', produit: produitWithPrice });
  } catch (error) {
    console.error('Erreur dans updateProduit:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const deleteProduit = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== "ok") {
      return res.status(500).json({ message: "Erreur de connexion à la base de données" });
    }

    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Utilisateur non connecté' });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de produit invalide' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId).lean();
    if (!utilisateur || utilisateur.rôle !== 'admin' || !utilisateur.actif) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const produit = await ProduitSchemaModel.findById(id);
    if (!produit) return res.status(404).json({ message: 'Produit non trouvé' });

    // Supprimer les images de Cloudinary
    if (produit.images.length > 0) {
      await Promise.all(
        produit.images.map(async url => {
          const publicId = url.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(publicId);
        })
      );
    }

    // Supprimer le produit des favoris des utilisateurs
    await UtilisateurSchemaModel.updateMany(
      { favoris: id },
      { $pull: { favoris: id } }
    );

    await ProduitSchemaModel.findByIdAndDelete(id);
    res.status(200).json({ message: 'Produit supprimé' });
  } catch (error) {
    console.error('Erreur dans deleteProduit:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
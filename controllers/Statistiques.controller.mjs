import mongoose from 'mongoose';
import { MongoConnected } from '../Database/database.mjs';
import { ObjectifVenteSchemaModel } from '../Models/objectifs_vente.model.mjs';
import { CommandeSchemaModel } from '../models/Commande.model.mjs';
import { UtilisateurSchemaModel } from '../Models/utilisateur.model.mjs';
import { ProduitSchemaModel } from '../models/Produit.model.mjs';
import { DefiSchemaModel } from '../Models/defi.model.mjs';
import { convertCurrency } from '../config/exchangerate.mjs';

export const CreerObjectifVente = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== 'ok') {
      return res.status(500).json({ message: 'Erreur de connexion à la base de données' });
    }

    const userId = req.user?.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Token invalide ou manquant' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId);
    if (!utilisateur || utilisateur.rôle !== 'admin') {
      return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    }

    const { type, montant, dateDebut, dateFin, categorie, equipe, ligue, utilisateurCible } = req.body;
    if (!type || !montant || !dateDebut || !dateFin) {
      return res.status(400).json({ message: 'Type, montant, dateDebut et dateFin sont requis' });
    }

    if (montant < 0) {
      return res.status(400).json({ message: 'Le montant ne peut pas être négatif' });
    }

    if (new Date(dateDebut) >= new Date(dateFin)) {
      return res.status(400).json({ message: 'La date de début doit être antérieure à la date de fin' });
    }

    if (type === 'categorie' && (!categorie || !mongoose.Types.ObjectId.isValid(categorie))) {
      return res.status(400).json({ message: 'ID de catégorie invalide' });
    }
    if (type === 'equipe' && (!equipe || !mongoose.Types.ObjectId.isValid(equipe))) {
      return res.status(400).json({ message: 'ID d\'équipe invalide' });
    }
    if (type === 'ligue' && (!ligue || !mongoose.Types.ObjectId.isValid(ligue))) {
      return res.status(400).json({ message: 'ID de ligue invalide' });
    }
    if (type === 'utilisateur' && (!utilisateurCible || !mongoose.Types.ObjectId.isValid(utilisateurCible))) {
      return res.status(400).json({ message: 'ID d\'utilisateur cible invalide' });
    }

    const objectif = new ObjectifVenteSchemaModel({
      type,
      montant,
      dateDebut,
      dateFin,
      creePar: userId,
      categorie: type === 'categorie' ? categorie : undefined,
      equipe: type === 'equipe' ? equipe : undefined,
      ligue: type === 'ligue' ? ligue : undefined,
      utilisateurCible: type === 'utilisateur' ? utilisateurCible : undefined,
    });

    await objectif.save();
    res.status(201).json({ message: 'Objectif de vente créé avec succès', objectif });
  } catch (error) {
    console.error('Erreur dans CreerObjectifVente:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const ObtenirObjectifsVente = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== 'ok') {
      return res.status(500).json({ message: 'Erreur de connexion à la base de données' });
    }

    const userId = req.user?.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Token invalide ou manquant' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId);
    if (!utilisateur || utilisateur.rôle !== 'admin') {
      return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    }

    const objectifs = await ObjectifVenteSchemaModel.find()
      .populate('creePar', 'nom email')
      .populate('categorie', 'nom')
      .populate('equipe', 'nom')
      .populate('ligue', 'nom')
      .populate('utilisateurCible', 'nom email')
      .lean();

    res.status(200).json(objectifs);
  } catch (error) {
    console.error('Erreur dans ObtenirObjectifsVente:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const ObtenirStatistiques = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== 'ok') {
      return res.status(500).json({ message: 'Erreur de connexion à la base de données' });
    }

    const userId = req.user?.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Token invalide ou manquant' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId);
    if (!utilisateur || utilisateur.rôle !== 'admin') {
      return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    }

    const dateDebut = req.query.dateDebut ? new Date(req.query.dateDebut) : new Date(0);
    const dateFin = req.query.dateFin ? new Date(req.query.dateFin) : new Date();

    // Statistiques des commandes
    const commandes = await CommandeSchemaModel.find({
      createdAt: { $gte: dateDebut, $lte: dateFin }
    }).lean();

    const revenuTotal = commandes.reduce((sum, cmd) => sum + cmd.prixTotal, 0);
    const commandesParStatut = {
      enAttente: commandes.filter(cmd => cmd.statut === 'en attente').length,
      payee: commandes.filter(cmd => cmd.statut === 'payée').length,
      expediee: commandes.filter(cmd => cmd.statut === 'expédiée').length,
      livree: commandes.filter(cmd => cmd.statut === 'livrée').length,
      annulee: commandes.filter(cmd => cmd.statut === 'annulée').length,
    };

    // Statistiques des produits
    const produits = await ProduitSchemaModel.find()
      .populate('categorie', 'nom')
      .populate('equipe', 'nom')
      .populate('ligue', 'nom')
      .lean();

    const ventesParCategorie = await CommandeSchemaModel.aggregate([
      { $match: { createdAt: { $gte: dateDebut, $lte: dateFin } } },
      { $unwind: '$articles' },
      {
        $lookup: {
          from: 'produits',
          localField: 'articles.produit',
          foreignField: '_id',
          as: 'produitInfo'
        }
      },
      { $unwind: '$produitInfo' },
      {
        $group: {
          _id: '$produitInfo.categorie',
          totalVentes: { $sum: '$articles.quantite' },
          revenu: { $sum: { $multiply: ['$articles.quantite', '$articles.prixUnitaire'] } }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categorieInfo'
        }
      },
      { $unwind: '$categorieInfo' },
      {
        $project: {
          categorie: '$categorieInfo.nom',
          totalVentes: 1,
          revenu: 1
        }
      }
    ]);

    const ventesParEquipe = await CommandeSchemaModel.aggregate([
      { $match: { createdAt: { $gte: dateDebut, $lte: dateFin } } },
      { $unwind: '$articles' },
      {
        $lookup: {
          from: 'produits',
          localField: 'articles.produit',
          foreignField: '_id',
          as: 'produitInfo'
        }
      },
      { $unwind: '$produitInfo' },
      {
        $group: {
          _id: '$produitInfo.equipe',
          totalVentes: { $sum: '$articles.quantite' },
          revenu: { $sum: { $multiply: ['$articles.quantite', '$articles.prixUnitaire'] } }
        }
      },
      {
        $lookup: {
          from: 'equipes',
          localField: '_id',
          foreignField: '_id',
          as: 'equipeInfo'
        }
      },
      { $unwind: '$equipeInfo' },
      {
        $project: {
          equipe: '$equipeInfo.nom',
          totalVentes: 1,
          revenu: 1
        }
      }
    ]);

    const ventesParLigue = await CommandeSchemaModel.aggregate([
      { $match: { createdAt: { $gte: dateDebut, $lte: dateFin } } },
      { $unwind: '$articles' },
      {
        $lookup: {
          from: 'produits',
          localField: 'articles.produit',
          foreignField: '_id',
          as: 'produitInfo'
        }
      },
      { $unwind: '$produitInfo' },
      {
        $group: {
          _id: '$produitInfo.ligue',
          totalVentes: { $sum: '$articles.quantite' },
          revenu: { $sum: { $multiply: ['$articles.quantite', '$articles.prixUnitaire'] } }
        }
      },
      {
        $lookup: {
          from: 'ligues',
          localField: '_id',
          foreignField: '_id',
          as: 'ligueInfo'
        }
      },
      { $unwind: '$ligueInfo' },
      {
        $project: {
          ligue: '$ligueInfo.nom',
          totalVentes: 1,
          revenu: 1
        }
      }
    ]);

    // Statistiques des utilisateurs
    const utilisateurs = await UtilisateurSchemaModel.find({
      createdAt: { $gte: dateDebut, $lte: dateFin }
    }).lean();

    const totalUtilisateurs = await UtilisateurSchemaModel.countDocuments();
    const nouveauxUtilisateurs = utilisateurs.length;
    const parrainages = await UtilisateurSchemaModel.aggregate([
      {
        $match: { personnesParrainees: { $ne: [] } }
      },
      {
        $group: {
          _id: null,
          totalParrainages: { $sum: { $size: '$personnesParrainees' } },
          pointsParrainage: { $sum: '$pointsParrainage' }
        }
      }
    ]);

    // Statistiques des défis
    const defis = await DefiSchemaModel.find({ actif: true }).lean();
    const defisCompletes = await UtilisateurSchemaModel.aggregate([
      { $match: { 'achievements.completed': true } },
      { $unwind: '$achievements' },
      { $match: { 'achievements.completed': true } },
      {
        $group: {
          _id: '$achievements.defiId',
          totalCompletions: { $sum: 1 },
          pointsDistribues: { $sum: '$achievements.points' }
        }
      },
      {
        $lookup: {
          from: 'defis',
          localField: '_id',
          foreignField: '_id',
          as: 'defiInfo'
        }
      },
      { $unwind: '$defiInfo' },
      {
        $project: {
          nom: '$defiInfo.nom',
          totalCompletions: 1,
          pointsDistribues: 1
        }
      }
    ]);

    // Conversion du revenu en différentes devises
    const revenuEUR = await convertCurrency(revenuTotal, 'XOF', 'EUR');
    const revenuUSD = await convertCurrency(revenuTotal, 'XOF', 'USD');

    res.status(200).json({
      revenus: {
        XOF: revenuTotal,
        EUR: revenuEUR,
        USD: revenuUSD
      },
      commandes: {
        total: commandes.length,
        parStatut: commandesParStatut
      },
      produits: {
        total: produits.length,
        ventesParCategorie,
        ventesParEquipe,
        ventesParLigue
      },
      utilisateurs: {
        total: totalUtilisateurs,
        nouveaux: nouveauxUtilisateurs,
        parrainages: parrainages[0]?.totalParrainages || 0,
        pointsParrainageDistribues: parrainages[0]?.pointsParrainage || 0
      },
      defis: {
        total: defis.length,
        completions: defisCompletes,
        pointsDistribues: defisCompletes.reduce((sum, d) => sum + d.pointsDistribues, 0)
      },
      periode: {
        debut: dateDebut.toISOString(),
        fin: dateFin.toISOString()
      }
    });
  } catch (error) {
    console.error('Erreur dans ObtenirStatistiques:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const ObtenirCommandesRecentes = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== 'ok') {
      return res.status(500).json({ message: 'Erreur de connexion à la base de données' });
    }

    const userId = req.user?.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Token invalide ou manquant' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId);
    if (!utilisateur || utilisateur.rôle !== 'admin') {
      return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    }

    const limit = parseInt(req.query.limit) || 10;
    const commandes = await CommandeSchemaModel.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('utilisateur', 'nom email')
      .populate('articles.produit', 'titre prix')
      .lean();

    const commandesFormatees = await Promise.all(commandes.map(async (cmd) => {
      const prixTotalEUR = await convertCurrency(cmd.prixTotal, 'XOF', 'EUR');
      const prixTotalUSD = await convertCurrency(cmd.prixTotal, 'XOF', 'USD');
      return {
        _id: cmd._id.toString(),
        utilisateur: cmd.utilisateur,
        articles: cmd.articles.map(art => ({
          produit: art.produit,
          quantite: art.quantite,
          prixUnitaire: art.prixUnitaire
        })),
        prixTotal: {
          XOF: cmd.prixTotal,
          EUR: prixTotalEUR,
          USD: prixTotalUSD
        },
        statut: cmd.statut,
        createdAt: cmd.createdAt.toISOString(),
        updatedAt: cmd.updatedAt.toISOString()
      };
    }));

    res.status(200).json(commandesFormatees);
  } catch (error) {
    console.error('Erreur dans ObtenirCommandesRecentes:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
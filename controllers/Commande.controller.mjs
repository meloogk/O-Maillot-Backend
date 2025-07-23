import mongoose from 'mongoose';
import { CommandeSchemaModel } from '../models/Commande.model.mjs';
import { PanierSchemaModel } from '../models/Panier.model.mjs';
import { ProduitSchemaModel } from '../models/Produit.model.mjs';
import { UtilisateurSchemaModel } from '../Models/utilisateur.model.mjs';
import { convertCurrency } from '../config/exchangerate.mjs';
import { calculerNiveau } from '../utils/recompenses.mjs';

export const createCommande = async (req, res) => {
  try {
    const { adresseLivraison, dateLivraisonPrévue } = req.body;
    const userId = req.user?.id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Utilisateur non connecté' });
    }
    if (!adresseLivraison || !adresseLivraison.rue || !adresseLivraison.ville || !adresseLivraison.codePostal || !adresseLivraison.pays) {
      return res.status(400).json({ message: 'Adresse de livraison incomplète' });
    }
    if (dateLivraisonPrévue && isNaN(new Date(dateLivraisonPrévue).getTime())) {
      return res.status(400).json({ message: 'Date de livraison prévue invalide' });
    }
    if (dateLivraisonPrévue && new Date(dateLivraisonPrévue) < new Date()) {
      return res.status(400).json({ message: 'La date de livraison prévue doit être dans le futur' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId);
    if (!utilisateur || !utilisateur.actif) {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    const panier = await PanierSchemaModel.findOne({ utilisateur: userId }).lean();
    if (!panier || panier.articles.length === 0) {
      return res.status(400).json({ message: 'Panier vide' });
    }

    const { recompenses } = calculerNiveau(utilisateur.pointsFidélité);
    const reduction = recompenses.reduction / 100;

    let prixTotalOriginal = 0;
    const articlesWithDetails = await Promise.all(
      panier.articles.map(async (article) => {
        if (!mongoose.Types.ObjectId.isValid(article.produit) || !['XS', 'S', 'M', 'L', 'XL', 'XXL'].includes(article.taille)) {
          throw new Error('Article invalide');
        }
        const produit = await ProduitSchemaModel.findById(article.produit).lean();
        if (!produit) throw new Error(`Produit ${article.produit} non trouvé`);

        const tailleDoc = produit.tailles.find(t => t.taille === article.taille);
        if (!tailleDoc || tailleDoc.quantité < article.quantité) {
          throw new Error(`Stock insuffisant pour ${produit.nom} (${article.taille})`);
        }

        const prixXOF = produit.prix * (1 - (produit.discount || 0) / 100);
        prixTotalOriginal += prixXOF * article.quantité;
        const prixXOFApresReduction = prixXOF * (1 - reduction);
        return {
          produit: article.produit,
          quantité: article.quantité,
          taille: article.taille,
          price: {
            XOF: prixXOFApresReduction,
            EUR: await convertCurrency(prixXOFApresReduction, 'XOF', 'EUR'),
            USD: await convertCurrency(prixXOFApresReduction, 'XOF', 'USD'),
          },
          total: {
            XOF: prixXOFApresReduction * article.quantité,
            EUR: await convertCurrency(prixXOFApresReduction * article.quantité, 'XOF', 'EUR'),
            USD: await convertCurrency(prixXOFApresReduction * article.quantité, 'XOF', 'USD'),
          },
        };
      })
    );

    const prixTotal = prixTotalOriginal * (1 - reduction);

    const commande = new CommandeSchemaModel({
      utilisateur: userId,
      articles: articlesWithDetails.map(a => ({
        produit: a.produit,
        quantité: a.quantité,
        taille: a.taille,
      })),
      prixTotal: prixTotalOriginal,
      adresseLivraison,
      statutCommande: 'en attente',
      reductionAppliquée: recompenses.reduction,
      dateLivraisonPrévue: dateLivraisonPrévue ? new Date(dateLivraisonPrévue) : undefined,
    });

    await commande.save();
    await PanierSchemaModel.deleteOne({ utilisateur: userId });

    const commandeWithDetails = {
      ...commande.toObject(),
      prixTotalOriginal,
      prixTotal: {
        XOF: prixTotal,
        EUR: await convertCurrency(prixTotal, 'XOF', 'EUR'),
        USD: await convertCurrency(prixTotal, 'XOF', 'USD'),
      },
      articles: articlesWithDetails,
    };

    res.status(201).json({ message: 'Commande créée', commande: commandeWithDetails });
  } catch (error) {
    console.error('Erreur dans createCommande:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const getCommandes = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Utilisateur non connecté' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId).lean();
    if (!utilisateur || !utilisateur.actif) {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    const commandes = await CommandeSchemaModel.find(
      utilisateur.rôle === 'admin' ? {} : { utilisateur: userId }
    ).lean();

    const commandesWithDetails = await Promise.all(
      commandes.map(async (commande) => {
        const articles = await Promise.all(
          commande.articles.map(async (article) => {
            const produit = await ProduitSchemaModel.findById(article.produit).lean();
            if (!produit) return null;
            const prixXOF = produit.prix * (1 - (produit.discount || 0) / 100) * (1 - commande.reductionAppliquée / 100);
            return {
              ...article,
              produit,
              price: {
                XOF: prixXOF,
                EUR: await convertCurrency(prixXOF, 'XOF', 'EUR'),
                USD: await convertCurrency(prixXOF, 'XOF', 'USD'),
              },
              total: {
                XOF: prixXOF * article.quantité,
                EUR: await convertCurrency(prixXOF * article.quantité, 'XOF', 'EUR'),
                USD: await convertCurrency(prixXOF * article.quantité, 'XOF', 'USD'),
              },
            };
          })
        ).then(articles => articles.filter(a => a !== null));

        const prixTotalOriginal = commande.prixTotal;
        const prixTotal = prixTotalOriginal * (1 - commande.reductionAppliquée / 100);

        return {
          ...commande,
          articles,
          prixTotalOriginal,
          prixTotal: {
            XOF: prixTotal,
            EUR: await convertCurrency(prixTotal, 'XOF', 'EUR'),
            USD: await convertCurrency(prixTotal, 'XOF', 'USD'),
          },
        };
      })
    );

    res.status(200).json(commandesWithDetails);
  } catch (error) {
    console.error('Erreur dans getCommandes:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const getCommandeById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Utilisateur non connecté' });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de commande invalide' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId).lean();
    if (!utilisateur || !utilisateur.actif) {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    const commande = await CommandeSchemaModel.findOne(
      utilisateur.rôle === 'admin' ? { _id: id } : { _id: id, utilisateur: userId }
    ).lean();
    if (!commande) return res.status(404).json({ message: 'Commande non trouvée' });

    const articles = await Promise.all(
      commande.articles.map(async (article) => {
        const produit = await ProduitSchemaModel.findById(article.produit).lean();
        if (!produit) return null;
        const prixXOF = produit.prix * (1 - (produit.discount || 0) / 100) * (1 - commande.reductionAppliquée / 100);
        return {
          ...article,
          produit,
          price: {
            XOF: prixXOF,
            EUR: await convertCurrency(prixXOF, 'XOF', 'EUR'),
            USD: await convertCurrency(prixXOF, 'XOF', 'USD'),
          },
          total: {
            XOF: prixXOF * article.quantité,
            EUR: await convertCurrency(prixXOF * article.quantité, 'XOF', 'EUR'),
            USD: await convertCurrency(prixXOF * article.quantité, 'XOF', 'USD'),
          },
        };
      })
    ).then(articles => articles.filter(a => a !== null));

    const prixTotalOriginal = commande.prixTotal;
    const prixTotal = prixTotalOriginal * (1 - commande.reductionAppliquée / 100);

    const commandeWithDetails = {
      ...commande,
      articles,
      prixTotalOriginal,
      prixTotal: {
        XOF: prixTotal,
        EUR: await convertCurrency(prixTotal, 'XOF', 'EUR'),
        USD: await convertCurrency(prixTotal, 'XOF', 'USD'),
      },
    };

    res.status(200).json(commandeWithDetails);
  } catch (error) {
    console.error('Erreur dans getCommandeById:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const updateCommande = async (req, res) => {
  try {
    const { id } = req.params;
    const { statutCommande, dateLivraisonPrévue } = req.body;
    const userId = req.user?.id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Utilisateur non connecté' });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de commande invalide' });
    }
    if (statutCommande && !['en attente', 'payée', 'expédiée', 'livrée', 'annulée'].includes(statutCommande)) {
      return res.status(400).json({ message: 'Statut de commande invalide' });
    }
    if (dateLivraisonPrévue && isNaN(new Date(dateLivraisonPrévue).getTime())) {
      return res.status(400).json({ message: 'Date de livraison prévue invalide' });
    }
    if (dateLivraisonPrévue && new Date(dateLivraisonPrévue) < new Date()) {
      return res.status(400).json({ message: 'La date de livraison prévue doit être dans le futur' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId).lean();
    if (!utilisateur || !utilisateur.actif) {
      return res.status(403).json({ message: 'Compte inactif' });
    }
    if (utilisateur.rôle !== 'admin') {
      return res.status(403).json({ message: 'Réservé aux administrateurs' });
    }

    const commande = await CommandeSchemaModel.findById(id);
    if (!commande) return res.status(404).json({ message: 'Commande non trouvée' });

    if (statutCommande) commande.statutCommande = statutCommande;
    if (dateLivraisonPrévue) commande.dateLivraisonPrévue = new Date(dateLivraisonPrévue);
    await commande.save();

    const articles = await Promise.all(
      commande.articles.map(async (article) => {
        const produit = await ProduitSchemaModel.findById(article.produit).lean();
        if (!produit) return null;
        const prixXOF = produit.prix * (1 - (produit.discount || 0) / 100) * (1 - commande.reductionAppliquée / 100);
        return {
          ...article,
          produit,
          price: {
            XOF: prixXOF,
            EUR: await convertCurrency(prixXOF, 'XOF', 'EUR'),
            USD: await convertCurrency(prixXOF, 'XOF', 'USD'),
          },
          total: {
            XOF: prixXOF * article.quantité,
            EUR: await convertCurrency(prixXOF * article.quantité, 'XOF', 'EUR'),
            USD: await convertCurrency(prixXOF * article.quantité, 'XOF', 'USD'),
          },
        };
      })
    ).then(articles => articles.filter(a => a !== null));

    const prixTotalOriginal = commande.prixTotal;
    const prixTotal = prixTotalOriginal * (1 - commande.reductionAppliquée / 100);

    const commandeWithDetails = {
      ...commande.toObject(),
      articles,
      prixTotalOriginal,
      prixTotal: {
        XOF: prixTotal,
        EUR: await convertCurrency(prixTotal, 'XOF', 'EUR'),
        USD: await convertCurrency(prixTotal, 'XOF', 'USD'),
      },
    };

    res.status(200).json({ message: 'Commande mise à jour', commande: commandeWithDetails });
  } catch (error) {
    console.error('Erreur dans updateCommande:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const cancelCommande = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Utilisateur non connecté' });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de commande invalide' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId).lean();
    if (!utilisateur || !utilisateur.actif) {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    const commande = await CommandeSchemaModel.findOne(
      utilisateur.rôle === 'admin' ? { _id: id } : { _id: id, utilisateur: userId }
    );
    if (!commande) return res.status(404).json({ message: 'Commande non trouvée' });
    if (commande.statutCommande !== 'en attente') {
      return res.status(400).json({ message: 'Seules les commandes en attente peuvent être annulées' });
    }

    commande.statutCommande = 'annulée';
    await commande.save();

    const articles = await Promise.all(
      commande.articles.map(async (article) => {
        const produit = await ProduitSchemaModel.findById(article.produit).lean();
        if (!produit) return null;
        const prixXOF = produit.prix * (1 - (produit.discount || 0) / 100) * (1 - commande.reductionAppliquée / 100);
        return {
          ...article,
          produit,
          price: {
            XOF: prixXOF,
            EUR: await convertCurrency(prixXOF, 'XOF', 'EUR'),
            USD: await convertCurrency(prixXOF, 'XOF', 'USD'),
          },
          total: {
            XOF: prixXOF * article.quantité,
            EUR: await convertCurrency(prixXOF * article.quantité, 'XOF', 'EUR'),
            USD: await convertCurrency(prixXOF * article.quantité, 'XOF', 'USD'),
          },
        };
      })
    ).then(articles => articles.filter(a => a !== null));

    const prixTotalOriginal = commande.prixTotal;
    const prixTotal = prixTotalOriginal * (1 - commande.reductionAppliquée / 100);

    const commandeWithDetails = {
      ...commande.toObject(),
      articles,
      prixTotalOriginal,
      prixTotal: {
        XOF: prixTotal,
        EUR: await convertCurrency(prixTotal, 'XOF', 'EUR'),
        USD: await convertCurrency(prixTotal, 'XOF', 'USD'),
      },
    };

    res.status(200).json({ message: 'Commande annulée', commande: commandeWithDetails });
  } catch (error) {
    console.error('Erreur dans cancelCommande:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

import { PaiementSchemaModel } from '../Models/paiement.model.mjs';
import { CommandeSchemaModel } from '../models/Commande.model.mjs';
import { ProduitSchemaModel } from '../models/Produit.model.mjs';
import { UtilisateurSchemaModel } from '../Models/utilisateur.model.mjs';
import { convertCurrency } from '../config/exchangerate.mjs';
import{calculerNiveau, calculerPointsPaiement} from '../utils/recompenses.mjs';

export const createPaiement = async (req, res) => {
  try {
    const { commandeId, méthode, détails } = req.body;
    const userId = req.user?.id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Utilisateur non connecté' });
    }
    if (!mongoose.Types.ObjectId.isValid(commandeId)) {
      return res.status(400).json({ message: 'ID de commande invalide' });
    }
    if (!['carte', 'paypal', 'stripe'].includes(méthode)) {
      return res.status(400).json({ message: 'Méthode de paiement invalide' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId);
    if (!utilisateur || !utilisateur.actif) {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    const commande = await CommandeSchemaModel.findOne({ _id: commandeId, utilisateur: userId });
    if (!commande) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }
    if (commande.statutCommande !== 'en attente') {
      return res.status(400).json({ message: 'Seules les commandes en attente peuvent être payées' });
    }

    const existingPaiement = await PaiementSchemaModel.findOne({ commande: commandeId });
    if (existingPaiement) {
      return res.status(400).json({ message: 'Un paiement existe déjà pour cette commande' });
    }

    // Calculer la réduction en fonction du niveau
    const { recompenses } = calculerNiveau(utilisateur.pointsFidélité);
    const reduction = recompenses.reduction / 100;
    const montant = commande.prixTotal * (1 - reduction);

    const paiement = new PaiementSchemaModel({
      commande: commandeId,
      utilisateur: userId,
      méthode,
      montant,
      devise: 'XOF',
      détails,
      statut: 'payée', // Supposons un paiement simulé réussi
      transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      datePaiement: new Date(),
    });

    await paiement.save();

    // Attribuer les points de fidélité
    const points = await calculerPointsPaiement(montant, 'XOF');
    utilisateur.pointsFidélité += points;
    await utilisateur.save();

    const paiementWithDetails = {
      ...paiement.toObject(),
      pointsAjoutés: points,
      commande: {
        ...commande.toObject(),
        prixTotalOriginal: commande.prixTotal,
        prixTotal: montant,
        articles: await Promise.all(
          commande.articles.map(async (article) => {
            const produit = await ProduitSchemaModel.findById(article.produit).lean();
            if (!produit) return null;
            const prixXOF = produit.prix * (1 - (produit.discount || 0) / 100);
            return {
              ...article,
              produit,
              price: {
                XOF: prixXOF,
                EUR: await convertCurrency(prixXOF, 'XOF', 'EUR'),
                USD: await convertCurrency(prixXOF, 'XOF', 'USD'),
              },
            };
          })
        ).then(articles => articles.filter(a => a !== null)),
      },
    };

    res.status(201).json({ message: 'Paiement créé', paiement: paiementWithDetails });
  } catch (error) {
    console.error('Erreur dans createPaiement:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const getPaiements = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Utilisateur non connecté' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId).lean();
    if (!utilisateur || !utilisateur.actif) {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    const paiements = await PaiementSchemaModel.find(
      utilisateur.rôle === 'admin' ? {} : { utilisateur: userId }
    ).lean();

    const paiementsWithDetails = await Promise.all(
      paiements.map(async (paiement) => {
        const commande = await CommandeSchemaModel.findById(paiement.commande).lean();
        if (!commande) return null;
        const articles = await Promise.all(
          commande.articles.map(async (article) => {
            const produit = await ProduitSchemaModel.findById(article.produit).lean();
            if (!produit) return null;
            const prixXOF = produit.prix * (1 - (produit.discount || 0) / 100);
            return {
              ...article,
              produit,
              price: {
                XOF: prixXOF,
                EUR: await convertCurrency(prixXOF, 'XOF', 'EUR'),
                USD: await convertCurrency(prixXOF, 'XOF', 'USD'),
              },
            };
          })
        ).then(articles => articles.filter(a => a !== null));
        return {
          ...paiement,
          commande: { ...commande, articles },
          montant: {
            XOF: paiement.montant,
            EUR: await convertCurrency(paiement.montant, paiement.devise, 'EUR'),
            USD: await convertCurrency(paiement.montant, paiement.devise, 'USD'),
          },
        };
      })
    ).then(paiements => paiements.filter(p => p !== null));

    res.status(200).json(paiementsWithDetails);
  } catch (error) {
    console.error('Erreur dans getPaiements:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const getPaiementById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Utilisateur non connecté' });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de paiement invalide' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId).lean();
    if (!utilisateur || !utilisateur.actif) {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    const paiement = await PaiementSchemaModel.findOne(
      utilisateur.rôle === 'admin' ? { _id: id } : { _id: id, utilisateur: userId }
    ).lean();
    if (!paiement) return res.status(404).json({ message: 'Paiement non trouvé' });

    const commande = await CommandeSchemaModel.findById(paiement.commande).lean();
    if (!commande) return res.status(404).json({ message: 'Commande non trouvée' });

    const paiementWithDetails = {
      ...paiement,
      montant: {
        XOF: paiement.montant,
        EUR: await convertCurrency(paiement.montant, paiement.devise, 'EUR'),
        USD: await convertCurrency(paiement.montant, paiement.devise, 'USD'),
      },
      commande: {
        ...commande,
        articles: await Promise.all(
          commande.articles.map(async (article) => {
            const produit = await ProduitSchemaModel.findById(article.produit).lean();
            if (!produit) return null;
            const prixXOF = produit.prix * (1 - (produit.discount || 0) / 100);
            return {
              ...article,
              produit,
              price: {
                XOF: prixXOF,
                EUR: await convertCurrency(prixXOF, 'XOF', 'EUR'),
                USD: await convertCurrency(prixXOF, 'XOF', 'USD'),
              },
            };
          })
        ).then(articles => articles.filter(a => a !== null)),
      },
    };

    res.status(200).json(paiementWithDetails);
  } catch (error) {
    console.error('Erreur dans getPaiementById:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const getFacture = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Utilisateur non connecté' });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de paiement invalide' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId).lean();
    if (!utilisateur || !utilisateur.actif) {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    const paiement = await PaiementSchemaModel.findOne(
      utilisateur.rôle === 'admin' ? { _id: id } : { _id: id, utilisateur: userId }
    ).lean();
    if (!paiement) return res.status(404).json({ message: 'Paiement non trouvé' });

    const commande = await CommandeSchemaModel.findById(paiement.commande).lean();
    if (!commande) return res.status(404).json({ message: 'Commande non trouvée' });

    const { recompenses } = calculerNiveau(utilisateur.pointsFidélité);

    const articles = await Promise.all(
      commande.articles.map(async (article) => {
        const produit = await ProduitSchemaModel.findById(article.produit).lean();
        if (!produit) return null;
        const prixXOF = produit.prix * (1 - (produit.discount || 0) / 100) * (1 - recompenses.reduction / 100);
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

    const facture = {
      factureId: paiement._id,
      commandeId: commande._id,
      utilisateur: {
        _id: utilisateur._id,
        nom: utilisateur.nom,
        email: utilisateur.email,
      },
      articles,
      prixTotal: {
        XOF: commande.prixTotal * (1 - recompenses.reduction / 100),
        EUR: await convertCurrency(commande.prixTotal * (1 - recompenses.reduction / 100), 'XOF', 'EUR'),
        USD: await convertCurrency(commande.prixTotal * (1 - recompenses.reduction / 100), 'XOF', 'USD'),
      },
      adresseLivraison: commande.adresseLivraison,
      paiement: {
        méthode: paiement.méthode,
        statut: paiement.statut,
        montant: {
          XOF: paiement.montant,
          EUR: await convertCurrency(paiement.montant, paiement.devise, 'EUR'),
          USD: await convertCurrency(paiement.montant, paiement.devise, 'USD'),
        },
        transactionId: paiement.transactionId,
        datePaiement: paiement.datePaiement,
      },
      statutCommande: commande.statutCommande,
      dateFacture: paiement.datePaiement,
      reductionAppliquée: recompenses.reduction,
    };

    res.status(200).json(facture);
  } catch (error) {
    console.error('Erreur dans getFacture:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
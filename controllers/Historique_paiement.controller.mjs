
import { HistoriquePaiementSchemaModel } from "../Models/historique_Paiement.model.mjs";
import { PaiementSchemaModel } from "../Models/paiement.model.mjs";
import { CommandeSchemaModel } from "../models/Commande.model.mjs";
import { UtilisateurSchemaModel } from "../Models/utilisateur.model.mjs";
import { ProduitSchemaModel } from "../models/Produit.model.mjs";
import { calculerNiveau, calculerPointsPaiement } from "../utils/recompenses.mjs";
import { convertCurrency } from "../config/exchangerate.mjs";



export const createHistoriquePaiement = async (req, res) => {
  try {
    const { paiementId } = req.body;
    const userId = req.user?.id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Utilisateur non connecté' });
    }
    if (!mongoose.Types.ObjectId.isValid(paiementId)) {
      return res.status(400).json({ message: 'ID de paiement invalide' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId);
    if (!utilisateur || !utilisateur.actif) {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    const paiement = await PaiementSchemaModel.findOne(
      utilisateur.rôle === 'admin' ? { _id: paiementId } : { _id: paiementId, utilisateur: userId }
    ).lean();
    if (!paiement) return res.status(404).json({ message: 'Paiement non trouvé' });

    const commande = await CommandeSchemaModel.findById(paiement.commande).lean();
    if (!commande) return res.status(404).json({ message: 'Commande non trouvée' });

    const { recompenses } = calculerNiveau(utilisateur.pointsFidélité);
    const reduction = recompenses.reduction / 100;
    const montantAvecReduction = paiement.montant;

    const historiquePaiement = new HistoriquePaiementSchemaModel({
      commande: paiement.commande,
      utilisateur: paiement.utilisateur,
      méthode: paiement.méthode,
      statut: paiement.statut,
      montant: montantAvecReduction,
      devise: 'XOF',
      détails: paiement.détails,
      transactionId: paiement.transactionId,
      datePaiement: paiement.datePaiement || new Date(),
    });

    await historiquePaiement.save();

    // Attribuer les points de fidélité si le paiement est réussi
    let pointsAjoutés = 0;
    if (paiement.statut === 'payée') {
      pointsAjoutés = await calculerPointsPaiement(montantAvecReduction, 'XOF');
      utilisateur.pointsFidélité += pointsAjoutés;
      await utilisateur.save();
    }

    const historiqueWithDetails = {
      ...historiquePaiement.toObject(),
      montant: {
        XOF: historiquePaiement.montant,
        EUR: await convertCurrency(historiquePaiement.montant, 'XOF', 'EUR'),
        USD: await convertCurrency(historiquePaiement.montant, 'XOF', 'USD'),
      },
      commande: {
        ...commande,
        prixTotalOriginal: commande.prixTotal,
        prixTotal: commande.prixTotal * (1 - reduction),
        articles: await Promise.all(
          commande.articles.map(async (article) => {
            const produit = await ProduitSchemaModel.findById(article.produit).lean();
            if (!produit) return null;
            const prixXOF = produit.prix * (1 - (produit.discount || 0) / 100) * (1 - reduction);
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
        ).then(articles => articles.filter(a => a !== null)),
      },
      pointsAjoutés,
      reductionAppliquée: recompenses.reduction,
    };

    res.status(201).json({ message: 'Historique de paiement créé', historique: historiqueWithDetails });
  } catch (error) {
    console.error('Erreur dans createHistoriquePaiement:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const getHistoriquePaiements = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Utilisateur non connecté' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId).lean();
    if (!utilisateur || !utilisateur.actif) {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    const historiques = await HistoriquePaiementSchemaModel.find(
      utilisateur.rôle === 'admin' ? {} : { utilisateur: userId }
    ).lean();

    const historiquesWithDetails = await Promise.all(
      historiques.map(async (historique) => {
        const commande = await CommandeSchemaModel.findById(historique.commande).lean();
        if (!commande) return null;
        const { recompenses } = calculerNiveau(utilisateur.pointsFidélité);
        const reduction = recompenses.reduction / 100;
        return {
          ...historique,
          montant: {
            XOF: historique.montant,
            EUR: await convertCurrency(historique.montant, 'XOF', 'EUR'),
            USD: await convertCurrency(historique.montant, 'XOF', 'USD'),
          },
          commande: {
            ...commande,
            prixTotalOriginal: commande.prixTotal,
            prixTotal: commande.prixTotal * (1 - reduction),
            articles: await Promise.all(
              commande.articles.map(async (article) => {
                const produit = await ProduitSchemaModel.findById(article.produit).lean();
                if (!produit) return null;
                const prixXOF = produit.prix * (1 - (produit.discount || 0) / 100) * (1 - reduction);
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
            ).then(articles => articles.filter(a => a !== null)),
          },
          reductionAppliquée: recompenses.reduction,
        };
      })
    ).then(historiques => historiques.filter(h => h !== null));

    res.status(200).json(historiquesWithDetails);
  } catch (error) {
    console.error('Erreur dans getHistoriquePaiements:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const getHistoriquePaiementById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Utilisateur non connecté' });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID d\'historique de paiement invalide' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId).lean();
    if (!utilisateur || !utilisateur.actif) {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    const historique = await HistoriquePaiementSchemaModel.findOne(
      utilisateur.rôle === 'admin' ? { _id: id } : { _id: id, utilisateur: userId }
    ).lean();
    if (!historique) return res.status(404).json({ message: 'Historique de paiement non trouvé' });

    const commande = await CommandeSchemaModel.findById(historique.commande).lean();
    if (!commande) return res.status(404).json({ message: 'Commande non trouvée' });

    const { recompenses } = calculerNiveau(utilisateur.pointsFidélité);
    const reduction = recompenses.reduction / 100;

    const historiqueWithDetails = {
      ...historique,
      montant: {
        XOF: historique.montant,
        EUR: await convertCurrency(historique.montant, 'XOF', 'EUR'),
        USD: await convertCurrency(historique.montant, 'XOF', 'USD'),
      },
      commande: {
        ...commande,
        prixTotalOriginal: commande.prixTotal,
        prixTotal: commande.prixTotal * (1 - reduction),
        articles: await Promise.all(
          commande.articles.map(async (article) => {
            const produit = await ProduitSchemaModel.findById(article.produit).lean();
            if (!produit) return null;
            const prixXOF = produit.prix * (1 - (produit.discount || 0) / 100) * (1 - reduction);
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
        ).then(articles => articles.filter(a => a !== null)),
      },
      reductionAppliquée: recompenses.reduction,
    };

    res.status(200).json(historiqueWithDetails);
  } catch (error) {
    console.error('Erreur dans getHistoriquePaiementById:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const deleteHistoriquePaiement = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Utilisateur non connecté' });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID d\'historique de paiement invalide' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId);
    if (!utilisateur || !utilisateur.actif) {
      return res.status(403).json({ message: 'Compte inactif' });
    }
    if (utilisateur.rôle !== 'admin') {
      return res.status(403).json({ message: 'Réservé aux administrateurs' });
    }

    const historique = await HistoriquePaiementSchemaModel.findById(id).lean();
    if (!historique) return res.status(404).json({ message: 'Historique de paiement non trouvé' });

    // Optionnel : Retirer les points de fidélité si le paiement était "payé"
    if (historique.statut === 'payée') {
      const points = await calculerPointsPaiement(historique.montant, 'XOF');
      utilisateur.pointsFidélité = Math.max(0, utilisateur.pointsFidélité - points);
      await utilisateur.save();
    }

    await HistoriquePaiementSchemaModel.findByIdAndDelete(id);

    res.status(200).json({ message: 'Historique de paiement supprimé', pointsRetirés: historique.statut === 'payée' ? points : 0 });
  } catch (error) {
    console.error('Erreur dans deleteHistoriquePaiement:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
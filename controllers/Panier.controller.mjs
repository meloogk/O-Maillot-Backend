import { PanierSchemaModel } from '../models/Panier.model.mjs';
import { ProduitSchemaModel } from '../models/Produit.model.mjs';
import { convertCurrency } from '../config/exchangerate.mjs';
import { UtilisateurSchemaModel } from '../Models/utilisateur.model.mjs';
import { calculerNiveau } from '../utils/recompenses.mjs';

export const addToCart = async (req, res) => {
  try {
    const { produit, taille, quantité } = req.body;
    const userId = req.user?.id;
    const sessionId = req.session?.id;

    if (!userId && !sessionId) {
      return res.status(401).json({ message: 'Utilisateur ou session requis' });
    }
    if (!mongoose.Types.ObjectId.isValid(produit)) {
      return res.status(400).json({ message: 'ID de produit invalide' });
    }
    if (!Number.isInteger(Number(quantité)) || Number(quantité) < 1) {
      return res.status(400).json({ message: 'Quantité invalide' });
    }

    const produitDoc = await ProduitSchemaModel.findById(produit).lean();
    if (!produitDoc) return res.status(404).json({ message: 'Produit non trouvé' });

    const tailleDoc = produitDoc.tailles.find(t => t.taille === taille);
    if (!tailleDoc || tailleDoc.quantité < Number(quantité)) {
      return res.status(400).json({ message: 'Stock insuffisant' });
    }

    let utilisateur;
    if (userId) {
      utilisateur = await UtilisateurSchemaModel.findById(userId).lean();
      if (!utilisateur || !utilisateur.actif) {
        return res.status(403).json({ message: 'Compte inactif' });
      }
    }

    let panier = await PanierSchemaModel.findOne(userId ? { utilisateur: userId } : { sessionId });
    if (!panier) {
      panier = new PanierSchemaModel({
        utilisateur: userId || undefined,
        sessionId: sessionId || undefined,
        articles: [],
      });
    }

    const articleIndex = panier.articles.findIndex(
      a => a.produit.toString() === produit && a.taille === taille
    );

    if (articleIndex >= 0) {
      panier.articles[articleIndex].quantité += Number(quantité);
    } else {
      panier.articles.push({ produit, taille, quantité: Number(quantité) });
    }

    await panier.save();

    const panierWithDetails = await buildPanierDetails(panier, utilisateur);
    res.status(200).json({ message: 'Article ajouté au panier', panier: panierWithDetails });
  } catch (error) {
    console.error('Erreur dans addToCart:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const getCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.session?.id;

    if (!userId && !sessionId) {
      return res.status(401).json({ message: 'Utilisateur ou session non connecté' });
    }

    const utilisateur = userId ? await UtilisateurSchemaModel.findById(userId).lean() : null;
    if (userId && (!utilisateur || !utilisateur.actif)) {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    const panier = await PanierSchemaModel.findOne(userId ? { utilisateur: userId } : { sessionId }).lean();
    if (!panier) return res.status(404).json({ message: 'Panier non trouvé' });

    const panierWithDetails = await buildPanierDetails(panier, utilisateur);
    res.status(200).json(panierWithDetails);
  } catch (error) {
    console.error('Erreur dans getCart:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantité } = req.body;
    const userId = req.user?.id;
    const sessionId = req.session?.id;

    if (!userId && !sessionId) {
      return res.status(401).json({ message: 'Utilisateur ou session non connecté' });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID d\'article invalide' });
    }
    if (!quantité || !Number.isInteger(Number(quantité)) || Number(quantité) < 1) {
      return res.status(400).json({ message: 'Quantité invalide' });
    }

    const utilisateur = userId ? await UtilisateurSchemaModel.findById(userId).lean() : null;
    if (userId && (!utilisateur || !utilisateur.actif)) {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    const panier = await PanierSchemaModel.findOne(userId ? { utilisateur: userId } : { sessionId });
    if (!panier) return res.status(404).json({ message: 'Panier non trouvé' });

    const articleIndex = panier.articles.findIndex(a => a._id.toString() === id);
    if (articleIndex < 0) return res.status(404).json({ message: 'Article non trouvé' });

    const produit = await ProduitSchemaModel.findById(panier.articles[articleIndex].produit).lean();
    if (!produit) return res.status(404).json({ message: 'Produit non trouvé' });

    const tailleDoc = produit.tailles.find(t => t.taille === panier.articles[articleIndex].taille);
    if (!tailleDoc || tailleDoc.quantité < Number(quantité)) {
      return res.status(400).json({ message: 'Stock insuffisant' });
    }

    panier.articles[articleIndex].quantité = Number(quantité);
    await panier.save();

    const panierWithDetails = await buildPanierDetails(panier, utilisateur);
    res.status(200).json({ message: 'Quantité mise à jour', panier: panierWithDetails });
  } catch (error) {
    console.error('Erreur dans updateCartItem:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const removeCartItem = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const sessionId = req.session?.id;

    if (!userId && !sessionId) {
      return res.status(401).json({ message: 'Utilisateur ou session non connecté' });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID d\'article invalide' });
    }

    const utilisateur = userId ? await UtilisateurSchemaModel.findById(userId).lean() : null;
    if (userId && (!utilisateur || !utilisateur.actif)) {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    const panier = await PanierSchemaModel.findOne(userId ? { utilisateur: userId } : { sessionId });
    if (!panier) return res.status(404).json({ message: 'Panier non trouvé' });

    const articleIndex = panier.articles.findIndex(a => a._id.toString() === id);
    if (articleIndex < 0) return res.status(404).json({ message: 'Article non trouvé' });

    panier.articles.splice(articleIndex, 1);
    await panier.save();

    const panierWithDetails = await buildPanierDetails(panier, utilisateur);
    res.status(200).json({ message: 'Article supprimé', panier: panierWithDetails });
  } catch (error) {
    console.error('Erreur dans removeCartItem:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const mergeCartOnLogin = async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.session?.id;

    if (!userId || !sessionId) {
      return res.status(400).json({ message: 'Utilisateur et session requis pour fusionner le panier' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId).lean();
    if (!utilisateur || !utilisateur.actif) {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    const sessionPanier = await PanierSchemaModel.findOne({ sessionId });
    const userPanier = await PanierSchemaModel.findOne({ utilisateur: userId });

    if (sessionPanier) {
      if (!userPanier) {
        sessionPanier.utilisateur = userId;
        sessionPanier.sessionId = undefined;
        await sessionPanier.save();
        const panierWithDetails = await buildPanierDetails(sessionPanier, utilisateur);
        return res.status(200).json({ message: 'Panier fusionné', panier: panierWithDetails });
      }

      for (const sessionArticle of sessionPanier.articles) {
        const produit = await ProduitSchemaModel.findById(sessionArticle.produit).lean();
        if (!produit) continue;

        const tailleDoc = produit.tailles.find(t => t.taille === sessionArticle.taille);
        if (!tailleDoc || tailleDoc.quantité < sessionArticle.quantité) {
          continue;
        }

        const articleIndex = userPanier.articles.findIndex(
          a => a.produit.toString() === sessionArticle.produit.toString() && a.taille === sessionArticle.taille
        );

        if (articleIndex >= 0) {
          userPanier.articles[articleIndex].quantité += sessionArticle.quantité;
        } else {
          userPanier.articles.push({
            produit: sessionArticle.produit,
            taille: sessionArticle.taille,
            quantité: sessionArticle.quantité,
          });
        }
      }

      await userPanier.save();
      await PanierSchemaModel.deleteOne({ sessionId });

      const panierWithDetails = await buildPanierDetails(userPanier, utilisateur);
      return res.status(200).json({ message: 'Panier fusionné', panier: panierWithDetails });
    }

    const panierWithDetails = userPanier
      ? await buildPanierDetails(userPanier, utilisateur)
      : { articles: [], reductionAppliquée: 0, prixTotalOriginal: 0, prixTotal: { XOF: 0, EUR: 0, USD: 0 } };
    res.status(200).json({ message: 'Aucun panier de session à fusionner', panier: panierWithDetails });
  } catch (error) {
    console.error('Erreur dans mergeCartOnLogin:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

async function buildPanierDetails(panier, utilisateur) {
  const reduction = utilisateur ? calculerNiveau(utilisateur.pointsFidélité).recompenses.reduction : 0;

  let prixTotalOriginal = 0;
  const articles = await Promise.all(
    panier.articles.map(async (article) => {
      const produit = await ProduitSchemaModel.findById(article.produit).lean();
      if (!produit) return null;
      const prixXOF = produit.prix * (1 - (produit.discount || 0) / 100);
      prixTotalOriginal += prixXOF * article.quantité;
      const prixXOFApresReduction = prixXOF * (1 - reduction / 100);
      return {
        ...article,
        produit,
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
  ).then(articles => articles.filter(a => a !== null));

  const prixTotal = prixTotalOriginal * (1 - reduction / 100);

  return {
    ...panier,
    articles,
    prixTotalOriginal,
    prixTotal: {
      XOF: prixTotal,
      EUR: await convertCurrency(prixTotal, 'XOF', 'EUR'),
      USD: await convertCurrency(prixTotal, 'XOF', 'USD'),
    },
    reductionAppliquée: reduction,
  };
}
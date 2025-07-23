import mongoose from 'mongoose';
import { FactureSchemaModel } from '../models/Facture.model.mjs';
import { PaiementSchemaModel } from '../Models/paiement.model.mjs';
import { CommandeSchemaModel } from '../models/Commande.model.mjs';
import { ProduitSchemaModel } from '../models/Produit.model.mjs';
import { UtilisateurSchemaModel } from '../Models/utilisateur.model.mjs';
import { convertCurrency } from '../config/exchangerate.mjs';


export const createFacture = async (req, res) => {
  try {
    const { paiementId, mentionsLégales } = req.body;
    const userId = req.user?.id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Utilisateur non connecté' });
    }
    if (!mongoose.Types.ObjectId.isValid(paiementId)) {
      return res.status(400).json({ message: 'ID de paiement invalide' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId).lean();
    if (!utilisateur || !utilisateur.actif) {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    const paiement = await PaiementSchemaModel.findOne(
      utilisateur.rôle === 'admin' ? { _id: paiementId } : { _id: paiementId, utilisateur: userId }
    ).lean();
    if (!paiement) return res.status(404).json({ message: 'Paiement non trouvé' });

    const commande = await CommandeSchemaModel.findById(paiement.commande).lean();
    if (!commande) return res.status(404).json({ message: 'Commande non trouvée' });

    const existingFacture = await FactureSchemaModel.findOne({ paiement: paiementId });
    if (existingFacture) {
      return res.status(400).json({ message: 'Une facture existe déjà pour ce paiement' });
    }

    const facture = new FactureSchemaModel({
      paiement: paiementId,
      commande: paiement.commande,
      utilisateur: paiement.utilisateur,
      mentionsLégales,
    });

    await facture.save();

    const factureWithDetails = await buildFactureDetails(facture, paiement, commande);
    res.status(201).json({ message: 'Facture créée', facture: factureWithDetails });
  } catch (error) {
    console.error('Erreur dans createFacture:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const getFactures = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Utilisateur non connecté' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId).lean();
    if (!utilisateur || !utilisateur.actif) {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    const factures = await FactureSchemaModel.find(
      utilisateur.rôle === 'admin' ? {} : { utilisateur: userId }
    ).lean();

    const facturesWithDetails = await Promise.all(
      factures.map(async (facture) => {
        const paiement = await PaiementSchemaModel.findById(facture.paiement).lean();
        if (!paiement) return null;
        const commande = await CommandeSchemaModel.findById(facture.commande).lean();
        if (!commande) return null;
        return await buildFactureDetails(facture, paiement, commande);
      })
    ).then(factures => factures.filter(f => f !== null));

    res.status(200).json(facturesWithDetails);
  } catch (error) {
    console.error('Erreur dans getFactures:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const getFactureById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Utilisateur non connecté' });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de facture invalide' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId).lean();
    if (!utilisateur || !utilisateur.actif) {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    const facture = await FactureSchemaModel.findOne(
      utilisateur.rôle === 'admin' ? { _id: id } : { _id: id, utilisateur: userId }
    ).lean();
    if (!facture) return res.status(404).json({ message: 'Facture non trouvée' });

    const paiement = await PaiementSchemaModel.findById(facture.paiement).lean();
    if (!paiement) return res.status(404).json({ message: 'Paiement non trouvé' });

    const commande = await CommandeSchemaModel.findById(facture.commande).lean();
    if (!commande) return res.status(404).json({ message: 'Commande non trouvée' });

    const factureWithDetails = await buildFactureDetails(facture, paiement, commande);
    res.status(200).json(factureWithDetails);
  } catch (error) {
    console.error('Erreur dans getFactureById:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const getFacturePDF = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Utilisateur non connecté' });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de facture invalide' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId).lean();
    if (!utilisateur || !utilisateur.actif) {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    const facture = await FactureSchemaModel.findOne(
      utilisateur.rôle === 'admin' ? { _id: id } : { _id: id, utilisateur: userId }
    ).lean();
    if (!facture) return res.status(404).json({ message: 'Facture non trouvée' });

    const paiement = await PaiementSchemaModel.findById(facture.paiement).lean();
    if (!paiement) return res.status(404).json({ message: 'Paiement non trouvé' });

    const commande = await CommandeSchemaModel.findById(facture.commande).lean();
    if (!commande) return res.status(404).json({ message: 'Commande non trouvée' });

    const factureDetails = await buildFactureDetails(facture, paiement, commande);
    const latexContent = generateLatexFacture(factureDetails);

    res.status(200).json({ latex: latexContent });
  } catch (error) {
    console.error('Erreur dans getFacturePDF:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

async function buildFactureDetails(facture, paiement, commande) {
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

  return {
    _id: facture._id,
    numéroFacture: facture.numéroFacture,
    paiement: paiement._id,
    commande: {
      _id: commande._id,
      prixTotalOriginal: commande.prixTotal,
      prixTotal: {
        XOF: commande.prixTotal * (1 - commande.reductionAppliquée / 100),
        EUR: await convertCurrency(commande.prixTotal * (1 - commande.reductionAppliquée / 100), 'XOF', 'EUR'),
        USD: await convertCurrency(commande.prixTotal * (1 - commande.reductionAppliquée / 100), 'XOF', 'USD'),
      },
      articles,
      adresseLivraison: commande.adresseLivraison,
      statutCommande: commande.statutCommande,
      reductionAppliquée: commande.reductionAppliquée,
      dateLivraisonPrévue: commande.dateLivraisonPrévue,
    },
    utilisateur: {
      _id: utilisateur._id,
      nom: utilisateur.nom,
      email: utilisateur.email,
    },
    prixTotal: {
      XOF: commande.prixTotal * (1 - commande.reductionAppliquée / 100),
      EUR: await convertCurrency(commande.prixTotal * (1 - commande.reductionAppliquée / 100), 'XOF', 'EUR'),
      USD: await convertCurrency(commande.prixTotal * (1 - commande.reductionAppliquée / 100), 'XOF', 'USD'),
    },
    prixTotalOriginal: commande.prixTotal,
    adresseLivraison: commande.adresseLivraison,
    paiementDetails: {
      méthode: paiement.méthode,
      statut: paiement.statut,
      montant: {
        XOF: paiement.montant,
        EUR: await convertCurrency(paiement.montant, 'XOF', 'EUR'),
        USD: await convertCurrency(paiement.montant, 'XOF', 'USD'),
      },
      transactionId: paiement.transactionId || 'N/A',
      datePaiement: paiement.datePaiement,
    },
    statutCommande: commande.statutCommande,
    dateFacture: paiement.datePaiement,
    mentionsLégales: facture.mentionsLégales,
    reductionAppliquée: commande.reductionAppliquée,
    dateLivraisonPrévue: commande.dateLivraisonPrévue,
    crééLe: facture.createdAt,
    misÀJourLe: facture.updatedAt,
  };
}

function generateLatexFacture(facture) {
  const items = facture.commande.articles
    .map(
      article => `
    \\item ${article.produit.nom.replace(/[&%$#_{}]/g, '\\$&')} (Taille: ${article.taille}, Quantité: ${article.quantité}) & ${article.price.XOF.toFixed(2)} XOF & ${article.total.XOF.toFixed(2)} XOF \\\\
  `
    )
    .join('');

  return `\\documentclass[a4paper,12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage{geometry}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{booktabs}
\\usepackage{natbib}
\\usepackage[french]{babel}
\\usepackage{NotoSerif}

\\geometry{a4paper, margin=1in}

\\begin{document}

\\begin{center}
  {\\Large \\textbf{Facture N°${facture.numéroFacture.replace(/[&%$#_{}]/g, '\\$&')}}}
\\end{center}

\\vspace{1cm}

\\begin{tabular}{ll}
  \\textbf{Client:} & ${facture.utilisateur.nom.replace(/[&%$#_{}]/g, '\\$&')} \\\\
  \\textbf{Email:} & ${facture.utilisateur.email.replace(/[&%$#_{}]/g, '\\$&')} \\\\
  \\textbf{Adresse de livraison:} & ${facture.adresseLivraison.rue.replace(/[&%$#_{}]/g, '\\$&')}, ${facture.adresseLivraison.ville.replace(/[&%$#_{}]/g, '\\$&')}, ${facture.adresseLivraison.codePostal.replace(/[&%$#_{}]/g, '\\$&')}, ${facture.adresseLivraison.pays.replace(/[&%$#_{}]/g, '\\$&')} \\\\
  \\textbf{Date de la facture:} & ${new Date(facture.dateFacture).toLocaleDateString('fr-FR')} \\\\
  \\textbf{Date de livraison prévue:} & ${new Date(facture.dateLivraisonPrévue).toLocaleDateString('fr-FR')} \\\\
  \\textbf{Réduction appliquée:} & ${facture.reductionAppliquée.toFixed(2)}\\% \\\\
\\end{tabular}

\\vspace{1cm}

\\begin{center}
  \\begin{tabular}{lrr}
    \\toprule
    \\textbf{Article} & \\textbf{Prix unitaire (XOF)} & \\textbf{Total (XOF)} \\\\
    \\midrule
    ${items}
    \\midrule
    \\textbf{Prix total original} & & ${facture.prixTotalOriginal.toFixed(2)} XOF \\\\
    \\textbf{Prix total après réduction} & & ${facture.prixTotal.XOF.toFixed(2)} XOF \\\\
    \\bottomrule
  \\end{tabular}
\\end{center}

\\vspace{1cm}

\\begin{tabular}{ll}
  \\textbf{Méthode de paiement:} & ${facture.paiementDetails.méthode} \\\\
  \\textbf{Statut du paiement:} & ${facture.paiementDetails.statut} \\\\
  \\textbf{Montant payé:} & ${facture.paiementDetails.montant.XOF.toFixed(2)} XOF \\\\
  \\textbf{Date de paiement:} & ${new Date(facture.paiementDetails.datePaiement).toLocaleDateString('fr-FR')} \\\\
  \\textbf{Transaction ID:} & ${facture.paiementDetails.transactionId.replace(/[&%$#_{}]/g, '\\$&')} \\\\
\\end{tabular}

\\vspace{1cm}

\\textbf{Mentions légales:} \\\\
${facture.mentionsLégales ? facture.mentionsLégales.replace(/[&%$#_{}]/g, '\\$&') : 'Aucune mention légale spécifiée.'}

\\end{document}`;
}
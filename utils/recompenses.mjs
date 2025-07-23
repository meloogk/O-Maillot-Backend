import { convertCurrency } from "../config/exchangerate.mjs";

// Constantes pour les points de parrainage
export const POINTS_PARRAIN = 75;
export const POINTS_FILLEUL = 25;

const niveaux = [
  { nom: 'GBAO', pointsRequis: 0, recompenses: { reduction: 0, livraisonsGratuites: 0, articlesOfferts: 0 }, badgeId: null },
  { nom: 'Supporteur', pointsRequis: 500, recompenses: { reduction: 5, livraisonsGratuites: 0, articlesOfferts: 0 }, badgeId: null },
  { nom: 'FANA', pointsRequis: 1500, recompenses: { reduction: 10, livraisonsGratuites: 0, articlesOfferts: 0 }, badgeId: null },
  { nom: 'VRAI FANA', pointsRequis: 3000, recompenses: { reduction: 15, livraisonsGratuites: 0, articlesOfferts: 0 }, badgeId: null },
  { nom: 'CR7 VS MESSI', pointsRequis: 7000, recompenses: { reduction: 20, livraisonsGratuites: 2, articlesOfferts: 1 }, badgeId: null },
  { nom: 'GOAT', pointsRequis: 15000, recompenses: { reduction: 25, livraisonsGratuites: 4, articlesOfferts: 2 }, badgeId: null },
];

export const calculerNiveau = (pointsFidélité) => {
  const niveauActuel = niveaux.reduce((prev, curr) => 
    pointsFidélité >= curr.pointsRequis ? curr : prev, niveaux[0]);
  
  const indexNiveau = niveaux.findIndex(n => n.nom === niveauActuel.nom);
  const niveauSuivant = niveaux[indexNiveau + 1] || null;
  
  const progression = niveauSuivant 
    ? ((pointsFidélité - niveauActuel.pointsRequis) / (niveauSuivant.pointsRequis - niveauActuel.pointsRequis)) * 100 
    : 100;

  return {
    niveauActuel: niveauActuel.nom,
    pointsRequis: niveauActuel.pointsRequis,
    recompenses: niveauActuel.recompenses,
    badgeId: niveauActuel.badgeId,
    progression: Number(progression.toFixed(2)),
    pointsPourNiveauSuivant: niveauSuivant ? niveauSuivant.pointsRequis - pointsFidélité : 0,
    tousLesNiveaux: niveaux.map(n => ({
      nom: n.nom,
      pointsRequis: n.pointsRequis,
      recompenses: n.recompenses,
      badgeId: n.badgeId,
    })),
  };
};

export const calculerPointsPaiement = async (montant, devise = 'FCFA') => {
  const montantFCFA = devise !== 'FCFA' ? await convertCurrency(montant, devise, 'FCFA') : montant;
  if (montantFCFA < 0) throw new Error('Le montant ne peut pas être négatif');
  if (!['FCFA', 'EUR', 'USD'].includes(devise)) throw new Error('Devise non supportée');
  if (montantFCFA < 15000) return 20;
  if (montantFCFA < 50000) return 50;
  if (montantFCFA < 100000) return 100;
  if (montantFCFA < 150000) return 150;
  if (montantFCFA < 300000) return 300;
  if (montantFCFA < 500000) return 500;
  return 1000;
};
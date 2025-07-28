import express from "express"

import { registerWithEmail, loginWithEmail, loginWithGoogle, loginWithPhone } from "../controllers/Authentification.controller.mjs"
import { GetUtilisateurConnecte } from "../controllers/Utilisateur.controller.mjs"
import { verifyToken } from "../middlewares/verifytoken.mjs"
import { isSuperAdmin } from "../middlewares/superadmin.mjs"
// import { uploadPhotoProfil,uploadToCloudinary } from "../middlewares/upload_photo.mjs"
import { addProduit,getProduits,updateProduit,deleteProduit,getProduitById} from "../controllers/Produit.controller.mjs"
import { getCategories,getCategorieById } from "../controllers/Categorie.controller.mjs"
import { getEquipes,getEquipeById } from "../controllers/Equipe.controller.mjs"
import { getLigues ,getLigueById} from "../controllers/Ligue.controller.mjs"
import { getBadges,getBadgeById } from "../controllers/Badge.controller.mjs"
import { getPaiements, createPaiement, getPaiementById, getFacture } from "../controllers/Paiement.controller.mjs"
import { addFavori,getFavoris,removeFavori } from "../controllers/Favoris.controller.mjs"
import { createCommande, getCommandes, getCommandeById, updateCommande, cancelCommande } from "../controllers/Commande.controller.mjs"
import {addToCart,getCart, updateCartItem, removeCartItem,mergeCartOnLogin} from "../controllers/Panier.controller.mjs"
import { createFacture, getFactures, getFactureById, getFacturePDF } from "../controllers/Facture.controller.mjs"
import { createHistoriquePaiement, getHistoriquePaiements, getHistoriquePaiementById, deleteHistoriquePaiement } from "../controllers/Historique_paiement.controller.mjs"
import { ObtenirProfilUtilisateur, ModifierProfilUtilisateur, SupprimerCompteUtilisateur } from "../controllers/Profil.controller.mjs"
import { CreerDefi, ObtenirDefis } from "../controllers/Defi.controller.mjs"
import { CreerObjectifVente,ObtenirObjectifsVente } from "../controllers/Statistiques.controller.mjs"
import {getUserRewards,claimAchievement} from "../controllers/Recompenses.controller.mjs"
import { UtiliserCodeParrainage } from "../controllers/Parrainage.controller.mjs"
const router = express.Router()
 
//Routes D'AUTHENTIFICATION 

// Inscription via email
router.post('/register/email', registerWithEmail);
// Connexion via email
router.post('/login/email', loginWithEmail);
// Connexion/Inscription via Google
router.post('/login/google', loginWithGoogle);
// Connexion/Inscription via téléphone
router.post('/login/phone', loginWithPhone);


/************ Utilisateur  ******************/
router.get("/admin/dashboard", verifyToken, isSuperAdmin, GetUtilisateurConnecte) //ajouter Obtenirstatique dans le controller statistiques
// router.get("/admin/recent-orders", verifyToken, isSuperAdmin, ObtenirCommandesRecentes);

router.get("/utilisateur_connecte", verifyToken, GetUtilisateurConnecte);
 

/************  Route Profil Utilisateur  ******************/
// Obtenir les informations du profil
router.get('/infos_utilisateur', verifyToken, ObtenirProfilUtilisateur);
// Modifier le profil (avec upload de photo optionnel)
router.put('/modifier_infos_utilisateur', verifyToken,  ModifierProfilUtilisateur);
// Supprimer le compte utilisateur
router.delete('/supprimer_compte', verifyToken, SupprimerCompteUtilisateur);


// Routes des produits
router.get("/get_produits", getProduits);
router.get("/produits/:id", getProduitById);
router.post("/ajouter_produits",verifyToken, addProduit);
router.put("/update_produits/:id", verifyToken, updateProduit);
router.delete("/delete_produits/:id",verifyToken, deleteProduit);


// Routes des catégories
router.get("/categories", getCategories);
router.get("/categories/:id", getCategorieById);

// Routes des équipes
router.get("/equipes", getEquipes);
router.get("/equipes/:id", getEquipeById);

// Routes des ligues
router.get("/ligues", getLigues);
router.get("/ligues/:id", getLigueById);

// Routes des badges
router.get("/badges", getBadges);
router.get("/badges/:id", getBadgeById);

// Routes du panier
router.post("/add_panier",  addToCart);
router.get("/get_panier",  getCart);
router.put("/update_panier/:id", verifyToken, updateCartItem);
router.delete("/remove_panier/:id",verifyToken, removeCartItem);
router.post("/merge_panier", verifyToken, mergeCartOnLogin);

// Routes des favoris
router.get("/get_favoris", verifyToken, getFavoris);
router.post("/add_favoris",verifyToken, addFavori);
router.delete("/remove_favoris", verifyToken, removeFavori);

// Routes des commandes
router.post("/create_commande", verifyToken ,createCommande);
router.get("/get_commande", verifyToken, getCommandes);
router.get("/get_commande/:id", verifyToken, getCommandeById);
router.put("/modifier_commande", verifyToken, updateCommande);
router.delete("/annuler_commande", verifyToken, cancelCommande);

// Routes des paiements
router.post("/create_paiement", verifyToken, createPaiement);
router.get("/get_paiement", verifyToken, getPaiements);
router.get("/get_paiement/:id", verifyToken, getPaiementById);
router.get("/facture", verifyToken ,getFacture);

// Routes des factures
router.post("/create_facture", verifyToken, createFacture);
router.get("/get_facture", verifyToken, getFactures);
router.get('/factures/:id',verifyToken, getFactureById);
router.get('/factures/:id/pdf', verifyToken, getFacturePDF);


// Routes de l'historique des paiements
router.post("/create_historique", verifyToken, createHistoriquePaiement);
router.get("/get_historique", verifyToken, getHistoriquePaiements);
router.get("/historique/:id", verifyToken, getHistoriquePaiementById);
router.delete("/delete_historique", verifyToken, deleteHistoriquePaiement);


// Routes pour les défis
router.post("/creer_defis", verifyToken,isSuperAdmin, CreerDefi);
router.get("/obtenir_defis", verifyToken, ObtenirDefis);
router.post("/defis/claim", verifyToken, claimAchievement);

// Route pour les récompenses
router.get("/recompenses", verifyToken, getUserRewards);

// Route pour le parrainage
router.post("/parrainage", verifyToken, UtiliserCodeParrainage);

// // Routes des objectifs de vente
 router.post('/admin/objectifs', verifyToken, isSuperAdmin, CreerObjectifVente);
 router.get('/admin/objectifs', verifyToken, isSuperAdmin, ObtenirObjectifsVente);

export default router
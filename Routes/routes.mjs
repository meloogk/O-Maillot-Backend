import express from "express"
import { ConnexionUtilisateur, InscriptionUtilisateur } from "../controllers/Authentification.controller.mjs"
import { AuthentificationGoogleUtilisateur } from "../controllers/Authentification_Google.controller.mjs"
import { AuthentificationTelephoneUtilisateur } from "../controllers/Authentification_numero.controller.mjs"
import { GetUtilisateurConnecte } from "../controllers/Utilisateur.controller.mjs"
import { verifyToken } from "../middlewares/verifytoken.mjs"
import { isSuperAdmin } from "../middlewares/superadmin.mjs"
import { uploadPhotoProfil } from "../middlewares/upload_photo.mjs"
import { ObtenirProfilUtilisateur, ModifierProfilUtilisateur, SupprimerCompteUtilisateur } from "../controllers/Profil.controller.mjs"
const router = express.Router()

/************ Authentification  ******************/
router.post("/inscription",InscriptionUtilisateur)
router.post("/connexion",ConnexionUtilisateur)
// Route POST pour tester la connexion Google
router.post("/auth_google", AuthentificationGoogleUtilisateur)
router.post("/auth_phone", AuthentificationTelephoneUtilisateur)


/************ Utilisateur  ******************/
router.get("/admin/dashboard", verifyToken, isSuperAdmin, GetUtilisateurConnecte) 
router.get("/user/profil", verifyToken, GetUtilisateurConnecte);
 

/************ Profil Utilisateur  ******************/
router.get("/profil_infos", verifyToken, ObtenirProfilUtilisateur);
router.put("/modifier_profil", verifyToken, uploadPhotoProfil.single("photo") ,ModifierProfilUtilisateur);
router.delete("/supprimer_profil", verifyToken, SupprimerCompteUtilisateur);

export default router
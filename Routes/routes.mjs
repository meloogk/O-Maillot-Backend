import express from "express"
import { ConnexionUtilisateur, InscriptionUtilisateur } from "../controllers/Authentification.controller.mjs"
import { AuthentificationGoogleUtilisateur } from "../controllers/Authentification_Google.controller.mjs"
import { AuthentificationTelephoneUtilisateur } from "../controllers/Authentification_numero.controller.mjs"
const router = express.Router()

/************ Authentification  ******************/
router.post("/inscription",InscriptionUtilisateur)
router.post("/connexion",ConnexionUtilisateur)
// Route POST pour tester la connexion Google
router.post("/auth_google", AuthentificationGoogleUtilisateur)
router.post("/auth_phone", AuthentificationTelephoneUtilisateur)
export default router
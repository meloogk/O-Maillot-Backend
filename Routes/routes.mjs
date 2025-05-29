import express from "express"
import { ConnexionUtilisateur, InscriptionUtilisateur } from "../controllers/Authentification.controller.mjs"

const router = express.Router()

/************ Authentification  ******************/
router.post("/inscription",InscriptionUtilisateur)
router.post("/connnexion",ConnexionUtilisateur)

export default router
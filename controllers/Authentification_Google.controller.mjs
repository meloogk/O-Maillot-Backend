import admin from "../Firebase/firebase_admin.mjs"
import { MongoConnected } from "../Database/database.mjs"
import { UtilisateurSchemaModel } from "../Models/utilisateur.model.mjs"
import bcrypt from "bcrypt"

// Google Sign-in : inscription ou connexion
export const AuthentificationGoogleUtilisateur = async (req, res) => {
  const { idToken } = req.body

  try {
    const db = await MongoConnected()
    if (db !== "ok") {
      return res.status(400).json({ message: "Échec de la connexion à la base de données" })
    }

    if (!idToken) {
      return res.status(400).json({ message: "Token Google manquant" })
    }

    // Vérifier le token reçu côté front avec Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(idToken)

    const { uid, email, name } = decodedToken

    if (!email) {
      return res.status(400).json({ message: "L'email n'est pas fourni par Google" })
    }

    let utilisateur = await UtilisateurSchemaModel.findOne({ email })

    // Création si inexistant
    if (!utilisateur) {
      const fakePassword = await bcrypt.hash(uid + Date.now(), 10)

      utilisateur = new UtilisateurSchemaModel({
        nom: name || "Utilisateur Google",
        email,
        motDePasse: fakePassword, // pour satisfaire le schéma
        rôle: "utilisateur",
        adresse: {},
        telephone: "",
      })

      await utilisateur.save()

      return res.status(201).json({
        message: "Inscription via Google réussie",
        data: {
          nom: utilisateur.nom,
          email: utilisateur.email,
          rôle: utilisateur.rôle,
          adresse: utilisateur.adresse,
          telephone: utilisateur.telephone,
          pointsFidélité: utilisateur.pointsFidélité,
        },
      })
    }

    // Connexion simple si déjà existant
    return res.status(200).json({
      message: "Connexion via Google réussie",
      data: {
        nom: utilisateur.nom,
        email: utilisateur.email,
        rôle: utilisateur.rôle,
        adresse: utilisateur.adresse,
        telephone: utilisateur.telephone,
        pointsFidélité: utilisateur.pointsFidélité,
      },
    })

  } catch (error) {
    console.error("Erreur Google Auth:", error)
    return res.status(500).json({
      message: "Erreur lors de l'authentification Google",
      erreur: error.message,
    })
  }
}

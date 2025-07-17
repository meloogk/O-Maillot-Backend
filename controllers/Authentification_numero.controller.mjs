import admin from "../Firebase/firebase_admin.mjs"
import { MongoConnected } from "../Database/database.mjs"
import { UtilisateurSchemaModel } from "../Models/utilisateur.model.mjs"
import bcrypt from "bcrypt"

// Authentification via téléphone (Firebase)
export const AuthentificationTelephoneUtilisateur = async (req, res) => {
  const { idToken } = req.body

  try {
    const db = await MongoConnected()
    if (db !== "ok") {
      return res.status(400).json({ message: "Échec de la connexion à la base de données" })
    }

    if (!idToken) {
      return res.status(400).json({ message: "Token Firebase manquant" })
    }

    // Vérifier le token avec Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(idToken)

    const { uid, phone_number } = decodedToken

    if (!phone_number) {
      return res.status(400).json({ message: "Numéro de téléphone absent dans le token" })
    }

    let utilisateur = await UtilisateurSchemaModel.findOne({ telephone: phone_number })

    // Création si inexistant
    if (!utilisateur) {
      const fakePassword = await bcrypt.hash(uid + Date.now(), 10)

      utilisateur = new UtilisateurSchemaModel({
        nom: "Utilisateur Téléphone",
        email: `${uid}@firebase.user`,
        motDePasse: fakePassword, // mot de passe factice
        rôle: "utilisateur",
        adresse: {},
        telephone: phone_number,
      })

      await utilisateur.save()

      return res.status(201).json({
        message: "Inscription via téléphone réussie",
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

    // Connexion simple
    return res.status(200).json({
      message: "Connexion via téléphone réussie",
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
    console.error("Erreur Auth Téléphone:", error)
    return res.status(500).json({
      message: "Erreur lors de l'authentification par téléphone",
      erreur: error.message,
    })
  }
}

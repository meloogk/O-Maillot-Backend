import { MongoConnected } from "../Database/database.mjs";
import { UtilisateurSchemaModel } from "../Models/utilisateur.model.mjs";

export const GetUtilisateurConnecte = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== "ok") {
      return res.status(500).json({ message: "Erreur de connexion à la base de données" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Token invalide ou manquant" });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId).select("-motDePasse");
    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Met à jour statut actif si champ existe et utilisateur est inactif
    if (typeof utilisateur.actif !== "undefined" && !utilisateur.actif) {
      utilisateur.actif = true;
      await utilisateur.save();
    }

    // Réponse directe avec adresse telle quelle (objet)
    res.status(200).json({
      id: utilisateur._id,
      nom: utilisateur.nom,
      email: utilisateur.email,
      telephone: utilisateur.telephone || "",
      adresse: utilisateur.adresse || {},      
      photo: utilisateur.photo || null,
      rôle: utilisateur.rôle || "utilisateur",
      pointsFidélité: utilisateur.pointsFidélité || 0,
      crééLe: utilisateur.crééLe || null,
    });
  } catch (error) {
    console.error("Erreur dans GetUtilisateurConnecte:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

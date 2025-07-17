import fs from "fs";
import { MongoConnected } from "../Database/database.mjs";
import { UtilisateurSchemaModel } from "../Models/utilisateur.model.mjs";

export const ObtenirProfilUtilisateur = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== "ok") return res.status(500).json({ message: "Erreur connexion DB" });

    const utilisateur = await UtilisateurSchemaModel.findById(req.user.id).select("-motDePasse");
    if (!utilisateur) return res.status(404).json({ message: "Utilisateur non trouvé" });

    res.status(200).json(utilisateur);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const ModifierProfilUtilisateur = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== "ok") return res.status(500).json({ message: "Erreur connexion DB" });

    const { nom, telephone, adresse } = req.body;
    const utilisateur = await UtilisateurSchemaModel.findById(req.user.id);

    if (!utilisateur) return res.status(404).json({ message: "Utilisateur non trouvé" });

    // Mise à jour des champs texte
    utilisateur.nom = nom || utilisateur.nom;
    utilisateur.telephone = telephone || utilisateur.telephone;
    utilisateur.adresse = adresse || utilisateur.adresse;

    // Gestion de la photo de profil
    if (req.file) {
      // Supprimer l’ancienne photo si elle existe (avec chemin absolu)
      if (utilisateur.photo) {
        const cheminAnciennePhoto = path.resolve(utilisateur.photo);
        if (fs.existsSync(cheminAnciennePhoto)) {
          fs.unlink(cheminAnciennePhoto, (err) => {
            if (err) console.error("Erreur suppression ancienne photo :", err);
          });
        }
      }

      // Enregistrer le chemin relatif pour stockage en base
      utilisateur.photo = `uploads/photos_profil/${req.file.filename}`;
    }

    await utilisateur.save();

    // Préparer les données à renvoyer avec URL complète
    const utilisateurData = utilisateur.toObject();
    if (utilisateur.photo) {
      utilisateurData.photo = `${req.protocol}://${req.get("host")}/${utilisateur.photo}`;
    }

    res.status(200).json({
      message: "Profil mis à jour avec succès",
      utilisateur: utilisateurData,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

export const SupprimerCompteUtilisateur = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== "ok") return res.status(500).json({ message: "Erreur connexion DB" });

    const utilisateur = await UtilisateurSchemaModel.findById(req.user.id);
    if (!utilisateur) return res.status(404).json({ message: "Utilisateur non trouvé" });

    // Supprimer la photo de profil si elle existe
    if (utilisateur.photo && fs.existsSync(utilisateur.photo)) {
      fs.unlink(utilisateur.photo, (err) => {
        if (err) console.error("Erreur suppression photo lors de la suppression du compte :", err);
      });
    }

    await UtilisateurSchemaModel.findByIdAndDelete(req.user.id);

    res.status(200).json({ message: "Compte supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

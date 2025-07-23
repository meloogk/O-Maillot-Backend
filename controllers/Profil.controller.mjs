import mongoose from 'mongoose';
import { MongoConnected } from '../Database/database.mjs';
import { UtilisateurSchemaModel } from '../Models/utilisateur.model.mjs';
import { PanierSchemaModel } from '../models/Panier.model.mjs';
import { CommandeSchemaModel } from '../models/Commande.model.mjs';
import { PaiementSchemaModel } from '../Models/paiement.model.mjs';
import { HistoriquePaiementSchemaModel } from '../Models/historique_Paiement.model.mjs';
import cloudinary from '../config/cloudinary.mjs';


export const ObtenirProfilUtilisateur = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== 'ok') {
      return res.status(500).json({ message: 'Erreur de connexion à la base de données' });
    }

    const userId = req.user?.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Utilisateur non connecté' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId)
      .select('-motDePasse')
      .lean();
    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (!utilisateur.actif) {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    // Inclure reductionAppliquée dans la réponse
    const utilisateurData = {
      ...utilisateur,
      reductionAppliquée: utilisateur.reductionAppliquée || 0,
    };

    res.status(200).json(utilisateurData);
  } catch (error) {
    console.error('Erreur dans ObtenirProfilUtilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const ModifierProfilUtilisateur = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== 'ok') {
      return res.status(500).json({ message: 'Erreur de connexion à la base de données' });
    }

    const userId = req.user?.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Utilisateur non connecté' });
    }

    const { nom, telephone, adresse } = req.body;
    const file = req.file;

    const utilisateur = await UtilisateurSchemaModel.findById(userId);
    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (!utilisateur.actif) {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    // Validation des champs
    if (nom) utilisateur.nom = nom;
    if (telephone && !/^\+?[1-9]\d{1,14}$/.test(telephone)) {
      return res.status(400).json({ message: 'Numéro de téléphone invalide (2 à 15 chiffres)' });
    }
    utilisateur.telephone = telephone || utilisateur.telephone;

    if (adresse) {
      try {
        const parsedAdresse = typeof adresse === 'string' ? JSON.parse(adresse) : adresse;
        if (!parsedAdresse.rue || !parsedAdresse.ville || !parsedAdresse.codePostal || !parsedAdresse.pays) {
          return res.status(400).json({ message: 'Adresse incomplète (rue, ville, codePostal, pays requis)' });
        }
        utilisateur.adresse = parsedAdresse;
      } catch (error) {
        return res.status(400).json({ message: 'Format d’adresse invalide' });
      }
    }

    // Gestion de la photo de profil avec Cloudinary
    if (file) {
      // Supprimer l’ancienne photo si elle existe
      if (utilisateur.photo) {
        const publicId = utilisateur.photo.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId).catch(err => {
          console.error('Erreur suppression ancienne photo Cloudinary:', err);
        });
      }

      // Uploader la nouvelle photo
      const result = await cloudinary.uploader.upload(file.path);
      utilisateur.photo = result.secure_url;
    }

    await utilisateur.save();

    // Préparer les données à renvoyer
    const utilisateurData = utilisateur.toObject({ virtuals: true });
    delete utilisateurData.motDePasse;

    res.status(200).json({
      message: 'Profil mis à jour avec succès',
      utilisateur: utilisateurData,
    });
  } catch (error) {
    console.error('Erreur dans ModifierProfilUtilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const SupprimerCompteUtilisateur = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== 'ok') {
      return res.status(500).json({ message: 'Erreur de connexion à la base de données' });
    }

    const userId = req.user?.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Utilisateur non connecté' });
    }

    const utilisateur = await UtilisateurSchemaModel.findById(userId);
    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (!utilisateur.actif) {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    // Supprimer la photo de profil de Cloudinary
    if (utilisateur.photo) {
      const publicId = utilisateur.photo.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(publicId).catch(err => {
        console.error('Erreur suppression photo Cloudinary:', err);
      });
    }

    // Suppressions en cascade
    await Promise.all([
      // Supprimer le panier
      PanierSchemaModel.deleteOne({ utilisateur: userId }),
      // Supprimer les commandes
      CommandeSchemaModel.deleteMany({ utilisateur: userId }),
      // Supprimer les paiements
      PaiementSchemaModel.deleteMany({ utilisateur: userId }),
      // Supprimer l’historique des paiements
      HistoriquePaiementSchemaModel.deleteMany({ utilisateur: userId }),
      // Retirer l’utilisateur des personnesParrainees des autres utilisateurs
      UtilisateurSchemaModel.updateMany(
        { personnesParrainees: userId },
        { $pull: { personnesParrainees: userId } }
      ),
    ]);

    // Supprimer l’utilisateur
    await UtilisateurSchemaModel.findByIdAndDelete(userId);

    res.status(200).json({ message: 'Compte supprimé avec succès' });
  } catch (error) {
    console.error('Erreur dans SupprimerCompteUtilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
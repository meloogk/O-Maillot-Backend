import multer from 'multer';
import cloudinary from '../config/cloudinary.mjs';

import { MongoConnected } from '../Database/database.mjs';
import { UtilisateurSchemaModel } from '../Models/utilisateur.model.mjs';

// Configuration de Multer pour stockage en mémoire
const storage = multer.memoryStorage();

export const uploadPhotoProfil = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const typesAutorises = /jpeg|jpg|png|webp/;
    const extname = typesAutorises.test(file.originalname.toLowerCase().split('.').pop());
    const mimetype = typesAutorises.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé. Seuls JPEG, JPG, PNG et WEBP sont acceptés.'));
    }
  },
}).single('photo'); // Champ attendu : 'photo'

// Middleware pour gérer l’upload vers Cloudinary
export const uploadToCloudinary = async (req, res, next) => {
  try {
    const db = await MongoConnected();
    if (db !== 'ok') {
      return res.status(500).json({ message: 'Erreur de connexion à la base de données' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Authentification requise' });
    }

    if (!req.user.actif) {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Aucune photo fournie' });
    }

    // Uploader vers Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'omaillot/photos_profil',
          public_id: `photo_${req.user.id}_${Date.now()}`,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    // Récupérer l’utilisateur
    const utilisateur = await UtilisateurSchemaModel.findById(req.user.id);
    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Supprimer l’ancienne photo sur Cloudinary si elle existe
    if (utilisateur.photo) {
      const publicId = utilisateur.photo.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`omaillot/photos_profil/${publicId}`);
    }

    // Mettre à jour le champ photo
    utilisateur.photo = result.secure_url;
    await utilisateur.save();

    // Formater la réponse
    const utilisateurData = {
      nom: utilisateur.nom,
      email: utilisateur.email,
      telephone: utilisateur.telephone,
      adresse: utilisateur.adresse,
      rôle: utilisateur.rôle,
      photo: utilisateur.photo,
      pointsFidélité: utilisateur.pointsFidélité,
      reductionAppliquée: utilisateur.reductionAppliquée,
      codeParrainage: utilisateur.codeParrainage,
      createdAt: utilisateur.createdAt,
      updatedAt: utilisateur.updatedAt,
    };

    res.status(200).json({
      message: 'Photo de profil mise à jour avec succès',
      utilisateur: utilisateurData,
    });
  } catch (error) {
    console.error('Erreur dans uploadToCloudinary:', error);
    res.status(500).json({ message: 'Erreur lors de l’upload de la photo', error: error.message });
  }
};
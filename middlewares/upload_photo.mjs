import multer from "multer";
import path from "path";
import fs from "fs";

// Dossier de destination
const dossierDestination = "uploads/photos_profil";
fs.mkdirSync(dossierDestination, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, dossierDestination);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const nomFichier = `photo_${Date.now()}${ext}`;
    cb(null, nomFichier);
  },
});

export const uploadPhotoProfil = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const typesAutorises = /jpeg|jpg|png|webp/;
    const extname = typesAutorises.test(path.extname(file.originalname).toLowerCase());
    const mimetype = typesAutorises.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Type de fichier non autorisé"));
    }
  },
});

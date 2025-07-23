import express from 'express';
import cors from 'cors';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import router from './Routes/routes.mjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MongoConnected } from './Database/database.mjs';
import { UtilisateurSchemaModel } from './Models/utilisateur.model.mjs';
import { admin } from './Firebase/firebase_admin.mjs';
import { nanoid } from 'nanoid';

dotenv.config();
const app = express();

// Configuration de CORS
const domaineAutorise = ['http://localhost:7777', 'http://localhost:3000'];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || domaineAutorise.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Domaine non autorisé par le CORS'));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));

// Middleware pour parsing JSON
app.use(express.json());

// Configuration des sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URL,
      collectionName: 'sessions',
    }),
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 jour
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
    },
  })
);

// Connexion à MongoDB
MongoConnected();

// Route de bienvenue
app.get('/', (req, res) => {
  res.send('Bienvenue sur mon site de vente de maillot !');
});

// Montage des routes
app.use('/api', router);

// Création du superadmin
const creerSuperAdmin = async () => {
  const superadminEmail = process.env.SUPERADMIN_EMAIL;
  const superadminPassword = process.env.SUPERADMIN_PASSWORD;
  if (!superadminEmail || !superadminPassword) {
    console.error('SUPERADMIN_EMAIL ou SUPERADMIN_PASSWORD manquant dans .env');
    return;
  }

  try {
    const existant = await UtilisateurSchemaModel.findOne({ email: superadminEmail });
    if (!existant) {
      console.log('Tentative de création du superadmin dans Firebase:', superadminEmail);
      let userRecord;
      try {
        userRecord = await admin.auth().createUser({
          email: superadminEmail,
          password: superadminPassword,
          displayName: 'Admin principal',
        });
      } catch (error) {
        if (error.code === 'auth/email-already-exists') {
          console.log(`Superadmin déjà existant dans Firebase: ${superadminEmail}`);
          return;
        }
        throw new Error(`Erreur Firebase lors de la création du superadmin: ${error.message}`);
      }

      if (!userRecord || !userRecord.uid) {
        throw new Error('Échec de la création du superadmin dans Firebase: UID non renvoyé');
      }

      await UtilisateurSchemaModel.create({
        nom: 'Admin principal',
        email: superadminEmail,
        motDePasse: superadminPassword, // Sera crypté par le hook pre('save')
        typeConnexion: 'email',
        uidFirebase: userRecord.uid,
        rôle: 'admin',
        codeParrainage: nanoid(8),
        pointsFidélité: 0,
        actif: true,
      });
      console.log('Superadmin créé avec succès:', superadminEmail);
    } else {
      console.log('Superadmin déjà existant dans MongoDB:', superadminEmail);
    }
  } catch (error) {
    console.error('Erreur lors de la création du superadmin:', {
      message: error.message,
      stack: error.stack,
    });
  }
};

// Exécuter après connexion MongoDB
mongoose.connection.once('open', async () => {
  await creerSuperAdmin();
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  if (res.headersSent) {
    console.error('Headers already sent, skipping error response:', err);
    return next(err);
  }
  console.error('Erreur globale:', err.stack);
  res.status(500).json({ message: 'Erreur serveur', error: err.message });
});

// Démarrer le serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
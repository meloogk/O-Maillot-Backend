import { adminAuth } from '../Firebase/firebase_admin.mjs';
import { MongoConnected } from '../Database/database.mjs';
import { UtilisateurSchemaModel } from '../Models/utilisateur.model.mjs';
import { nanoid } from 'nanoid';

// Fonction utilitaire pour formater la réponse utilisateur
const formatUserResponse = (utilisateur) => {
  const utilisateurData = utilisateur.toObject({ virtuals: true });
  delete utilisateurData.motDePasse;
  return {
    nom: utilisateurData.nom,
    email: utilisateurData.email,
    telephone: utilisateurData.telephone,
    adresse: utilisateurData.adresse,
    rôle: utilisateurData.rôle || 'utilisateur',
    photo: utilisateurData.photo,
    pointsFidélité: utilisateurData.pointsFidélité,
    reductionAppliquée: utilisateurData.reductionAppliquée,
    codeParrainage: utilisateurData.codeParrainage,
    createdAt: utilisateurData.createdAt,
    updatedAt: utilisateurData.updatedAt,
  };
};

// Inscription via email
export const registerWithEmail = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== 'ok') {
      console.log('Erreur de connexion à la base de données dans registerWithEmail');
      return res.status(500).json({ message: 'Erreur de connexion à la base de données' });
    }

    const { nom, email, motDePasse, confirmationMotDePasse, telephone, adresse } = req.body;
    console.log('Données reçues dans registerWithEmail:', { nom, email, telephone, adresse });

    if (!nom || !email || !motDePasse || !confirmationMotDePasse) {
      console.log('Champs requis manquants dans registerWithEmail');
      return res.status(400).json({ message: 'Nom, email, mot de passe et confirmation requis' });
    }

    if (motDePasse !== confirmationMotDePasse) {
      console.log('Les mots de passe ne correspondent pas');
      return res.status(400).json({ message: 'Les mots de passe ne correspondent pas' });
    }

    if (telephone && !/^\+?[1-9]\d{1,14}$/.test(telephone)) {
      console.log('Numéro de téléphone invalide:', telephone);
      return res.status(400).json({ message: 'Numéro de téléphone invalide (2 à 15 chiffres)' });
    }

    if (adresse) {
      const parsedAdresse = typeof adresse === 'string' ? JSON.parse(adresse) : adresse;
      if (!parsedAdresse.rue || !parsedAdresse.ville || !parsedAdresse.codePostal || !parsedAdresse.pays) {
        console.log('Adresse incomplète:', parsedAdresse);
        return res.status(400).json({ message: 'Adresse incomplète (rue, ville, codePostal, pays requis)' });
      }
    }

    const existingUser = await UtilisateurSchemaModel.findOne({ email });
    if (existingUser) {
      console.log(`Email déjà utilisé dans MongoDB: ${email}`);
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }

    console.log('Vérification de l’utilisateur dans Firebase:', { email });
    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
      console.log(`Utilisateur trouvé dans Firebase: ${email}, UID: ${userRecord.uid}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('Tentative de création d’utilisateur dans Firebase:', { email, nom });
        try {
          userRecord = await adminAuth.createUser({
            email,
            password: motDePasse,
            displayName: nom,
          });
        } catch (createError) {
          if (createError.code === 'auth/email-already-exists') {
            console.log(`Email déjà utilisé dans Firebase: ${email}`);
            return res.status(400).json({ message: 'Email déjà utilisé dans Firebase' });
          }
          throw createError;
        }
      } else {
        throw error;
      }
    }

    if (!userRecord || !userRecord.uid) {
      console.log('Échec de la création ou récupération de l’utilisateur dans Firebase: UID non renvoyé');
      return res.status(500).json({ message: 'Échec de la création ou récupération de l’utilisateur dans Firebase' });
    }
    console.log('userRecord:', userRecord);

    const superadminEmail = process.env.SUPERADMIN_EMAIL;
    const utilisateur = new UtilisateurSchemaModel({
      nom,
      email,
      motDePasse,
      typeConnexion: 'email',
      uidFirebase: userRecord.uid,
      telephone,
      adresse,
      rôle: email === superadminEmail ? 'admin' : 'utilisateur',
      codeParrainage: nanoid(8),
      pointsFidélité: 0,
      actif: true,
    });

    console.log('Tentative d’enregistrement dans MongoDB:', utilisateur);
    await utilisateur.save();

    console.log('Inscription réussie pour:', email);
    return res.status(201).json({
      message: 'Inscription réussie, veuillez vous connecter',
      utilisateur: formatUserResponse(utilisateur),
    });
  } catch (error) {
    console.error('Erreur dans registerWithEmail:', error);
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Connexion via email
export const loginWithEmail = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== 'ok') {
      console.log('Erreur de connexion à la base de données dans loginWithEmail');
      return res.status(500).json({ message: 'Erreur de connexion à la base de données' });
    }

    const { idToken } = req.body;
    if (!idToken) {
      console.log('ID token requis manquant dans loginWithEmail');
      return res.status(400).json({ message: 'ID token requis' });
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const utilisateur = await UtilisateurSchemaModel.findOne({ uidFirebase: decodedToken.uid });
    if (!utilisateur || !utilisateur.actif) {
      console.log(`Utilisateur non trouvé ou compte inactif pour uidFirebase: ${decodedToken.uid}`);
      return res.status(401).json({ message: 'Utilisateur non trouvé ou compte inactif' });
    }

    if (utilisateur.typeConnexion !== 'email') {
      console.log(`Mauvais type de connexion pour ${utilisateur.email}: ${utilisateur.typeConnexion}`);
      return res.status(400).json({ message: 'Ce compte utilise une autre méthode de connexion' });
    }

    const utilisateurData = formatUserResponse(utilisateur);
    console.log('Connexion réussie pour:', utilisateur.email);
    return res.status(200).json({
      message: 'Connexion réussie',
      token: idToken,
      utilisateur: utilisateurData,
    });
  } catch (error) {
    console.error('Erreur dans loginWithEmail:', error);
    if (error.code === 'auth/id-token-expired') {
      console.log('Token expiré dans loginWithEmail');
      return res.status(401).json({ message: 'Token expiré' });
    }
    return res.status(401).json({ message: 'Token invalide', error: error.message });
  }
};

// Connexion/Inscription via Google
export const loginWithGoogle = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== 'ok') {
      console.log('Erreur de connexion à la base de données dans loginWithGoogle');
      return res.status(500).json({ message: 'Erreur de connexion à la base de données' });
    }

    const { idToken } = req.body;
    if (!idToken) {
      console.log('Token Google requis manquant dans loginWithGoogle');
      return res.status(400).json({ message: 'Token Google requis' });
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid, email, name } = decodedToken;

    if (!email) {
      console.log('Email non fourni par Google dans loginWithGoogle');
      return res.status(400).json({ message: 'Email non fourni par Google' });
    }

    let utilisateur = await UtilisateurSchemaModel.findOne({ uidFirebase: uid });
    if (!utilisateur) {
      const superadminEmail = process.env.SUPERADMIN_EMAIL;
      utilisateur = new UtilisateurSchemaModel({
        nom: name || 'Utilisateur Google',
        email,
        motDePasse: null,
        typeConnexion: 'google.com',
        uidFirebase: uid,
        rôle: email === superadminEmail ? 'admin' : 'utilisateur',
        codeParrainage: nanoid(8),
        pointsFidélité: 0,
        actif: true,
      });
      await utilisateur.save();
      console.log('Nouvel utilisateur Google créé:', email);
    }

    if (!utilisateur.actif) {
      console.log(`Compte inactif pour ${email}`);
      return res.status(403).json({ message: 'Compte inactif' });
    }

    const utilisateurData = formatUserResponse(utilisateur);
    console.log(`Connexion/Inscription Google réussie pour: ${email}`);
    return res.status(200).json({
      message: utilisateur.createdAt === utilisateur.updatedAt ? 'Inscription Google réussie' : 'Connexion Google réussie',
      token: idToken,
      utilisateur: utilisateurData,
    });
  } catch (error) {
    console.error('Erreur dans loginWithGoogle:', error);
    if (error.code === 'auth/id-token-expired') {
      console.log('Token expiré dans loginWithGoogle');
      return res.status(401).json({ message: 'Token expiré' });
    }
    return res.status(401).json({ message: 'Token invalide', error: error.message });
  }
};

// Connexion/Inscription via téléphone
export const loginWithPhone = async (req, res) => {
  try {
    const db = await MongoConnected();
    if (db !== 'ok') {
      console.log('Erreur de connexion à la base de données dans loginWithPhone');
      return res.status(500).json({ message: 'Erreur de connexion à la base de données' });
    }

    const { idToken } = req.body;
    if (!idToken) {
      console.log('Token téléphone requis manquant dans loginWithPhone');
      return res.status(400).json({ message: 'Token téléphone requis' });
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid, phone_number } = decodedToken;

    if (!phone_number) {
      console.log('Numéro de téléphone non fourni dans loginWithPhone');
      return res.status(400).json({ message: 'Numéro de téléphone non fourni' });
    }

    let utilisateur = await UtilisateurSchemaModel.findOne({ uidFirebase: uid });
    if (!utilisateur) {
      utilisateur = new UtilisateurSchemaModel({
        nom: 'Utilisateur Téléphone',
        motDePasse: null,
        typeConnexion: 'phone',
        uidFirebase: uid,
        telephone: phone_number,
        rôle: 'utilisateur',
        codeParrainage: nanoid(8),
        pointsFidélité: 0,
        actif: true,
      });
      await utilisateur.save();
      console.log('Nouvel utilisateur téléphone créé:', phone_number);
    }

    if (!utilisateur.actif) {
      console.log(`Compte inactif pour téléphone: ${phone_number}`);
      return res.status(403).json({ message: 'Compte inactif' });
    }

    const utilisateurData = formatUserResponse(utilisateur);
    console.log(`Connexion/Inscription téléphone réussie pour: ${phone_number}`);
    return res.status(200).json({
      message: utilisateur.createdAt === utilisateur.updatedAt ? 'Inscription téléphone réussie' : 'Connexion téléphone réussie',
      token: idToken,
      utilisateur: utilisateurData,
    });
  } catch (error) {
    console.error('Erreur dans loginWithPhone:', error);
    if (error.code === 'auth/id-token-expired') {
      console.log('Token expiré dans loginWithPhone');
      return res.status(401).json({ message: 'Token expiré' });
    }
    return res.status(401).json({ message: 'Token invalide', error: error.message });
  }
};
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { calculerNiveau } from '../utils/recompenses.mjs';

const UtilisateurSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, 'Le nom est requis'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'L’email est requis'],
      unique: true,
      lowercase: true,
      index: true,
      match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'L’email doit être valide'],
    },
    motDePasse: {
      type: String,
      required: [false, 'Le mot de passe est requis pour les connexions par email'],
    },
    typeConnexion: {
      type: String,
      enum: {
        values: ['email', 'google.com', 'facebook.com', 'github.com', 'apple.com', 'microsoft.com', 'phone'],
        message: 'Le type de connexion doit être email, google.com, facebook.com, github.com, apple.com, microsoft.com ou phone',
      },
      default: 'email',
    },
    uidFirebase: {
      type: String,
      required: [true, 'L’UID Firebase est requis'],
      unique: true,
    },
    rôle: {
      type: String,
      enum: {
        values: ['utilisateur', 'admin'],
        message: 'Le rôle doit être "utilisateur" ou "admin"',
      },
      default: 'utilisateur',
    },
    adresse: {
      rue: { type: String },
      ville: { type: String },
      codePostal: { type: String },
      pays: { type: String },
    },
    telephone: {
      type: String,
      match: [/^\+?[1-9]\d{1,14}$/, 'Le numéro de téléphone doit être valide (2 à 15 chiffres)'],
    },
    photo: { type: String },
    favoris: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Produit', index: true }],
    pointsFidélité: {
      type: Number,
      default: 0,
      min: [0, 'Les points de fidélité ne peuvent pas être négatifs'],
    },
    actif: {
      type: Boolean,
      default: true,
    },
    codeParrainage: {
      type: String,
      unique: true,
      default: () => nanoid(8),
    },
    personnesParrainees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', index: true }],
    pointsParrainage: {
      type: Number,
      default: 0,
      min: [0, 'Les points de parrainage ne peuvent pas être négatifs'],
    },
    totalEarned: {
      type: Number,
      default: 0,
      min: [0, 'Les points gagnés par parrainage ne peuvent pas être négatifs'],
    },
    codeParrainUtilise: {
      type: String,
      default: null,
    },
    badges: [{
      badgeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Badge' },
      unlockedAt: { type: Date, default: Date.now },
    }],
    achievements: [{
      defiId: { type: mongoose.Schema.Types.ObjectId, ref: 'Defi' },
      progress: { type: Number, default: 0 },
      completed: { type: Boolean, default: false },
      completedAt: { type: Date },
      claimed: { type: Boolean, default: false },
    }],
    streaks: {
      currentLoginStreak: { type: Number, default: 0 },
      longestLoginStreak: { type: Number, default: 0 },
      lastLoginDate: { type: Date },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Champ virtuel pour la réduction appliquée
UtilisateurSchema.virtual('reductionAppliquée').get(function () {
  return calculerNiveau(this.pointsFidélité).recompenses.reduction;
});

// Hachage du mot de passe pour les connexions de type 'email'
UtilisateurSchema.pre('save', async function (next) {
  if (this.isModified('motDePasse') && this.typeConnexion === 'email' && this.motDePasse) {
    this.motDePasse = await bcrypt.hash(this.motDePasse, 10);
  }
  next();
});

// Comparaison du mot de passe
UtilisateurSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.motDePasse || this.typeConnexion !== 'email') return false;
  return await bcrypt.compare(candidatePassword, this.motDePasse);
};

export const UtilisateurSchemaModel = mongoose.model('Utilisateur', UtilisateurSchema);
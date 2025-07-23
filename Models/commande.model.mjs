import mongoose from 'mongoose';

const ArticleCommandeSchema = new mongoose.Schema({
  produit: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Produit', 
    required: [true, 'Le produit est requis'], 
    index: true 
  },
  quantité: { 
    type: Number, 
    required: [true, 'La quantité est requise'], 
    min: [1, 'La quantité doit être au moins 1'] 
  },
  taille: { 
    type: String, 
    enum: {
      values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      message: 'La taille doit être XS, S, M, L, XL ou XXL'
    }, 
    required: [true, 'La taille est requise'] 
  },
});

const CommandeSchema = new mongoose.Schema({
  utilisateur: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Utilisateur', 
    required: [true, 'L’utilisateur est requis'], 
    index: true 
  },
  articles: {
    type: [ArticleCommandeSchema],
    required: [true, 'Les articles sont requis'],
    validate: {
      validator: arr => arr.length > 0,
      message: 'La commande doit contenir au moins un article'
    }
  },
  prixTotal: { 
    type: Number, 
    required: [true, 'Le prix total est requis'], 
    min: [0, 'Le prix total ne peut pas être négatif'] 
  },
  adresseLivraison: {
    rue: { type: String, required: [true, 'La rue est requise'], trim: true },
    ville: { type: String, required: [true, 'La ville est requise'], trim: true },
    codePostal: { type: String, required: [true, 'Le code postal est requis'], trim: true },
    pays: { type: String, required: [true, 'Le pays est requis'], trim: true },
  },
  statutCommande: { 
    type: String, 
    enum: {
      values: ['en attente', 'payée', 'expédiée', 'livrée', 'annulée'],
      message: 'Statut invalide, doit être : en attente, payée, expédiée, livrée ou annulée'
    }, 
    default: 'en attente',
    index: true 
  },
  reductionAppliquée: {
    type: Number,
    min: [0, 'La réduction ne peut pas être négative'],
    max: [100, 'La réduction ne peut pas dépasser 100%'],
    default: 0,
  },
  dateLivraisonPrévue: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours après la création
  },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

export const CommandeSchemaModel = mongoose.model('Commande', CommandeSchema);
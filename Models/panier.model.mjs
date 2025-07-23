import mongoose from 'mongoose';

const ArticlePanierSchema = new mongoose.Schema({
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

const PanierSchema = new mongoose.Schema({
  utilisateur: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Utilisateur', 
    index: { sparse: true } 
  },
  sessionId: { 
    type: String, 
    index: { sparse: true } 
  },
  articles: {
    type: [ArticlePanierSchema],
    default: [],
  },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Validation pour garantir utilisateur ou sessionId
PanierSchema.pre('validate', function (next) {
  if (!this.utilisateur && !this.sessionId) {
    next(new Error('Le panier doit être associé à un utilisateur ou à un sessionId'));
  } else if (this.utilisateur && this.sessionId) {
    next(new Error('Le panier ne peut pas être associé à un utilisateur et à un sessionId simultanément'));
  } else {
    next();
  }
});

export const PanierSchemaModel = mongoose.model('Panier', PanierSchema);
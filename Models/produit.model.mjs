import mongoose from 'mongoose';
import { convertCurrency } from '../config/exchangerate.mjs';

const TailleSchema = new mongoose.Schema({
  taille: { 
    type: String, 
    enum: {
      values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      message: 'La taille doit être XS, S, M, L, XL ou XXL'
    }, 
    required: [true, 'La taille est requise'] 
  },
  quantité: { 
    type: Number, 
    required: [true, 'La quantité est requise'], 
    min: [0, 'La quantité ne peut pas être négative'] 
  }
});

const ProduitSchema = new mongoose.Schema({
  titre: { 
    type: String, 
    required: [true, 'Le titre est requis'], 
    trim: true 
  },
  description: { type: String },
  prix: { 
    type: Number, 
    required: [true, 'Le prix est requis'], 
    min: [0, 'Le prix ne peut pas être négatif'] 
  },
  catégorie: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Categorie', 
    required: [true, 'La catégorie est requise'], 
    index: true 
  },
  équipe: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Equipe', 
    required: [true, 'L’équipe est requise'], 
    index: true 
  },
  ligue: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Ligue', 
    required: [true, 'La ligue est requise'], 
    index: true 
  },
  stock: { 
    type: Number, 
    required: [true, 'Le stock est requis'], 
    min: [0, 'Le stock ne peut pas être négatif'] 
  },
  tailles: [TailleSchema],
  images: [{ type: String }],
  enVedette: { type: Boolean, default: false },
  season: { type: String },
  isHome: { type: Boolean, default: false },
  discount: { 
    type: Number, 
    default: 0, 
    min: [0, 'La réduction ne peut pas être négative'] 
  },
  avis: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Avis', 
    index: true 
  }],
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Validation pour éviter les doublons dans tailles
ProduitSchema.pre('validate', function (next) {
  if (this.tailles) {
    const taillesSet = new Set(this.tailles.map(t => t.taille));
    if (taillesSet.size !== this.tailles.length) {
      next(new Error('Les tailles ne doivent pas contenir de doublons'));
    }
  }
  next();
});

// Champ virtuel pour les prix avec conversions
ProduitSchema.virtual('price').get(async function () {
  const prixXOF = this.prix * (1 - (this.discount || 0) / 100);
  return {
    XOF: prixXOF,
    EUR: await convertCurrency(prixXOF, 'XOF', 'EUR'),
    USD: await convertCurrency(prixXOF, 'XOF', 'USD'),
  };
});

export const ProduitSchemaModel = mongoose.model('Produit', ProduitSchema);
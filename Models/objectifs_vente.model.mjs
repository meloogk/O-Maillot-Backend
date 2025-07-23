import mongoose from 'mongoose';

const { model, Schema } = mongoose;

const ObjectifVenteSchema = new Schema({
  type: { 
    type: String, 
    enum: ['global', 'categorie', 'equipe', 'ligue', 'utilisateur'], 
    required: true 
  },
  montant: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  montantAtteint: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  dateDebut: { 
    type: Date, 
    required: true 
  },
  dateFin: { 
    type: Date, 
    required: true 
  },
  creePar: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Utilisateur', 
    required: true 
  },
  categorie: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Categorie', 
    required: function() { return this.type === 'categorie'; } 
  },
  equipe: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Equipe', 
    required: function() { return this.type === 'equipe'; } 
  },
  ligue: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Ligue', 
    required: function() { return this.type === 'ligue'; } 
  },
  utilisateurCible: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Utilisateur', 
    required: function() { return this.type === 'utilisateur'; } 
  },
  progression: { 
    type: Number, 
    default: 0, 
    min: 0, 
    max: 100 
  },
  creeLe: { 
    type: Date, 
    default: Date.now 
  },
  misAJourLe: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Middleware pour calculer la progression avant sauvegarde
ObjectifVenteSchema.pre('save', function(next) {
  if (this.montant > 0) {
    this.progression = Number(((this.montantAtteint / this.montant) * 100).toFixed(2));
  }
  next();
});

export const ObjectifVenteSchemaModel = model.ObjectifVente || model('ObjectifVente', ObjectifVenteSchema);
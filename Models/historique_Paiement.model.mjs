import mongoose from 'mongoose';

const HistoriquePaiementSchema = new mongoose.Schema({
  commande: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Commande', 
    required: true, 
    index: true 
  },
  utilisateur: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Utilisateur', 
    required: true, 
    index: true 
  },
  méthode: { 
    type: String, 
    enum: ['carte', 'paypal', 'stripe'], 
    required: true 
  },
  statut: { 
    type: String, 
    enum: ['en attente', 'payée', 'échouée', 'remboursée'], 
    required: true, 
    default: 'en attente' 
  },
  montant: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  devise: { 
    type: String, 
    enum: ['XOF', 'EUR', 'USD'], 
    default: 'XOF' 
  },
  détails: { 
    type: Object, 
    default: {} 
  },
  transactionId: { 
    type: String, 
    unique: true, 
    sparse: true 
  },
  datePaiement: { 
    type: Date, 
    default: Date.now 
  },
  crééLe: { 
    type: Date, 
    default: Date.now 
  },
}, { timestamps: true });

export const HistoriquePaiementSchemaModel = mongoose.model('HistoriquePaiement', HistoriquePaiementSchema);
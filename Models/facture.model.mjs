import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

const FactureSchema = new mongoose.Schema({
  paiement: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Paiement', 
    required: true, 
    index: true,
    unique: true 
  },
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
  numéroFacture: { 
    type: String, 
    unique: true, 
    default: () => `FACT-${nanoid(8)}` 
  },
  mentionsLégales: { 
    type: String, 
    default: '' 
  },
  crééLe: { 
    type: Date, 
    default: Date.now 
  },
}, { timestamps: true });

export const FactureSchemaModel = mongoose.model('Facture', FactureSchema);
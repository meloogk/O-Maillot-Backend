import mongoose from 'mongoose';

const DefiSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  description: { type: String, required: true },
  points: { type: Number, required: true, min: 0 },
  critere: {
    type: { type: String, enum: ['achat', 'parrainage', 'connexion'], required: true },
    valeur: { type: Number, required: true, min: 0 },
  },
  actif: { type: Boolean, default: true },
  crééLe: { type: Date, default: Date.now },
});

export const DefiSchemaModel = mongoose.models.Defi || mongoose.model('Defi', DefiSchema);
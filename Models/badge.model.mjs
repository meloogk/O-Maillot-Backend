import mongoose from 'mongoose';
const { model, Schema } = mongoose;

const BadgeSchema = new Schema({
  nom: { type: String, required: [true, 'Le nom est requis'], trim: true },
  description: { type: String, required: [true, 'La description est requise'] },
  image: { type: String, required: [true, 'L’image est requise'] },
  icon: { type: String, required: [true, 'L’icône est requise'] },
  color: { type: String, required: [true, 'La couleur est requise'] },
  rarity: { 
    type: String, 
    enum: ['COMMON', 'RARE', 'EPIC', 'LEGENDARY'], 
    required: [true, 'La rareté est requise'] 
  },
  niveau: { type: String, required: [true, 'Le niveau est requis'] }, // Lien avec recompenses.mjs
  crééLe: { type: Date, default: Date.now },
  misÀJourLe: { type: Date, default: Date.now },
});

export const BadgeSchemaModel = model('Badge', BadgeSchema);
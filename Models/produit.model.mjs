import mongoose from "mongoose";
const { model, Schema } = mongoose

const TailleSchema = new Schema({
    taille: { type: String, enum: ['XS','S', 'M', 'L', 'XL','XXL'], required: true },
    quantité: { type: Number, required: true }
});

const ProduitSchema = new Schema({
  titre: { type: String, required: true },
  description: { type: String },
  prix: { type: Number, required: true },
  catégorie: { type: mongoose.Schema.Types.ObjectId, ref: 'Categorie' },
  équipe: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipe' },
  ligue: { type: mongoose.Schema.Types.ObjectId, ref: 'Ligue' },
  badges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
  stock: { type: Number, default: 0 },
  tailles: [TailleSchema],
  images: [String],
  enVedette: { type: Boolean, default: false },
  avis: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Avis' }],
  crééLe: { type: Date, default: Date.now }
    })

    export const ProduitSchemaModel = model.Produit || model("Produit", ProduitSchema)
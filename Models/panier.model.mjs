import mongoose from "mongoose";
const { model, Schema } = mongoose

const articlePanierSchema = new Schema({
    produit: { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true },
    quantité: { type: Number, required: true },
    taille: { type: String, enum:['XS','S', 'M', 'L', 'XL','XXL'], required: true }
});

const PanierSchema = new Schema({
  utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', unique: true },
  articles: [articlePanierSchema],
  misÀJourLe: { type: Date, default: Date.now }
    })

    export const PanierSchemaModel = model.Panier || model("Panier", PanierSchema)
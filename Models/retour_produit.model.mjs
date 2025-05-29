import mongoose from "mongoose";
const { model, Schema } = mongoose

const RetourProduitSchema = new Schema({
    commande: { type: mongoose.Schema.Types.ObjectId, ref: 'Commande', required: true },
    produit: { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true },
    raison: { type: String },
    approuvé: { type: Boolean, default: false },
    demandéLe: { type: Date, default: Date.now }
    })

    export const RetourProduitSchemaModel = model.RetourProduit || model(" Retour Produit",  RetourProduitSchema)
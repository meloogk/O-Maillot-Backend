import mongoose from "mongoose";
const { model, Schema } = mongoose

const AvisSchema = new Schema({
    utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur' },
    produit: { type: mongoose.Schema.Types.ObjectId, ref: 'Produit' },
    note: { type: Number, min: 1, max: 5, required: true },
    commentaire: { type: String },
    crééLe: { type: Date, default: Date.now }
    })

    export const AvisSchemaModel = model.Avis || model("Avis", AvisSchema)
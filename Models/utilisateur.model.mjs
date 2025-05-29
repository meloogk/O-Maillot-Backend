import mongoose from "mongoose";
const { model, Schema } = mongoose

const UtilisateurSchema = new Schema({
    nom: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    motDePasse: { type: String, required: true },
    
    rôle: { type: String, enum: ['utilisateur', 'admin'], default: 'utilisateur' },
    adresse: { type: Object },
    telephone: { type: String },
    favoris: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Produit' }],
    listeSouhaits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Produit' }],
    pointsFidélité: { type: Number, default: 0 },
    crééLe: { type: Date, default: Date.now }
    })

    export const UtilisateurSchemaModel = model.Utilisateurs || model("Utilisateurs", UtilisateurSchema)
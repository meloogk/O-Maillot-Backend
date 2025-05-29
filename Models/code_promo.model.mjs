import mongoose from "mongoose";
const { model, Schema } = mongoose

const CodePromoSchema = new Schema({
    code: { type: String, required: true, unique: true },
    typeRemise: { type: String, enum: ['pourcentage', 'montantFixe'], required: true },
    valeur: { type: Number, required: true },
    dateExpiration: { type: Date, required: true },
    montantMinimumCommande: { type: Number, default: 0 },
    utiliséPar: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur' }]
    })

    export const CodePromoSchemaModel = model.CodePromo || model("CodePromo", CodePromoSchema)
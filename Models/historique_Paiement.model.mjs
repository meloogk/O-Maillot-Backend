import mongoose from "mongoose";
const { model, Schema } = mongoose

const HistoriquePaiementSchema = new Schema({
    commande: { type: mongoose.Schema.Types.ObjectId, ref: 'Commande' },
    méthode: { type: String }, 
    statut: { type: String },
    montant: { type: Number },
    date: { type: Date, default: Date.now }
    })

    export const HistoriquePaiementSchemaModel = model.HistoriquePaiement|| model("Historique Paiement", HistoriquePaiementSchema)
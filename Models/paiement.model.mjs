import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const PaiementSchema = new Schema({
    commande: { type: mongoose.Schema.Types.ObjectId, ref: 'Commande', required: true},
    utilisateur: {type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur',required: true},
    méthode: { type: String, enum: ['carte', 'paypal', 'stripe'],required: true},
    statut: { type: String,enum:['en attente', 'payée', 'échouée', 'remboursée'], default: 'en attente'},
    montant: { type: Number,required: true},
    devise: {type: String,default: 'FCFA'},
    transactionId: {type: String, required: false},
    détails: {type: Object },
    datePaiement: {type: Date, default: Date.now}
});

export const PaiementSchemaModel = model.Paiement || model('Paiement', PaiementSchema);

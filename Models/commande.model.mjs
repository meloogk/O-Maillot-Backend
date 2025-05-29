import mongoose from "mongoose";
const { model, Schema } = mongoose;

const articleCommandeSchema = new Schema({
  produit: { type: mongoose.Schema.Types.ObjectId, ref: 'Produit' },
  quantité: { type: Number, required: true },
  taille: { type: String, enum: ['XS','S', 'M', 'L', 'XL','XXL'], required: true }
});

const CommandeSchema = new Schema({
  utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur' },
  articles: [articleCommandeSchema],
  prixTotal: { type: Number, required: true },
  adresseLivraison: { type: Object, required: true },
  paiement: {
    méthode: { type: String, enum: ['carte', 'paypal', 'stripe','cash','mobile money'], default: 'carte' },
    statut: { type: String, enum: ['en attente', 'payée', 'échouée', 'remboursée'], default: 'en attente' },
    transactionId: { type: String },
    datePaiement: { type: Date }
  },
  statutCommande: { type: String, enum: ['en attente', 'expédiée', 'livrée', 'annulée'], default: 'en attente' },
  crééLe: { type: Date, default: Date.now }
});

export const CommandeSchemaModel = model.Commande || model("Commande", CommandeSchema);

import mongoose from "mongoose";
const { model, Schema } = mongoose

const EquipeSchema = new Schema({
  nom: { type: String, required: true },
  ligue: { type: mongoose.Schema.Types.ObjectId, ref: 'Ligue', required: true },
  crééLe: { type: Date, default: Date.now },
  misÀJourLe: { type: Date, default: Date.now },
  logo: { type: String }
}, {
  timestamps: true
});

    export const EquipeSchemaModel = model.Equipe || model("Equipe", EquipeSchema)
import mongoose from "mongoose";
const { model, Schema } = mongoose

const CategorieSchema = new Schema({
  nom: { type: String, required: true },
  ligue: { type: mongoose.Schema.Types.ObjectId, ref: 'Ligue',required: false },
  crééLe: { type: Date, default: Date.now },
  misÀJourLe: { type: Date, default: Date.now },
  logo: { type: String }
}, {
  timestamps: true
});
CategorieSchema.index({ nom: 1 }, { unique: true });

    export const CategorieSchemaModel = model.Categorie || model("Categorie", CategorieSchema)
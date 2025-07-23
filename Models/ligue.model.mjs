import mongoose from "mongoose";
const { model, Schema } = mongoose

const LigueSchema = new Schema({
  nom: { type: String, required: true },
  pays: { type: String },
  crééLe: { type: Date, default: Date.now },
  misÀJourLe: { type: Date, default: Date.now },
  logo: { type: String }
}, {
  timestamps: true
});

    export const LigueSchemaModel = model.Ligue || model("Ligue", LigueSchema)
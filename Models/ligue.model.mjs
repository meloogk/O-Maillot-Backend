import mongoose from "mongoose";
const { model, Schema } = mongoose

const LigueSchema = new Schema({
    nom: { type: String, required: true },
    pays: { type: String },
    logo: { type: String }
    })

    export const LigueSchemaModel = model.Ligue || model("Ligue", LigueSchema)
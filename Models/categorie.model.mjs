import mongoose from "mongoose";
const { model, Schema } = mongoose

const CategorieSchema = new Schema({
    nom: { type: String, required: true },
    ligue: { type: mongoose.Schema.Types.ObjectId, ref: 'Ligue' },
    logo: { type: String }
    })

    export const CategorieSchemaModel = model.Categorie || model("Categorie", CategorieSchema)
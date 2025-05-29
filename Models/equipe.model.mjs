import mongoose from "mongoose";
const { model, Schema } = mongoose

const EquipeSchema = new Schema({
    nom: { type: String, required: true },
    ligue: { type: mongoose.Schema.Types.ObjectId, ref: 'Ligue' },
    logo: { type: String }
    })

    export const EquipeSchemaModel = model.Equipe || model("Equipe", EquipeSchema)
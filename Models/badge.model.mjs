import mongoose from "mongoose";
const { model, Schema } = mongoose

const BadgeSchema = new Schema({
    nom: { type: String, required: true },
    image: { type: String }
    })

    export const BadgeSchemaModel = model.Badge || model("Badge", BadgeSchema)
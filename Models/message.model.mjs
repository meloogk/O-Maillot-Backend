import mongoose from "mongoose";
const { model, Schema } = mongoose

const MessageSchema = new Schema({
    nom: { type: String, required: true },
    email: { type: String, required: true },
    sujet: { type: String, required: true },
    message: { type: String, required: true },
    envoyéLe: { type: Date, default: Date.now }
    })

    export const MessageSchemaModel = model.Message || model("Message", MessageSchema)
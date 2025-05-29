import mongoose from "mongoose";
const { model, Schema } = mongoose

const AbonnéNewsletterSchema = new Schema({
    email: { type: String, required: true, unique: true },
    inscritLe: { type: Date, default: Date.now }
    })

    export const AbonnéNewsletterSchemaModel = model.AbonnéNewsletter|| model("AbonnéNewsletter", AbonnéNewsletterSchema)
import mongoose from "mongoose";
const { model, Schema } = mongoose

const NotificationsSchema = new Schema({
    utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur' },
    titre: { type: String },
    message: { type: String, required: true },
    lu: { type: Boolean, default: false },
    type: { type: String }, 
    date: { type: Date, default: Date.now }
    })

    export const  NotificationsSchemaModel = model. Notifications || model(" Notifications",  NotificationsSchema)
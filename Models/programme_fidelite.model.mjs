import mongoose from "mongoose";
const { model, Schema } = mongoose

const historiquePointsSchema = new Schema({
    date: { type: Date, default: Date.now },
    description: { type: String },
    points: { type: Number }
});

const ProgrammeFidélitéSchema = new Schema({
    utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true, unique: true },
    points: { type: Number, default: 0 },
    niveau: { type: String, default: 'Bronze' },
    historiquePoints: [historiquePointsSchema]
    })

    export const  ProgrammeFidélitéSchemaModel = model.ProgrammeFidélité || model("ProgrammeFidélité",  ProgrammeFidélitéSchema)
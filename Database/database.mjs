import mongoose from "mongoose"

export const MongoConnected = async() => {
    try {
        const mongoURL = process.env.MONGO_URL
        await mongoose.connect(mongoURL,{
            dbName:"O'MAILLOT"
        })

        console.log("Connexion à mongoDB réussie avec succès !")
        return "ok"
    } catch (error) {
        console.log(error)
    }
}
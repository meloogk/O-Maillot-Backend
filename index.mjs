import express from  "express"
import cors from "cors"
import router from "./Routes/routes.mjs"
import dotenv from "dotenv"
import { MongoConnected } from "./Database/database.mjs"

const app = express()
dotenv.config()
const domaineAutorise = ["http://localhost:7777", "http://localhost:3000"]

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || domaineAutorise.includes(origin)) {
            callback(null, true)
        } else {
            callback(new Error("Domaine non autorisé par le cors"))
        }
    }
}
app.use(cors(corsOptions))

app.use(express.json())

MongoConnected()
app.get("/",(req,res)=>{
    res.send("bienvenue sur mon site de vente de maillot !")
})
app.use("/api",router)





app.listen(7777,()=>console.log("Serveur démarré sur le port 7777"))
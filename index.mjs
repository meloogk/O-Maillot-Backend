import express from "express";
import cors from "cors";
import router from "./Routes/routes.mjs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { MongoConnected } from "./Database/database.mjs";
import bcrypt from "bcrypt";
import { UtilisateurSchemaModel } from "./Models/utilisateur.model.mjs";

dotenv.config();
const app = express();

const domaineAutorise = ["http://localhost:7777", "http://localhost:3000"];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || domaineAutorise.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Domaine non autorisé par le cors"));
    }
  },
};
app.use(cors(corsOptions));
app.use(express.json());

// Sert les fichiers du dossier uploads (images)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

MongoConnected();

app.get("/", (req, res) => {
  res.send("Bienvenue sur mon site de vente de maillot !");
});

app.use("/api", router);

const creerSuperAdmin = async () => {
  const superadminEmail = process.env.SUPERADMIN_EMAIL;
  const superadminPassword = process.env.SUPERADMIN_PASSWORD;
  const existant = await UtilisateurSchemaModel.findOne({ email: superadminEmail });

  if (!existant) {
    const hash = await bcrypt.hash(superadminPassword, 10);
    await UtilisateurSchemaModel.create({
      nom: "Admin principal",
      email: superadminEmail,
      motDePasse: hash,
      rôle: "admin",
      actif: true,
    });
    console.log("Superadmin créé automatiquement");
  } else {
    console.log("Superadmin déjà existant");
  }
};

await creerSuperAdmin();

app.listen(7777, () => console.log("Serveur démarré sur le port 7777"));

import { MongoConnected } from "../Database/database.mjs"
import auth from "../Firebase/firebase.mjs"
import { UtilisateurSchemaModel } from "../Models/utilisateur.model.mjs"
import { createUserWithEmailAndPassword} from "firebase/auth"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";

export const InscriptionUtilisateur = async (req,res) => {
    const {nom,email,motDePasse,confirmationMotDePasse,adresse,telephone} = req.body
    try {
        const db = await MongoConnected()
        if (db !== "ok") {
            return res.status(400).json({message:"Echec de la connexion a la base de donnees"})
        }

        if(!nom || !email || !motDePasse || !confirmationMotDePasse || !adresse || !telephone){
            return res.status(400).json({message:"Veuillez remplir tous les champs"})
        }

        if(motDePasse !== confirmationMotDePasse){
            return res.status(400).json({ message: "Les mots de passe ne correspondent pas." })
        }

        const userExist = await UtilisateurSchemaModel.findOne({email})
        if (userExist) {
            return res.status(400).json({message:"L'utilisateur existe deja"})
        }

        const userInfos = await createUserWithEmailAndPassword(auth,email,motDePasse)
        const uid = userInfos.user.uid

        if (uid) {
              // Hachage du mot de passe avant stockage dans MongoDB
            const hashedPassword = await bcrypt.hash(motDePasse, 10)
            const newUser = new UtilisateurSchemaModel({nom,email,motDePasse:hashedPassword,adresse,telephone})
            const result = await newUser.save()

            if (result) {
                return res.status(200).json({message:"ok",data:result})
            } else {
                  return res.status(400).json({message:"Utilisateur non enregistré dans la base de données"})
            }
        } else {
            return res.status(400).json({message:"Utilisateur non inscrit dans firebase"})
        }

    } catch (error) {
        console.log(error)
    }
}


export const ConnexionUtilisateur = async (req, res) => {
  const { email, motDePasse } = req.body;
  try {
    const db = await MongoConnected();
    if (db !== "ok") {
      return res.status(500).json({ message: "Échec de la connexion à la base de données" });
    }

    if (!email || !motDePasse) {
      return res.status(400).json({ message: "Veuillez remplir tous les champs" });
    }

    const userExist = await UtilisateurSchemaModel.findOne({ email });
    if (!userExist) {
      return res.status(400).json({ message: "Utilisateur non inscrit, veuillez créer un compte !" });
    }

    // Vérification du mot de passe avec bcrypt
    const isPasswordValid = await bcrypt.compare(motDePasse, userExist.motDePasse);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    // Génération du token JWT avec rôle
    const token = jwt.sign(
      {
        id: userExist._id,
        email: userExist.email,
        rôle: userExist.rôle,
        photo: userExist.photo 
      },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    return res.status(200).json({
      message: "ok",
      token,
      data: {
        nom: userExist.nom,
        email: userExist.email,
        adresse: userExist.adresse,
        telephone: userExist.telephone,
        rôle: userExist.rôle,
       photo:  userExist.photo 
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};
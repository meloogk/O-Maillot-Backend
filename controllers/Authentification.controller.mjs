import { MongoConnected } from "../Database/database.mjs"
import auth from "../Firebase/firebase.mjs"
import { UtilisateurSchemaModel } from "../Models/utilisateur.model.mjs"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth"
import bcrypt from "bcrypt"

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


export const ConnexionUtilisateur = async (req,res) => {
    const {email,motDePasse} = req.body
    try {
        const db = await MongoConnected()
        if (db !== "ok") {
            return res.status(400).json({message:"Echec de la connexion a la base de donnees"})
        }

        if(!email || !motDePasse  ){
            return res.status(400).json({message:"Veuillez remplir tous les champs"})
        }

        const userExist = await UtilisateurSchemaModel.findOne({email})
        if (!userExist) {
            return res.status(400).json({message:"Utilisateur non inscrit , veillez créer un compte !"})
        }

        const userInfos = await signInWithEmailAndPassword(auth,email,motDePasse)
        const uid = userInfos.user.uid

        if (uid) {
            return res.status(200).json({
            message: "ok",
            data: {
                nom: userExist.nom,
                email: userExist.email,
                adresse: userExist.adresse,
                telephone:userExist.telephone
            }
        })
        } else {
            return res.status(400).json({message:"Échec de connexion à Firebase."})
        }

    } catch (error) {
        console.log(error)
    }
}
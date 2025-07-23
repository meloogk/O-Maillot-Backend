import mongoose from "mongoose";

export const MongoConnected = async () => {
  try {
    // Empêche une reconnexion si déjà connecté
    if (mongoose.connection.readyState === 1) {
      return "ok"; // déjà connecté
    }

    const mongoURL = process.env.MONGO_URL;
    await mongoose.connect(mongoURL, {
      dbName: "O'MAILLOT",
    });

    console.log("✅ Connexion à MongoDB réussie !");
    return "ok";
  } catch (error) {
    console.error("❌ Erreur de connexion à MongoDB :", error);
    return "erreur";
  }
};

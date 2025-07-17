import admin from "firebase-admin"
import dotenv from "dotenv"
dotenv.config()

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.projectId,
      clientEmail: process.env.client_email,
      privateKey: process.env.private_key.replace(/\\n/g, '\n'),
    }),
  })
}

export default admin

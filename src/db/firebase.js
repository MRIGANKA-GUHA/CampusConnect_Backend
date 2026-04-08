import admin from "firebase-admin";

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountString) {
  console.error("Missing FIREBASE_SERVICE_ACCOUNT environment variable");
}

const serviceAccount = serviceAccountString ? JSON.parse(serviceAccountString) : {};

if (!admin.apps.length && serviceAccountString) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;

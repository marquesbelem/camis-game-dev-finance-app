import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { getStorage } from "firebase-admin/storage";

let isFirebaseAdminInitialized = false;

if (getApps().length === 0) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    console.warn("FIREBASE_SERVICE_ACCOUNT_KEY is not defined. Push notifications will be skipped.");
  } else {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
      isFirebaseAdminInitialized = true;
      console.log("Firebase Admin SDK initialized successfully.");
    } catch (e) {
      console.error("Failed to initialize Firebase Admin SDK:", e);
    }
  }
} else {
  isFirebaseAdminInitialized = true;
}

export { getMessaging, getStorage, isFirebaseAdminInitialized };

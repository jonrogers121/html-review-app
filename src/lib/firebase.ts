/**
 * Firebase SDK Initialisation
 *
 * Single source of truth for the Firebase app, Auth, and Firestore instances.
 * Credentials are sourced from firebase-applet-config.json at the project root.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyB2AhIrByAVVTz2faW68K8jkvEje9_uBt4',
  authDomain: 'databeat-501010.firebaseapp.com',
  projectId: 'databeat-501010',
  storageBucket: 'databeat-501010.firebasestorage.app',
  messagingSenderId: '749622907477',
  appId: '1:749622907477:web:1dfc266df3df9f8695fadc'
};

// Prevent re-initialisation during hot-reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Named Firestore database (not the default)
const FIRESTORE_DB_ID =
  'ai-studio-htmlprototyperev-920b1745-c7c6-4c20-8a58-5533d9a211fd';

export const auth = getAuth(app);
export const db = getFirestore(app, FIRESTORE_DB_ID);

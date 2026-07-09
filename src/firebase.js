import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyD1ee7DR0aIkMaHySCyHdsf7c6lukUnIoA",
  authDomain: "au-data-base.firebaseapp.com",
  databaseURL: "https://au-data-base-default-rtdb.firebaseio.com",
  projectId: "au-data-base",
  storageBucket: "au-data-base.firebasestorage.app",
  messagingSenderId: "230738811298",
  appId: "1:230738811298:web:84ad366cdc0d70dba8fafb",
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// Firebase Configuration
// Reemplaza estos valores con tu configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBtnnoH8WdNdPso5VSvBdi_T3QUj6bKjdc",
    authDomain: "sistemaplanilla.firebaseapp.com",
    projectId: "sistemaplanilla",
    storageBucket: "sistemaplanilla.firebasestorage.app",
    messagingSenderId: "491116295999",
    appId: "1:491116295999:web:704f7c8620fcb43b00858a",
    measurementId: "G-QBB39HNE7R"
  };

// Inicializar Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };

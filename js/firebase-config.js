// Importa lo necesario desde Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDEXoRtBYglvzgpmedWnMLK_8LUtlcfpdw",
    authDomain: "mensualidadesradicaltraining.firebaseapp.com",
    projectId: "mensualidadesradicaltraining",
    storageBucket: "mensualidadesradicaltraining.firebasestorage.app",
    messagingSenderId: "69749168198",
    appId: "1:69749168198:web:f5c600df7b927576fcd247"
};

// Inicializa Firebase y exporta Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };

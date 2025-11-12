// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    updatePassword,
    updateEmail,
    sendPasswordResetEmail,
    validatePassword,
    signOut,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAujGS8fDmyVlIaFgHZd85bOYL8cMWOzI4",
    authDomain: "techbridge-hydroponic.firebaseapp.com",
    databaseURL:
        "https://techbridge-hydroponic-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "techbridge-hydroponic",
    storageBucket: "techbridge-hydroponic.firebasestorage.app",
    messagingSenderId: "156880371159",
    appId: "1:156880371159:web:a3ca33bdce209af30fdf92",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Authentication function
async function registerUser(email, password) {
    const status = await validatePassword(auth, password);

    if (!status.isValid) {
        let msg = "Password belum memenuhi kriteria:\n";
        if (status.meetsMinimumLength !== true) msg += "- Minimal 8 karakter\n";
        if (status.containsUppercaseLetter !== true) msg += "- Huruf besar\n";
        if (status.containsLowercaseLetter !== true) msg += "- Huruf kecil\n";
        if (status.containsNumericCharacter !== true) msg += "- Angka\n";
        if (status.containsNonAlphanumericCharacter !== true)
            msg += "- Simbol (!@#$%)\n";

        alert(msg);
        return;
    }

    // Jika valid, lanjut registrasi
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            console.log("User Registered:", user.uid);
            alert("Registrasi berhasil!");
        })
        .catch((error) => alert(error.message));
}

function loginUser(email, password) {
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            console.log("User logged in ; ", user);
            alert("Login Berhasil");
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.log(errorCode);
            console.log(errorMessage);
            alert(errorMessage);
        });
}

function logoutUser() {
    signOut(auth)
        .then(() => {
            alert("Berhasil Logout");
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.log(errorCode);
            console.log(errorMessage);
            alert(errorMessage);
        });
}

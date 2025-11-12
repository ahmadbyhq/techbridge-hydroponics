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
    onAuthStateChanged,
    validatePassword,
    setPersistence,
    browserLocalPersistence,
    signOut,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import {
    getDatabase,
    ref,
    set,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

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
const db = getDatabase(app);
let isRegistering = false;

onAuthStateChanged(auth, (user) => {
    const path = window.location.pathname;
    if (isRegistering) return;

    if (user) {
        if (path.endsWith("login.html") || path.endsWith("register.html")) {
            window.location.href = "index.html";
        }
    } else {
        if (!path.endsWith("login.html") && !path.endsWith("register.html")) {
            window.location.href = "login.html";
        }
    }
});

function getLocalTimeString() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}-${pad(
        d.getMonth() + 1
    )}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(
        d.getSeconds()
    )}`;
}

// Authentication function
async function registerUser(name, email, password) {
    isRegistering = true;
    const result = await validatePassword(auth, password);

    if (!result.isValid) {
        let msg = "Password belum memenuhi kriteria:";
        if (!result.meetsMinimumLength) msg += "\n- Harus minimal 6 karakter";
        if (!result.containsUppercaseLetter)
            msg += "\n- Harus ada huruf besar (A–Z)";
        if (!result.containsLowercaseLetter)
            msg += "\n- Harus ada huruf kecil (a–z)";
        if (!result.containsNumericCharacter)
            msg += "\n- Harus ada angka (0–9)";
        if (!result.containsNonAlphanumericCharacter)
            msg += "\n- Harus ada simbol ";

        console.error("Firebase password validation failed:", result);
        // lempar error custom agar bisa ditangani di register.html
        const err = new Error(msg);
        err.code = "auth/invalid-password-policy";
        throw err;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );
        const user = userCredential.user;
        const userRef = ref(db, "users/" + user.uid);

        await set(userRef, {
            name: name,
            email: email,
            created_at: getLocalTimeString(),
        });

        alert("Registrasi berhasil! Silakan lanjut ke setup device.");
        console.log("User Registered:", user.uid);
        setTimeout(() => {
            window.location.href = "setup.html";
        }, 300);
    } catch (error) {
        console.error("Firebase Auth Error:", error);
        throw error;
    } finally {
        isRegistering = false;
    }
}

async function loginUser(email, password) {
    try {
        await setPersistence(auth, browserLocalPersistence);

        const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );
        const user = userCredential.user;

        alert("Login Berhasil!");
        console.log("User logged in:", user.email);
        window.location.href = "index.html";
    } catch (error) {
        console.error(error);
        alert("Login gagal: " + error.message);
    }
}

function logoutUser() {
    signOut(auth)
        .then(() => {
            window.location.href = "login.html";
        })
        .catch((error) => {
            console.error("Logout Error:", error.message);
        });
}

export { registerUser, loginUser, logoutUser };

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

import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

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
const firestore = getFirestore(app);
let isRegistering = false;

const publicPages = ["login.html", "register.html"];

onAuthStateChanged(auth, async (user) => {
    const path = window.location.pathname.split("/").pop();

    if (!user) {
        if (!publicPages.includes(path)) {
            window.location.href = "login.html";
        }
        return;
    }

    // if (isRegistering) return;

    const userRef = doc(firestore, "users", user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
        if (path !== "setup.html") window.location.href = "setup.html";
        return;
    }

    const data = snap.data();

    if (data.device_id) {
        if (
            path === "login.html" ||
            path === "register.html" ||
            path === "setup.html"
        ) {
            window.location.href = "index.html";
        }
        return;
    }

    if (path !== "setup.html") {
        window.location.href = "setup.html";
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
    try {
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );
        const user = userCredential.user;

        await setDoc(doc(firestore, "users", user.uid), {
            name,
            email,
            created_at: getLocalTimeString(),
            device_id: null,
        });

        console.log("User Registered:", user.uid);
        window.location.href = "setup.html";
    } catch (error) {
        console.error("Firebase Auth Error:", error);
        throw error;
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
    } catch (error) {
        console.error("Firebase Auth Error:", error);
        throw error;
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

export { registerUser, loginUser, logoutUser, app, getLocalTimeString };

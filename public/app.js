// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
    getDatabase,
    ref,
    onValue,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

import {
    getFirestore,
    doc,
    getDoc,
    updateDoc,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

import {
    getAuth,
    onAuthStateChanged,
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
const database = getDatabase(app);
const firestore = getFirestore(app);
const auth = getAuth(app);

// last monitoring data
let lastTemp = null;
let lastHum = null;
let lastTds = null;
let lastTempWater = null;
let sensorLimits = null;
let deviceId = null;
let info = null;

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        console.warn("User belum login.");
        return;
    }

    console.log("User login:", user.uid);

    const userRef = doc(firestore, "users", user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
        console.error("User Firestore tidak ditemukan!");
        return;
    }

    deviceId = snap.data().device_id;
    console.log("Device ID:", deviceId);

    const deviceRef = doc(firestore, "devices", deviceId);
    const devSnap = await getDoc(deviceRef);

    if (!devSnap.exists()) {
        console.error("Dokumen device tidak ditemukan!");
        return;
    }

    sensorLimits = devSnap.data().sensor_limits;
    console.log("Sensor Limits:", sensorLimits);

    startRealtimeListener(deviceId);
});

function startRealtimeListener(deviceId) {
    const basePath = `devices/${deviceId}/sensors`;

    const infoRef = ref(database, `devices/${deviceId}/info`);
    const temperatureRef = ref(database, `${basePath}/temperature`);
    const humidityRef = ref(database, `${basePath}/humidity`);
    const tempWaterRef = ref(database, `${basePath}/tempWater`);
    const tdsRef = ref(database, `${basePath}/tds`);

    onValue(infoRef, (snapshot) => {
        info = snapshot.val();
        if (!info) return;

        updateElement("info-device_id", info.device_id);
        updateElement("info-ssid", info.ssid);
        updateElement("info-ip", info.ip);
        updateElement("info-last_update", info.last_update);
        updateElement("info-last_active", info.last_active);

        checkDeviceStatus(info);
    });

    onValue(temperatureRef, (snapshot) => {
        const v = snapshot.val();
        updateElement("temperature", v, " °C");

        const cat = getTempCategory(v);
        updateStatus("temp-status", cat);

        updateDiff("temp-diff", v - lastTemp, "°C");
        lastTemp = v;
    });

    onValue(humidityRef, (snapshot) => {
        const v = snapshot.val();
        updateElement("humidity", v, " %");

        const cat = getHumCategory(v);
        updateStatus("hum-status", cat);

        updateDiff("hum-diff", v - lastHum, "%");
        lastHum = v;
    });

    onValue(tempWaterRef, (snapshot) => {
        const v = snapshot.val();
        updateElement("temp-water", v, " °C");

        const cat = getTempWaterCategory(v);
        updateStatus("temp-water-status", cat);

        updateDiff("temp-water-diff", v - lastTempWater, "°C");
        lastTempWater = v;
    });

    onValue(tdsRef, (snapshot) => {
        const v = snapshot.val();
        updateElement("tds", v, " ppm");

        const cat = getTDSCategory(v);
        updateStatus("tds-status", cat);

        updateDiff("tds-diff", v - lastTds, "ppm");
        lastTds = v;
    });

    // Monitoring status realtime
    setInterval(() => {
        if (info) {
            checkDeviceStatus(info);
        }
    }, 15000);
}

// Suhu udara
function getTempCategory(v) {
    if (!sensorLimits) return "Normal";
    if (v < sensorLimits.temp_env_min) return "Dingin";
    if (v > sensorLimits.temp_env_max) return "Panas";
    return "Normal";
}

// Suhu air
function getTempWaterCategory(v) {
    if (!sensorLimits) return "Normal";
    if (v < sensorLimits.temp_water_min) return "Dingin";
    if (v > sensorLimits.temp_water_max) return "Panas";
    return "Normal";
}

// Humidity
function getHumCategory(v) {
    if (!sensorLimits) return "Normal";
    if (v < sensorLimits.humidity_min) return "Rendah";
    if (v > sensorLimits.humidity_max) return "Tinggi";
    return "Normal";
}

// TDS
function getTDSCategory(v) {
    if (!sensorLimits) return "Normal";
    if (v < sensorLimits.tds_min) return "Rendah";
    if (v > sensorLimits.tds_max) return "Tinggi";
    return "Normal";
}

function updateElement(id, value, suffix = "") {
    const el = document.getElementById(id);
    if (el) el.innerText = `${value}${suffix}`;
}

function updateStatus(id, category) {
    const el = document.getElementById(id);
    if (!el) return;

    let color =
        category === "Normal"
            ? "bg-green-100 text-green-600"
            : category === "Panas" || category === "Tinggi"
            ? "bg-red-100 text-red-600"
            : "bg-blue-100 text-blue-600";

    el.className = `px-3 py-1 rounded-full text-sm font-medium ${color}`;
    el.innerText = category;
}

// Fungsi selisih tetap sama dengan punyamu
function updateDiff(id, diff, unit) {
    const el = document.getElementById(id);
    if (!el || diff === null) return;

    const df = diff.toFixed(1);

    if (diff > 0) {
        el.className = "flex items-center gap-1 ml-2 text-green-600";
        el.innerHTML = `<ion-icon name="arrow-up-outline"></ion-icon><span class="text-sm font-medium">+${df} ${unit}</span>`;
    } else if (diff < 0) {
        el.className = "flex items-center gap-1 ml-2 text-red-600";
        el.innerHTML = `<ion-icon name="arrow-down-outline"></ion-icon><span class="text-sm font-medium">${df} ${unit}</span>`;
    }
}

function checkDeviceStatus(info) {
    if (!info) return;

    const statusEl = document.getElementById("device-status");
    const now = new Date();
    const lastUpdate = new Date((info.last_update || "").replace(" ", "T"));
    const diffUpdate = Math.floor((now - lastUpdate) / 1000);

    if (isNaN(diffUpdate) || diffUpdate > 60) {
        statusEl.className =
            "mt-4 px-3 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2 bg-red-100 text-red-700 border border-red-300";
        statusEl.innerHTML =
            '<ion-icon class="text-xl" name="alert-circle-outline"></ion-icon><span>Perangkat tidak aktif / belum tersambung Wi-Fi</span>';
    } else {
        const waktuUpdate =
            diffUpdate <= 1 ? "baru saja" : `${diffUpdate} detik lalu`;
        statusEl.className =
            "mt-4 px-3 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2 bg-green-100 text-green-700 border border-green-300";
        statusEl.innerHTML = `<ion-icon class="text-xl" name="checkmark-circle-outline"></ion-icon><span>Perangkat aktif (update ${waktuUpdate})</span>`;
    }
}

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
    collection,
    addDoc,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

import {
    getAuth,
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "...", //api key
    authDomain: "techbridge-hydroponic.firebaseapp.com",
    databaseURL:
        "https://techbridge-hydroponic-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "techbridge-hydroponic",
    storageBucket: "techbridge-hydroponic.firebasestorage.app",
    messagingSenderId: "....",
    appId: "...",
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
let lastTempCategory = null;
let lastHumCategory = null;
let lastTempWaterCategory = null;
let lastTdsCategory = null;

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

    onValue(temperatureRef, async (snapshot) => {
        const v = snapshot.val();
        updateElement("temperature", v, " °C");
        console.log("DEBUG TEMP =>", snapshot.exists(), snapshot.val());

        const cat = getTempCategory(v);
        updateStatus("temp-status", cat);

        // NOTIF: kalau kategori berubah & jadi di luar normal
        if (sensorLimits && cat !== lastTempCategory) {
            if (cat === "Panas") {
                await createNotification({
                    title: "Suhu Lingkungan Tinggi",
                    message: `Suhu udara mencapai ${v.toFixed(1)}°C, melebihi batas maksimal ${sensorLimits.temp_env_max}°C.`,
                    level: "danger",
                    sensor_label: "Suhu Lingkungan",
                });
            } else if (cat === "Dingin") {
                await createNotification({
                    title: "Suhu Lingkungan Rendah",
                    message: `Suhu udara turun ke ${v.toFixed(1)}°C, di bawah batas minimal ${sensorLimits.temp_env_min}°C.`,
                    level: "warning",
                    sensor_label: "Suhu Lingkungan",
                });
            }
        }
        lastTempCategory = cat;

        updateDiff("temp-diff", v - lastTemp, "°C");
        lastTemp = v;
    });

    onValue(humidityRef, async (snapshot) => {
        const v = snapshot.val();
        updateElement("humidity", v, " %");

        const cat = getHumCategory(v);
        updateStatus("hum-status", cat);

        if (sensorLimits && cat !== lastHumCategory) {
            if (cat === "Tinggi") {
                await createNotification({
                    title: "Kelembapan Tinggi",
                    message: `Kelembapan naik menjadi ${v.toFixed(1)}%, melebihi batas maksimal ${sensorLimits.humidity_max}%.`,
                    level: "warning",
                    sensor_label: "Sensor Kelembapan",
                });
            } else if (cat === "Rendah") {
                await createNotification({
                    title: "Kelembapan Rendah",
                    message: `Kelembapan turun menjadi ${v.toFixed(1)}%, di bawah batas minimal ${sensorLimits.humidity_min}%.`,
                    level: "warning",
                    sensor_label: "Sensor Kelembapan",
                });
            }
        }
        lastHumCategory = cat;

        updateDiff("hum-diff", v - lastHum, "%");
        lastHum = v;
    });

    onValue(tempWaterRef, async (snapshot) => {
        const v = snapshot.val();
        updateElement("temp-water", v, " °C");

        const cat = getTempWaterCategory(v);
        updateStatus("temp-water-status", cat);

        if (sensorLimits && cat !== lastTempWaterCategory) {
            if (cat === "Panas") {
                await createNotification({
                    title: "Suhu Air Tinggi",
                    message: `Suhu air mencapai ${v.toFixed(1)}°C, melebihi batas maksimal ${sensorLimits.temp_water_max}°C.`,
                    level: "danger",
                    sensor_label: "Suhu Air",
                });
            } else if (cat === "Dingin") {
                await createNotification({
                    title: "Suhu Air Rendah",
                    message: `Suhu air turun ke ${v.toFixed(1)}°C, di bawah batas minimal ${sensorLimits.temp_water_min}°C.`,
                    level: "warning",
                    sensor_label: "Suhu Air",
                });
            }
        }
        lastTempWaterCategory = cat;

        updateDiff("temp-water-diff", v - lastTempWater, "°C");
        lastTempWater = v;
    });

    onValue(tdsRef, async (snapshot) => {
        const v = snapshot.val();
        updateElement("tds", v, " ppm");

        const cat = getTDSCategory(v);
        updateStatus("tds-status", cat);

        if (sensorLimits && cat !== lastTdsCategory) {
            if (cat === "Tinggi") {
                await createNotification({
                    title: "Nutrisi (TDS) Tinggi",
                    message: `Kadar nutrisi mencapai ${v.toFixed(1)} ppm, melebihi batas maksimal ${sensorLimits.tds_max} ppm.`,
                    level: "danger",
                    sensor_label: "PPM",
                });
            } else if (cat === "Rendah") {
                await createNotification({
                    title: "Nutrisi (TDS) Rendah",
                    message: `Kadar nutrisi turun ke ${v.toFixed(1)} ppm, di bawah batas minimal ${sensorLimits.tds_min} ppm.`,
                    level: "warning",
                    sensor_label: "PPM",
                });
            }
        }
        lastTdsCategory = cat;

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

// Helper: buat notifikasi ke Firestore
async function createNotification(payload) {
    if (!deviceId) return;

    const notifCol = collection(
        firestore,
        "devices",
        deviceId,
        "notifications",
    );

    try {
        await addDoc(notifCol, {
            ...payload,
            read: false,
            created_at: serverTimestamp(),
        });
        console.log("Notifikasi dibuat:", payload.title);
    } catch (err) {
        console.error("Gagal membuat notifikasi:", err);
    }
}

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
    getDatabase,
    ref,
    onValue,
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
const database = getDatabase(app);

// last monitoring data
let lastTemp = null;
let lastLdr = null;
let lastHum = null;
// let lastTds = null;
let lastTempWater = null;

// Database references
const deviceId = "device_6C3B015C";
const basePath = `devices/${deviceId}/sensors`;
const infoRef = ref(database, `devices/${deviceId}/info`);

const temperatureRef = ref(database, `${basePath}/temperature`);
const humidityRef = ref(database, `${basePath}/humidity`);
const ldrRef = ref(database, `${basePath}/ldr`);
const tempWaterRef = ref(database, `${basePath}/tempWater`);
// const tdsRef = ref(database, "sensors/tds");

// Helper function to update element safely
function updateElement(id, value, suffix = "") {
    const el = document.getElementById(id);
    if (el) el.innerText = value + suffix;
}

function getLdrCategory(ldr_value) {
    if (ldr_value < 1024) return "Gelap";
    else if (ldr_value < 2048) return "Redup";
    else if (ldr_value < 3072) return "Sedang";
    else return "Terang";
}

function getTempCategory(temp_value) {
    if (temp_value < 20) return "Dingin";
    else if (temp_value >= 20 && temp_value <= 33) return "Normal";
    else return "Panas";
}

function getTempWaterCategory(tempWater_value) {
    if (tempWater_value < 15) return "Sangat Dingin";
    else if (tempWater_value >= 15 && tempWater_value < 20) return "Dingin";
    else if (tempWater_value >= 20 && tempWater_value <= 27) return "Normal";
    else if (tempWater_value > 27 && tempWater_value <= 30) return "Hangat";
    else return "Panas";
}

function getHumCategory(hum_value) {
    if (hum_value < 40) return "Rendah";
    else if (hum_value <= 70) return "Normal";
    else return "Tinggi";
}

// function getTDSCategory(tds_value) {
//     if (tds_value < 600) return "Rendah";
//     else if (tds_value >= 600 && tds_value <= 1200) return "Normal";
//     else return "Tinggi";
// }

// Realtime listeners
onValue(temperatureRef, (snapshot) => {
    const temperature = snapshot.val();
    console.log("Temperature:", temperature);

    // Update value utama
    updateElement("temperature", temperature, " °C");

    // Update status (Normal/Panas/Dingin)
    const category = getTempCategory(temperature);
    const statusEl = document.getElementById("temp-status");
    if (statusEl) {
        statusEl.innerText = category;
        statusEl.className =
            "px-3 py-1 rounded-full text-sm font-medium " +
            (category === "Normal"
                ? "bg-green-100 text-green-600"
                : category === "Panas"
                ? "bg-red-100 text-red-600"
                : "bg-blue-100 text-blue-600");
    }

    // Hitung selisih
    if (lastTemp !== null) {
        const diff = temperature - lastTemp;
        const diffEl = document.getElementById("temp-diff");

        if (diffEl) {
            const diffFormatted = diff.toFixed(1);
            if (diff > 0) {
                diffEl.className =
                    "flex items-center gap-1 ml-2 text-green-600";
                diffEl.innerHTML = `
                    <ion-icon name="arrow-up-outline"></ion-icon>
                    <span class="text-sm font-medium">+${diffFormatted}°C</span>
                `;
            } else if (diff < 0) {
                diffEl.className = "flex items-center gap-1 ml-2 text-red-600";
                diffEl.innerHTML = `
                    <ion-icon name="arrow-down-outline"></ion-icon>
                    <span class="text-sm font-medium">${diffFormatted}°C</span>
                `;
            } else {
                diffEl.className = "flex items-center gap-1 ml-2 text-gray-600";
                diffEl.innerHTML = `
                    <ion-icon name="remove-outline"></ion-icon>
                    <span class="text-sm font-medium">0°C</span>
                `;
            }
        }
    }

    lastTemp = temperature;
});

onValue(humidityRef, (snapshot) => {
    const humidity = snapshot.val();
    console.log("Humidity:", humidity);
    updateElement("humidity", humidity, " %");

    const category = getHumCategory(humidity);
    const statusEl = document.getElementById("hum-status");
    if (statusEl) {
        statusEl.innerText = category;
        statusEl.className =
            "px-3 py-1 rounded-full text-sm font-medium " +
            (category === "Normal"
                ? "bg-green-100 text-green-600"
                : category === "Tinggi"
                ? "bg-red-100 text-red-600"
                : "bg-blue-100 text-blue-600");
    }

    // Hitung selisih
    if (lastHum !== null) {
        const diff = humidity - lastHum;
        const diffEl = document.getElementById("hum-diff");
        if (diffEl) {
            const diffFormatted = diff.toFixed(1);
            if (diff > 0) {
                diffEl.className =
                    "flex items-center gap-1 ml-2 text-green-600";
                diffEl.innerHTML = ` <ion-icon name="arrow-up-outline"></ion-icon>
                    <span class="text-sm font-medium">+${diffFormatted}%</span>
                `;
            } else if (diff < 0) {
                diffEl.className = "flex items-center gap-1 ml-2 text-red-600";
                diffEl.innerHTML = ` <ion-icon name="arrow-down-outline"></ion-icon>
                    <span class="text-sm font-medium">${diffFormatted}%</span>
                `;
            } else {
                diffEl.className = "flex items-center gap-1 ml-2 text-gray-600";
                diffEl.innerHTML = ` <ion-icon name="remove-outline"></ion-icon> <span class="text-sm font-medium">0%</span>
                `;
            }
        }
    }
    lastHum = humidity;
});

onValue(tempWaterRef, (snapshot) => {
    const tempWater = snapshot.val();
    console.log("Temp Water:", tempWater);
    updateElement("temp-water", tempWater, " °C");

    const category = getTempWaterCategory(tempWater);
    const statusEl = document.getElementById("temp-water-status");
    if (statusEl) {
        statusEl.innerText = category;
        statusEl.className =
            "px-3 py-1 rounded-full text-sm font-medium " +
            (category === "Normal"
                ? "bg-green-100 text-green-600"
                : category === "Hangat"
                ? "bg-yellow-100 text-yellow-600"
                : category === "Panas"
                ? "bg-red-100 text-red-600"
                : category === "Dingin"
                ? "bg-blue-100 text-blue-600"
                : "bg-blue-200 text-blue-500");
    }
    // Hitung selisih
    if (lastTempWater !== null) {
        const diff = tempWater - lastTempWater;
        const diffEl = document.getElementById("temp-water-diff");
        if (diffEl) {
            const diffFormatted = diff.toFixed(1);
            if (diff > 0) {
                diffEl.className =
                    "flex items-center gap-1 ml-2 text-green-600";
                diffEl.innerHTML = `
                    <ion-icon name="arrow-up-outline"></ion-icon>
                    <span class="text-sm font-medium">+${diffFormatted}°C</span>
                `;
            } else if (diff < 0) {
                diffEl.className = "flex items-center gap-1 ml-2 text-red-600";
                diffEl.innerHTML = `
                    <ion-icon name="arrow-down-outline"></ion-icon>
                    <span class="text-sm font-medium">${diffFormatted}°C</span>
                `;
            } else {
                diffEl.className = "flex items-center gap-1 ml-2 text-gray-600";
                diffEl.innerHTML = `
                    <ion-icon name="remove-outline"></ion-icon>
                    <span class="text-sm font-medium">0°C</span>
                `;
            }
        }
    }
    lastTempWater = tempWater;
});

onValue(ldrRef, (snapshot) => {
    const ldr = snapshot.val();
    console.log("LDR:", ldr);
    updateElement("ldr", ldr, " lux");
    const category = getLdrCategory(ldr);
    const statusEl = document.getElementById("ldr-status");
    if (statusEl) {
        statusEl.innerText = category;
        statusEl.className =
            "px-3 py-1 rounded-full text-sm font-medium " +
            (category === "Gelap"
                ? "bg-gray-500 text-gray-100"
                : category === "Redup"
                ? "bg-blue-100 text-blue-600"
                : category === "Sedang"
                ? "bg-yellow-100 text-yellow-600"
                : "bg-green-100 text-green-600");
    }

    // Hitung selisih
    if (lastLdr !== null) {
        const diff = ldr - lastLdr;
        const diffEl = document.getElementById("ldr-diff");
        if (diffEl) {
            if (diff > 0) {
                diffEl.className =
                    "flex items-center gap-1 ml-2 text-green-600";
                diffEl.innerHTML = `<ion-icon name="arrow-up-outline"></ion-icon>
                    <span class="text-sm font-medium">+${diff} lux</span>
                `;
            } else if (diff < 0) {
                diffEl.className = "flex items-center gap-1 ml-2 text-red-600";
                diffEl.innerHTML = `<ion-icon name="arrow-down-outline"></ion-icon>
                    <span class="text-sm font-medium">${diff} lux</span>
                `;
            } else {
                diffEl.className = "flex items-center gap-1 ml-2 text-gray-600";
                diffEl.innerHTML = `<ion-icon name="remove-outline"></ion-icon>
                    <span class="text-sm font-medium">0 lux</span>
                `;
            }
        }
    }
    lastLdr = ldr;
});

// onValue(tdsRef, (snapshot) => {
//     const tds = snapshot.val();
//     console.log("TDS:", tds);
//     updateElement("tds", tds, " ppm");
//     const category = getTDSCategory(tds);
//     const statusEl = document.getElementById("tds-status");
//     if (statusEl) {
//         statusEl.innerText = category;
//         statusEl.className =
//             "px-3 py-1 rounded-full text-sm font-medium " +
//             (category === "Rendah" : ? "bg-blue-100 text-blue-600"
//                 : category === "Normal"
//                 ? "bg-green-100 text-green-600"
//                 : "bg-red-100 text-red-600");
//     }

//     // Hitung selisih
//     if (lastTds !== null) {
//         const diff = tds - lastTds;
//         const diffEl = document.getElementById("tds-diff");
//         if (diffEl) {
//             if (diff > 0) {
//                 diffEl.className =
//                     "flex items-center gap-1 ml-2 text-green-600";
//                 diffEl.innerHTML = `<ion-icon name="arrow-up-outline"></ion-icon>
//                     <span class="text-sm font-medium">+${diff} ppm</span>
//                 `;
//             } else if (diff < 0) {
//                 diffEl.className = "flex items-center gap-1 ml-2 text-red-600";
//                 diffEl.innerHTML = `<ion-icon name="arrow-down-outline"></ion-icon>
//                     <span class="text-sm font-medium">${diff} ppm</span>
//                 `;
//             } else {
//                 diffEl.className = "flex items-center gap-1 ml-2 text-gray-600";
//                 diffEl.innerHTML = `<ion-icon name="remove-outline"></ion-icon>
//                     <span class="text-sm font-medium">0 ppm</span>
//                 `;
//             }
//         }
//     }
//     lastTds = tds;
// });

let latestInfo = null;

onValue(infoRef, (snapshot) => {
    latestInfo = snapshot.val();
    if (!latestInfo) return;

    // console.log("INFO:", latestInfo);

    updateElement("info-device_id", latestInfo.device_id);
    updateElement("info-ssid", latestInfo.ssid);
    updateElement("info-ip", latestInfo.ip);
    updateElement("info-last_update", latestInfo.last_update);
    updateElement("info-last_active", latestInfo.last_active);

    checkDeviceStatus();
});

// Fungsi untuk cek status perangkat
function checkDeviceStatus() {
    if (!latestInfo) return;

    const statusEl = document.getElementById("device-status");
    const now = new Date();
    const lastUpdate = new Date(
        (latestInfo.last_update || "").replace(" ", "T")
    );
    const lastActive = new Date(
        (latestInfo.last_active || "").replace(" ", "T")
    );

    const diffUpdate = Math.floor((now - lastUpdate) / 1000);
    const diffActive = Math.floor((now - lastActive) / 1000);

    // logika utama: update >1 menit berarti tidak aktif
    if (isNaN(diffUpdate) || diffUpdate > 60) {
        statusEl.className =
            "mt-4 px-3 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2 bg-red-100 text-red-700 border border-red-300";
        statusEl.innerHTML =
            '<ion-icon class="text-xl" name="alert-circle-outline"></ion-icon><span>Perangkat tidak aktif / belum tersambung Wi-Fi</span>';
    } else {
        statusEl.className =
            "mt-4 px-3 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2 bg-green-100 text-green-700 border border-green-300";
        statusEl.innerHTML = `<ion-icon class="text-xl" name="checkmark-circle-outline"></ion-icon>
            <span>Perangkat aktif (update ${diffUpdate} detik lalu)</span>`;
    }

    // opsional: tampilkan juga info kapan terakhir nyala
    console.log(`Cek: last_active=${diffActive} detik lalu`);
}

// Jalankan pengecekan rutin tiap 15 detik
setInterval(checkDeviceStatus, 15 * 1000);

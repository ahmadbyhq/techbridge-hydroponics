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
let lastGas = null;
let lastLdr = null;
let lastHum = null;
let lastTds = null;
let lastTempWater = null;

// Database references
const temperatureRef = ref(database, "sensors/temperature");
const humidityRef = ref(database, "sensors/humidity");
const gasRef = ref(database, "sensors/gas");
const ldrRef = ref(database, "sensors/ldr");
const tempWaterRef = ref(database, "sensors/tempWater");
const relayRef = ref(database, "relay/ldrLamp");
// const tdsRef = ref(database, "sensors/tds");

// Helper function to update element safely
function updateElement(id, value, suffix = "") {
    const el = document.getElementById(id);
    if (el) el.innerText = value + suffix;
}

function getGasCategory(gas_value) {
    if (gas_value <= 1000) return "Normal";
    else if (gas_value <= 2000) return "Warning";
    else return "Danger";
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
    if (tempWater_value < 20) return "Dingin";
    else if (tempWater_value >= 20 && tempWater_value <= 27) return "Normal";
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
                : category === "Panas"
                ? "bg-red-100 text-red-600"
                : "bg-blue-100 text-blue-600");
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

onValue(gasRef, (snapshot) => {
    const gas = snapshot.val();
    console.log("Gas:", gas);
    updateElement("gas", gas, " ppm");

    const category = getGasCategory(gas);
    const statusEl = document.getElementById("gas-status");
    if (statusEl) {
        statusEl.innerText = category;
        statusEl.className =
            "px-3 py-1 rounded-full text-sm font-medium " +
            (category === "Normal"
                ? "bg-green-100 text-green-600"
                : category === "Warning"
                ? "bg-yellow-100 text-yellow-600"
                : "bg-red-100 text-red-600");
    }

    // Hitung selisih
    if (lastGas !== null) {
        const diff = gas - lastGas;
        const diffEl = document.getElementById("gas-diff");
        if (diffEl) {
            if (diff > 0) {
                diffEl.className =
                    "flex items-center gap-1 ml-2 text-green-600";
                diffEl.innerHTML = `
                    <ion-icon name="arrow-up-outline"></ion-icon>
                    <span class="text-sm font-medium">+${diff} ppm</span>
                `;
            } else if (diff < 0) {
                diffEl.className = "flex items-center gap-1 ml-2 text-red-600";
                diffEl.innerHTML = `<ion-icon name="arrow-down-outline"></ion-icon>
                    <span class="text-sm font-medium">${diff} ppm</span>
                `;
            } else {
                diffEl.className = "flex items-center gap-1 ml-2 text-gray-600";
                diffEl.innerHTML = `
                    <ion-icon name="remove-outline"></ion-icon>
                    <span class="text-sm font-medium">0 ppm</span>
                `;
            }
        }
    }
    lastGas = gas;
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

onValue(relayRef, (snapshot) => {
    const relayState = snapshot.val();
    console.log("Relay State:", relayState);

    const statusEl = document.getElementById("lamp-status");
    if (statusEl) {
        statusEl.innerText = relayState ? "ON" : "OFF";
        statusEl.className =
            "px-3 py-1 rounded-full text-sm font-medium " +
            (relayState
                ? "bg-green-100 text-green-600"
                : "bg-red-100 text-red-600");
    }
    const lampEl = document.getElementById("lamp");
    if (lampEl) {
        lampEl.innerText = relayState ? "Nyala" : "Mati";
        lampEl.className = "text-3xl font-bold ";
    }
});

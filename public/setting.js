// setting.js
import { app } from "./auth.js";
import {
    getAuth,
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc,
    updateDoc,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const auth = getAuth(app);
const firestore = getFirestore(app);

//load batas sensor
async function loadSensorLimits() {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(firestore, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return;

    const userData = userSnap.data();
    const deviceId = userData.device_id;

    if (!deviceId) return;

    const deviceRef = doc(firestore, "devices", deviceId);
    const deviceSnap = await getDoc(deviceRef);

    if (!deviceSnap.exists()) return;

    const deviceData = deviceSnap.data();
    const limits = deviceData.sensor_limits;

    if (!limits) return;

    document.getElementById("tempWaterMin").value = limits.temp_water_min;
    document.getElementById("tempWaterMax").value = limits.temp_water_max;

    document.getElementById("tempEnvMin").value = limits.temp_env_min;
    document.getElementById("tempEnvMax").value = limits.temp_env_max;

    document.getElementById("humidityMin").value = limits.humidity_min;
    document.getElementById("humidityMax").value = limits.humidity_max;

    document.getElementById("tdsMin").value = limits.tds_min;
    document.getElementById("tdsMax").value = limits.tds_max;
    console.log("Berhasil load sensor");
}

// save perubahan batas sensor
async function saveSensorLimits() {
    const fields = {
        tempWater: {
            min: parseFloat(document.getElementById("tempWaterMin").value),
            max: parseFloat(document.getElementById("tempWaterMax").value),
            err: document.getElementById("errTempWater"),
            range: { min: -55, max: 125 },
        },
        tempEnv: {
            min: parseFloat(document.getElementById("tempEnvMin").value),
            max: parseFloat(document.getElementById("tempEnvMax").value),
            err: document.getElementById("errTempEnv"),
            range: { min: -40, max: 80 },
        },
        humidity: {
            min: parseFloat(document.getElementById("humidityMin").value),
            max: parseFloat(document.getElementById("humidityMax").value),
            err: document.getElementById("errHumidity"),
            range: { min: 0, max: 100 },
        },
        tds: {
            min: parseFloat(document.getElementById("tdsMin").value),
            max: parseFloat(document.getElementById("tdsMax").value),
            err: document.getElementById("errTDS"),
            range: { min: 0, max: 1000 },
        },
    };

    let valid = true;

    Object.values(fields).forEach((f) => {
        f.err.classList.add("hidden");
        f.err.textContent = "";
    });

    Object.values(fields).forEach((f) => {
        if (isNaN(f.min) || isNaN(f.max)) {
            f.err.textContent = "Nilai minimum dan maksimum harus diisi.";
            f.err.classList.remove("hidden");
            valid = false;
            return;
        }

        if (f.min >= f.max) {
            f.err.textContent =
                "Nilai Minimum harus lebih kecil dari maksimum.";
            f.err.classList.remove("hidden");
            valid = false;
            return;
        }

        if (f.min < f.range.min || f.max > f.range.max) {
            f.err.textContent = `Batas rentang sensor harus berada antara ${f.range.min} hingga ${f.range.max}.`;
            f.err.classList.remove("hidden");
            valid = false;
            return;
        }
    });

    if (!valid) return;

    const user = auth.currentUser;
    const userRef = doc(firestore, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const deviceId = userSnap.data().device_id;

    const devRef = doc(firestore, "devices", deviceId);
    const devSnap = await getDoc(devRef);
    const oldLimits = devSnap.data().sensor_limits || {};

    const newLimits = {
        temp_water_min: fields.tempWater.min,
        temp_water_max: fields.tempWater.max,

        temp_env_min: fields.tempEnv.min,
        temp_env_max: fields.tempEnv.max,

        humidity_min: fields.humidity.min,
        humidity_max: fields.humidity.max,

        tds_min: fields.tds.min,
        tds_max: fields.tds.max,
    };

    let changed = false;

    Object.keys(newLimits).forEach((key) => {
        if (oldLimits[key] !== newLimits[key]) {
            changed = true;
        }
    });

    if (!changed) {
        alert("Tidak ada perubahan pada batas sensor.");
        console.log("Tidak ada batas sensor yang dirubah");
        return;
    }

    await updateDoc(devRef, { sensor_limits: newLimits });

    alert("Perubahan sensor berhasil disimpan!");
    console.log("Perubahan batas sensor berhasil disimpan!");
}

document.addEventListener("DOMContentLoaded", () => {
    const saveBtn = document.getElementById("saveSensorSettings");
    if (saveBtn) saveBtn.addEventListener("click", saveSensorLimits);
});

onAuthStateChanged(auth, (user) => {
    if (user) loadSensorLimits();
});

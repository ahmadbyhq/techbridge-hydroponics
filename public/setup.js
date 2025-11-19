import {
    getDatabase,
    ref,
    get,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { app, getLocalTimeString } from "./auth.js";

const auth = getAuth(app);
const firestore = getFirestore(app);
const rtdb = getDatabase(app);

const form = document.getElementById("setupForm");
const deviceField = document.getElementById("deviceId");
const msgError = document.getElementById("msgError");

async function checkDeviceExistsRTDB(deviceId) {
    const deviceRef = ref(rtdb, "devices/" + deviceId + "/info");
    const snapshot = await get(deviceRef);
    return snapshot.exists();
}

async function checkDeviceOwnership(deviceId) {
    const deviceDoc = await getDoc(doc(firestore, "devices", deviceId));
    if (!deviceDoc.exists()) return null;
    return deviceDoc.data().owner_uid;
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    msgError.classList.add("hidden");
    msgError.textContent = "";

    const device_id = deviceField.value.trim();
    const user = auth.currentUser;

    if (!device_id || !user) {
        msgError.textContent = "ID device harus diisi.";
        msgError.classList.remove("hidden");
        return;
    }

    try {
        const existsRTDB = await checkDeviceExistsRTDB(device_id);

        if (!existsRTDB) {
            msgError.textContent = "ID Device tidak ditemukan dalam database.";
            msgError.classList.remove("hidden");
            return;
        }

        const ownerUid = await checkDeviceOwnership(device_id);

        if (ownerUid && ownerUid !== user.uid) {
            msgError.textContent = "Device ini sudah dimiliki oleh akun lain.";
            msgError.classList.remove("hidden");
            return;
        }

        const userSnap = await getDoc(doc(firestore, "users", user.uid));
        const userData = userSnap.data();

        await updateDoc(doc(firestore, "users", user.uid), {
            device_id: device_id,
        });

        await setDoc(
            doc(firestore, "devices", device_id),
            {
                device_id: device_id,
                owner_uid: user.uid,
                owner_name: userData.name,
                owner_email: userData.email,
                claimed_at: getLocalTimeString(),

                sensor_limits: {
                    temp_env_min: 20,
                    temp_env_max: 30,
                    temp_water_min: 18,
                    temp_water_max: 24,
                    humidity_min: 50,
                    humidity_max: 80,
                    tds_min: 700,
                    tds_max: 900,
                },
            },
            { merge: true }
        );

        window.location.href = "index.html";
    } catch (error) {
        console.error(error);
        msgError.textContent = "Terjadi kesalahan. Coba lagi.";
        msgError.classList.remove("hidden");
    }
});

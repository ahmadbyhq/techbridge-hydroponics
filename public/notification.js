// notification.js
import { app } from "./auth.js";

import {
    getAuth,
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc,
    collection,
    query,
    orderBy,
    onSnapshot,
    writeBatch,
    updateDoc,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const auth = getAuth(app);
const firestore = getFirestore(app);

let currentDeviceId = null;
let notifications = [];

const notifListEl = document.getElementById("notif-list");
const totalNotifEl = document.getElementById("total-notif");
const markAllReadBtn = document.getElementById("mark-all-read");
const deleteAllBtn = document.getElementById("delete-all");

// ====================================================================
// START LISTENER
// ====================================================================

async function startNotificationListener(user) {
    const userSnap = await getDoc(doc(firestore, "users", user.uid));
    if (!userSnap.exists()) return;

    currentDeviceId = userSnap.data().device_id;
    if (!currentDeviceId) return;

    const notifCol = collection(
        firestore,
        "devices",
        currentDeviceId,
        "notifications"
    );
    const q = query(notifCol, orderBy("created_at", "desc"));

    onSnapshot(q, (snapshot) => {
        notifications = [];

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();

            // FILTER — hanya tampilkan yang belum dibaca dan belum dihapus
            if (data.is_deleted || data.deleted_at) return;
            // if (data.read && data.read_at) return;

            notifications.push({
                id: docSnap.id,
                ...data,
            });
        });

        notifications.sort((a, b) => {
            if (!a.read && b.read) return -1;
            if (a.read && !b.read) return 1; 

            const timeA = new Date(
                a.created_at?.toDate?.() || a.created_at
            );
            const timeB = new Date(
                b.created_at?.toDate?.() || b.created_at
            );
            return timeB - timeA;
        });

        renderNotifications();
    });
}

onAuthStateChanged(auth, (user) => {
    if (user) startNotificationListener(user);
});

// ====================================================================
// RENDER LIST
// ====================================================================

function renderNotifications() {
    notifListEl.innerHTML = "";

    if (notifications.length === 0) {
        notifListEl.innerHTML = `
            <p class="text-md text-gray-500 text-center py-4">Belum ada notifikasi.</p>
        `;
        totalNotifEl.textContent = "0";
        return;
    }

    notifications.forEach((notif) => {
        const wrapper = document.createElement("div");

        const level = notif.level || "warning";
        const bgColor =
            level === "danger"
                ? "bg-red-50"
                : level === "info"
                ? "bg-blue-50"
                : "bg-amber-50";

        const iconColor =
            level === "danger"
                ? "text-red-500"
                : level === "info"
                ? "text-blue-500"
                : "text-amber-500";

        const sensorBg =
            level === "danger"
                ? "bg-red-100 text-red-700"
                : level === "info"
                ? "bg-blue-100 text-blue-700"
                : "bg-amber-100 text-amber-700";

        const opacity = notif.read ? "opacity-60" : "";

        wrapper.className = `flex items-center gap-3 rounded-xl px-4 py-3 ${bgColor} border border-gray-200 ${opacity}`;

        wrapper.innerHTML = `
          <div class="flex items-center">
              <div class="flex items-center justify-center w-10 h-10 rounded-full border-2 ${iconColor}">
                  <ion-icon 
                      name="${
                          level === "danger"
                              ? "alert-circle-outline"
                              : level === "info"
                              ? "information-circle-outline"
                              : "warning-outline"
                      }" 
                      class="text-lg ${iconColor}">
                  </ion-icon>
              </div>
          </div>


        <div class="flex-1 flex justify-between items-center">
            <div class="max-w-[80%]">
                <p class="font-semibold text-sm text-gray-900">${
                    notif.title
                }</p>
                <p class="text-xs text-gray-700 mt-0.5">${notif.message}</p>
                <p class="text-[11px] text-gray-500 mt-1">${formatTimestamp(
                    notif.created_at
                )}</p>
            </div>

            <div class="flex items-center gap-2">

                <!-- NAMA SENSOR -->
                <span class="px-2 py-1 rounded-full text-[11px] font-medium ${sensorBg} whitespace-nowrap">
                    ${notif.sensor_label || "-"}
                </span>

                <!-- TANDAI DIBACA -->
                <button data-id="${notif.id}"
                    class="notif-read flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:bg-emerald-500 hover:text-white transition">
                    <ion-icon name="checkmark-done-outline" class="text-lg"></ion-icon>
                </button>

                <!-- HAPUS -->
                <button data-id="${notif.id}"
                    class="notif-delete flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:bg-red-500 hover:text-white transition">
                    <ion-icon name="trash-outline" class="text-lg"></ion-icon>
                </button>
            </div>
        </div>
        `;

        notifListEl.appendChild(wrapper);
    });

    totalNotifEl.textContent = notifications.length;

    attachEvents();
}

// ====================================================================
// FORMAT TIMESTAMP
// ====================================================================

function formatTimestamp(ts) {
    if (!ts) return "";

    if (ts.toDate) return ts.toDate().toLocaleString("id-ID");
    if (ts.timestampValue)
        return new Date(ts.timestampValue).toLocaleString("id-ID");
    if (typeof ts === "string") return new Date(ts).toLocaleString("id-ID");

    return "";
}

// ====================================================================
// EVENT HANDLERS (READ / DELETE)
// ====================================================================

function attachEvents() {
    // Tandai dibaca per-item
    document.querySelectorAll(".notif-read").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const id = btn.dataset.id;
            await updateDoc(
                doc(firestore, "devices", currentDeviceId, "notifications", id),
                {
                    read: true,
                    read_at: new Date(),
                }
            );
        });
    });

    // Hapus per-item
    document.querySelectorAll(".notif-delete").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const id = btn.dataset.id;
            await updateDoc(
                doc(firestore, "devices", currentDeviceId, "notifications", id),
                {
                    is_deleted: true,
                    deleted_at: new Date(),
                }
            );
        });
    });
}

// ====================================================================
// MARK ALL READ
// ====================================================================

markAllReadBtn.addEventListener("click", async () => {
    if (notifications.length === 0) return;

    const batch = writeBatch(firestore);
    const now = new Date();

    notifications.forEach((n) => {
        const ref = doc(
            firestore,
            "devices",
            currentDeviceId,
            "notifications",
            n.id
        );
        batch.update(ref, { read: true, read_at: now });
    });

    await batch.commit();
});

// ====================================================================
// DELETE ALL
// ====================================================================

deleteAllBtn.addEventListener("click", async () => {
    if (notifications.length === 0) return;
    if (!confirm("Hapus semua notifikasi?")) return;

    const batch = writeBatch(firestore);
    const now = new Date();

    notifications.forEach((n) => {
        const ref = doc(
            firestore,
            "devices",
            currentDeviceId,
            "notifications",
            n.id
        );
        batch.update(ref, { is_deleted: true, deleted_at: now });
    });

    await batch.commit();
});

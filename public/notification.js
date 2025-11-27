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
  deleteDoc,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const auth = getAuth(app);
const firestore = getFirestore(app);

// state global
let currentDeviceId = null;
let notifications = [];

// elemen DOM
const notifListEl = document.getElementById("notif-list");
const totalNotifEl = document.getElementById("total-notif");
const markAllReadBtn = document.getElementById("mark-all-read");
const deleteAllBtn = document.getElementById("delete-all");

console.log("notification.js loaded");

async function startNotificationListener(user) {
  console.log("startNotificationListener for uid:", user.uid);

  const userRef = doc(firestore, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    console.error("User doc tidak ditemukan di Firestore");
    return;
  }

  const userData = userSnap.data();
  const deviceId = userData.device_id;
  console.log("deviceId dari user doc:", deviceId);

  if (!deviceId) {
    console.error("device_id kosong di dokumen user");
    return;
  }

  currentDeviceId = deviceId;

  const notifCol = collection(firestore, "devices", deviceId, "notifications");

  const q = query(notifCol, orderBy("created_at", "desc"));

  onSnapshot(
    q,
    (snapshot) => {
      notifications = [];
      snapshot.forEach((docSnap) => {
        notifications.push({
          id: docSnap.id,
          ...docSnap.data(),
        });
      });
      renderNotifications();
    },
    (error) => {
      console.error("onSnapshot notifications error:", error);
    }
  );
}

onAuthStateChanged(auth, (user) => {
  console.log("onAuthStateChanged, user =", user);

  if (!user) {
    console.warn("Tidak ada user login");
    return;
  }

  startNotificationListener(user);
});

// Render notifications
function renderNotifications() {
  if (!notifListEl) return;

  notifListEl.innerHTML = "";

  if (notifications.length === 0) {
    notifListEl.innerHTML = `
      <p class="text-md text-gray-500 text-center py-4">
        Belum ada notifikasi.
      </p>
    `;
    updateTotalNotif();
    return;
  }

  notifications.forEach((notif) => {
    const wrapper = document.createElement("div");

    const level = notif.level || "warning";
    const bgColor = level === "danger" ? "bg-red-50" : "bg-amber-50";
    const iconBorder =
      level === "danger"
        ? "border-red-500 text-red-500"
        : "border-amber-500 text-amber-500";

    const sensorBg =
      level === "danger"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";

    const opacity = notif.read ? "opacity-60" : "";

    wrapper.className = `flex items-start gap-3 rounded-xl px-4 py-3 ${bgColor} ${opacity}`;

    wrapper.innerHTML = `
  <div class="flex items-start gap-3 w-full">
    
    <div class="mt-0.5">
      <div class="w-8 h-8 rounded-full flex items-center justify-center border-2 ${iconBorder}">
        <ion-icon name="${
          level === "danger" ? "alert-circle-outline" : "warning-outline"
        }" class="text-xl"></ion-icon>
      </div>
    </div>

    <div class="flex-1 flex justify-between items-center">
      <div class="max-w-[80%]">
        <p class="font-semibold text-sm text-gray-900">${notif.title || "-"}</p>
        <p class="text-xs text-gray-700 mt-0.5">${notif.message || ""}</p>
        <p class="text-[11px] text-gray-500 mt-1">${formatTimestamp(
          notif.created_at
        )}</p>
      </div>

      <!-- Chip + Trash -->
      <div class="flex items-center gap-2">
        
        <span class="inline-flex items-center justify-center px-2 py-1 rounded-full text-[11px] font-medium ${sensorBg} whitespace-nowrap">
          ${notif.sensor_label || "-"}
        </span>

        <button data-id="${notif.id}"
          class="notif-close flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:bg-red-500 hover:text-white transition-colors duration-150">
          <ion-icon name="trash-outline" class="text-lg"></ion-icon>
        </button>
      </div>
    </div>
  </div>
`;

    notifListEl.appendChild(wrapper);
  });

  updateTotalNotif();
  attachCloseHandlers();
}

function formatTimestamp(ts) {
  if (!ts) return "";

  // Firestore Timestamp -> Date
  if (ts.toDate && typeof ts.toDate === "function") {
    const date = ts.toDate();
    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  return "";
}

function updateTotalNotif() {
  if (!totalNotifEl) return;
  totalNotifEl.textContent = String(notifications.length);
}

function attachCloseHandlers() {
  const closeButtons = document.querySelectorAll(".notif-close");
  closeButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      if (!id || !currentDeviceId) return;

      const notifRef = doc(
        firestore,
        "devices",
        currentDeviceId,
        "notifications",
        id
      );

      await deleteDoc(notifRef);
    });
  });
}

//Mark all as read
if (markAllReadBtn) {
  markAllReadBtn.addEventListener("click", async () => {
    if (!currentDeviceId || notifications.length === 0) return;

    const batch = writeBatch(firestore);

    notifications.forEach((n) => {
      if (!n.read) {
        const refDoc = doc(
          firestore,
          "devices",
          currentDeviceId,
          "notifications",
          n.id
        );
        batch.update(refDoc, { read: true });
      }
    });

    await batch.commit();
  });
}

// Delete all notifications
if (deleteAllBtn) {
  deleteAllBtn.addEventListener("click", async () => {
    if (!currentDeviceId || notifications.length === 0) return;
    if (!confirm("Hapus semua notifikasi?")) return;

    const batch = writeBatch(firestore);

    notifications.forEach((n) => {
      const refDoc = doc(
        firestore,
        "devices",
        currentDeviceId,
        "notifications",
        n.id
      );
      batch.delete(refDoc);
    });

    await batch.commit();
  });
}

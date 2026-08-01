const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Simple AI matching logic: match donor-compatible (same bloodGroup and organ)
function computeMatches(donors, recipients) {
  const matches = [];
  recipients.forEach((r) => {
    const donor = donors.find(
      (d) =>
        d.bloodGroup &&
        r.bloodGroup &&
        d.bloodGroup.toLowerCase() === r.bloodGroup.toLowerCase() &&
        d.organType &&
        r.organType &&
        d.organType.toLowerCase() === r.organType.toLowerCase()
    );
    if (donor) {
      matches.push({
        donorId: donor.id,
        donorName: donor.fullName || "",
        recipientId: r.id,
        recipientName: r.fullName || "",
        bloodGroup: r.bloodGroup || "",
        organType: r.organType || "",
        score: Math.round(80 + Math.random() * 20), // mock score
        status: "Pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });
  return matches;
}

// POST route to run AI match
app.post("/run-match", async (req, res) => {
  try {
    const donorsSnap = await db.collection("users").where("role", "==", "donor").get();
    const recipientsSnap = await db.collection("users").where("role", "==", "recipient").get();

    const donors = donorsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const recipients = recipientsSnap.docs.map((r) => ({ id: r.id, ...r.data() }));

    const matches = computeMatches(donors, recipients);

    const batch = db.batch();
    const saved = [];
    matches.forEach((m) => {
      const ref = db.collection("matches").doc();
      batch.set(ref, m);
      saved.push({ id: ref.id, ...m });
    });
    await batch.commit();

    res.status(200).json({ success: true, matches: saved });
  } catch (err) {
    console.error("Error run-match:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET example route
app.get("/users", async (req, res) => {
  try {
    const usersSnap = await db.collection("users").get();
    const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

exports.simulateOrganTransport = onSchedule("every 2 minutes", async () => {
  const db = admin.firestore();
  const snapshot = await db.collection('organTransfers')
    .where('status', '==', 'in_transit').get();

  snapshot.forEach(async (doc) => {
    const data = doc.data();
    const { vehicleLocation, recipientLocation } = data;

    // Move vehicle 10% closer to destination each tick
    const newLat = vehicleLocation.lat + (recipientLocation.lat - vehicleLocation.lat) * 0.1;
    const newLng = vehicleLocation.lng + (recipientLocation.lng - vehicleLocation.lng) * 0.1;

    await doc.ref.update({ vehicleLocation: { lat: newLat, lng: newLng } });
  });
});

// Export a single entrypoint
exports.api = functions.https.onRequest(app);

// functions/index.js — add this line alongside your existing exports
exports.createDoctorAccount = require("./createDoctorAccount").createDoctorAccount;
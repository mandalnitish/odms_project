// functions/createDoctorAccount.js
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

exports.createDoctorAccount = onCall(async (request) => {
  const { auth, data } = request;

  // Must be signed in
  if (!auth) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }

  // Caller must be an admin — checked server-side against Firestore,
  // never trust a role claim sent from the client.
  const callerDoc = await admin
    .firestore()
    .collection("users")
    .doc(auth.uid)
    .get();

  if (!callerDoc.exists || callerDoc.data().role !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "Only an admin can create doctor accounts."
    );
  }

  const { fullName, email, password, mobile, address, specialization, hospital } = data;

  if (!fullName || !email || !password) {
    throw new HttpsError(
      "invalid-argument",
      "fullName, email, and password are required."
    );
  }

  if (password.length < 6) {
    throw new HttpsError(
      "invalid-argument",
      "Password must be at least 6 characters."
    );
  }

  try {
    // Create the Auth account
    const newUser = await admin.auth().createUser({
      email: email.trim().toLowerCase(),
      password,
      displayName: fullName.trim(),
    });

    // Create the Firestore profile — role is set here, server-side, only
    await admin.firestore().collection("users").doc(newUser.uid).set({
      uid: newUser.uid,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      mobile: mobile?.trim() || "",
      address: address?.trim() || "",
      specialization: specialization?.trim() || "",
      hospital: hospital?.trim() || "",
      role: "doctor",
      documentsVerified: true,
      accountStatus: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: auth.uid,
    });

    return { success: true, uid: newUser.uid };
  } catch (err) {
    if (err.code === "auth/email-already-exists") {
      throw new HttpsError(
        "already-exists",
        "An account already exists with this email."
      );
    }
    throw new HttpsError("internal", err.message || "Failed to create doctor account.");
  }
});
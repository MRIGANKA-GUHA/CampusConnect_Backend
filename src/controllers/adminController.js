import admin from "../db/firebase.js";
import { Club } from "../models/Club.js";

// ─── Get Student Count ─────────────────────────────────────────────────────────
export const getStudentCount = async (req, res) => {
  try {
    const snapshot = await admin
      .firestore()
      .collection("users")
      .where("role", "in", ["student", "convenor"])
      .count()
      .get();

    return res.status(200).json({ count: snapshot.data().count });
  } catch (error) {
    console.error("Admin stats error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Get All Students List ───────────────────────────────────────────────────
export const getStudents = async (req, res) => {
  try {
    const snapshot = await admin
      .firestore()
      .collection("users")
      .where("role", "in", ["student", "convenor"])
      .get();

    const students = [];
    snapshot.forEach((doc) => {
      // Don't send sensitive info like exact timestamps if not needed, but sending public profile info.
      const data = doc.data();
      students.push({
        id: data.uid || doc.id,
        displayName: data.displayName,
        email: data.email,
        phoneNo: data.phoneNo,
        department: data.department,
        rollNo: data.rollNo,
        role: data.role || 'student',
        photoURL: data.photoURL,
        bio: data.bio || data.metadata?.bio || '',
        isVerified: data.isVerified,
        isDisabled: data.isDisabled || false,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      });
    });

    return res.status(200).json({ students });
  } catch (error) {
    console.error("Admin getStudents error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Delete User (Permanent Hard Delete) ─────────────────────────────────────
export const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Delete from Firestore users collection
    await admin.firestore().collection("users").doc(id).delete();

    // 2. Delete active session if any
    await admin.firestore().collection("sessions").doc(id).delete();

    // 3. Delete from Firebase Authentication
    await admin.auth().deleteUser(id);

    return res.status(200).json({ message: "User permanently deleted." });
  } catch (error) {
    console.error("Admin deleteUser error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Update User Role ────────────────────────────────────────────────────────
export const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role || !["student", "admin", "convenor"].includes(role)) {
    return res.status(400).json({ error: "Invalid role specified." });
  }

  try {
    // Update role in Firestore
    await admin.firestore().collection("users").doc(id).update({ role });

    // If we rely on token verification, we should probably delete their session
    // to force them to log back in and re-fetch privileges on their side.
    await admin.firestore().collection("sessions").doc(id).delete();

    return res.status(200).json({ message: `User role successfully updated to ${role}.` });
  } catch (error) {
    console.error("Admin updateUserRole error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Toggle User Disabled Status ─────────────────────────────────────────────
export const toggleUserStatus = async (req, res) => {
  const { id } = req.params;
  const { disabled } = req.body;

  if (typeof disabled !== 'boolean') {
    return res.status(400).json({ error: "Invalid status format. Must be boolean." });
  }

  try {
    // 1. Disable/Enable in Firebase Auth (this BLOCKS login at the auth level)
    await admin.auth().updateUser(id, { disabled });

    // 2. Mirror state in Firestore for UI display
    await admin.firestore().collection("users").doc(id).update({ isDisabled: disabled });

    // 3. If disabling, delete active session to immediately kick them out
    if (disabled) {
      await admin.firestore().collection("sessions").doc(id).delete();
    }

    return res.status(200).json({
      message: `User account successfully ${disabled ? 'disabled' : 'enabled'}.`
    });
  } catch (error) {
    console.error("Admin toggleUserStatus error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Toggle User Verification ──────────────────────────────────────────────────
export const toggleVerification = async (req, res) => {
  const { id } = req.params;
  const { verified } = req.body;

  if (typeof verified !== 'boolean') {
    return res.status(400).json({ error: "Invalid status format. Must be boolean." });
  }

  try {
    await admin.firestore().collection("users").doc(id).update({ isVerified: verified });

    return res.status(200).json({
      message: `User account successfully ${verified ? 'verified' : 'unverified'}.`
    });
  } catch (error) {
    console.error("Admin toggleVerification error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Get Public Clubs (No Auth) ───────────────────────────────────────────────
export const getPublicClubs = async (req, res) => {
  try {
    const clubsSnapshot = await admin.firestore()
      .collection("clubs")
      .where("status", "==", "active")
      .get();

    const clubs = [];
    for (const doc of clubsSnapshot.docs) {
      const data = doc.data();
      let convenorName = "";
      let convenorPhoto = "";
      let convenorEmail = "";

      if (data.convenorId) {
        const userDoc = await admin.firestore().collection("users").doc(data.convenorId).get();
        if (userDoc.exists) {
          const u = userDoc.data();
          convenorName = u.displayName || "";
          convenorPhoto = u.photoURL || "";
          convenorEmail = u.email || "";
        }
      }

      clubs.push({
        id: doc.id,
        name: data.name || "",
        category: data.category || "",
        logoURL: data.logoURL || "",
        tagline: data.tagline || "",
        convenorName,
        convenorPhoto,
        convenorEmail
      });
    }

    return res.status(200).json({ clubs });
  } catch (error) {
    console.error("Public getClubs error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Get All Clubs (Admin) ──────────────────────────────────────────────────────
export const getClubs = async (req, res) => {
  try {
    const clubsSnapshot = await admin.firestore().collection("clubs").get();
    const clubs = [];

    for (const doc of clubsSnapshot.docs) {
      const data = doc.data();
      let convenorName = "Unknown";
      let convenorPhoto = null;
      if (data.convenorId) {
        const userDoc = await admin.firestore().collection("users").doc(data.convenorId).get();
        if (userDoc.exists) {
          convenorName = userDoc.data().displayName || userDoc.data().email;
          convenorPhoto = userDoc.data().photoURL || null;
        }
      }

      clubs.push({
        id: doc.id,
        ...data,
        convenorName,
        convenorPhoto
      });
    }

    return res.status(200).json({ clubs });
  } catch (error) {
    console.error("Admin getClubs error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Password generator ───────────────────────────────────────────────────────
const generateClubPassword = (clubName) => {
  const nameSlug = clubName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toLowerCase();
  const numbers = Math.floor(10000 + Math.random() * 89999).toString();
  const specials = ['!', '@', '#', '$', '%'];
  const special = specials[Math.floor(Math.random() * specials.length)];
  return (nameSlug + numbers + special).slice(0, 16).padEnd(8, '0');
};

// ─── Create Club ──────────────────────────────────────────────────────────────
export const createClub = async (req, res) => {
  const { name, category, clubEmail, convenorName, convenorEmail, description } = req.body;

  if (!name || !clubEmail || !convenorEmail || !convenorName) {
    return res.status(400).json({ error: "Name, Club Email, Convenor Name and Email are required." });
  }

  try {
    // 1. Get existing convenor
    const convenorRecord = await admin.auth().getUserByEmail(convenorEmail);
    const convenorId = convenorRecord.uid;

    // 2. Generate password for club account (8–16 chars)
    const generatedPassword = generateClubPassword(name);

    // 3. Create Firebase Auth account for the club email
    const clubAuthRecord = await admin.auth().createUser({
      email: clubEmail,
      password: generatedPassword,
      displayName: `${name} Official`,
    });

    // 4. Store club auth user in Firestore
    await admin.firestore().collection("users").doc(clubAuthRecord.uid).set({
      uid: clubAuthRecord.uid,
      email: clubEmail,
      displayName: `${name} Official`,
      role: "club",
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // 5. Create Club document using the Club model
    const clubRef = admin.firestore().collection("clubs").doc();
    const club = new Club({
      id: clubRef.id,
      name,
      description: description || "",
      convenorId,
      clubEmail,
      clubAuthUid: clubAuthRecord.uid,
      category: category || "Other",
      status: "active",
      logoURL: "",
      coverURL: "",
      tagline: "",
      socialLinks: { instagram: "", linkedin: "", website: "" },
      metadata: {},
      members: [],
      events: []
    });
    const newClub = club.toFirestore();

    await clubRef.set(newClub);

    return res.status(201).json({
      message: "Club initialized successfully.",
      club: newClub,
      clubEmail,
      password: generatedPassword  // Shown once — admin must note it
    });
  } catch (error) {
    console.error("Admin createClub error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Update Club Status ───────────────────────────────────────────────────────
export const updateClubStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Status is required." });
  }

  try {
    await admin.firestore().collection("clubs").doc(id).update({
      status,
      updatedAt: new Date().toISOString()
    });
    return res.status(200).json({ message: "Club status updated successfully." });
  } catch (error) {
    console.error("Admin updateClubStatus error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Delete Club ──────────────────────────────────────────────────────────────
export const deleteClub = async (req, res) => {
  const { id } = req.params;
  try {
    await admin.firestore().collection("clubs").doc(id).delete();
    return res.status(200).json({ message: "Club deleted successfully." });
  } catch (error) {
    console.error("Admin deleteClub error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Get All Convenors List ───────────────────────────────────────────────────
export const getConvenors = async (req, res) => {
  try {
    // 1. Fetch all clubs to get already-assigned convenor IDs
    const clubsSnapshot = await admin.firestore().collection("clubs").get();
    const assignedConvenorIds = new Set();
    clubsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.convenorId) assignedConvenorIds.add(data.convenorId);
    });

    // 2. Fetch all convenor-role users
    const snapshot = await admin
      .firestore()
      .collection("users")
      .where("role", "==", "convenor")
      .get();

    const convenors = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const uid = data.uid || doc.id;
      // Exclude those already assigned to a club
      if (!assignedConvenorIds.has(uid)) {
        convenors.push({
          id: uid,
          displayName: data.displayName,
          email: data.email
        });
      }
    });

    return res.status(200).json({ convenors });
  } catch (error) {
    console.error("Get convenors error:", error);
    return res.status(500).json({ error: error.message });
  }
};

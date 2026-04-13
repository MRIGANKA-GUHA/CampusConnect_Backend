import admin from "../db/firebase.js";

// ─── Get Student Count ─────────────────────────────────────────────────────────
export const getStudentCount = async (req, res) => {
  try {
    const snapshot = await admin
      .firestore()
      .collection("users")
      .where("role", "==", "student")
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
      .where("role", "==", "student")
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


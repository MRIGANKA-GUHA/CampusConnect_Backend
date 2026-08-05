import admin from "../db/firebase.js";
import { Club } from "../models/Club.js";
import { Notice } from "../models/Notice.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/uploadPdf.js";

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

  if (!role || !["student", "admin"].includes(role)) {
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

// ─── Get Public Stats (No Auth) ────────────────────────────────────────────────
export const getPublicStats = async (req, res) => {
  try {
    const firestore = admin.firestore();

    // 1. Club Count (Active only)
    const clubsSnapshot = await firestore
      .collection("clubs")
      .where("status", "==", "active")
      .count()
      .get();
    
    // 2. Event Count (Published or Completed)
    const eventsSnapshot = await firestore
      .collection("events")
      .where("status", "in", ["published", "completed"])
      .count()
      .get();

    // 3. Member Count (Students)
    const membersSnapshot = await firestore
      .collection("users")
      .where("role", "==", "student")
      .count()
      .get();

    return res.status(200).json({
      clubs: clubsSnapshot.data().count,
      events: eventsSnapshot.data().count,
      members: membersSnapshot.data().count
    });
  } catch (error) {
    console.error("Public stats error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Get Public Events (No Auth) ──────────────────────────────────────────────
export const getPublicEvents = async (req, res) => {
  try {
    const eventsSnapshot = await admin.firestore()
      .collection("events")
      .where("status", "in", ["published", "completed"])
      .orderBy("date", "asc")
      .limit(6)
      .get();

    const events = [];
    eventsSnapshot.forEach(doc => {
      events.push({ id: doc.id, ...doc.data() });
    });

    return res.status(200).json({ events });
  } catch (error) {
    console.error("Public events error:", error);
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

// ─── Get All Students (for club convenor assignment) ─────────────────────────
export const getConvenors = async (req, res) => {
  try {
    // 1. Fetch all clubs to get already-assigned convenor IDs
    const clubsSnapshot = await admin.firestore().collection("clubs").get();
    const assignedConvenorIds = new Set();
    clubsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.convenorId) assignedConvenorIds.add(data.convenorId);
    });

    // 2. Fetch all students (any student can be assigned as a convenor)
    const snapshot = await admin
      .firestore()
      .collection("users")
      .where("role", "==", "student")
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
    console.error("Get students (convenor assignment) error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Get All Notices (Admin) ────────────────────────────────────────────────────
export const getNotices = async (req, res) => {
  try {
    const snapshot = await admin.firestore()
      .collection("notices")
      .orderBy("createdAt", "desc")
      .get();

    const notices = [];
    const userCache = new Map();      //For caching the user data

    for (const doc of snapshot.docs) {
      const data = doc.data();
      let authorName = data.authorName || "Unknown";

      if (data.authorId) {
        if (userCache.has(data.authorId)) {
          authorName = userCache.get(data.authorId);
        } else {
          const userDoc = await admin.firestore().collection("users").doc(data.authorId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData.displayName) {
              authorName = userData.displayName;
            } else if (userData.email) {
              authorName = userData.email;
            }
          }
          userCache.set(data.authorId, authorName);
        }
      }

      notices.push({
        id: doc.id,
        ...data,
        authorName
      });
    }

    return res.status(200).json({ notices });
  } catch (error) {
    console.error("Get notices error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Create Notice (Admin) ──────────────────────────────────────────────────────
export const createNotice = async (req, res) => {
  try {
    const { uid, displayName, email } = req.user;
    const { title, content, category, priority, targetAudience, clubId, attachments } = req.body;

    if (!title || !content || !category) {
      return res.status(400).json({ error: "title, content and category are required." });
    }

    // Fetch user profile from Firestore to get the actual displayName
    let authorName = displayName || email;
    const userDoc = await admin.firestore().collection("users").doc(uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData.displayName) {
        authorName = userData.displayName;
      }
    }

    // Handle file upload to Cloudinary if provided
    let finalAttachments = [];
    let attachmentName = null;
    if (req.file) {
      try {
        const cloudinaryUrl = await uploadToCloudinary(req.file.buffer, 'notices');
        finalAttachments = [cloudinaryUrl]; // Store as array of strings
        attachmentName = req.file.originalname || null;
        console.log('[Admin] Notice PDF uploaded to Cloudinary:', cloudinaryUrl);
      } catch (uploadErr) {
        console.error('[Admin] Cloudinary upload failed:', uploadErr);
        // We continue with empty attachments if upload fails, or you could return an error
      }
    } else if (attachments) {
      finalAttachments = Array.isArray(attachments) ? attachments : [attachments];
    }

    const now = new Date().toISOString();
    const docRef = admin.firestore().collection("notices").doc();

    const notice = new Notice({
      id: docRef.id,
      title: title.trim(),
      content: content.trim(),
      authorId: uid,
      authorName: authorName,
      category,
      priority: priority || "normal",
      attachments: finalAttachments,
      attachmentName: attachmentName,
      targetAudience: targetAudience || "everyone",
      clubId: clubId || null,
      createdAt: now,
      updatedAt: now
    });

    await docRef.set(notice.toFirestore());
    return res.status(201).json({ notice: { id: docRef.id, ...notice.toFirestore() } });
  } catch (error) {
    console.error("Create notice error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Update Notice ───────────────────────────────────────────────────────────
export const updateNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, priority, targetAudience, clubId, removeAttachment } = req.body;

    const docRef = admin.firestore().collection("notices").doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: "Notice not found." });
    }

    const existing = docSnap.data();
    let finalAttachments = existing.attachments || [];
    let attachmentName = existing.attachmentName || null;

    // If admin requests removal of existing attachment without replacement
    if (removeAttachment === 'true' || removeAttachment === true) {
      for (const url of finalAttachments) {
        await deleteFromCloudinary(url);
      }
      finalAttachments = [];
      attachmentName = null;
    }

    // If a new PDF file was uploaded, replace the existing one
    if (req.file) {
      // Delete old attachments from Cloudinary first
      for (const url of finalAttachments) {
        await deleteFromCloudinary(url);
      }
      const cloudinaryUrl = await uploadToCloudinary(req.file.buffer, 'notices');
      finalAttachments = [cloudinaryUrl];
      attachmentName = req.file.originalname || null;
      console.log('[Admin] Notice PDF replaced in Cloudinary:', cloudinaryUrl);
    }

    const updatedFields = {
      ...(title          && { title: title.trim() }),
      ...(content        && { content: content.trim() }),
      ...(category       && { category }),
      ...(priority       && { priority }),
      ...(targetAudience && { targetAudience }),
      ...(clubId !== undefined && { clubId: clubId || null }),
      attachments: finalAttachments,
      attachmentName,
      updatedAt: new Date().toISOString(),
    };

    await docRef.update(updatedFields);

    const updatedSnap = await docRef.get();
    return res.status(200).json({ notice: { id, ...updatedSnap.data() } });
  } catch (error) {
    console.error("Update notice error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Delete Notice ───────────────────────────────────────────────────────────
export const deleteNotice = async (req, res) => {
  try {
    const { id } = req.params;

    const docRef = admin.firestore().collection("notices").doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: "Notice not found." });
    }

    const { attachments = [] } = docSnap.data();

    // Delete all associated Cloudinary files first
    for (const url of attachments) {
      await deleteFromCloudinary(url);
    }

    // Delete the Firestore document
    await docRef.delete();

    return res.status(200).json({ message: "Notice deleted successfully.", id });
  } catch (error) {
    console.error("Delete notice error:", error);
    return res.status(500).json({ error: error.message });
  }
};

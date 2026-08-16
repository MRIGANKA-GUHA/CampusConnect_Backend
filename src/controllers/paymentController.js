import admin from "../db/firebase.js";
import { Registration, PAYMENT_STATUS, VERIFIED_BY_ROLE } from "../models/Registration.js";

// ─── Helper: Resolve club doc from clubAuthUid ────────────────────────────────
const getClubByAuthUid = async (clubAuthUid) => {
  const snapshot = await admin.firestore()
    .collection("clubs")
    .where("clubAuthUid", "==", clubAuthUid)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

// ─── POST /api/student/events/:eventId/register ───────────────────────────────
// Student registers for an event (free = auto-verified, paid = pending)
export const registerForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { upiTransactionId } = req.body;
    const studentUid = req.user.uid;

    // Fetch event
    const eventRef = admin.firestore().collection("events").doc(eventId);
    const eventDoc = await eventRef.get();
    if (!eventDoc.exists) return res.status(404).json({ error: "Event not found." });

    const event = { id: eventDoc.id, ...eventDoc.data() };

    // Only published events can be registered for
    if (event.status !== "published") {
      return res.status(400).json({ error: "This event is not accepting registrations." });
    }

    // Check if student is already registered
    const existingSnap = await admin.firestore()
      .collection("registrations")
      .where("eventId", "==", eventId)
      .where("studentUid", "==", studentUid)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      return res.status(409).json({ error: "You are already registered for this event." });
    }

    // Check capacity (if defined)
    if (event.capacity && (event.attendees || []).length >= event.capacity) {
      return res.status(400).json({ error: "This event has reached its capacity." });
    }

    // Fetch student info for denormalization
    const userDoc = await admin.firestore().collection("users").doc(studentUid).get();
    const studentData = userDoc.exists ? userDoc.data() : {};

    const now = new Date().toISOString();

    // Build registration doc using the Registration model
    const docRef = admin.firestore().collection("registrations").doc();
    const registration = new Registration({
      id: docRef.id,
      eventId,
      eventTitle: event.title || "",
      clubId: event.clubId || "",
      clubName: event.clubName || "",
      isFree,

      // Student info (denormalized)
      studentUid,
      studentName: studentData.displayName || "",
      studentEmail: studentData.email || "",
      studentRollNo: studentData.rollNo || "",
      studentDepartment: studentData.department || "",
      studentPhotoURL: studentData.photoURL || "",

      // Payment info
      amount: isFree ? 0 : (event.price || 0),
      paymentStatus: isFree ? PAYMENT_STATUS.VERIFIED : PAYMENT_STATUS.PENDING,
      upiTransactionId: isFree ? "" : (upiTransactionId || ""),

      // Verification trail
      registeredAt: now,
      verifiedAt: isFree ? now : null,
      verifiedBy: null,
      verifiedByRole: null,
      createdAt: now,
      updatedAt: now,
    });

    // Atomically: create registration doc + add student UID to event.attendees[]
    const batch = admin.firestore().batch();
    batch.set(docRef, registration.toFirestore());
    batch.update(eventRef, {
      attendees: admin.firestore.FieldValue.arrayUnion(studentUid),
      updatedAt: now,
    });
    await batch.commit();

    return res.status(201).json({ message: "Registration successful.", registration: registration.toFirestore() });
  } catch (error) {
    console.error("registerForEvent error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── GET /api/student/events/:eventId/my-registration ────────────────────────
// Student checks their own registration status for an event
export const getMyRegistration = async (req, res) => {
  try {
    const { eventId } = req.params;
    const studentUid = req.user.uid;

    const snap = await admin.firestore()
      .collection("registrations")
      .where("eventId", "==", eventId)
      .where("studentUid", "==", studentUid)
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(200).json({ registration: null });
    }

    return res.status(200).json({ registration: { id: snap.docs[0].id, ...snap.docs[0].data() } });
  } catch (error) {
    console.error("getMyRegistration error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── GET /api/student/registrations ──────────────────────────────────────────
// Student gets all their registrations (all events)
export const getMyRegistrations = async (req, res) => {
  try {
    const studentUid = req.user.uid;
    const snap = await admin.firestore()
      .collection("registrations")
      .where("studentUid", "==", studentUid)
      .get();

    const registrations = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    registrations.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));

    return res.status(200).json({ registrations });
  } catch (error) {
    console.error("getMyRegistrations error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── GET /api/club/events/:eventId/registrations ─────────────────────────────
// Club fetches all registrations for a specific event they own
export const getEventRegistrations = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Verify club ownership
    const club = await getClubByAuthUid(req.user.uid);
    if (!club) return res.status(404).json({ error: "Club not found." });

    const eventDoc = await admin.firestore().collection("events").doc(eventId).get();
    if (!eventDoc.exists) return res.status(404).json({ error: "Event not found." });
    if (eventDoc.data().clubId !== club.id) {
      return res.status(403).json({ error: "You can only view registrations for your own events." });
    }

    const snap = await admin.firestore()
      .collection("registrations")
      .where("eventId", "==", eventId)
      .get();

    const registrations = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    registrations.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));

    // Summary stats
    const total = registrations.length;
    const pending = registrations.filter(r => r.paymentStatus === "pending").length;
    const verified = registrations.filter(r => r.paymentStatus === "verified").length;
    const rejected = registrations.filter(r => r.paymentStatus === "rejected").length;
    const revenue = registrations
      .filter(r => r.paymentStatus === "verified" && !r.isFree)
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    return res.status(200).json({
      registrations,
      stats: { total, pending, verified, rejected, revenue }
    });
  } catch (error) {
    console.error("getEventRegistrations error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── GET /api/club/registrations/stats ─────────────────────────────────────────────
// Club fetches aggregate registration stats across all their events
export const getClubRegistrationStats = async (req, res) => {
  try {
    const club = await getClubByAuthUid(req.user.uid);
    if (!club) return res.status(404).json({ error: "Club not found." });

    const snap = await admin.firestore()
      .collection("registrations")
      .where("clubId", "==", club.id)
      .get();

    const all = snap.docs.map(doc => doc.data());
    const total = all.length;
    const pending = all.filter(r => r.paymentStatus === "pending").length;
    const verified = all.filter(r => r.paymentStatus === "verified").length;
    const revenue = all
      .filter(r => r.paymentStatus === "verified" && !r.isFree)
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    return res.status(200).json({
      stats: { total, pending, verified, revenue }
    });
  } catch (error) {
    console.error("getClubRegistrationStats error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── PATCH /api/club/registrations/:id/status ────────────────────────────────
// Club verifies or rejects a registration (paid events)
export const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // "verified" | "rejected"

    if (!["verified", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'verified' or 'rejected'." });
    }

    const club = await getClubByAuthUid(req.user.uid);
    if (!club) return res.status(404).json({ error: "Club not found." });

    const regRef = admin.firestore().collection("registrations").doc(id);
    const regDoc = await regRef.get();
    if (!regDoc.exists) return res.status(404).json({ error: "Registration not found." });

    const reg = regDoc.data();
    if (reg.clubId !== club.id) {
      return res.status(403).json({ error: "You can only manage registrations for your own club's events." });
    }

    if (reg.isFree) {
      return res.status(400).json({ error: "Free event registrations are auto-verified and cannot be changed." });
    }

    const now = new Date().toISOString();
    await regRef.update({
      paymentStatus: status,
      verifiedAt: now,
      verifiedBy: req.user.uid,
      verifiedByRole: VERIFIED_BY_ROLE.CLUB,
      updatedAt: now,
    });

    return res.status(200).json({ message: `Registration ${status}.`, id, status });
  } catch (error) {
    console.error("updatePaymentStatus error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── GET /api/admin/registrations ────────────────────────────────────────────
// Admin sees all registrations — filterable by clubId, eventId, paymentStatus
export const getAllRegistrations = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access only." });
    }

    const { clubId, eventId, paymentStatus } = req.query;

    let query = admin.firestore().collection("registrations");
    if (eventId) query = query.where("eventId", "==", eventId);
    else if (clubId) query = query.where("clubId", "==", clubId);

    const snap = await query.get();
    let registrations = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filter by paymentStatus in memory (avoids composite index requirement)
    if (paymentStatus && paymentStatus !== "all") {
      registrations = registrations.filter(r => r.paymentStatus === paymentStatus);
    }

    registrations.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));

    // Global stats
    const all = snap.docs.map(doc => doc.data()); // unfiltered for stats
    const totalAll = all.length;
    const pendingAll = all.filter(r => r.paymentStatus === "pending").length;
    const verifiedAll = all.filter(r => r.paymentStatus === "verified").length;
    const revenueAll = all
      .filter(r => r.paymentStatus === "verified" && !r.isFree)
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    return res.status(200).json({
      registrations,
      stats: {
        total: totalAll,
        pending: pendingAll,
        verified: verifiedAll,
        revenue: revenueAll
      }
    });
  } catch (error) {
    console.error("getAllRegistrations error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── PATCH /api/admin/registrations/:id/status ───────────────────────────────
// Admin verifies or rejects any registration
export const adminUpdatePaymentStatus = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access only." });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!["verified", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'verified' or 'rejected'." });
    }

    const regRef = admin.firestore().collection("registrations").doc(id);
    const regDoc = await regRef.get();
    if (!regDoc.exists) return res.status(404).json({ error: "Registration not found." });

    if (regDoc.data().isFree) {
      return res.status(400).json({ error: "Free event registrations are auto-verified and cannot be changed." });
    }

    const now = new Date().toISOString();
    await regRef.update({
      paymentStatus: status,
      verifiedAt: now,
      verifiedBy: req.user.uid,
      verifiedByRole: VERIFIED_BY_ROLE.ADMIN,
      updatedAt: now,
    });

    return res.status(200).json({ message: `Registration ${status} by admin.`, id, status });
  } catch (error) {
    console.error("adminUpdatePaymentStatus error:", error);
    return res.status(500).json({ error: error.message });
  }
};

import admin from "../db/firebase.js";
import { Event, EVENT_STATUS } from "../models/Event.js";
import { Notice } from "../models/Notice.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/uploadPdf.js";

// ─── Helper: Resolve club doc from clubAuthUid ────────────────────────────────
// Every club Firebase Auth user has a unique `clubAuthUid` stored on the Club doc.
// We look up the club by this UID so controllers know which club they're operating on.
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

// ─── Helper: Parse "10:30 AM" / "2:00 PM" → total minutes since midnight ──────
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let [, h, m, ampm] = match;
  h = parseInt(h, 10);
  m = parseInt(m, 10);
  if (ampm.toUpperCase() === 'PM' && h !== 12) h += 12;
  if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
  return h * 60 + m;
};

// ─── Helper: Validate event datetime is not in the past ───────────────────────
const validateEventDatetime = (date, time) => {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  if (date < todayStr) return "Event date cannot be in the past.";

  if (date === todayStr && time) {
    const eventMinutes = parseTimeToMinutes(time);
    if (eventMinutes !== null) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      if (eventMinutes <= nowMinutes) {
        return "Event time cannot be in the past for today's date.";
      }
    }
  }

  return null;
};

// ─── Get Club Profile ─────────────────────────────────────────────────────────
export const getClubProfile = async (req, res) => {
  try {
    const club = await getClubByAuthUid(req.user.uid);
    if (!club) return res.status(404).json({ error: "Club not found." });

    // Fetch convenor details
    let convenorName = "";
    let convenorEmail = "";
    let convenorPhoto = "";
    if (club.convenorId) {
      const userDoc = await admin.firestore().collection("users").doc(club.convenorId).get();
      if (userDoc.exists) {
        const u = userDoc.data();
        convenorName = u.displayName || "";
        convenorEmail = u.email || "";
        convenorPhoto = u.photoURL || "";
      }
    }

    return res.status(200).json({
      club: {
        ...club,
        convenorName,
        convenorEmail,
        convenorPhoto,
        memberCount: (club.members || []).length
      }
    });
  } catch (error) {
    console.error("getClubProfile error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Update Club Profile ──────────────────────────────────────────────────────
export const updateClubProfile = async (req, res) => {
  try {
    const club = await getClubByAuthUid(req.user.uid);
    if (!club) return res.status(404).json({ error: "Club not found." });

    const { description, tagline, socialLinks } = req.body;

    const updates = {
      ...(description !== undefined && { description }),
      ...(tagline !== undefined && { tagline }),
      ...(socialLinks !== undefined && {
        socialLinks: {
          instagram: socialLinks.instagram || "",
          linkedin: socialLinks.linkedin || "",
          website: socialLinks.website || "",
        }
      }),
      updatedAt: new Date().toISOString()
    };

    await admin.firestore().collection("clubs").doc(club.id).update(updates);
    return res.status(200).json({ message: "Club profile updated.", updates });
  } catch (error) {
    console.error("updateClubProfile error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Upload Club Logo ─────────────────────────────────────────────────────────
export const uploadClubLogo = async (req, res) => {
  try {
    const club = await getClubByAuthUid(req.user.uid);
    if (!club) return res.status(404).json({ error: "Club not found." });
    if (!req.file) return res.status(400).json({ error: "No image file provided." });

    // Delete old logo from Cloudinary if present
    if (club.logoURL) await deleteFromCloudinary(club.logoURL);

    const logoURL = await uploadToCloudinary(req.file.buffer, "club_logos");
    await admin.firestore().collection("clubs").doc(club.id).update({
      logoURL,
      updatedAt: new Date().toISOString()
    });

    // Also update photoURL on the user document and Firebase Auth
    await admin.firestore().collection("users").doc(req.user.uid).update({
      photoURL: logoURL,
      updatedAt: new Date().toISOString()
    });
    try {
      await admin.auth().updateUser(req.user.uid, { photoURL: logoURL });
    } catch (_) { }

    return res.status(200).json({ message: "Club logo updated.", logoURL });
  } catch (error) {
    console.error("uploadClubLogo error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Upload Club Cover Image ──────────────────────────────────────────────────
export const uploadClubCover = async (req, res) => {
  try {
    const club = await getClubByAuthUid(req.user.uid);
    if (!club) return res.status(404).json({ error: "Club not found." });
    if (!req.file) return res.status(400).json({ error: "No image file provided." });

    if (club.coverURL) await deleteFromCloudinary(club.coverURL);

    const coverURL = await uploadToCloudinary(req.file.buffer, "club_covers");
    await admin.firestore().collection("clubs").doc(club.id).update({
      coverURL,
      updatedAt: new Date().toISOString()
    });

    return res.status(200).json({ message: "Club cover updated.", coverURL });
  } catch (error) {
    console.error("uploadClubCover error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Get Club Events ──────────────────────────────────────────────────────────
export const getClubEvents = async (req, res) => {
  try {
    const club = await getClubByAuthUid(req.user.uid);
    if (!club) return res.status(404).json({ error: "Club not found." });

    const snapshot = await admin.firestore()
      .collection("events")
      .where("clubId", "==", club.id)
      .get();

    const today = new Date().toISOString().split("T")[0];
    const events = [];
    const autoCompleteBatch = admin.firestore().batch();
    let hasAutoCompletes = false;

    snapshot.docs.forEach(doc => {
      const data = { id: doc.id, ...doc.data() };

      if (data.status === "published" && data.date && data.date < today) {
        data.status = "completed";
        autoCompleteBatch.update(doc.ref, { status: "completed", updatedAt: new Date().toISOString() });
        hasAutoCompletes = true;
      }

      events.push(data);
    });

    if (hasAutoCompletes) await autoCompleteBatch.commit();
    // Sort in memory to avoid requiring a composite index in Firestore
    events.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({ events });
  } catch (error) {
    console.error("getClubEvents error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Create Club Event ────────────────────────────────────────────────────────
export const createClubEvent = async (req, res) => {
  try {
    const club = await getClubByAuthUid(req.user.uid);
    if (!club) return res.status(404).json({ error: "Club not found." });

    const {
      title, description, date, time, venue,
      category, capacity, price, registrationDeadline,
      status,
      options   // extensible future options object
    } = req.body;

    if (!title || !date || !venue) {
      return res.status(400).json({ error: "Title, date and venue are required." });
    }

    const datetimeError = validateEventDatetime(date, time);
    if (datetimeError) return res.status(400).json({ error: datetimeError });

    const docRef = admin.firestore().collection("events").doc();
    const now = new Date().toISOString();

    const event = new Event({
      id: docRef.id,
      title: title.trim(),
      description: description || "",
      date,
      time: time || "",
      venue: venue.trim(),
      organizerId: req.user.uid,
      clubId: club.id,
      clubName: club.name,
      category: category || "Other",
      // Clubs can only save events as draft, pending (under review), or cancelled — admins publish them
      status: [EVENT_STATUS.DRAFT, EVENT_STATUS.PENDING, EVENT_STATUS.CANCELLED].includes(status) ? status : EVENT_STATUS.DRAFT,
      bannerURL: "",
      capacity: capacity ? Number(capacity) : null,
      attendees: [],
      price: price ? Number(price) : 0,
      registrationDeadline: registrationDeadline || "",
      options: options || {},  // forward-compatible extra config
      createdAt: now,
      updatedAt: now
    });

    await docRef.set(event.toFirestore());

    // Add event ID to the club's events array
    await admin.firestore().collection("clubs").doc(club.id).update({
      events: admin.firestore.FieldValue.arrayUnion(docRef.id),
      updatedAt: now
    });

    return res.status(201).json({ message: "Event created.", event: event.toFirestore() });
  } catch (error) {
    console.error("createClubEvent error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Update Club Event ────────────────────────────────────────────────────────
export const updateClubEvent = async (req, res) => {
  try {
    const club = await getClubByAuthUid(req.user.uid);
    if (!club) return res.status(404).json({ error: "Club not found." });

    const { id } = req.params;
    const eventRef = admin.firestore().collection("events").doc(id);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) return res.status(404).json({ error: "Event not found." });
    // Verify ownership
    if (eventDoc.data().clubId !== club.id) {
      return res.status(403).json({ error: "You can only edit your own club's events." });
    }

    const {
      title, description, date, time, venue,
      category, capacity, price, registrationDeadline, status, options
    } = req.body;

    if (date !== undefined || time !== undefined) {
      const checkDate = date ?? eventDoc.data().date;
      const checkTime = time ?? eventDoc.data().time;
      const datetimeError = validateEventDatetime(checkDate, checkTime);
      if (datetimeError) return res.status(400).json({ error: datetimeError });
    }

    const updates = {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description }),
      ...(date !== undefined && { date }),
      ...(time !== undefined && { time }),
      ...(venue !== undefined && { venue: venue.trim() }),
      ...(category !== undefined && { category }),
      ...(capacity !== undefined && { capacity: capacity ? Number(capacity) : null }),
      ...(price !== undefined && { price: price ? Number(price) : 0 }),
      ...(registrationDeadline !== undefined && { registrationDeadline }),
      ...(status !== undefined && (() => {
        // Clubs can only move events between draft, pending (under review), or cancelled
        const CLUB_ALLOWED_STATUSES = [EVENT_STATUS.DRAFT, EVENT_STATUS.PENDING, EVENT_STATUS.CANCELLED];
        if (!CLUB_ALLOWED_STATUSES.includes(status)) return {};
        return { status };
      })()),
      ...(options !== undefined && { options }),
      updatedAt: new Date().toISOString()
    };

    await eventRef.update(updates);
    return res.status(200).json({ message: "Event updated.", updates });
  } catch (error) {
    console.error("updateClubEvent error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Delete Club Event ────────────────────────────────────────────────────────
export const deleteClubEvent = async (req, res) => {
  try {
    const club = await getClubByAuthUid(req.user.uid);
    if (!club) return res.status(404).json({ error: "Club not found." });

    const { id } = req.params;
    const eventRef = admin.firestore().collection("events").doc(id);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) return res.status(404).json({ error: "Event not found." });
    if (eventDoc.data().clubId !== club.id) {
      return res.status(403).json({ error: "You can only delete your own club's events." });
    }

    const now = new Date().toISOString();
    await eventRef.delete();

    // Remove event ID from the club's events array
    await admin.firestore().collection("clubs").doc(club.id).update({
      events: admin.firestore.FieldValue.arrayRemove(id),
      updatedAt: now
    });

    return res.status(200).json({ message: "Event deleted.", id });
  } catch (error) {
    console.error("deleteClubEvent error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Upload Event Banner Image ────────────────────────────────────────────────
export const uploadEventBanner = async (req, res) => {
  try {
    const club = await getClubByAuthUid(req.user.uid);
    if (!club) return res.status(404).json({ error: "Club not found." });
    if (!req.file) return res.status(400).json({ error: "No image file provided." });

    const { id } = req.params;
    const eventRef = admin.firestore().collection("events").doc(id);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) return res.status(404).json({ error: "Event not found." });
    if (eventDoc.data().clubId !== club.id) {
      return res.status(403).json({ error: "You can only edit your own club's events." });
    }

    // Delete old banner if present
    const oldBannerURL = eventDoc.data().bannerURL;
    if (oldBannerURL) await deleteFromCloudinary(oldBannerURL);

    const bannerURL = await uploadToCloudinary(req.file.buffer, "event_banners");
    await eventRef.update({ bannerURL, updatedAt: new Date().toISOString() });

    return res.status(200).json({ message: "Event banner uploaded.", bannerURL });
  } catch (error) {
    console.error("uploadEventBanner error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Upload Event PDF ─────────────────────────────────────────────────────────
export const uploadEventPdf = async (req, res) => {
  try {
    const club = await getClubByAuthUid(req.user.uid);
    if (!club) return res.status(404).json({ error: "Club not found." });
    if (!req.file) return res.status(400).json({ error: "No PDF file provided." });

    const { id } = req.params;
    const eventRef = admin.firestore().collection("events").doc(id);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) return res.status(404).json({ error: "Event not found." });
    if (eventDoc.data().clubId !== club.id) {
      return res.status(403).json({ error: "You can only edit your own club's events." });
    }

    // Delete old PDF if present
    const oldPdfURL = eventDoc.data().pdfURL;
    if (oldPdfURL) await deleteFromCloudinary(oldPdfURL);

    const pdfURL = await uploadToCloudinary(req.file.buffer, "event_pdfs");
    const pdfName = req.file.originalname || null;
    await eventRef.update({ pdfURL, pdfName, updatedAt: new Date().toISOString() });

    return res.status(200).json({ message: "Event PDF uploaded.", pdfURL, pdfName });
  } catch (error) {
    console.error("uploadEventPdf error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Get Club Members ─────────────────────────────────────────────────────────
// Fetches full user profiles for all UIDs stored in club.members[]
export const getClubMembers = async (req, res) => {
  try {
    const club = await getClubByAuthUid(req.user.uid);
    if (!club) return res.status(404).json({ error: "Club not found." });

    const memberUids = club.members || [];
    if (memberUids.length === 0) {
      return res.status(200).json({ members: [] });
    }

    // Firestore `in` queries support up to 30 values; chunk if needed
    const chunkSize = 30;
    const members = [];
    for (let i = 0; i < memberUids.length; i += chunkSize) {
      const chunk = memberUids.slice(i, i + chunkSize);
      const snapshot = await admin.firestore()
        .collection("users")
        .where("uid", "in", chunk)
        .get();
      snapshot.docs.forEach(doc => {
        const d = doc.data();
        members.push({
          uid: d.uid,
          displayName: d.displayName,
          email: d.email,
          photoURL: d.photoURL || "",
          department: d.department || "",
          rollNo: d.rollNo || ""
        });
      });
    }

    return res.status(200).json({ members, total: members.length });
  } catch (error) {
    console.error("getClubMembers error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Get Club Notices ─────────────────────────────────────────────────────────
export const getClubNotices = async (req, res) => {
  try {
    const club = await getClubByAuthUid(req.user.uid);
    if (!club) return res.status(404).json({ error: "Club not found." });

    const snapshot = await admin.firestore()
      .collection("notices")
      .where("clubId", "==", club.id)
      .get();

    const notices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Sort in memory to avoid requiring a composite index in Firestore
    notices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({ notices });
  } catch (error) {
    console.error("getClubNotices error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Post Club Notice ─────────────────────────────────────────────────────────
export const postClubNotice = async (req, res) => {
  try {
    const club = await getClubByAuthUid(req.user.uid);
    if (!club) return res.status(404).json({ error: "Club not found." });

    const { title, content, category, priority, attachments } = req.body;

    if (!title || !content || !category) {
      return res.status(400).json({ error: "title, content and category are required." });
    }

    // Handle optional PDF upload
    let finalAttachments = [];
    let attachmentName = null;
    if (req.file) {
      try {
        const cloudinaryUrl = await uploadToCloudinary(req.file.buffer, "club_notices");
        finalAttachments = [cloudinaryUrl];
        attachmentName = req.file.originalname || null;
      } catch (uploadErr) {
        console.error("Cloudinary upload failed:", uploadErr);
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
      authorId: req.user.uid,
      authorName: club.name,  // Author name shown as the club name
      category,
      priority: priority || "normal",
      attachments: finalAttachments,
      attachmentName,
      targetAudience: "everyone",
      clubId: club.id,
      createdAt: now,
      updatedAt: now
    });

    await docRef.set(notice.toFirestore());
    return res.status(201).json({ notice: { id: docRef.id, ...notice.toFirestore() } });
  } catch (error) {
    console.error("postClubNotice error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Delete Club Notice ───────────────────────────────────────────────────────
export const deleteClubNotice = async (req, res) => {
  try {
    const club = await getClubByAuthUid(req.user.uid);
    if (!club) return res.status(404).json({ error: "Club not found." });

    const { id } = req.params;
    const docRef = admin.firestore().collection("notices").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) return res.status(404).json({ error: "Notice not found." });
    if (docSnap.data().clubId !== club.id) {
      return res.status(403).json({ error: "You can only delete your own club's notices." });
    }

    // Delete Cloudinary attachments
    const { attachments = [] } = docSnap.data();
    for (const url of attachments) await deleteFromCloudinary(url);

    await docRef.delete();
    return res.status(200).json({ message: "Notice deleted.", id });
  } catch (error) {
    console.error("deleteClubNotice error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Get Club Dashboard Stats ─────────────────────────────────────────────────
export const getClubStats = async (req, res) => {
  try {
    const club = await getClubByAuthUid(req.user.uid);
    if (!club) return res.status(404).json({ error: "Club not found." });

    const now = new Date().toISOString();

    // Count events
    const eventsSnapshot = await admin.firestore()
      .collection("events")
      .where("clubId", "==", club.id)
      .get();

    let upcomingEvents = 0;
    let pastEvents = 0;
    eventsSnapshot.docs.forEach(doc => {
      const d = doc.data();
      if (d.date >= now.split("T")[0]) upcomingEvents++;
      else pastEvents++;
    });

    // Count notices
    const noticesSnapshot = await admin.firestore()
      .collection("notices")
      .where("clubId", "==", club.id)
      .count()
      .get();

    return res.status(200).json({
      stats: {
        totalMembers: (club.members || []).length,
        upcomingEvents,
        pastEvents,
        noticesPosted: noticesSnapshot.data().count
      }
    });
  } catch (error) {
    console.error("getClubStats error:", error);
    return res.status(500).json({ error: error.message });
  }
};

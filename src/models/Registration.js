/**
 * Registration Schema / Model Representation
 * This defines the standard structure for an event registration in CampusConnect.
 *
 * Design Notes:
 * - Student info is denormalized at registration time so the record is self-contained
 *   and doesn't require extra joins when displaying registration lists.
 * - Payment verification creates an audit trail via verifiedAt / verifiedBy / verifiedByRole.
 * - Free events are auto-verified at registration time (paymentStatus = "verified").
 * - Paid events start as "pending" and must be manually verified by a club manager or admin.
 */

export class Registration {
  constructor({
    id,

    // ── Event context ────────────────────────────────────────────────────────
    eventId,
    eventTitle = "",
    clubId = "",
    clubName = "",

    // ── Student info (denormalized at registration time) ─────────────────────
    studentUid,
    studentName = "",
    studentEmail = "",
    studentRollNo = "",
    studentDepartment = "",
    studentPhotoURL = "",

    // ── Payment details ──────────────────────────────────────────────────────
    isFree = true,
    amount = 0,
    paymentStatus = "pending",       // "pending" | "verified" | "rejected"
    upiTransactionId = "",
    paymentImageURL = "",            // TODO: payment screenshot/proof upload

    // ── Verification audit trail ─────────────────────────────────────────────
    verifiedAt = null,
    verifiedBy = null,               // UID of the user who verified/rejected
    verifiedByRole = null,           // "club" | "admin"

    // ── Timestamps ───────────────────────────────────────────────────────────
    registeredAt = new Date().toISOString(),
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString(),
  }) {
    this.id = id;

    // Event context
    this.eventId = eventId;
    this.eventTitle = eventTitle;
    this.clubId = clubId;
    this.clubName = clubName;

    // Student info
    this.studentUid = studentUid;
    this.studentName = studentName;
    this.studentEmail = studentEmail;
    this.studentRollNo = studentRollNo;
    this.studentDepartment = studentDepartment;
    this.studentPhotoURL = studentPhotoURL;

    // Payment details
    this.isFree = isFree;
    this.amount = amount;
    this.paymentStatus = paymentStatus;
    this.upiTransactionId = upiTransactionId;
    this.paymentImageURL = paymentImageURL;

    // Verification audit trail
    this.verifiedAt = verifiedAt;
    this.verifiedBy = verifiedBy;
    this.verifiedByRole = verifiedByRole;

    // Timestamps
    this.registeredAt = registeredAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Converts the instance to a plain object for Firestore storage.
   */
  toFirestore() {
    return {
      id: this.id,

      eventId: this.eventId,
      eventTitle: this.eventTitle,
      clubId: this.clubId,
      clubName: this.clubName,

      studentUid: this.studentUid,
      studentName: this.studentName,
      studentEmail: this.studentEmail,
      studentRollNo: this.studentRollNo,
      studentDepartment: this.studentDepartment,
      studentPhotoURL: this.studentPhotoURL,

      isFree: this.isFree,
      amount: this.amount,
      paymentStatus: this.paymentStatus,
      upiTransactionId: this.upiTransactionId,
      paymentImageURL: this.paymentImageURL,

      verifiedAt: this.verifiedAt,
      verifiedBy: this.verifiedBy,
      verifiedByRole: this.verifiedByRole,

      registeredAt: this.registeredAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Factory: builds a Registration from a raw Firestore document snapshot.
   * @param {FirebaseFirestore.DocumentSnapshot} doc
   * @returns {Registration}
   */
  static fromFirestore(doc) {
    const data = doc.data();
    return new Registration({ id: doc.id, ...data });
  }
}

// ── Payment status constants ──────────────────────────────────────────────────
export const PAYMENT_STATUS = {
  PENDING: "pending",
  VERIFIED: "verified",
  REJECTED: "rejected",
};

// ── Verification role constants ───────────────────────────────────────────────
export const VERIFIED_BY_ROLE = {
  CLUB: "club",
  ADMIN: "admin",
};

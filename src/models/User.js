/**
 * User Schema / Model Representation
 * This defines the standard structure for a user in CampusConnect.
 */

export class User {
  constructor({
    uid,
    email,
    displayName,
    rollNo = "",
    role = "student",
    photoURL = "",
    isVerified = false,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString(),
    authProvider = "email-password",
    metadata = {}
  }) {
    this.uid = uid;
    this.email = email;
    this.displayName = displayName;
    this.rollNo = rollNo;
    this.role = role;
    this.photoURL = photoURL;
    this.isVerified = isVerified;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.authProvider = authProvider;
    this.metadata = metadata;
  }

  /**
   * Helper to convert the class instance to a plain object
   * for Firestore storage.
   */
  toFirestore() {
    return {
      uid: this.uid,
      email: this.email,
      displayName: this.displayName,
      rollNo: this.rollNo,
      role: this.role,
      photoURL: this.photoURL,
      isVerified: this.isVerified,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      authProvider: this.authProvider,
      metadata: this.metadata
    };
  }

  /**
   * Basic validation logic
   */
  static validate(data) {
    const errors = [];
    if (!data.uid) errors.push("UID is required");
    if (!data.email) errors.push("Email is required");
    if (!data.displayName) errors.push("Display Name is required");
    if (!["student", "admin", "convenor"].includes(data.role)) {
      errors.push("Invalid role assigned");
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const USER_ROLES = {
  STUDENT: "student",
  ADMIN: "admin",
  CONVENOR: "convenor"
};

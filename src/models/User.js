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
    department = "",
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
    this.role = role;
    // rollNo and department are only meaningful for non-admin roles
    const isAdmin = role === "admin";
    this.rollNo = isAdmin ? "" : rollNo;
    this.department = isAdmin ? "" : department;
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
      department: this.department,
      photoURL: this.photoURL,
      isVerified: this.isVerified,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      authProvider: this.authProvider,
      metadata: this.metadata
    };
  }

}

export const USER_ROLES = {
  STUDENT: "student",
  ADMIN: "admin",
  CONVENOR: "convenor"
};

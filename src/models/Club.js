/**
 * Club Schema / Model Representation
 * This defines the standard structure for a club in CampusConnect.
 */

export class Club {
  constructor({
    id,
    name,
    description = "",
    convenorId,
    clubEmail = "",
    clubAuthUid = "",
    category,
    status = "active",
    logoURL = "",
    coverURL = "",
    tagline = "",
    socialLinks = {},
    metadata = {},
    members = [],
    events = [],
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.convenorId = convenorId;
    this.clubEmail = clubEmail;
    this.clubAuthUid = clubAuthUid;
    this.category = category;
    this.status = status;
    this.logoURL = logoURL;
    this.coverURL = coverURL;
    this.tagline = tagline;
    this.socialLinks = {
      instagram: socialLinks.instagram || "",
      linkedin: socialLinks.linkedin || "",
      website: socialLinks.website || "",
    };
    this.metadata = metadata;
    this.members = members;
    this.events = events;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Helper to convert the class instance to a plain object
   * for Firestore storage.
   */
  toFirestore() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      convenorId: this.convenorId,
      clubEmail: this.clubEmail,
      clubAuthUid: this.clubAuthUid,
      category: this.category,
      status: this.status,
      logoURL: this.logoURL,
      coverURL: this.coverURL,
      tagline: this.tagline,
      socialLinks: this.socialLinks,
      metadata: this.metadata,
      members: this.members,
      events: this.events,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export const CLUB_STATUS = {
  PENDING: "pending",
  ACTIVE: "active",
  INACTIVE: "inactive"
};

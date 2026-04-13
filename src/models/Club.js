/**
 * Club Schema / Model Representation
 * This defines the standard structure for a club in CampusConnect.
 */

export class Club {
  constructor({
    id,
    name,
    description,
    convenorId,
    category,
    status = "active",
    logoURL = "",
    socialLinks = {},
    metadata = {},
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.convenorId = convenorId;
    this.category = category;
    this.status = status;
    this.logoURL = logoURL;
    this.socialLinks = {
      instagram: socialLinks.instagram || "",
      linkedin: socialLinks.linkedin || "",
      website: socialLinks.website || "",
      ...socialLinks
    };
    this.metadata = metadata;
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
      category: this.category,
      status: this.status,
      logoURL: this.logoURL,
      socialLinks: this.socialLinks,
      metadata: this.metadata,
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

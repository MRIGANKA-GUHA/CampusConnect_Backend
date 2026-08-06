/**
 * Event Schema / Model Representation
 * This defines the standard structure for an event in CampusConnect.
 * Designed to be extensible: the `options` object is a free-form map for
 * future per-event configuration (e.g. team size, payment gateway, custom
 * registration fields, QR check-in, etc.) without requiring a schema migration.
 */

export class Event {
  constructor({
    id,
    title,
    description,
    date,
    time,
    venue,
    organizerId,
    clubId = null,
    clubName = "",
    category,
    status = "draft",
    bannerURL = "",
    pdfURL = "",
    capacity = null,
    attendees = [],
    price = 0,
    registrationDeadline = "",
    options = {},
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.date = date;
    this.time = time;
    this.venue = venue;
    this.organizerId = organizerId;
    this.clubId = clubId;
    this.clubName = clubName;
    this.category = category;
    this.status = status;
    this.bannerURL = bannerURL;
    this.pdfURL = pdfURL;
    this.capacity = capacity;
    this.attendees = attendees;
    this.price = price;
    this.registrationDeadline = registrationDeadline;
    this.options = options;
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
      title: this.title,
      description: this.description,
      date: this.date,
      time: this.time,
      venue: this.venue,
      organizerId: this.organizerId,
      clubId: this.clubId,
      clubName: this.clubName,
      category: this.category,
      status: this.status,
      bannerURL: this.bannerURL,
      pdfURL: this.pdfURL,
      capacity: this.capacity,
      attendees: this.attendees,
      price: this.price,
      registrationDeadline: this.registrationDeadline,
      options: this.options,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export const EVENT_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  COMPLETED: "completed",
  CANCELLED: "cancelled"
};

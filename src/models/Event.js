/**
 * Event Schema / Model Representation
 * This defines the standard structure for an event in CampusConnect.
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
    category,
    status = "draft",
    bannerURL = "",
    clubName = "",
    capacity = null,
    attendees = [],
    price = 0,
    registrationDeadline = "",
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
    this.category = category;
    this.status = status;
    this.bannerURL = bannerURL;
    this.clubName = clubName;
    this.capacity = capacity;
    this.attendees = attendees;
    this.price = price;
    this.registrationDeadline = registrationDeadline;
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
      category: this.category,
      status: this.status,
      bannerURL: this.bannerURL,
      clubName: this.clubName,
      capacity: this.capacity,
      attendees: this.attendees,
      price: this.price,
      registrationDeadline: this.registrationDeadline,
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

/**
 * Notice Schema / Model Representation
 * This defines the standard structure for a notice in CampusConnect.
 */

export class Notice {
  constructor({
    id,
    title,
    content,
    authorId,
    authorName = "",
    category,
    priority = "normal",
    attachments = [],
    targetAudience = "everyone",
    clubId = null,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.title = title;
    this.content = content;
    this.authorId = authorId;
    this.authorName = authorName;
    this.category = category;
    this.priority = priority;
    this.attachments = attachments;
    this.targetAudience = targetAudience;
    this.clubId = clubId;
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
      content: this.content,
      authorId: this.authorId,
      authorName: this.authorName,
      category: this.category,
      priority: this.priority,
      attachments: this.attachments,
      targetAudience: this.targetAudience,
      clubId: this.clubId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export const NOTICE_PRIORITY = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  URGENT: "urgent"
};

export const TARGET_AUDIENCE = {
  EVERYONE: "everyone",
  STUDENTS: "students",
  CONVENORS: "convenors"
};

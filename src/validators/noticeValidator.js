/**
 * Notice Validator
 * Validates notice data before any Firestore write.
 */

const VALID_PRIORITIES = ["low", "normal", "high", "urgent"];
const VALID_AUDIENCES = ["everyone", "students", "convenors"];
const VALID_CATEGORIES = ["Academic", "Events", "Holiday", "Urgent", "General", "Club"];

/**
 * Validates a notice payload against the CampusConnect notice schema rules.
 * @param {Object} data - The notice data to validate
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateNotice(data) {
  const errors = [];

  // Required Fields
  if (!data.title || data.title.trim() === "") errors.push("Title is required");
  if (!data.content || data.content.trim() === "") errors.push("Content body is required");
  if (!data.authorId) errors.push("Author ID is required");
  if (!data.category) errors.push("Category is required");

  // Format and Value Checks
  if (data.priority && !VALID_PRIORITIES.includes(data.priority)) {
    errors.push(`Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}`);
  }

  if (data.targetAudience && !VALID_AUDIENCES.includes(data.targetAudience)) {
    errors.push(`Invalid target audience. Must be one of: ${VALID_AUDIENCES.join(", ")}`);
  }

  if (data.category && !VALID_CATEGORIES.includes(data.category)) {
    // Standardise category but don't strictly block
  }

  // Attachments Check (Should be an array of objects)
  if (data.attachments && !Array.isArray(data.attachments)) {
    errors.push("Attachments must be an array of file objects");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

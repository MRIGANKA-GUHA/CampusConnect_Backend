/**
 * Event Validator
 * Validates event data before any Firestore write.
 */

const VALID_STATUSES = ["draft", "published", "completed", "cancelled"];
const VALID_CATEGORIES = ["Technical", "Cultural", "Workshop", "Sports", "Seminar", "Other"];

/**
 * Validates an event payload against the CampusConnect event schema rules.
 * @param {Object} data - The event data to validate
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateEvent(data) {
  const errors = [];

  // Required Fields
  if (!data.title || data.title.trim() === "") errors.push("Title is required");
  if (!data.description || data.description.trim() === "") errors.push("Description is required");
  if (!data.date) errors.push("Event date is required");
  if (!data.time) errors.push("Event time is required");
  if (!data.venue || data.venue.trim() === "") errors.push("Venue is required");
  if (!data.organizerId) errors.push("Organizer ID is required");
  if (!data.category) errors.push("Category is required");

  // Format and Value Checks
  if (data.status && !VALID_STATUSES.includes(data.status)) {
    errors.push(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`);
  }

  if (data.category && !VALID_CATEGORIES.includes(data.category)) {
    // We allow other categories but maybe log a warning or standardise? 
    // For now, let's keep it flexible but recommend from list.
  }

  // Capacity Check (Optional but must be number if provided)
  if (data.capacity !== undefined && data.capacity !== null) {
    if (typeof data.capacity !== 'number' || data.capacity < 0) {
      errors.push("Capacity must be a positive number if provided");
    }
  }

  // Attendees list (Should be an array)
  if (data.attendees && !Array.isArray(data.attendees)) {
    errors.push("Attendees must be an array of user IDs");
  }

  // Payment Check (Optional price for display)
  if (data.price !== undefined && data.price !== null) {
    if (typeof data.price !== 'number' || data.price < 0) {
      errors.push("Price must be a non-negative number");
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

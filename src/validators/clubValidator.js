/**
 * Club Validator
 * Validates club data before any Firestore write.
 */

const VALID_STATUSES = ["pending", "active", "inactive"];
const VALID_CATEGORIES = ["Technical", "Cultural", "Arts", "Sports", "Social", "Other"];

/**
 * Validates a club payload against the CampusConnect club schema rules.
 * @param {Object} data - The club data to validate
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateClub(data) {
  const errors = [];

  // Required Fields
  if (!data.name || data.name.trim() === "") errors.push("Club name is required");
  if (!data.description || data.description.trim() === "") errors.push("Description is required");
  if (!data.convenorId) errors.push("Convenor ID is required");
  if (!data.category) errors.push("Category is required");

  // Format and Value Checks
  if (data.status && !VALID_STATUSES.includes(data.status)) {
    errors.push(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`);
  }

  if (data.category && !VALID_CATEGORIES.includes(data.category)) {
    // Recommend from list but don't strictly block unless specified
  }

  // Social Links Check (Should be an object)
  if (data.socialLinks && typeof data.socialLinks !== 'object') {
    errors.push("Social links must be an object");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

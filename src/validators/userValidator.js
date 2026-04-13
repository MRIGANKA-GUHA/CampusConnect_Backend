/**
 * User Validator
 * Validates user data before any Firestore write.
 * Kept separate from the User model to follow separation of concerns.
 */

const VALID_ROLES = ["student", "admin", "convenor"];

/**
 * Validates a user payload against the CampusConnect user schema rules.
 * @param {Object} data - The user data to validate
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateUser(data) {
  const errors = [];

  if (!data.uid) errors.push("UID is required");
  if (!data.email) errors.push("Email is required");
  if (!data.displayName) errors.push("Display Name is required");

  if (!VALID_ROLES.includes(data.role)) {
    errors.push(`Invalid role assigned. Must be one of: ${VALID_ROLES.join(", ")}`);
  }

  // Admins must not have rollNo or department
  if (data.role === "admin") {
    if (data.rollNo && data.rollNo.trim() !== "") {
      errors.push("Admins cannot have a Roll Number");
    }
    if (data.department && data.department.trim() !== "") {
      errors.push("Admins cannot have a Department");
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

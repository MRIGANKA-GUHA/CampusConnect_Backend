/**
 * Profile Validator
 * Validates profile data before any Firestore write.
 */

/**
 * Validates a profile payload against the CampusConnect profile rules.
 * @param {Object} data - The profile data to validate (phoneNo, rollNo)
 * @param {string} role - The role of the user (e.g. 'student', 'admin')
 * @returns {{ isValid: boolean, error: string | null }}
 */
export function validateProfile(data, role) {
  const phoneRegex = /^[0-9]{10}$/;
  if (data.phoneNo && !phoneRegex.test(data.phoneNo)) {
    return { isValid: false, error: "Phone number must be exactly 10 digits" };
  }

  if (role === 'student') {
    const rollRegex = /^[0-9]{11}$/;
    if (data.rollNo && !rollRegex.test(data.rollNo)) {
      return { isValid: false, error: "Roll number must be exactly 11 digits" };
    }
  }

  return { isValid: true, error: null };
}

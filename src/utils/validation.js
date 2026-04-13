export const normalizePhoneNumber = (phoneNumber) => {
  return phoneNumber.replace(/\s+/g, '').trim();
};

export const isValidPhoneNumber = (phoneNumber) => {
  // Simple international-style validation
  return /^\+?[1-9]\d{9,14}$/.test(phoneNumber);
};
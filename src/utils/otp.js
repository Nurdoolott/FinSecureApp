export const generateOtpCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
};

export const getOtpExpiry = () => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 5); // 5 minutes
  return expiry;
};
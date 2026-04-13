export const sendOtpToPhone = async (phoneNumber, otpCode) => {
  // Mock SMS sending
  console.log(`OTP for ${phoneNumber}: ${otpCode}`);

  return {
    success: true,
    message: 'OTP sent successfully (mock)'
  };
};
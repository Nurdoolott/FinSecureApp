import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

export const sendOtpSms = async (phoneNumber) => {
  const verification = await client.verify.v2
    .services(serviceSid)
    .verifications.create({
      to: phoneNumber,
      channel: 'sms'
    });

  return verification;
};

export const checkOtpCode = async (verificationSid, code) => {
  const check = await client.verify.v2
    .services(serviceSid)
    .verificationChecks.create({
      verificationSid,
      code
    });

  return check;
};
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { normalizePhoneNumber, isValidPhoneNumber } from '../utils/validation.js';
import { sendOtpSms, checkOtpCode } from '../services/twilioVerifyService.js';

export const startRegister = async (req, res) => {
  try {
    const { fullName, phoneNumber, password, email } = req.body;

    if (!fullName || !phoneNumber || !password) {
      return res.status(400).json({
        message: 'Full name, phone number, and password are required'
      });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    if (!isValidPhoneNumber(normalizedPhone)) {
      return res.status(400).json({
        message: 'Phone number must be in E.164 format, for example +996700123456'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters long'
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { phoneNumber: normalizedPhone }
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'Phone number is already registered'
      });
    }

    if (email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email }
      });

      if (existingEmail) {
        return res.status(409).json({
          message: 'Email is already in use'
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const verification = await sendOtpSms(normalizedPhone);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const pending = await prisma.pendingRegistration.upsert({
      where: { phoneNumber: normalizedPhone },
      update: {
        fullName,
        email: email || null,
        passwordHash,
        verificationSid: verification.sid,
        expiresAt
      },
      create: {
        fullName,
        phoneNumber: normalizedPhone,
        email: email || null,
        passwordHash,
        verificationSid: verification.sid,
        expiresAt
      }
    });

    return res.status(200).json({
      message: 'OTP sent successfully',
      pendingRegistrationId: pending.id
    });
  } catch (error) {
    console.error('START REGISTER ERROR:', error);
    return res.status(500).json({
      message: 'Server error during registration start'
    });
  }
};

export const verifyRegister = async (req, res) => {
  try {
    const { pendingRegistrationId, otpCode } = req.body;

    if (!pendingRegistrationId || !otpCode) {
      return res.status(400).json({
        message: 'Pending registration ID and OTP code are required'
      });
    }

    const pending = await prisma.pendingRegistration.findUnique({
      where: { id: pendingRegistrationId }
    });

    if (!pending) {
      return res.status(404).json({
        message: 'Pending registration not found'
      });
    }

    if (new Date() > pending.expiresAt) {
      await prisma.pendingRegistration.delete({
        where: { id: pending.id }
      });

      return res.status(400).json({
        message: 'OTP code has expired'
      });
    }

    const check = await checkOtpCode(pending.verificationSid, otpCode);

    if (check.status !== 'approved') {
      return res.status(400).json({
        message: 'Invalid OTP code'
      });
    }

    const accountNumber = `ACC${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const user = await prisma.user.create({
      data: {
        fullName: pending.fullName,
        phoneNumber: pending.phoneNumber,
        email: pending.email,
        passwordHash: pending.passwordHash,
        account: {
          create: {
            accountNumber,
            balance: 1000,
            currency: 'USD'
          }
        }
      },
      include: {
        account: true
      }
    });

    await prisma.pendingRegistration.delete({
      where: { id: pending.id }
    });

    return res.status(201).json({
      message: 'Registration completed successfully',
      user: {
        id: user.id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        email: user.email,
        account: user.account
      }
    });
  } catch (error) {
    console.error('VERIFY REGISTER ERROR:', error);
    return res.status(500).json({
      message: 'Server error during registration verification'
    });
  }
};

export const login = async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password) {
      return res.status(400).json({
        message: 'Phone number and password are required'
      });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    const user = await prisma.user.findUnique({
      where: { phoneNumber: normalizedPhone },
      include: { account: true }
    });

    if (!user) {
      return res.status(401).json({
        message: 'Phone number or password incorrect'
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: 'Phone number or password incorrect'
      });
    }

    const token = jwt.sign(
      { userId: user.id, phoneNumber: user.phoneNumber },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        email: user.email,
        account: user.account
      }
    });
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    return res.status(500).json({
      message: 'Server error during login'
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        message: 'Phone number is required'
      });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    if (!isValidPhoneNumber(normalizedPhone)) {
      return res.status(400).json({
        message: 'Phone number must be in E.164 format, for example +996700123456'
      });
    }

    const user = await prisma.user.findUnique({
      where: { phoneNumber: normalizedPhone }
    });

    if (!user) {
      return res.status(404).json({
        message: 'User with this phone number was not found'
      });
    }

    const verification = await sendOtpSms(normalizedPhone);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const pendingReset = await prisma.pendingPasswordReset.create({
      data: {
        phoneNumber: normalizedPhone,
        verificationSid: verification.sid,
        expiresAt
      }
    });

    return res.status(200).json({
      message: 'Password reset OTP sent successfully',
      pendingResetId: pendingReset.id
    });
  } catch (error) {
    console.error('FORGOT PASSWORD ERROR:', error);
    return res.status(500).json({
      message: 'Server error during forgot password'
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { pendingResetId, otpCode, newPassword } = req.body;

    if (!pendingResetId || !otpCode || !newPassword) {
      return res.status(400).json({
        message: 'Pending reset ID, OTP code, and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'New password must be at least 6 characters long'
      });
    }

    const pendingReset = await prisma.pendingPasswordReset.findUnique({
      where: { id: pendingResetId }
    });

    if (!pendingReset) {
      return res.status(404).json({
        message: 'Pending password reset not found'
      });
    }

    if (new Date() > pendingReset.expiresAt) {
      await prisma.pendingPasswordReset.delete({
        where: { id: pendingReset.id }
      });

      return res.status(400).json({
        message: 'OTP code has expired'
      });
    }

    const check = await checkOtpCode(pendingReset.verificationSid, otpCode);

    if (check.status !== 'approved') {
      return res.status(400).json({
        message: 'Invalid OTP code'
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { phoneNumber: pendingReset.phoneNumber },
      data: { passwordHash }
    });

    await prisma.pendingPasswordReset.delete({
      where: { id: pendingReset.id }
    });

    return res.status(200).json({
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('RESET PASSWORD ERROR:', error);
    return res.status(500).json({
      message: 'Server error during password reset'
    });
  }
};
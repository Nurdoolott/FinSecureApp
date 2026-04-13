import express from 'express';
import {
  startRegister,
  verifyRegister,
  login,
  forgotPassword,
  resetPassword
} from '../controllers/authController.js';

const router = express.Router();

router.post('/start-register', startRegister);
router.post('/verify-register', verifyRegister);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
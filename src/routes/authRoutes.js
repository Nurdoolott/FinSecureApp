import express from 'express';
import {
  startRegister,
  verifyRegister,
  login
} from '../controllers/authController.js';

const router = express.Router();

router.post('/start-register', startRegister);
router.post('/verify-register', verifyRegister);
router.post('/login', login);

export default router;
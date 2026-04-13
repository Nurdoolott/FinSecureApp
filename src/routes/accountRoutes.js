import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { getBalance } from '../controllers/accountController.js';

const router = express.Router();

router.get('/balance', authMiddleware, getBalance);

export default router;
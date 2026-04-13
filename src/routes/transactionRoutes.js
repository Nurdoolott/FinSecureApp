import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  transferMoney,
  getTransactionHistory
} from '../controllers/transactionController.js';

const router = express.Router();

router.post('/transfer', authMiddleware, transferMoney);
router.get('/history', authMiddleware, getTransactionHistory);

export default router;
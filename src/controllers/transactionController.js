import prisma from '../config/prisma.js';

import { normalizePhoneNumber } from '../utils/validation.js';

export const transferMoney = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { transferMethod, receiverValue, amount } = req.body;

    if (!transferMethod || !receiverValue || !amount) {
      return res.status(400).json({
        message: 'Transfer method, receiver value, and amount are required'
      });
    }

    const transferAmount = Number(amount);

    if (isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({
        message: 'Amount must be a positive number'
      });
    }

    const senderAccount = await prisma.account.findUnique({
      where: { userId }
    });

    if (!senderAccount) {
      return res.status(404).json({
        message: 'Sender account not found'
      });
    }

    let receiverAccount = null;

    if (transferMethod === 'ACCOUNT') {
      receiverAccount = await prisma.account.findUnique({
        where: { accountNumber: receiverValue }
      });
    } else if (transferMethod === 'PHONE') {
      const normalizedPhone = normalizePhoneNumber(receiverValue);

      const receiverUser = await prisma.user.findUnique({
        where: { phoneNumber: normalizedPhone },
        include: { account: true }
      });

      if (receiverUser) {
        receiverAccount = receiverUser.account;
      }
    } else {
      return res.status(400).json({
        message: 'Invalid transfer method. Use ACCOUNT or PHONE'
      });
    }

    if (!receiverAccount) {
      return res.status(404).json({
        message: 'Receiver account not found'
      });
    }

    if (senderAccount.id === receiverAccount.id) {
      return res.status(400).json({
        message: 'You cannot transfer money to yourself'
      });
    }

    if (senderAccount.balance < transferAmount) {
      return res.status(400).json({
        message: 'Insufficient balance'
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedSender = await tx.account.update({
        where: { id: senderAccount.id },
        data: {
          balance: {
            decrement: transferAmount
          }
        }
      });

      const updatedReceiver = await tx.account.update({
        where: { id: receiverAccount.id },
        data: {
          balance: {
            increment: transferAmount
          }
        }
      });

      const transaction = await tx.transaction.create({
        data: {
          senderAccountId: senderAccount.id,
          receiverAccountId: receiverAccount.id,
          amount: transferAmount,
          type: transferMethod === 'PHONE' ? 'TRANSFER_BY_PHONE' : 'TRANSFER_BY_ACCOUNT',
          status: 'SUCCESS'
        }
      });

      return {
        updatedSender,
        updatedReceiver,
        transaction
      };
    });

    return res.status(201).json({
  message: 'Transfer completed successfully',
  transaction: {
    id: result.transaction.id,
    amount: result.transaction.amount,
    type: result.transaction.type,
    status: result.transaction.status,
    createdAt: result.transaction.createdAt,
    receiverValue,
    transferMethod
  },
  senderBalance: result.updatedSender.balance
});
  } catch (error) {
    console.error('TRANSFER ERROR:', error);
    return res.status(500).json({
      message: 'Server error during transfer'
    });
  }
};

export const getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user.userId;

    const account = await prisma.account.findUnique({
      where: { userId }
    });

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { senderAccountId: account.id },
          { receiverAccountId: account.id }
        ]
      },
      include: {
        senderAccount: {
          select: {
            accountNumber: true
          }
        },
        receiverAccount: {
          select: {
            accountNumber: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.status(200).json(transactions);
  } catch (error) {
    console.error('GET TRANSACTION HISTORY ERROR:', error);
    return res.status(500).json({ message: 'Server error while fetching transaction history' });
  }
};
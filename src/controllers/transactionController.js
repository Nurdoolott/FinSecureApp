import prisma from '../config/prisma.js';

export const transferMoney = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { receiverAccountNumber, amount } = req.body;

    if (!receiverAccountNumber || !amount) {
      return res.status(400).json({ message: 'Receiver account number and amount are required' });
    }

    const transferAmount = Number(amount);

    if (isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }

    const senderAccount = await prisma.account.findUnique({
      where: { userId }
    });

    if (!senderAccount) {
      return res.status(404).json({ message: 'Sender account not found' });
    }

    if (senderAccount.accountNumber === receiverAccountNumber) {
      return res.status(400).json({ message: 'You cannot transfer money to your own account' });
    }

    const receiverAccount = await prisma.account.findUnique({
      where: { accountNumber: receiverAccountNumber }
    });

    if (!receiverAccount) {
      return res.status(404).json({ message: 'Receiver account not found' });
    }

    if (senderAccount.balance < transferAmount) {
      return res.status(400).json({ message: 'Insufficient balance' });
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
          type: 'TRANSFER',
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
      transaction: result.transaction,
      senderBalance: result.updatedSender.balance
    });
  } catch (error) {
    console.error('TRANSFER ERROR:', error);
    return res.status(500).json({ message: 'Server error during transfer' });
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
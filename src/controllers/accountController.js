import prisma from '../config/prisma.js';

export const getBalance = async (req, res) => {
  try {
    const userId = req.user.userId;

    const account = await prisma.account.findUnique({
      where: { userId }
    });

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    return res.status(200).json({
      accountNumber: account.accountNumber,
      balance: account.balance,
      currency: account.currency
    });
  } catch (error) {
    console.error('GET BALANCE ERROR:', error);
    return res.status(500).json({ message: 'Server error while fetching balance' });
  }
};
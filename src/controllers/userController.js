import prisma from '../config/prisma.js';

export const getMe = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { account: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      id: user.id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      account: user.account
    });
  } catch (error) {
    console.error('GET ME ERROR:', error);
    return res.status(500).json({
      message: 'Server error while fetching user data'
    });
  }
};
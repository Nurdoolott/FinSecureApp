import express from 'express';
import { getTopBusinessNews, searchNews } from '../controllers/newsController.js';

const router = express.Router();

router.get('/top', getTopBusinessNews);
router.get('/search', searchNews);

export default router;
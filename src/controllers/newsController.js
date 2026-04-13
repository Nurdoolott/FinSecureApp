import { fetchBusinessNews, searchEconomicNews } from '../services/newsService.js';

export const getTopBusinessNews = async (req, res) => {
  try {
    const data = await fetchBusinessNews();
    return res.status(200).json({
      status: data.status,
      totalResults: data.totalResults,
      articles: data.articles
    });
  } catch (error) {
    console.error('GET TOP BUSINESS NEWS ERROR:', error);
    return res.status(500).json({ message: 'Server error while fetching business news' });
  }
};

export const searchNews = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    const data = await searchEconomicNews(q);
    return res.status(200).json({
      status: data.status,
      totalResults: data.totalResults,
      articles: data.articles
    });
  } catch (error) {
    console.error('SEARCH NEWS ERROR:', error);
    return res.status(500).json({ message: 'Server error while searching news' });
  }
};
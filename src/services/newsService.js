const NEWS_BASE_URL = process.env.NEWS_BASE_URL;
const NEWS_API_KEY = process.env.NEWS_API_KEY;

export const fetchBusinessNews = async () => {
  const url = `${NEWS_BASE_URL}/top-headlines?category=business&pageSize=20&language=en&apiKey=${NEWS_API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`News API error: ${response.status}`);
  }

  const data = await response.json();

  return data;
};

export const searchEconomicNews = async (query) => {
  const encodedQuery = encodeURIComponent(query);
  const url = `${NEWS_BASE_URL}/everything?q=${encodedQuery}&language=en&sortBy=publishedAt&pageSize=20&apiKey=${NEWS_API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`News API error: ${response.status}`);
  }

  const data = await response.json();

  return data;
};
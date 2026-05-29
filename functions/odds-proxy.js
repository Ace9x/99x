// The Odds API Proxy — caches responses to stretch free tier (500 req/month)
const _cache = {};

function getCached(key, ttlSec) {
  const entry = _cache[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > ttlSec * 1000) return null;
  return entry.data;
}

function setCache(key, data) {
  _cache[key] = { ts: Date.now(), data };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
      body: '',
    };
  }

  const ODDS_API_KEY = process.env.ODDS_API_KEY;

  if (!ODDS_API_KEY) {
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'ODDS_API_KEY not configured', mock: true }),
    };
  }

  const params = event.queryStringParameters || {};
  const sport = params.sport || 'basketball_nba';
  const markets = params.markets || 'h2h,spreads,totals';
  const regions = params.regions || 'us';
  const oddsFormat = params.oddsFormat || 'american';
  const path = params.path || 'odds';

  let url;
  if (path === 'sports') {
    url = `https://api.the-odds-api.com/v4/sports/?apiKey=${ODDS_API_KEY}`;
  } else {
    url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${ODDS_API_KEY}&regions=${regions}&markets=${markets}&oddsFormat=${oddsFormat}`;
  }

  // Cache for 5 minutes — critical for staying within free tier
  const cacheKey = url.replace(ODDS_API_KEY, 'KEY');
  const cached = getCached(cacheKey, 300);
  if (cached) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Cache': 'HIT',
      },
      body: JSON.stringify(cached),
    };
  }

  try {
    const response = await fetch(url);
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (response.status === 200) {
      setCache(cacheKey, data);
    }

    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'X-Cache': 'MISS',
    };

    // Forward quota headers so the app can show remaining requests
    if (response.headers.get('x-requests-remaining')) {
      headers['X-Requests-Remaining'] = response.headers.get('x-requests-remaining');
    }
    if (response.headers.get('x-requests-used')) {
      headers['X-Requests-Used'] = response.headers.get('x-requests-used');
    }

    return { statusCode: response.status, headers, body: JSON.stringify(data) };
  } catch (e) {
    return {
      statusCode: 502,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Odds API fetch failed: ' + e.message, mock: true }),
    };
  }
};

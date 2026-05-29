// MLB Stats API Proxy — Official free MLB API (statsapi.mlb.com), no auth needed
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

  const params = { ...(event.queryStringParameters || {}) };
  const path = params.path || '/schedule';
  delete params.path;

  // Auto-inject today's date for schedule requests if not provided
  if (path === '/schedule' && !params.date) {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const yyyy = today.getFullYear();
    params.date = `${mm}/${dd}/${yyyy}`;
  }

  // Default hydration for schedule
  if (path === '/schedule' && !params.hydrate) {
    params.hydrate = 'team,linescore,game(content(summary))';
  }
  if (path === '/schedule' && !params.sportId) {
    params.sportId = '1';
  }

  const qs = new URLSearchParams(params).toString();
  const url = `https://statsapi.mlb.com/api/v1${path}${qs ? '?' + qs : ''}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EdgePro/1.0)',
        'Accept': 'application/json',
      },
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60',
      },
      body: JSON.stringify(data),
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'MLB fetch failed: ' + e.message }),
    };
  }
};

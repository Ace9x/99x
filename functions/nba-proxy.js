// NBA Stats Proxy — stats.nba.com requires server-side requests (CORS blocked in browser)
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

  const params = event.queryStringParameters || {};
  const endpoint = params.endpoint || 'scoreboard';
  delete params.endpoint;

  const qs = new URLSearchParams(params).toString();

  // Default scoreboard params if none provided
  let url;
  if (endpoint === 'scoreboard' && !qs) {
    const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    url = `https://stats.nba.com/stats/scoreboard?GameDate=${encodeURIComponent(today)}&LeagueID=00&DayOffset=0`;
  } else {
    url = `https://stats.nba.com/stats/${endpoint}${qs ? '?' + qs : ''}`;
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.nba.com/',
        'Origin': 'https://www.nba.com',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'x-nba-stats-origin': 'stats',
        'x-nba-stats-token': 'true',
        'Connection': 'keep-alive',
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
      body: JSON.stringify({ error: 'NBA fetch failed: ' + e.message }),
    };
  }
};

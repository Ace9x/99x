// NHL API Proxy — Official free NHL API (api-web.nhle.com), no auth needed
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
  const path = params.path || '/score/now';
  delete params.path;

  const qs = new URLSearchParams(params).toString();
  const url = `https://api-web.nhle.com/v1${path}${qs ? '?' + qs : ''}`;

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
      body: JSON.stringify({ error: 'NHL fetch failed: ' + e.message }),
    };
  }
};

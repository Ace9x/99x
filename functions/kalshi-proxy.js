const crypto = require('crypto');

exports.handler = async (event) => {
  // CORS preflight
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

  const KALSHI_KEY_ID = process.env.KALSHI_KEY_ID;
  const KALSHI_PRIVATE_KEY = process.env.KALSHI_PRIVATE_KEY;

  if (!KALSHI_KEY_ID || !KALSHI_PRIVATE_KEY) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Kalshi credentials not configured' }),
    };
  }

  // Kalshi API base — migrated from trading-api.kalshi.com to api.elections.kalshi.com
  const KALSHI_BASE = 'https://api.elections.kalshi.com';
  const API_PATH = '/trade-api/v2/markets';

  // Build query string from incoming params
  const qs = new URLSearchParams(event.queryStringParameters || {}).toString();
  const fullPath = API_PATH + (qs ? '?' + qs : '');
  const method = 'GET';

  // RSA-PSS SHA256 signature: sign(timestamp_ms + method + path_without_qs)
  const timestamp = Date.now().toString();
  const msgToSign = timestamp + method + API_PATH;

  let signature;
  try {
    const sign = crypto.createSign('SHA256');
    sign.update(msgToSign);
    signature = sign.sign(
      { key: KALSHI_PRIVATE_KEY, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST },
      'base64'
    );
  } catch (e) {
    // Fallback to PKCS1v15
    try {
      const sign2 = crypto.createSign('SHA256');
      sign2.update(msgToSign);
      signature = sign2.sign(KALSHI_PRIVATE_KEY, 'base64');
    } catch (e2) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Signing failed: ' + e2.message }),
      };
    }
  }

  try {
    const url = KALSHI_BASE + fullPath;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'KALSHI-ACCESS-KEY': KALSHI_KEY_ID,
        'KALSHI-ACCESS-TIMESTAMP': timestamp,
        'KALSHI-ACCESS-SIGNATURE': signature,
        'Content-Type': 'application/json',
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
      },
      body: JSON.stringify(data),
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Kalshi fetch failed: ' + e.message }),
    };
  }
};

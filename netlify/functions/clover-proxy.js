// Clover API Proxy — GAP Bridge Apps
const https = require('https');

exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-clover-env',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
      body: '',
    };
  }

  const path = event.path.replace('/.netlify/functions/clover-proxy', '');
  const queryString = event.queryStringParameters 
    ? '?' + Object.entries(event.queryStringParameters).map(([k,v]) => k+'='+encodeURIComponent(v)).join('&')
    : '';

  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  const cloverEnv = event.headers['x-clover-env'] || 'sandbox';
  const baseUrl = cloverEnv === 'production' ? 'https://api.clover.com' : 'https://sandbox.dev.clover.com';
  const targetUrl = baseUrl + path + queryString;

  try {
    const response = await makeRequest(targetUrl, event.httpMethod, authHeader, event.body);
    
    // Try to parse and re-stringify to ensure valid JSON
    let responseBody = response.body;
    try {
      const parsed = JSON.parse(responseBody);
      responseBody = JSON.stringify(parsed);
    } catch(e) {
      // If not valid JSON, wrap it
      responseBody = JSON.stringify({ message: responseBody, statusCode: response.statusCode });
    }

    return {
      statusCode: response.statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-clover-env',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
      body: responseBody,
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};

function makeRequest(url, method, authHeader, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body && method !== 'GET') req.write(body);
    req.end();
  });
}

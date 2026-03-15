// Clover API Proxy — GAP Bridge Apps
// Routes all Clover API calls through Netlify to bypass CORS restrictions

const https = require('https');
const http = require('http');

exports.handler = async function(event, context) {
  // Get the Clover path from the request
  const path = event.path.replace('/.netlify/functions/clover-proxy', '');
  const queryString = event.queryStringParameters 
    ? '?' + new URLSearchParams(event.queryStringParameters).toString()
    : '';

  // Get environment and credentials from headers
  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  const cloverEnv = event.headers['x-clover-env'] || 'sandbox';
  
  const baseUrl = cloverEnv === 'production' 
    ? 'https://api.clover.com' 
    : 'https://sandbox.dev.clover.com';

  const targetUrl = `${baseUrl}${path}${queryString}`;

  // Build request options
  const options = {
    method: event.httpMethod,
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  };

  try {
    const response = await makeRequest(targetUrl, options, event.body);
    
    return {
      statusCode: response.statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-clover-env',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
      body: response.body,
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};

function makeRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body && options.method !== 'GET') req.write(body);
    req.end();
  });
}

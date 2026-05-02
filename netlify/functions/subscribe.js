const https = require('https');

exports.handler = async function(event) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { email } = JSON.parse(event.body);

    if (!email || !email.includes('@')) {
      return { statusCode: 400, body: 'Invalid email' };
    }

    const pubId  = process.env.BEEHIIV_PUB_ID;
    const apiKey = process.env.BEEHIIV_API_KEY;

    const payload = JSON.stringify({
      email: email,
      reactivate_existing: false,
      send_welcome_email: true,
      utm_medium: 'landing_page',
      utm_campaign: 'validation'
    });

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.beehiiv.com',
        path: `/v2/publications/${pubId}/subscriptions`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    if (result.status !== 200 && result.status !== 201) {
      console.error('Beehiiv error:', result.status, result.body);
      return { statusCode: 500, body: 'Subscription failed: ' + result.body };
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true })
    };

  } catch (err) {
    console.error('Function error:', err.message);
    return { statusCode: 500, body: 'Server error: ' + err.message };
  }
};

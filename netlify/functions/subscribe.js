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

    const response = await fetch(
      `https://api.beehiiv.com/v2/publications/${process.env.BEEHIIV_PUB_ID}/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BEEHIIV_API_KEY}`
        },
        body: JSON.stringify({
          email: email,
          reactivate_existing: false,
          send_welcome_email: true,
          utm_medium: 'landing_page',
          utm_campaign: 'validation'
        })
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('Beehiiv error:', err);
      return { statusCode: 500, body: 'Subscription failed' };
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true })
    };

  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: 'Server error' };
  }
};

const https = require('https');
 
function getScoreEmail(score, correct) {
  const labels = {
    0:    { title: 'Just getting started 🌱', grade: 'Beginner' },
    250:  { title: 'Not bad at all 📖',        grade: 'Learner'  },
    500:  { title: 'Solid Jewish knowledge 🕎', grade: 'Scholar'  },
    750:  { title: 'Solid Jewish knowledge 🕎', grade: 'Scholar'  },
    1000: { title: 'Yodea Legend 🌟',           grade: 'Legend'   },
  };
 
  const messages = {
    0: `You got 0 out of 3 on your first lesson — and that's exactly why Yodea exists. Nobody explained this stuff to us either. That changes today.`,
    250: `You got 1 out of 3 on your first lesson. Not bad for a warm-up. The shofar has been confusing Jews for centuries — you're in good company.`,
    500: `You got 2 out of 3 on your first lesson. That's genuinely impressive for a first try. You clearly paid attention at some point — probably more than you think.`,
    750: `You got 2 out of 3 on your first lesson. Solid. The one you missed is actually one of the most commonly confused facts in all of Judaism. You're not alone.`,
    1000: `You got 3 out of 3 on your first lesson. Perfect score. You either already knew your shofar facts — or you're a very good guesser. Either way, Yodea legend status: confirmed.`,
  };
 
  const info = labels[score] || labels[500];
  const msg  = messages[score] || messages[500];
 
  return {
    subject: `Your Yodea Score: ${score} pts — ${info.grade}`,
    body: `Your Yodea Score: ${score} points
${info.title}
 
${msg}
 
━━━━━━━━━━━━━━━━━━━━━━
What you just learned: The Shofar
━━━━━━━━━━━━━━━━━━━━━━
 
The shofar is a ram's horn — no mouthpiece, no keys, just breath and lip pressure. It connects back to the Binding of Isaac, when Abraham found a ram caught in a thicket. Every time you hear it on Rosh Hashanah, that's the story it's telling.
 
The four calls:
· Tekiah — one long blast
· Shevarim — three medium blasts  
· Teruah — nine short staccato blasts
· Tekiah Gedolah — one very long blast, held as long as humanly possible
 
Tomorrow: a new lesson lands in your inbox. Same format — 5 minutes, one topic, one thing you'll actually remember.
 
— The Yodea team
 
P.S. "Yodea" means "one who knows" in Hebrew. It's also in the Passover song "Echad Mi Yodea" — which you've almost certainly sung without knowing what it means. We'll fix that soon.`
  };
}
 
exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
 
  try {
    const { email, score, correct } = JSON.parse(event.body);
 
    if (!email || !email.includes('@')) {
      return { statusCode: 400, body: 'Invalid email' };
    }
 
    const pubId  = process.env.BEEHIIV_PUB_ID;
    const apiKey = process.env.BEEHIIV_API_KEY;
 
    // Get personalised email content based on score
    const scoreVal = typeof score === 'number' ? score : 0;
    const emailContent = getScoreEmail(scoreVal, correct || 0);
 
    const payload = JSON.stringify({
      email: email,
      reactivate_existing: false,
      send_welcome_email: false, // We send our own personalised one below
      utm_medium: 'landing_page',
      utm_campaign: 'validation',
      custom_fields: [
        { name: 'yodea_score', value: String(scoreVal) },
        { name: 'correct_answers', value: String(correct || 0) }
      ]
    });
 
    // Step 1 — Add to Beehiiv
    const subResult = await new Promise((resolve, reject) => {
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
 
    if (subResult.status !== 200 && subResult.status !== 201) {
      console.error('Beehiiv subscription error:', subResult.status, subResult.body);
      return { statusCode: 500, body: 'Subscription failed' };
    }
 
    // Step 2 — Send personalised score email via Beehiiv transactional
    // For now log the content — transactional emails need Beehiiv paid plan
    // On free plan the welcome email in Beehiiv settings handles this
    console.log('Score email for', email, ':', emailContent.subject);
 
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: true, 
        score: scoreVal,
        subject: emailContent.subject
      })
    };
 
  } catch (err) {
    console.error('Function error:', err.message);
    return { statusCode: 500, body: 'Server error: ' + err.message };
  }
};
 

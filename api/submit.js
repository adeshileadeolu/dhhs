// api/submit.js
const Busboy = require('busboy');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    res.status(500).json({ error: 'Server not configured' });
    return;
  }

  try {
    const { fields, files } = await parseMultipartForm(req);

    // Send text fields as a message
    const message = Object.entries(fields)
      .map(([key, value]) => `*${key}*: ${value}`)
      .join('\n');

    if (message) {
      const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: `📥 New form submission:\n\n${message}`,
          parse_mode: 'Markdown',
        }),
      });
      const result = await tgRes.json();
      if (!result.ok) console.error('Telegram sendMessage error:', result);
    }

    // Send each uploaded file as a document
    for (const file of files) {
      if (!file.content || file.content.length === 0) continue;

      const form = new FormData();
      form.append('chat_id', CHAT_ID);
      form.append('document', new Blob([file.content], { type: file.contentType }), file.filename);

      const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
        method: 'POST',
        body: form,
      });
      const result = await tgRes.json();
      if (!result.ok) console.error('Telegram sendDocument error:', result);
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Function error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

function parseMultipartForm(req) {
  return new Promise((resolve, reject) => {
    const fields = {};
    const files = [];

    const busboy = Busboy({ headers: req.headers });

    busboy.on('field', (name, value) => {
      fields[name] = value;
    });

    busboy.on('file', (name, stream, info) => {
      const { filename, mimeType } = info;
      const chunks = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => {
        files.push({ filename, contentType: mimeType, content: Buffer.concat(chunks) });
      });
    });

    busboy.on('finish', () => resolve({ fields, files }));
    busboy.on('error', reject);

    req.pipe(busboy);
  });
}

// Disable Vercel's default body parser so we can stream the raw multipart body to busboy
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
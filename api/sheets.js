export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SHEETS_URL = process.env.SHEETS_API_URL;

  try {
    if (req.method === 'GET') {
      const { action, sheet } = req.query;
      const response = await fetch(`${SHEETS_URL}?action=${action}&sheet=${sheet}`, {
        redirect: 'follow'
      });
      const text = await response.text();
      const data = JSON.parse(text);
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const response = await fetch(SHEETS_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });
      const text = await response.text();
      const data = JSON.parse(text);
      return res.status(200).json(data);
    }
  } catch(err) {
    return res.status(500).json({ success: false, error: err.toString() });
  }
}

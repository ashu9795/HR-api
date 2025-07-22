require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3000;

app.use(express.json());

// Map company names to known domains (optional but helpful)
const domainMap = {
  google: "google.com",
  tcs: "tcs.com",
  microsoft: "microsoft.com",
  addverb: "addverb.com", // custom mapping
};

// Fallback domain guesser
function guessDomain(companyName) {
  return domainMap[companyName.toLowerCase()] || `${companyName.toLowerCase().replace(/\s+/g, '')}.com`;
}

// Function to get emails from Hunter.io
async function getHunterEmails(domain) {
  try {
    const res = await axios.get('https://api.hunter.io/v2/domain-search', {
      params: {
        domain,
        api_key: process.env.HUNTER_API_KEY,
      },
    });

    const emails = res.data.data.emails;

    // Filter HR-related emails
    const hrEmails = emails.filter(email =>
      email.position &&
      /hr|human resources|recruit|talent|people/i.test(email.position)
    );

    return { hrEmails, allEmails: emails };
  } catch (err) {
    console.error('Hunter API Error:', err.response?.data || err.message);
    return { hrEmails: [], allEmails: [] };
  }
}

// API Endpoint
app.get('/find-hr-email', async (req, res) => {
  const company = req.query.company;

  if (!company) {
    return res.status(400).json({ error: 'Company name is required' });
  }

  const domain = guessDomain(company);
  const { hrEmails, allEmails } = await getHunterEmails(domain);

  if (hrEmails.length === 0) {
    return res.status(404).json({
      message: 'No HR emails found for this domain. Here are other public emails.',
      domain,
      allEmails: allEmails.slice(0, 5) // show 5 for debugging
    });
  }

  res.json({
    company,
    domain,
    hrEmails,
    totalFound: hrEmails.length
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

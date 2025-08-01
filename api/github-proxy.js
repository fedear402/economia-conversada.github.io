// Vercel serverless function to proxy GitHub API calls
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { path, content, message } = req.body;
  
  if (!process.env.GITHUB_TOKEN) {
    return res.status(500).json({ error: 'GitHub token not configured' });
  }

  try {
    console.log('GitHub API Debug:', {
      path,
      hasToken: !!process.env.GITHUB_TOKEN,
      tokenLength: process.env.GITHUB_TOKEN?.length || 0
    });

    // Get current file SHA if it exists
    const currentResponse = await fetch(
      `https://api.github.com/repos/fedear402/economia-conversada.github.io/contents/${path}`,
      {
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    let sha = null;
    if (currentResponse.ok) {
      const currentData = await currentResponse.json();
      sha = currentData.sha;
    }

    // Create or update file
    const updateData = {
      message: message || 'Update data file',
      content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
      branch: 'main'
    };

    if (sha) {
      updateData.sha = sha;
    }

    const response = await fetch(
      `https://api.github.com/repos/fedear402/economia-conversada.github.io/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      }
    );

    if (response.ok) {
      const result = await response.json();
      res.status(200).json({ success: true, data: result });
    } else {
      const error = await response.text();
      res.status(response.status).json({ error: error });
    }
  } catch (error) {
    console.error('GitHub API error:', error);
    res.status(500).json({ error: error.message });
  }
}
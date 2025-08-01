// Simple data storage using GitHub Issues API (no file permissions needed)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, type, data } = req.body;
  
  if (!process.env.GITHUB_TOKEN) {
    return res.status(500).json({ error: 'GitHub token not configured' });
  }

  const repo = 'fedear402/economia-conversada.github.io';

  try {
    if (action === 'save') {
      // Create or update an issue with the data
      const title = `Data: ${type}`;
      const body = `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
      
      // Check if issue already exists
      const searchResponse = await fetch(
        `https://api.github.com/repos/${repo}/issues?labels=data-${type}&state=open`,
        {
          headers: {
            'Authorization': `token ${process.env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (searchResponse.ok) {
        const issues = await searchResponse.json();
        
        if (issues.length > 0) {
          // Update existing issue
          const issueNumber = issues[0].number;
          const updateResponse = await fetch(
            `https://api.github.com/repos/${repo}/issues/${issueNumber}`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ title, body })
            }
          );
          
          if (updateResponse.ok) {
            res.status(200).json({ success: true, action: 'updated' });
          } else {
            const error = await updateResponse.text();
            res.status(updateResponse.status).json({ error });
          }
        } else {
          // Create new issue
          const createResponse = await fetch(
            `https://api.github.com/repos/${repo}/issues`,
            {
              method: 'POST',
              headers: {
                'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ 
                title, 
                body, 
                labels: [`data-${type}`] 
              })
            }
          );
          
          if (createResponse.ok) {
            res.status(200).json({ success: true, action: 'created' });
          } else {
            const error = await createResponse.text();
            res.status(createResponse.status).json({ error });
          }
        }
      }
    } else if (action === 'load') {
      // Load data from issue
      const searchResponse = await fetch(
        `https://api.github.com/repos/${repo}/issues?labels=data-${type}&state=open`,
        {
          headers: {
            'Authorization': `token ${process.env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (searchResponse.ok) {
        const issues = await searchResponse.json();
        if (issues.length > 0) {
          const body = issues[0].body;
          const jsonMatch = body.match(/```json\n([\s\S]*?)\n```/);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[1]);
            res.status(200).json({ success: true, data });
          } else {
            res.status(200).json({ success: true, data: {} });
          }
        } else {
          res.status(200).json({ success: true, data: {} });
        }
      } else {
        const error = await searchResponse.text();
        res.status(searchResponse.status).json({ error });
      }
    }
  } catch (error) {
    console.error('GitHub Issues API error:', error);
    res.status(500).json({ error: error.message });
  }
}
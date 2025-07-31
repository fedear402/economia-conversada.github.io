// Simple deletion logging endpoint for Vercel
export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.status(200).json({ message: 'OK' });
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  try {
    const { filePath, fileName, timestamp } = req.body;
    
    if (!filePath || !fileName) {
      res.status(400).json({ error: 'Missing filePath or fileName' });
      return;
    }
    
    // Just log the deletion (no actual file operations)
    console.log(`🗑️ DELETION LOGGED: ${fileName} at ${filePath} on ${timestamp}`);
    
    // Return success (files remain hidden via localStorage)
    res.status(200).json({ 
      success: true, 
      message: `Deletion logged: ${fileName}`,
      logged_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Logging error:', error);
    res.status(500).json({ error: 'Failed to log deletion' });
  }
}
// Get global deletion list endpoint
export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.status(200).json({ message: 'OK' });
    return;
  }
  
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  try {
    // In a real implementation, this would read from a database
    // For now, return empty list (files are tracked in localStorage per user)
    res.status(200).json({ 
      deleted_files: [],
      message: 'Global deletion tracking not implemented - using localStorage'
    });
    
  } catch (error) {
    console.error('Error getting deleted files:', error);
    res.status(500).json({ error: 'Failed to get deleted files' });
  }
}
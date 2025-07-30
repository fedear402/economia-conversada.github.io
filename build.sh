#!/bin/bash

echo "Building book structure for static deployment..."

# Generate the book structure JSON
python3 generate_book_structure.py

echo "Build complete!"
echo "Files ready for deployment:"
echo "- index.html"
echo "- script.js"
echo "- styles.css"
echo "- book-structure.json"
echo "- book1/ (entire directory)"
echo ""
echo "Make sure to deploy all these files to Vercel."
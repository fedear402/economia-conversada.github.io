#!/bin/bash

echo "Building book structure for static deployment..."

# Generate the book structure JSON
python3 generate_book_structure.py

# Generate the character data JSON
python3 -c "
import json
exec(open('section_characters.py').read())
with open('section_characters.json', 'w', encoding='utf-8') as f:
    json.dump(section_characters, f, indent=2, ensure_ascii=False)
print('Generated section_characters.json')
"

echo "Build complete!"
echo "Files ready for deployment:"
echo "- index.html"
echo "- script.js"
echo "- styles.css"
echo "- book-structure.json"
echo "- section_characters.json"
echo "- book1/ (entire directory)"
echo ""
echo "Make sure to deploy all these files to Vercel."
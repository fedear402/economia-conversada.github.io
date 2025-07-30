#!/usr/bin/env python3
"""
Simple HTTP server for testing the chapter viewer locally.
Run this script and then open http://localhost:8000 in your browser.
"""

import http.server
import socketserver
import os
import json
import urllib.parse

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers to allow local file access
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        
        if parsed_path.path == '/api/book-structure':
            self.handle_book_structure()
        else:
            super().do_GET()
    
    def handle_book_structure(self):
        try:
            book_structure = self.scan_book_directory()
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(book_structure, indent=2).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
    
    def scan_book_directory(self):
        book_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'book1')
        
        if not os.path.exists(book_path):
            return {"error": "book1 directory not found"}
        
        book_structure = {
            "title": "Economía Conversada",
            "chapters": []
        }
        
        # Get all chapter directories (C1, C2, etc.)
        chapter_dirs = [d for d in os.listdir(book_path) 
                       if os.path.isdir(os.path.join(book_path, d)) and d.startswith('C')]
        chapter_dirs.sort(key=lambda x: int(x[1:]) if x[1:].isdigit() else 0)
        
        for chapter_dir in chapter_dirs:
            chapter_path = os.path.join(book_path, chapter_dir)
            
            # Read chapter title
            chapter_title = self.read_file_content(os.path.join(chapter_path, 'title.txt'))
            if not chapter_title:
                chapter_title = f"Capítulo {chapter_dir[1:]}"
            
            chapter_data = {
                "id": chapter_dir,
                "title": chapter_title,
                "textFile": f"book1/{chapter_dir}/chapter.txt",
                "audioFile": self.find_audio_file(chapter_path),
                "sections": []
            }
            
            # Get all section directories (S1, S2, etc.)
            section_dirs = [d for d in os.listdir(chapter_path)
                           if os.path.isdir(os.path.join(chapter_path, d)) and d.startswith('S')]
            section_dirs.sort(key=lambda x: int(x[1:]) if x[1:].isdigit() else 0)
            
            for section_dir in section_dirs:
                section_path = os.path.join(chapter_path, section_dir)
                
                # Read section title
                section_title = self.read_file_content(os.path.join(section_path, 'title.txt'))
                if not section_title:
                    section_title = f"Sección {section_dir[1:]}"
                
                section_data = {
                    "id": section_dir,
                    "title": section_title,
                    "textFile": f"book1/{chapter_dir}/{section_dir}/main.txt",
                    "audioFile": self.find_audio_file(section_path),
                    "description": self.read_file_content(os.path.join(section_path, 'description.txt'))
                }
                
                chapter_data["sections"].append(section_data)
            
            book_structure["chapters"].append(chapter_data)
        
        return book_structure
    
    def read_file_content(self, file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read().strip()
        except:
            return None
    
    def find_audio_file(self, directory):
        audio_extensions = ['.mp3', '.wav', '.ogg', '.m4a']
        
        for file in os.listdir(directory):
            for ext in audio_extensions:
                if file.lower().endswith(ext):
                    rel_path = os.path.relpath(os.path.join(directory, file), 
                                             os.path.dirname(os.path.abspath(__file__)))
                    return rel_path.replace('\\', '/')
        return None

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        print("Press Ctrl+C to stop the server")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
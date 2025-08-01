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
from datetime import datetime

PORT = 8000
DELETION_HISTORY_FILE = 'deleted_files_history.json'

def load_deletion_history():
    """Load the history of deleted files."""
    if not os.path.exists(DELETION_HISTORY_FILE):
        return {}
    
    try:
        with open(DELETION_HISTORY_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"Warning: Could not read deletion history: {e}")
        return {}

def save_deletion_history(history):
    """Save the history of deleted files."""
    try:
        with open(DELETION_HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(history, f, indent=2, ensure_ascii=False)
    except IOError as e:
        print(f"Warning: Could not save deletion history: {e}")

def record_deletion(history, file_path, reason="user_deleted"):
    """Record a file deletion in the history."""
    history[file_path] = {
        'deleted_at': datetime.now().isoformat(),
        'reason': reason
    }

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers to allow local file access
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
    
    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        
        if parsed_path.path == '/api/book-structure':
            self.handle_book_structure()
        else:
            super().do_GET()
    
    def do_DELETE(self):
        parsed_path = urllib.parse.urlparse(self.path)
        
        if parsed_path.path.startswith('/api/delete-audio/'):
            self.handle_delete_audio()
        else:
            self.send_response(404)
            self.end_headers()
    
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
            
            # Get all section directories (S1, S2, etc.) and SINOPSIS
            section_dirs = [d for d in os.listdir(chapter_path)
                           if os.path.isdir(os.path.join(chapter_path, d)) and 
                           (d.startswith('S') or d == 'SINOPSIS')]
            
            # Sort sections: S1, S2, etc. first, then SINOPSIS last
            def sort_sections(section):
                if section.startswith('S') and section[1:].isdigit():
                    return (0, int(section[1:]))  # Regular sections by number
                elif section == 'SINOPSIS':
                    return (1, 0)  # SINOPSIS comes last
                else:
                    return (2, 0)  # Other sections at the end
            
            section_dirs.sort(key=sort_sections)
            
            for section_dir in section_dirs:
                section_path = os.path.join(chapter_path, section_dir)
                
                # Handle SINOPSIS specially
                if section_dir == 'SINOPSIS':
                    section_title = self.read_file_content(os.path.join(section_path, 'title.txt'))
                    if not section_title:
                        section_title = "Sinopsis"
                    
                    section_data = {
                        "id": section_dir,
                        "title": section_title,
                        "textFile": f"book1/{chapter_dir}/{section_dir}/sinopsis.txt",
                        "audioFile": self.find_audio_file(section_path),
                        "description": None  # SINOPSIS doesn't have description.txt
                    }
                else:
                    # Regular sections (S1, S2, etc.)
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
    
    def handle_delete_audio(self):
        try:
            # Extract the file path from the URL
            # URL format: /api/delete-audio/book1/C1/S1/filename.mp3
            url_parts = self.path.split('/')
            if len(url_parts) < 6:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Invalid file path"}).encode())
                return
            
            # Reconstruct the file path
            file_path = '/'.join(url_parts[3:])  # Skip '', 'api', 'delete-audio'
            full_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), file_path)
            
            if not os.path.exists(full_path):
                self.send_response(404)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "File not found"}).encode())
                return
            
            # Security check: ensure file is an audio file and within book1 directory
            if not file_path.startswith('book1/') or not any(file_path.lower().endswith(ext) for ext in ['.mp3', '.wav', '.ogg', '.m4a', '.flac']):
                self.send_response(403)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Access denied"}).encode())
                return
            
            # Record deletion in history before deleting the file
            deletion_history = load_deletion_history()
            record_deletion(deletion_history, file_path, "user_deleted")
            save_deletion_history(deletion_history)
            
            # Delete the file
            os.remove(full_path)
            
            # Update the audio manifest
            dir_path = os.path.dirname(full_path)
            manifest_path = os.path.join(dir_path, 'audio_manifest.json')
            filename = os.path.basename(full_path)
            
            if os.path.exists(manifest_path):
                try:
                    with open(manifest_path, 'r', encoding='utf-8') as f:
                        manifest = json.load(f)
                    
                    if filename in manifest:
                        manifest.remove(filename)
                        
                        with open(manifest_path, 'w', encoding='utf-8') as f:
                            json.dump(manifest, f, indent=0, ensure_ascii=False)
                except Exception as e:
                    print(f"Warning: Could not update manifest: {e}")
            
            print(f"User deleted file: {file_path} (recorded in deletion history)")
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "message": f"File {filename} deleted successfully"}).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        print("Press Ctrl+C to stop the server")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
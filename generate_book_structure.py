#!/usr/bin/env python3
"""
Generate a static book structure JSON file from the book1 directory.
Run this script to create book-structure.json for static hosting.
"""

import os
import json

def read_file_content(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read().strip()
    except:
        return None

def find_audio_file(directory):
    audio_extensions = ['.mp3', '.wav', '.ogg', '.m4a']
    
    try:
        for file in os.listdir(directory):
            for ext in audio_extensions:
                if file.lower().endswith(ext):
                    rel_path = os.path.relpath(os.path.join(directory, file), 
                                             os.path.dirname(os.path.abspath(__file__)))
                    return rel_path.replace('\\', '/')
    except:
        pass
    return None

def generate_book_structure():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    book_path = os.path.join(script_dir, 'book1')
    
    if not os.path.exists(book_path):
        print(f"Error: book1 directory not found at {book_path}")
        return None
    
    book_structure = {
        "title": "Economía Conversada",
        "chapters": []
    }
    
    # Get all chapter directories (C1, C2, etc.)
    try:
        chapter_dirs = [d for d in os.listdir(book_path) 
                       if os.path.isdir(os.path.join(book_path, d)) and d.startswith('C')]
        chapter_dirs.sort(key=lambda x: int(x[1:]) if x[1:].isdigit() else 0)
    except:
        print(f"Error: Could not read book1 directory")
        return None
    
    for chapter_dir in chapter_dirs:
        chapter_path = os.path.join(book_path, chapter_dir)
        
        # Read chapter title
        chapter_title = read_file_content(os.path.join(chapter_path, 'title.txt'))
        if not chapter_title:
            chapter_title = f"Capítulo {chapter_dir[1:]}"
        
        chapter_data = {
            "id": chapter_dir,
            "title": chapter_title,
            "textFile": f"book1/{chapter_dir}/chapter.txt",
            "audioFile": find_audio_file(chapter_path),
            "sections": []
        }
        
        # Get all section directories (S1, S2, etc.) and SINOPSIS
        try:
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
        except:
            section_dirs = []
        
        for section_dir in section_dirs:
            section_path = os.path.join(chapter_path, section_dir)
            
            # Handle SINOPSIS specially
            if section_dir == 'SINOPSIS':
                section_title = read_file_content(os.path.join(section_path, 'title.txt'))
                if not section_title:
                    section_title = "Sinopsis"
                
                section_data = {
                    "id": section_dir,
                    "title": section_title,
                    "textFile": f"book1/{chapter_dir}/{section_dir}/sinopsis.txt",
                    "audioFile": find_audio_file(section_path),
                    "description": None  # SINOPSIS doesn't have description.txt
                }
            else:
                # Regular sections (S1, S2, etc.)
                section_title = read_file_content(os.path.join(section_path, 'title.txt'))
                if not section_title:
                    section_title = f"Sección {section_dir[1:]}"
                
                section_data = {
                    "id": section_dir,
                    "title": section_title,
                    "textFile": f"book1/{chapter_dir}/{section_dir}/main.txt",
                    "audioFile": find_audio_file(section_path),
                    "description": read_file_content(os.path.join(section_path, 'description.txt'))
                }
            
            chapter_data["sections"].append(section_data)
        
        book_structure["chapters"].append(chapter_data)
        print(f"Processed {chapter_dir}: {chapter_title} with {len(chapter_data['sections'])} sections")
    
    return book_structure

if __name__ == "__main__":
    print("Generating book structure...")
    book_structure = generate_book_structure()
    
    if book_structure:
        output_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'book-structure.json')
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(book_structure, f, indent=2, ensure_ascii=False)
        
        print(f"Book structure saved to: {output_file}")
        print(f"Found {len(book_structure['chapters'])} chapters")
        
        total_sections = sum(len(chapter['sections']) for chapter in book_structure['chapters'])
        print(f"Total sections: {total_sections}")
    else:
        print("Failed to generate book structure")
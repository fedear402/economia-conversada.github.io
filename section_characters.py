#!/usr/bin/env python3
"""
Script to analyze speaking characters in book sections.
Creates a dictionary mapping section paths to lists of speaking characters.
A character is considered speaking if they appear at least 3 times as the first word after a colon.
"""

import os
import re
from characters import character_description
#find_speaking_characters("book1/C1/S7/main.txt")
def find_speaking_characters(main_txt_path):
    print("Hello")
    """
    Analyze a main.txt file to find speaking characters.
    Returns a list of characters that speak at least 3 times.
    """
    try:
        with open(main_txt_path, 'r', encoding='utf-8') as file:
            content = file.read()
    except (FileNotFoundError, UnicodeDecodeError):
        return []
    
    # Count occurrences of each character speaking
    character_counts = {}
    
    # Split content into lines and look for character speech patterns
    lines = content.split('\n')
    for line in lines:
        
        line = line.strip()
        if ':' in line:
            # Extract the first word before the colon
            parts = line.split(':', 1)
            if len(parts) >= 2:
                potential_character = parts[0].strip()

                # Check if this matches any character in our dictionary
                if potential_character in character_description or potential_character in character_description.keys():
                    character_counts[potential_character] = character_counts.get(potential_character, 0) + 1
    
    # Return characters that speak at least 3 times
    speaking_characters = [char for char, count in character_counts.items() if count >= 3]
    return speaking_characters

def analyze_all_sections():
    """
    Analyze all main.txt files in the book1 directory structure.
    Returns a dictionary mapping section paths to lists of speaking characters.
    """
    results = {}
    book_path = "book1"
    
    if not os.path.exists(book_path):
        return results
    
    # Walk through all chapters and sections
    for chapter_name in os.listdir(book_path):
        chapter_path = os.path.join(book_path, chapter_name)
        
        if not os.path.isdir(chapter_path):
            continue
            
        for section_name in os.listdir(chapter_path):
            section_path = os.path.join(chapter_path, section_name)
            
            if not os.path.isdir(section_path):
                continue
                
            main_txt_path = os.path.join(section_path, "main.txt")
            
            if os.path.exists(main_txt_path):
                # Use the full path as the key
                full_section_path = f"{chapter_name}/{section_name}"
                speaking_characters = find_speaking_characters(main_txt_path)
                
                if speaking_characters:  # Only add if there are speaking characters
                    results[full_section_path] = speaking_characters
    
    return results

def main():
    """Main function to run the character analysis and display results."""
    
    character_sections = analyze_all_sections()
    
    if not character_sections:
        return {}
    
    
    # Sort sections for consistent output
    for section_path in sorted(character_sections.keys()):
        characters = character_sections[section_path]
    
    # Also create a summary by character

    
    character_appearances = {}
    for section_path, characters in character_sections.items():
        for character in characters:
            if character not in character_appearances:
                character_appearances[character] = []
            character_appearances[character].append(section_path)
    
    for character in sorted(character_appearances.keys()):
        sections = character_appearances[character]
    return character_sections

section_characters = main()




if __name__ == "__main__":
    main()
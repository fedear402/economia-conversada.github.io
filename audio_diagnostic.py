#!/usr/bin/env python3
"""
Comprehensive diagnostic for audio files and manifests
"""

import os
import json
from pathlib import Path

def scan_all_audio_files():
    """Scan for all audio files and compare with manifests"""
    book_path = Path("book1")
    
    print("🔍 COMPREHENSIVE AUDIO FILE DIAGNOSTIC")
    print("=" * 50)
    
    total_audio_files = 0
    total_manifest_files = 0
    missing_from_manifest = []
    
    # Load book structure
    try:
        with open("book-structure.json", "r") as f:
            book_structure = json.load(f)
        print(f"📚 Book structure: {len(book_structure['chapters'])} chapters")
    except Exception as e:
        print(f"❌ Error loading book structure: {e}")
        return
    
    print()
    
    for chapter in book_structure["chapters"]:
        chapter_id = chapter["id"]
        chapter_path = book_path / chapter_id
        
        print(f"📖 {chapter_id}: {chapter['title']}")
        
        if not chapter.get("sections"):
            print("   No sections")
            continue
            
        for section in chapter["sections"]:
            section_id = section["id"]
            section_path = chapter_path / section_id
            
            if not section_path.exists():
                print(f"   ❌ {section_id}: Directory doesn't exist")
                continue
            
            # Find actual audio files
            audio_extensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac']
            actual_files = []
            for ext in audio_extensions:
                actual_files.extend(section_path.glob(f"*{ext}"))
            actual_files = [f.name for f in actual_files]
            
            # Read manifest
            manifest_path = section_path / "audio_manifest.json"
            manifest_files = []
            if manifest_path.exists():
                try:
                    with open(manifest_path, "r") as f:
                        manifest_files = json.load(f)
                except Exception as e:
                    print(f"   ❌ {section_id}: Error reading manifest: {e}")
            
            total_audio_files += len(actual_files)
            total_manifest_files += len(manifest_files)
            
            # Compare
            if actual_files:
                if set(actual_files) == set(manifest_files):
                    print(f"   ✅ {section_id}: {len(actual_files)} files - {', '.join(actual_files)}")
                else:
                    print(f"   ⚠️  {section_id}: MISMATCH")
                    print(f"      Actual: {actual_files}")
                    print(f"      Manifest: {manifest_files}")
                    missing_from_manifest.append(f"{chapter_id}-{section_id}")
            elif manifest_files:
                print(f"   ❌ {section_id}: Manifest has files but no actual files found")
                print(f"      Manifest: {manifest_files}")
            else:
                print(f"   ⚪ {section_id}: No audio files")
    
    print()
    print("📊 SUMMARY")
    print("=" * 50)
    print(f"Total actual audio files found: {total_audio_files}")
    print(f"Total files in manifests: {total_manifest_files}")
    
    if missing_from_manifest:
        print(f"Sections with manifest mismatches: {len(missing_from_manifest)}")
        for section in missing_from_manifest:
            print(f"  - {section}")
    else:
        print("✅ All manifests match actual files")
    
    print()
    print("🌐 TO TEST IN BROWSER:")
    print("1. Open http://localhost:8000")
    print("2. Click 'To-Do' in sidebar")
    print("3. Console should show:")
    print(f"   - 'Total audio files loaded: {total_audio_files}'")
    print(f"   - Individual section logs for all {total_audio_files} files")

if __name__ == "__main__":
    scan_all_audio_files()
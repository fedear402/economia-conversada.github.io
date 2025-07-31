#!/usr/bin/env python3
"""
Audio Manifest Updater for the Economics Book Website

This script automatically scans all folders in the book structure and updates
the audio_manifest.json files with the actual audio files present in each folder.

Usage:
    python update_audio_manifest.py [--dry-run] [--book-path BOOK_PATH]

Options:
    --dry-run        Show what would be changed without making actual changes
    --book-path      Path to the book directory (default: ./book1)
"""

import os
import json
import argparse
from pathlib import Path
from typing import List, Set

# Supported audio file extensions
AUDIO_EXTENSIONS = {'.mp3', '.wav', '.m4a', '.ogg', '.flac'}

def find_audio_files(directory: Path) -> List[str]:
    """Find all audio files in a directory and return their filenames."""
    audio_files = []
    
    if not directory.exists():
        return audio_files
    
    for file in directory.iterdir():
        if file.is_file() and file.suffix.lower() in AUDIO_EXTENSIONS:
            audio_files.append(file.name)
    
    # Sort for consistent ordering
    return sorted(audio_files)

def update_audio_manifest(directory: Path, dry_run: bool = False) -> bool:
    """Update the audio_manifest.json file in the given directory."""
    manifest_path = directory / 'audio_manifest.json'
    audio_files = find_audio_files(directory)
    
    # Read existing manifest if it exists
    existing_manifest = []
    if manifest_path.exists():
        try:
            with open(manifest_path, 'r', encoding='utf-8') as f:
                existing_manifest = json.load(f)
                if not isinstance(existing_manifest, list):
                    existing_manifest = []
        except (json.JSONDecodeError, IOError) as e:
            print(f"Warning: Could not read existing manifest in {directory}: {e}")
            existing_manifest = []
    
    # Check if update is needed
    if set(audio_files) == set(existing_manifest):
        return False  # No changes needed
    
    if dry_run:
        print(f"Would update {manifest_path}:")
        print(f"  Current: {existing_manifest}")
        print(f"  New:     {audio_files}")
        return True
    
    # Write updated manifest
    try:
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(audio_files, f, indent=0, ensure_ascii=False)
        print(f"Updated {manifest_path}: {audio_files}")
        return True
    except IOError as e:
        print(f"Error: Could not write to {manifest_path}: {e}")
        return False

def scan_book_directory(book_path: Path, dry_run: bool = False) -> dict:
    """Scan the entire book directory and update all audio manifests."""
    stats = {
        'updated': 0,
        'unchanged': 0,
        'errors': 0,
        'total_folders': 0
    }
    
    if not book_path.exists():
        print(f"Error: Book path {book_path} does not exist")
        return stats
    
    print(f"Scanning book directory: {book_path}")
    print(f"Mode: {'DRY RUN' if dry_run else 'LIVE UPDATE'}")
    print("-" * 50)
    
    # Find all directories that should have audio manifests
    # This includes: chapter directories (C1, C2, etc.) and section directories (S1, S2, etc.)
    
    for chapter_dir in book_path.iterdir():
        if not chapter_dir.is_dir() or not chapter_dir.name.startswith('C'):
            continue
            
        print(f"\nProcessing chapter: {chapter_dir.name}")
        
        # Update chapter-level audio manifest
        stats['total_folders'] += 1
        try:
            if update_audio_manifest(chapter_dir, dry_run):
                stats['updated'] += 1
            else:
                stats['unchanged'] += 1
        except Exception as e:
            print(f"Error processing {chapter_dir}: {e}")
            stats['errors'] += 1
        
        # Process sections within the chapter
        for section_dir in chapter_dir.iterdir():
            if not section_dir.is_dir() or not section_dir.name.startswith('S'):
                continue
                
            print(f"  Processing section: {section_dir.name}")
            stats['total_folders'] += 1
            
            try:
                if update_audio_manifest(section_dir, dry_run):
                    stats['updated'] += 1
                else:
                    stats['unchanged'] += 1
            except Exception as e:
                print(f"Error processing {section_dir}: {e}")
                stats['errors'] += 1
    
    # Also check special directories like 'Intro'
    for special_dir in book_path.iterdir():
        if special_dir.is_dir() and special_dir.name in ['Intro']:
            print(f"\nProcessing special directory: {special_dir.name}")
            stats['total_folders'] += 1
            
            try:
                if update_audio_manifest(special_dir, dry_run):
                    stats['updated'] += 1
                else:
                    stats['unchanged'] += 1
            except Exception as e:
                print(f"Error processing {special_dir}: {e}")
                stats['errors'] += 1
    
    return stats

def main():
    parser = argparse.ArgumentParser(
        description='Update audio_manifest.json files for the Economics book website',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be changed without making actual changes'
    )
    
    parser.add_argument(
        '--book-path',
        type=Path,
        default=Path('./book1'),
        help='Path to the book directory (default: ./book1)'
    )
    
    args = parser.parse_args()
    
    # Make sure we're working with absolute paths
    book_path = args.book_path.resolve()
    
    # Run the scan
    stats = scan_book_directory(book_path, args.dry_run)
    
    # Print summary
    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    print(f"Total folders processed: {stats['total_folders']}")
    print(f"Audio manifests updated: {stats['updated']}")
    print(f"Audio manifests unchanged: {stats['unchanged']}")
    print(f"Errors encountered: {stats['errors']}")
    
    if args.dry_run and stats['updated'] > 0:
        print(f"\nRun without --dry-run to apply {stats['updated']} changes")
    
    return 0 if stats['errors'] == 0 else 1

if __name__ == '__main__':
    exit(main())
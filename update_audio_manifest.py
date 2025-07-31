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
from typing import List, Set, Dict
from datetime import datetime

# Supported audio file extensions
AUDIO_EXTENSIONS = {'.mp3', '.wav', '.m4a', '.ogg', '.flac'}

# File to store deletion history
DELETION_HISTORY_FILE = 'deleted_files_history.json'

def load_deletion_history(book_path: Path) -> Dict[str, Dict]:
    """Load the history of deleted files."""
    history_file = book_path / DELETION_HISTORY_FILE
    
    if not history_file.exists():
        return {}
    
    try:
        with open(history_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"Warning: Could not read deletion history: {e}")
        return {}

def save_deletion_history(book_path: Path, history: Dict[str, Dict]):
    """Save the history of deleted files."""
    history_file = book_path / DELETION_HISTORY_FILE
    
    try:
        with open(history_file, 'w', encoding='utf-8') as f:
            json.dump(history, f, indent=2, ensure_ascii=False)
    except IOError as e:
        print(f"Warning: Could not save deletion history: {e}")

def record_deletion(history: Dict[str, Dict], file_path: str, reason: str = "user_deleted"):
    """Record a file deletion in the history."""
    history[file_path] = {
        'deleted_at': datetime.now().isoformat(),
        'reason': reason
    }

def find_audio_files(directory: Path, delete_wav: bool = False, deletion_history: Dict[str, Dict] = None, book_path: Path = None) -> List[str]:
    """Find all audio files in a directory and return their filenames.
    
    Args:
        directory: Path to the directory to scan
        delete_wav: If True, delete all .wav files found
        deletion_history: Dictionary of previously deleted files
        book_path: Root path of the book (for relative path calculation)
    
    Returns:
        List of audio filenames (excluding deleted .wav files)
    """
    audio_files = []
    
    if not directory.exists():
        return audio_files
    
    if deletion_history is None:
        deletion_history = {}
    
    for file in directory.iterdir():
        if file.is_file() and file.suffix.lower() in AUDIO_EXTENSIONS:
            # Calculate relative path for deletion history tracking
            if book_path:
                try:
                    relative_path = str(file.relative_to(book_path))
                except ValueError:
                    relative_path = str(file)
            else:
                relative_path = str(file)
            
            # Check if this file was previously deleted by user
            if relative_path in deletion_history:
                try:
                    file.unlink()
                    print(f"  Re-deleted previously deleted file: {file.name} (originally deleted: {deletion_history[relative_path]['deleted_at']})")
                except OSError as e:
                    print(f"  Warning: Could not re-delete {file.name}: {e}")
                continue  # Don't add deleted files to the list
            
            # Delete .wav files if requested
            if delete_wav and file.suffix.lower() == '.wav':
                try:
                    file.unlink()
                    print(f"  Deleted WAV file: {file.name}")
                    # Record WAV deletion in history
                    record_deletion(deletion_history, relative_path, "wav_cleanup")
                except OSError as e:
                    print(f"  Warning: Could not delete {file.name}: {e}")
                continue  # Don't add deleted files to the list
            
            audio_files.append(file.name)
    
    # Sort for consistent ordering
    return sorted(audio_files)

def update_audio_manifest(directory: Path, dry_run: bool = False, delete_wav: bool = False, deletion_history: Dict[str, Dict] = None, book_path: Path = None) -> str:
    """Update the audio_manifest.json file in the given directory."""
    manifest_path = directory / 'audio_manifest.json'
    audio_files = find_audio_files(directory, delete_wav and not dry_run, deletion_history, book_path)
    
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
    
    # Always ensure manifest exists, even if empty
    manifest_exists = manifest_path.exists()
    changes_needed = set(audio_files) != set(existing_manifest)
    
    if not manifest_exists:
        print(f"  Creating new manifest: {manifest_path.name}")
    elif changes_needed:
        print(f"  Updating existing manifest: {manifest_path.name}")
    
    # Check if update is needed
    if manifest_exists and not changes_needed:
        return "unchanged"  # No changes needed
    
    if dry_run:
        if not manifest_exists:
            print(f"Would create {manifest_path}: {audio_files}")
            return "created"
        else:
            print(f"Would update {manifest_path}:")
            print(f"  Current: {existing_manifest}")
            print(f"  New:     {audio_files}")
            return "updated"
    
    # Write updated/new manifest
    try:
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(audio_files, f, indent=0, ensure_ascii=False)
        if not manifest_exists:
            print(f"Created {manifest_path}: {audio_files}")
            return "created"
        else:
            print(f"Updated {manifest_path}: {audio_files}")
            return "updated"
    except IOError as e:
        print(f"Error: Could not write to {manifest_path}: {e}")
        return "error"

def scan_book_directory(book_path: Path, dry_run: bool = False, delete_wav: bool = False) -> dict:
    """Scan the entire book directory and update all audio manifests."""
    stats = {
        'updated': 0,
        'created': 0,
        'unchanged': 0,
        'errors': 0,
        'total_folders': 0,
        'redeleted_files': 0
    }
    
    if not book_path.exists():
        print(f"Error: Book path {book_path} does not exist")
        return stats
    
    # Load deletion history
    deletion_history = load_deletion_history(book_path)
    if deletion_history:
        print(f"Loaded deletion history with {len(deletion_history)} previously deleted files")
    
    print(f"Scanning book directory: {book_path}")
    print(f"Mode: {'DRY RUN' if dry_run else 'LIVE UPDATE'}")
    if delete_wav:
        print("WAV file deletion: ENABLED")
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
            result = update_audio_manifest(chapter_dir, dry_run, delete_wav, deletion_history, book_path)
            if result == "created":
                stats['created'] += 1
            elif result == "updated":
                stats['updated'] += 1
            elif result == "unchanged":
                stats['unchanged'] += 1
            else:  # error
                stats['errors'] += 1
        except Exception as e:
            print(f"Error processing {chapter_dir}: {e}")
            stats['errors'] += 1
        
        # Process sections and other subdirectories within the chapter
        for subdir in chapter_dir.iterdir():
            if not subdir.is_dir():
                continue
            
            # Process sections (S1, S2, etc.) and other special directories (SINOPSIS, etc.)
            if subdir.name.startswith('S') or subdir.name in ['SINOPSIS', 'INTRO', 'CONCLUSION']:
                print(f"  Processing {subdir.name.lower()}: {subdir.name}")
                stats['total_folders'] += 1
                
                try:
                    result = update_audio_manifest(subdir, dry_run, delete_wav, deletion_history, book_path)
                    if result == "created":
                        stats['created'] += 1
                    elif result == "updated":
                        stats['updated'] += 1
                    elif result == "unchanged":
                        stats['unchanged'] += 1
                    else:  # error
                        stats['errors'] += 1
                except Exception as e:
                    print(f"Error processing {subdir}: {e}")
                    stats['errors'] += 1
    
    # Also check special directories like 'Intro'
    for special_dir in book_path.iterdir():
        if special_dir.is_dir() and special_dir.name in ['Intro']:
            print(f"\nProcessing special directory: {special_dir.name}")
            stats['total_folders'] += 1
            
            try:
                result = update_audio_manifest(special_dir, dry_run, delete_wav, deletion_history, book_path)
                if result == "created":
                    stats['created'] += 1
                elif result == "updated":
                    stats['updated'] += 1
                elif result == "unchanged":
                    stats['unchanged'] += 1
                else:  # error
                    stats['errors'] += 1
            except Exception as e:
                print(f"Error processing {special_dir}: {e}")
                stats['errors'] += 1
    
    # Save updated deletion history
    if not dry_run:
        save_deletion_history(book_path, deletion_history)
    
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
    
    parser.add_argument(
        '--delete-wav',
        action='store_true',
        help='Delete all .wav files found during the scan'
    )
    
    args = parser.parse_args()
    
    # Make sure we're working with absolute paths
    book_path = args.book_path.resolve()
    
    # Run the scan
    stats = scan_book_directory(book_path, args.dry_run, args.delete_wav)
    
    # Print summary
    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    print(f"Total folders processed: {stats['total_folders']}")
    print(f"Audio manifests created: {stats['created']}")
    print(f"Audio manifests updated: {stats['updated']}")
    print(f"Audio manifests unchanged: {stats['unchanged']}")
    print(f"Errors encountered: {stats['errors']}")
    
    total_changes = stats['created'] + stats['updated']
    if args.dry_run and total_changes > 0:
        print(f"\nRun without --dry-run to apply {total_changes} changes ({stats['created']} new, {stats['updated']} updates)")
    
    return 0 if stats['errors'] == 0 else 1

if __name__ == '__main__':
    exit(main())
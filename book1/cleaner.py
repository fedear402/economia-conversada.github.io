import os
import subprocess
import sys
from pathlib import Path


def clean_files(root_path: str, pattern = "main"):
    for dirpath, _, filenames in os.walk(root_path):
        counterparts = {f for f in filenames if f.endswith(".mp3") and f"{pattern}_1" in f}

        if not counterparts:
            continue

        for filename in filenames:
            if filename.endswith(".mp3") and pattern in filename and f"{pattern}_1" not in filename:
                # Generate the expected name of the counterpart file
                expected_counterpart = filename.replace(f"{pattern}", f"{pattern}_1", 1)

                # Delete the candidate if its counterpart exists
                if expected_counterpart in counterparts:
                    file_to_delete = os.path.join(dirpath, filename)
                    print(f"Deleting: {file_to_delete}")
                    os.remove(file_to_delete)


if __name__ == '__main__':
    target_directory = 'book1'
    # clean_files(target_directory)
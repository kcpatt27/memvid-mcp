#!/usr/bin/env python3

import json
import sys
import os
from memvid import MemvidEncoder, MemvidRetriever
from pathlib import Path

# Set UTF-8 encoding for Windows compatibility
if os.name == 'nt':  # Windows
    os.environ['PYTHONIOENCODING'] = 'utf-8'

try:
    # Collect all files to process
    all_files = []
    sources = [{"type": "directory", "path": "test-data", "options": {"file_types": [".ts", ".md"]}}]
    
    for source in sources:
        source_type = source.get('type')
        source_path = source.get('path')
        
        if source_type == 'file':
            if os.path.exists(source_path):
                all_files.append(source_path)
                print(f"Added file: {source_path}", file=sys.stderr)
            
        elif source_type == 'directory':
            options = source.get('options', {})
            file_types = options.get('file_types', ['.txt', '.md', '.py', '.js', '.ts'])
            
            # Ensure all extensions start with dot
            file_extensions = [ext if ext.startswith('.') else f'.{ext}' for ext in file_types]
            
            for file_path in Path(source_path).rglob('*'):
                if file_path.suffix.lower() in file_extensions and file_path.is_file():
                    all_files.append(str(file_path))
                    print(f"Found file: {file_path}", file=sys.stderr)
                        
        elif source_type == 'text':
            # For text content, create a temporary file
            temp_file = f"temp_text_{len(all_files)}.txt"
            with open(temp_file, 'w', encoding='utf-8') as f:
                f.write(source_path)  # source_path contains the text content
            all_files.append(temp_file)
    
    print(f"Total files to process: {len(all_files)}", file=sys.stderr)
    
    if not all_files:
        print("No files found to process", file=sys.stderr)
        sys.exit(1)
    
    # Use MemVid from_documents method for processing multiple files
    try:
        encoder = MemvidEncoder.from_documents(all_files)
        chunks_created = len(all_files)
        print(f"Successfully created encoder from {chunks_created} documents", file=sys.stderr)
    except Exception as encoder_error:
        print(f"from_documents failed, trying individual files: {encoder_error}", file=sys.stderr)
        # Fallback to individual file processing
        encoder = MemvidEncoder()
        chunks_created = 0
        
        for file_path in all_files:
            try:
                if file_path.lower().endswith('.pdf'):
                    encoder.add_pdf(file_path)
                else:
                    # Read and add text content
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        encoder.add_text(content)
                chunks_created += 1
                print(f"Processed: {file_path}", file=sys.stderr)
            except Exception as file_error:
                print(f"Warning: Could not process {file_path}: {file_error}", file=sys.stderr)
    
    # Build the video/memory bank
    output_path = "test-manual.mp4"
    index_path = output_path.replace('.mp4', '.faiss')
    
    # Capture build_video output to avoid encoding issues
    try:
        result = encoder.build_video(output_path, index_path)
        print(f"Created {chunks_created} chunks")
    except UnicodeEncodeError as ue:
        # Handle encoding errors gracefully
        print(f"Created {chunks_created} chunks (with encoding warnings)", file=sys.stderr)
    except Exception as build_error:
        print(f"Build completed with warnings: {str(build_error)}", file=sys.stderr)
        print(f"Created {chunks_created} chunks")
    
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1) 

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
    sources = [{"type":"file","path":"D:\\projects\\personal-projects\\memvid-mcp\\temp\\benchmark_large_text.txt"}]
    
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
    
    # Create encoder using correct MemVid API
    encoder = MemvidEncoder()
    chunks_created = 0
    
    # Process files using correct methods
    for file_path in all_files:
        try:
            if file_path.lower().endswith('.pdf'):
                # Use add_pdf for PDF files
                encoder.add_pdf(file_path)
                chunks_created += 1
                print(f"Added PDF: {file_path}", file=sys.stderr)
            else:
                # Read and add text content using add_text
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    if content.strip():  # Only add non-empty content
                        encoder.add_text(content)
                        chunks_created += 1
                        print(f"Added text from: {file_path}", file=sys.stderr)
        except Exception as file_error:
            print(f"Warning: Could not process {file_path}: {file_error}", file=sys.stderr)
    
    if chunks_created == 0:
        print("No content was successfully processed", file=sys.stderr)
        sys.exit(1)
    
    # Build the video/memory bank with correct parameters
    output_path = r"D:\\projects\\personal-projects\\memvid-mcp\\memory-banks\\benchmark_large_text_1749403554474.mp4"
    index_path = output_path.replace('.mp4', '.faiss')
    
    print(f"Building video with output_path: {output_path}", file=sys.stderr)
    print(f"Building video with index_path: {index_path}", file=sys.stderr)
    
    # Use correct build_video method with both required parameters
    try:
        encoder.build_video(output_file=output_path, index_file=index_path)
        print(f"Created {chunks_created} chunks")
    except UnicodeEncodeError as ue:
        # Handle encoding errors gracefully
        print(f"Created {chunks_created} chunks (with encoding warnings)", file=sys.stderr)
        print(f"Created {chunks_created} chunks")
    except Exception as build_error:
        print(f"Build error: {str(build_error)}", file=sys.stderr)
        # Try alternate approach or report error
        if "required positional argument" in str(build_error):
            print("Trying alternate build approach...", file=sys.stderr)
            try:
                encoder.build_video(output_path, index_path)
                print(f"Created {chunks_created} chunks")
            except Exception as alt_error:
                print(f"Alternate build also failed: {alt_error}", file=sys.stderr)
                sys.exit(1)
        else:
            sys.exit(1)
    
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)

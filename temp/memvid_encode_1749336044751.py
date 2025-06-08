
import json
import sys
import os
from memvid import MemvidEncoder, MemvidRetriever
from pathlib import Path

try:
    encoder = MemvidEncoder(
        chunk_size=512,
        overlap=50,
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )
    
    chunks_created = 0
    
    for source in [{"type":"directory","path":"D:\\projects\\personal-projects\\memvid-mcp\\test-data","options":{"file_types":["ts","md"]}}]:
        if source['type'] == 'file':
            encoder.add_file(source['path'])
            chunks_created += 1
        elif source['type'] == 'directory':
            file_types = source.get('options', {}).get('file_types', ['.txt', '.md', '.py', '.js', '.ts'])
            for file_path in Path(source['path']).rglob('*'):
                if file_path.suffix in file_types:
                    encoder.add_file(str(file_path))
                    chunks_created += 1
        elif source['type'] == 'text':
            encoder.add_text(source['path'])
            chunks_created += 1
    
    encoder.save("D:\projects\personal-projects\memvid-mcp\memory-banks\test-bank.mp4")
    print(f"Created {chunks_created} chunks")
    
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)

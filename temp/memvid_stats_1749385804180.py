
import json
import sys
import os
from memvid import MemvidEncoder, MemvidRetriever
from pathlib import Path

# Set UTF-8 encoding for Windows compatibility
if os.name == 'nt':  # Windows
    os.environ['PYTHONIOENCODING'] = 'utf-8'

try:
    import os
    
    bank_path = r"D:\\projects\\personal-projects\\memvid-mcp\\memory-banks\\direct-test.mp4"
    
    if not os.path.exists(bank_path):
        raise FileNotFoundError(f"Memory bank not found: {bank_path}")
        
    file_size = os.path.getsize(bank_path)
    
    # Try to get chunk count from retriever
    try:
        index_path = bank_path.replace('.mp4', '.faiss')
        retriever = MemvidRetriever(bank_path, index_path)
        # Use encoder stats if available
        if hasattr(retriever, 'get_stats'):
            stats_data = retriever.get_stats()
            chunks = stats_data.get('chunks', 1)
        else:
            # Rough estimation based on file size
            chunks = max(1, int(file_size / 50000))  # Estimate ~50KB per chunk
    except Exception as retriever_error:
        print(f"Warning: Could not get retriever stats: {retriever_error}", file=sys.stderr)
        chunks = max(1, int(file_size / 50000))
    
    stats = {
        'chunks': chunks,
        'size': file_size
    }
    
    print(json.dumps(stats))
    
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)

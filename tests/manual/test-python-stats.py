import json
import sys
import os
from memvid import MemvidEncoder, MemvidRetriever
from pathlib import Path

try:
    import os
    
    bank_path = r"D:\projects\personal-projects\memvid-mcp\memory-banks\direct-test.mp4"
    
    print(f"Testing stats for: {bank_path}", file=sys.stderr)
    
    if not os.path.exists(bank_path):
        raise FileNotFoundError(f"Memory bank not found: {bank_path}")
        
    file_size = os.path.getsize(bank_path)
    print(f"File size: {file_size}", file=sys.stderr)
    
    # Try to get chunk count from retriever
    try:
        index_path = bank_path.replace('.mp4', '.faiss')
        print(f"Index path: {index_path}", file=sys.stderr)
        print(f"Index exists: {os.path.exists(index_path)}", file=sys.stderr)
        
        print("Creating retriever...", file=sys.stderr)
        retriever = MemvidRetriever(bank_path, index_path)
        print("Retriever created successfully", file=sys.stderr)
        
        # Use encoder stats if available
        if hasattr(retriever, 'get_stats'):
            print("Retriever has get_stats method", file=sys.stderr)
            stats_data = retriever.get_stats()
            chunks = stats_data.get('chunks', 1)
        else:
            print("Retriever does not have get_stats method", file=sys.stderr)
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
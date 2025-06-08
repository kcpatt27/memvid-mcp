
import json
import sys
import os
from memvid import MemvidEncoder, MemvidRetriever
from pathlib import Path

# Set UTF-8 encoding for Windows compatibility
if os.name == 'nt':  # Windows
    os.environ['PYTHONIOENCODING'] = 'utf-8'

try:
    bank_path = r"D:\\projects\\personal-projects\\memvid-mcp\\memory-banks\\test-project.mp4"
    index_path = bank_path.replace('.mp4', '.faiss')
    retriever = MemvidRetriever(bank_path, index_path)
    query = "test content"
    results = retriever.search(query, top_k=5)
    
    formatted_results = []
    for i, result in enumerate(results):
        # MemVid results are typically strings or have a text attribute
        content = str(result)
        if hasattr(result, 'text'):
            content = result.text
        elif hasattr(result, 'content'):
            content = result.content
            
        # Calculate a simple score based on position (higher for earlier results)
        score = max(0.1, 1.0 - (i * 0.1))
        
        # Only include results above minimum score
        if score >= 0.3:
            formatted_results.append({
                'content': content,
                'score': score,
                'metadata': {
                    'position': i,
                    'source': 'memvid'
                }
            })
    
    print(json.dumps(formatted_results, ensure_ascii=False))
    
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)

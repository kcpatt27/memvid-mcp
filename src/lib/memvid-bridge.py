#!/usr/bin/env python3
"""
Direct MemVid Python Bridge - Concurrent operations support
Enhanced for Phase 3d: Handle multiple MCP tool calls safely
"""

import json
import sys
import os
import traceback
import warnings
from pathlib import Path
from typing import Dict, Any, Optional
import logging
import threading
import time

# Enhanced logging setup for concurrent operations debugging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - [%(threadName)s] - %(message)s',
    handlers=[
        logging.FileHandler('memvid_bridge.log', mode='w'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)
logger.info("Memvid bridge script started - Phase 3d concurrent operations support")

# Suppress warnings during imports
warnings.filterwarnings('ignore')
logger.info("Warnings ignored")

logger.info("Testing basic imports only (lazy loading for heavy dependencies)...")

try:
    logger.info("Testing basic Python libraries...")
    import tempfile
    logger.info("tempfile imported successfully")
    
    logger.info("All basic imports completed successfully - using lazy loading for heavy dependencies")
    
except Exception as e:
    logger.error(f"BASIC IMPORT FAILED: {e}")
    logger.error(f"Exception type: {type(e).__name__}")
    logger.error(f"Traceback: {traceback.format_exc()}")
    sys.exit(1)

class DirectMemvidBridge:
    def __init__(self):
        self.encoders = {}
        self.retrievers = {}  # Cache retrievers for concurrent access
        self._heavy_imports_loaded = False
        self._heavy_imports_lock = threading.Lock()  # Thread safety for heavy imports
        self._encoders_lock = threading.Lock()  # Thread safety for encoder storage
        self._request_count = 0
        self._request_lock = threading.Lock()
        logger.info("DirectMemvidBridge initialized with concurrent operations support")
    
    def _ensure_heavy_imports(self):
        """Thread-safe lazy load heavy dependencies only when needed"""
        if self._heavy_imports_loaded:
            return
            
        with self._heavy_imports_lock:
            # Double-check pattern for thread safety
            if self._heavy_imports_loaded:
                return
                
            logger.info("Loading heavy dependencies (numpy, torch, sentence_transformers, memvid)...")
            
            try:
                # Import heavy dependencies
                logger.info("Loading numpy...")
                import numpy
                logger.info(f"numpy version: {numpy.__version__}")
                
                logger.info("Loading PIL...")
                from PIL import Image
                logger.info("PIL loaded successfully")
                
                logger.info("Loading cv2...")
                import cv2
                logger.info(f"cv2 version: {cv2.__version__}")
                
                logger.info("Loading torch...")
                import torch
                logger.info(f"torch version: {torch.__version__}")
                
                logger.info("Loading sentence_transformers (this may take time on first run)...")
                import sentence_transformers
                logger.info(f"sentence_transformers version: {sentence_transformers.__version__}")
                
                logger.info("Loading faiss...")
                import faiss
                logger.info("faiss loaded successfully")
                
                logger.info("Loading sklearn...")
                import sklearn
                logger.info(f"sklearn version: {sklearn.__version__}")
                
                logger.info("Loading MemVid components...")
                from memvid.encoder import MemvidEncoder
                logger.info("MemvidEncoder loaded successfully")
                
                from memvid.retriever import MemvidRetriever
                logger.info("MemvidRetriever loaded successfully")
                
                # Store the imports as class attributes for later use
                self.MemvidEncoder = MemvidEncoder
                self.MemvidRetriever = MemvidRetriever
                
                self._heavy_imports_loaded = True
                logger.info("All heavy dependencies loaded successfully!")
                
            except Exception as e:
                logger.error(f"HEAVY IMPORT FAILED: {e}")
                logger.error(f"Exception type: {type(e).__name__}")
                logger.error(f"Traceback: {traceback.format_exc()}")
                raise e
    
    def _get_request_id(self):
        """Thread-safe request ID generation"""
        with self._request_lock:
            self._request_count += 1
            return self._request_count
    
    def create_memory_bank(self, bank_name: str, sources: list, **kwargs):
        """Create a new memory bank from sources - Thread-safe implementation"""
        request_id = self._get_request_id()
        try:
            logger.info(f"[REQ-{request_id}] Creating memory bank: {bank_name}")
            
            # Lazy load heavy dependencies only when needed
            self._ensure_heavy_imports()
            
            # Initialize encoder (create new instance for each request to avoid conflicts)
            encoder = self.MemvidEncoder()
            
            # Thread-safe encoder storage
            with self._encoders_lock:
                self.encoders[f"{bank_name}_{request_id}"] = encoder
            
            # Process sources
            content_text = ""
            for source in sources:
                if isinstance(source, str):
                    content_text += source + "\n\n"
                elif isinstance(source, dict) and 'content' in source:
                    content_text += source['content'] + "\n\n"
            
            # Add content to encoder
            encoder.add_text(content_text)
            
            # Build video and index files
            video_path = f"memory-banks/{bank_name}.mp4"
            index_path = f"memory-banks/{bank_name}"
            
            result = encoder.build_video(video_path, index_path)
            
            # Clean up temporary encoder reference
            with self._encoders_lock:
                if f"{bank_name}_{request_id}" in self.encoders:
                    del self.encoders[f"{bank_name}_{request_id}"]
            
            logger.info(f"[REQ-{request_id}] Memory bank created successfully: {bank_name}")
            return {
                "status": "success",
                "bank_name": bank_name,
                "video_path": video_path,
                "index_path": f"{index_path}.json",
                "stats": result
            }
            
        except Exception as e:
            logger.error(f"[REQ-{request_id}] Failed to create memory bank {bank_name}: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {
                "status": "error", 
                "error": str(e)
            }
    
    def search_memory_bank(self, video_path: str, index_path: str, query: str, **kwargs):
        """Search a memory bank for relevant content - Thread-safe with retriever caching"""
        request_id = self._get_request_id()
        try:
            logger.info(f"[REQ-{request_id}] Searching memory bank: {video_path} for query: {query}")
            
            # Lazy load heavy dependencies only when needed
            self._ensure_heavy_imports()
            
            # Get or create cached retriever for better performance
            retriever_key = f"{video_path}:{index_path}"
            
            if retriever_key not in self.retrievers:
                logger.info(f"[REQ-{request_id}] Creating new retriever for {retriever_key}")
                retriever = self.MemvidRetriever(video_path, index_path)
                self.retrievers[retriever_key] = retriever
            else:
                logger.info(f"[REQ-{request_id}] Using cached retriever for {retriever_key}")
                retriever = self.retrievers[retriever_key]
            
            # Perform search
            top_k = kwargs.get('top_k', 5)
            start_time = time.time()
            results = retriever.search(query, top_k=top_k)
            search_time = time.time() - start_time
            
            logger.info(f"[REQ-{request_id}] Search found {len(results)} results in {search_time:.3f}s")
            return {
                "status": "success",
                "results": results,
                "total_results": len(results),
                "search_time": search_time
            }
            
        except Exception as e:
            logger.error(f"[REQ-{request_id}] Failed to search memory bank {video_path}: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {
                "status": "error",
                "error": str(e)
            }

def main():
    """Main bridge loop for handling MCP requests"""
    try:
        bridge = DirectMemvidBridge()
        
        # Send ready signal immediately (no heavy imports at startup)
        print(json.dumps({'status': 'ready'}), flush=True)
        logger.info("Bridge ready, sent JSON ready signal")
        
        # Process JSON-RPC requests
        for line in sys.stdin:
            try:
                request = json.loads(line.strip())
                request_id = request.get('id')
                method = request.get('method')
                params = request.get('params', {})
                
                logger.info(f"Received JSON-RPC request: method={method}, id={request_id}")
                
                if method == 'encode':
                    # Create memory bank 
                    sources = params['sources']
                    output_path = params['output_path']
                    
                    # Extract bank name from output path
                    bank_name = os.path.basename(output_path).replace('.mp4', '')
                    
                    result = bridge.create_memory_bank(bank_name, sources)
                    
                    # Format as JSON-RPC response
                    if result.get('status') == 'success':
                        response = {
                            'id': request_id,
                            'result': {
                                'success': True,
                                'chunks_created': 1,  # Will be updated when we track this
                                'files': {
                                    'mp4': result['video_path'],
                                    'faiss': result['index_path'].replace('.json', '.faiss'),
                                    'json': result['index_path']
                                }
                            }
                        }
                    else:
                        response = {
                            'id': request_id,
                            'result': {
                                'success': False,
                                'error': result.get('error', 'Unknown error'),
                                'chunks_created': 0
                            }
                        }
                    
                    print(json.dumps(response), flush=True)
                    
                elif method == 'search':
                    # Search memory bank
                    video_path = params['video_path']
                    index_path = params['index_path']
                    query = params['query']
                    
                    # Extract other parameters (excluding the ones we pass as positional args)
                    other_params = {k: v for k, v in params.items() 
                                  if k not in ['video_path', 'index_path', 'query']}
                    
                    result = bridge.search_memory_bank(video_path, index_path, query, **other_params)
                    
                    # Format as JSON-RPC response
                    if result.get('status') == 'success':
                        response = {
                            'id': request_id,
                            'result': {
                                'success': True,
                                'results': result['results'],
                                'total_results': result['total_results']
                            }
                        }
                    else:
                        response = {
                            'id': request_id,
                            'result': {
                                'success': False,
                                'error': result.get('error', 'Unknown error'),
                                'results': []
                            }
                        }
                    
                    print(json.dumps(response), flush=True)
                    
                elif method == 'ping':
                    response = {
                        'id': request_id,
                        'result': {'status': 'pong'}
                    }
                    print(json.dumps(response), flush=True)
                    
                else:
                    logger.error(f"Unknown method: {method}")
                    response = {
                        'id': request_id,
                        'error': {
                            'message': f"Unknown method: {method}",
                            'type': 'ValueError'
                        }
                    }
                    print(json.dumps(response), flush=True)
                    
            except Exception as e:
                logger.error(f"Error processing request: {e}")
                logger.error(f"Traceback: {traceback.format_exc()}")
                error_response = {
                    'id': request.get('id') if 'request' in locals() else None,
                    'error': {
                        'message': str(e),
                        'type': type(e).__name__,
                        'traceback': traceback.format_exc()
                    }
                }
                print(json.dumps(error_response), flush=True)
                
    except Exception as e:
        logger.error(f"Bridge main loop failed: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        sys.exit(1)

if __name__ == "__main__":
    logger.info("Script is being run directly")
    main() 
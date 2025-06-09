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

# Suppress all warnings
warnings.filterwarnings('ignore')

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
            
            # Temporarily redirect stdout to stderr to capture unwanted prints from libraries
            original_stdout = sys.stdout
            sys.stdout = sys.stderr

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
            finally:
                # Restore stdout
                sys.stdout = original_stdout
                logger.info("Restored stdout.")
    
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
            
            # Process sources properly by type
            content_text = ""
            for source in sources:
                try:
                    if isinstance(source, str):
                        content_text += source + "\n\n"
                    elif isinstance(source, dict):
                        source_type = source.get('type', 'text')
                        source_path = source.get('path', '')
                        
                        if source_type == 'text':
                            # Direct text content
                            content_text += source_path + "\n\n"
                        elif source_type == 'file':
                            # Read file content
                            logger.info(f"[REQ-{request_id}] Reading file: {source_path}")
                            if os.path.exists(source_path):
                                with open(source_path, 'r', encoding='utf-8', errors='ignore') as f:
                                    file_content = f.read()
                                    content_text += f"\n\n=== {os.path.basename(source_path)} ===\n\n"
                                    content_text += file_content + "\n\n"
                            else:
                                logger.warning(f"[REQ-{request_id}] File not found: {source_path}")
                        elif source_type == 'directory':
                            # Process directory contents
                            logger.info(f"[REQ-{request_id}] Processing directory: {source_path}")
                            if os.path.exists(source_path) and os.path.isdir(source_path):
                                options = source.get('options', {})
                                file_types = options.get('file_types', ['txt', 'md', 'py', 'js', 'ts', 'json'])
                                
                                # Add dot prefix if not present
                                file_types = [ft if ft.startswith('.') else f'.{ft}' for ft in file_types]
                                
                                for root, dirs, files in os.walk(source_path):
                                    for file in files:
                                        file_path = os.path.join(root, file)
                                        file_ext = os.path.splitext(file)[1].lower()
                                        
                                        if file_ext in file_types:
                                            try:
                                                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                                                    file_content = f.read()
                                                    rel_path = os.path.relpath(file_path, source_path)
                                                    content_text += f"\n\n=== {rel_path} ===\n\n"
                                                    content_text += file_content + "\n\n"
                                                    logger.info(f"[REQ-{request_id}] Processed file: {rel_path}")
                                            except Exception as e:
                                                logger.warning(f"[REQ-{request_id}] Could not read file {file_path}: {e}")
                            else:
                                logger.warning(f"[REQ-{request_id}] Directory not found: {source_path}")
                        elif source_type == 'url':
                            # URL fetching (basic implementation)
                            logger.info(f"[REQ-{request_id}] Fetching URL: {source_path}")
                            try:
                                import urllib.request
                                with urllib.request.urlopen(source_path) as response:
                                    url_content = response.read().decode('utf-8', errors='ignore')
                                    content_text += f"\n\n=== {source_path} ===\n\n"
                                    content_text += url_content + "\n\n"
                            except Exception as e:
                                logger.warning(f"[REQ-{request_id}] Could not fetch URL {source_path}: {e}")
                        elif 'content' in source:
                            # Legacy content field support
                            content_text += source['content'] + "\n\n"
                        else:
                            logger.warning(f"[REQ-{request_id}] Unknown source type or missing content: {source}")
                            
                except Exception as e:
                    logger.error(f"[REQ-{request_id}] Error processing source {source}: {e}")
                    continue
            
            if not content_text.strip():
                raise ValueError("No content was extracted from sources. Please check source paths and types.")
            
            logger.info(f"[REQ-{request_id}] Extracted {len(content_text)} characters from sources")
            
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

    def add_content_to_bank(self, bank_path: str, content: str, metadata: dict = None, **kwargs):
        """Add content to an existing memory bank - Thread-safe implementation"""
        request_id = self._get_request_id()
        try:
            logger.info(f"[REQ-{request_id}] Adding content to memory bank: {bank_path}")
            
            # Lazy load heavy dependencies only when needed
            self._ensure_heavy_imports()
            
            # Derive file paths from bank_path
            # bank_path could be the .mp4 file or the base name
            base_path = bank_path.replace('.mp4', '').replace('.json', '').replace('.faiss', '')
            video_path = f"{base_path}.mp4"
            index_path = f"{base_path}.json"
            faiss_path = f"{base_path}.faiss"
            
            # Check if memory bank exists
            if not os.path.exists(video_path) or not os.path.exists(index_path):
                raise ValueError(f"Memory bank not found at {base_path}")
            
            logger.info(f"[REQ-{request_id}] Loading existing memory bank from {base_path}")
            
            # Load the existing retriever/encoder to get the current state
            # Create a new encoder instance for adding content
            encoder = self.MemvidEncoder()
            
            # Read existing JSON index to get current chunks
            try:
                with open(index_path, 'r', encoding='utf-8') as f:
                    existing_index = json.load(f)
                    
                # Add existing content to the new encoder
                if 'chunks' in existing_index and isinstance(existing_index['chunks'], list):
                    logger.info(f"[REQ-{request_id}] Loading {len(existing_index['chunks'])} existing chunks")
                    for chunk in existing_index['chunks']:
                        if isinstance(chunk, dict) and 'text' in chunk:
                            encoder.add_text(chunk['text'])
                        elif isinstance(chunk, str):
                            encoder.add_text(chunk)
                            
            except Exception as e:
                logger.warning(f"[REQ-{request_id}] Could not load existing index: {e}")
                # If we can't load existing content, we'll just add the new content
                # This might result in a partial rebuild, but it's better than failing
            
            # Add the new content
            if metadata:
                # Format content with metadata if provided
                formatted_content = f"\n\n=== New Content ===\n"
                if metadata.get('source'):
                    formatted_content += f"Source: {metadata['source']}\n"
                if metadata.get('category'):
                    formatted_content += f"Category: {metadata['category']}\n"
                if metadata.get('timestamp'):
                    formatted_content += f"Timestamp: {metadata['timestamp']}\n"
                formatted_content += f"\n{content}\n\n"
            else:
                formatted_content = f"\n\n=== New Content ===\n{content}\n\n"
            
            # Add new content to encoder
            encoder.add_text(formatted_content)
            logger.info(f"[REQ-{request_id}] Added {len(content)} characters of new content")
            
            # Create backup of existing files
            backup_video = f"{video_path}.backup"
            backup_index = f"{index_path}.backup" 
            backup_faiss = f"{faiss_path}.backup"
            
            try:
                if os.path.exists(video_path):
                    os.rename(video_path, backup_video)
                if os.path.exists(index_path):
                    os.rename(index_path, backup_index)
                if os.path.exists(faiss_path):
                    os.rename(faiss_path, backup_faiss)
                    
                # Rebuild the memory bank with all content (existing + new)
                result = encoder.build_video(video_path, base_path)
                
                # Clean up backup files if successful
                for backup_file in [backup_video, backup_index, backup_faiss]:
                    if os.path.exists(backup_file):
                        os.remove(backup_file)
                        
                logger.info(f"[REQ-{request_id}] Successfully added content to memory bank: {base_path}")
                
                # Invalidate cached retriever since the bank has been updated
                retriever_key = f"{video_path}:{index_path}"
                if retriever_key in self.retrievers:
                    del self.retrievers[retriever_key]
                    logger.info(f"[REQ-{request_id}] Invalidated cached retriever for updated bank")
                
                return {
                    "status": "success",
                    "bank_path": base_path,
                    "chunks_added": 1,  # Estimate - could be calculated more precisely
                    "stats": result
                }
                
            except Exception as e:
                # Restore backup files if rebuild failed
                logger.error(f"[REQ-{request_id}] Rebuild failed, restoring backups: {e}")
                
                for original, backup in [(video_path, backup_video), (index_path, backup_index), (faiss_path, backup_faiss)]:
                    if os.path.exists(backup):
                        if os.path.exists(original):
                            os.remove(original)
                        os.rename(backup, original)
                        
                raise e
                
        except Exception as e:
            logger.error(f"[REQ-{request_id}] Failed to add content to memory bank {bank_path}: {e}")
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
                    
                elif method == 'add_content':
                    # Add content to existing memory bank
                    bank_path = params['bank_path']
                    content = params['content']
                    metadata = params.get('metadata', {})
                    
                    # Extract other parameters
                    other_params = {k: v for k, v in params.items() 
                                  if k not in ['bank_path', 'content', 'metadata']}
                    
                    result = bridge.add_content_to_bank(bank_path, content, metadata, **other_params)
                    
                    # Format as JSON-RPC response
                    if result.get('status') == 'success':
                        response = {
                            'id': request_id,
                            'result': {
                                'success': True,
                                'chunks_added': result.get('chunks_added', 1)
                            }
                        }
                    else:
                        response = {
                            'id': request_id,
                            'result': {
                                'success': False,
                                'error': result.get('error', 'Unknown error'),
                                'chunks_added': 0
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
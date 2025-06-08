#!/usr/bin/env python3

import os
import sys
from memvid import MemvidEncoder

def test_memvid():
    print("Testing MemVid functionality...")
    
    # Test 1: Basic MemVid import
    try:
        encoder = MemvidEncoder()
        print("✅ MemvidEncoder created successfully")
    except Exception as e:
        print(f"❌ Failed to create MemvidEncoder: {e}")
        return False
    
    # Test 2: Add some text content
    try:
        test_content = """
        # Test Document
        This is a test document for MemVid functionality.
        
        ## Features
        - Text processing
        - Semantic search
        - Memory bank creation
        """
        encoder.add_text(test_content)
        print("✅ Added text content successfully")
    except Exception as e:
        print(f"❌ Failed to add text: {e}")
        return False
    
    # Test 3: Build video/memory bank
    try:
        output_path = os.path.abspath("./memory-banks/minimal-test.mp4")
        index_path = output_path.replace('.mp4', '.faiss')
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        print(f"Building video at: {output_path}")
        print(f"Building index at: {index_path}")
        
        encoder.build_video(output_file=output_path, index_file=index_path)
        
        # Check if files were created
        if os.path.exists(output_path):
            print(f"✅ MP4 file created: {output_path} ({os.path.getsize(output_path)} bytes)")
        else:
            print(f"❌ MP4 file not created: {output_path}")
            return False
            
        if os.path.exists(index_path):
            print(f"✅ Index file created: {index_path} ({os.path.getsize(index_path)} bytes)")
        else:
            print(f"❌ Index file not created: {index_path}")
            return False
            
    except Exception as e:
        print(f"❌ Failed to build video: {e}")
        return False
    
    print("🎉 All tests passed!")
    return True

if __name__ == "__main__":
    success = test_memvid()
    sys.exit(0 if success else 1) 
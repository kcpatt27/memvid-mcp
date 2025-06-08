#!/usr/bin/env python
import sys
import os
import time

# Add the memvid directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'memvid'))

from memvid import MemvidEncoder

def test_memvid_directly():
    print("=== MemVid Direct Test ===")
    print(f"Python: {sys.executable}")
    print(f"Working dir: {os.getcwd()}")
    
    try:
        print("\n1. Creating MemvidEncoder...")
        encoder = MemvidEncoder()
        print("✓ MemvidEncoder created successfully")
        
        print("\n2. Adding simple text...")
        start_time = time.time()
        encoder.add_text("This is a simple test document for debugging MemVid performance issues.")
        add_time = time.time() - start_time
        print(f"✓ Text added in {add_time:.3f}s")
        
        print("\n3. Building video...")
        output_file = "test-direct-memvid.mp4"
        index_file = "test-direct-memvid.json"
        
        # Clean up existing files
        for f in [output_file, index_file]:
            if os.path.exists(f):
                os.remove(f)
                print(f"✓ Cleaned up existing {f}")
        
        build_start = time.time()
        encoder.build_video(output_file, index_file)
        build_time = time.time() - build_start
        print(f"✓ Video built in {build_time:.3f}s")
        
        print("\n4. Checking outputs...")
        if os.path.exists(output_file):
            size = os.path.getsize(output_file)
            print(f"✓ Video file created: {size} bytes")
        else:
            print("✗ Video file not created")
            
        if os.path.exists(index_file):
            size = os.path.getsize(index_file)
            print(f"✓ Index file created: {size} bytes")
        else:
            print("✗ Index file not created")
            
        total_time = time.time() - start_time
        print(f"\n=== Total time: {total_time:.3f}s ===")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_memvid_directly() 
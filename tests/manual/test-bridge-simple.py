#!/usr/bin/env python3

import sys
import json
import subprocess
import os

def test_bridge():
    print("Testing MemVid bridge...")
    
    # Test 1: Check if bridge script exists
    bridge_path = os.path.join('src', 'lib', 'memvid-bridge.py')
    if not os.path.exists(bridge_path):
        print(f"❌ Bridge script not found: {bridge_path}")
        return False
    
    print(f"✅ Bridge script found: {bridge_path}")
    
    # Test 2: Try to start the bridge process
    python_path = os.path.join('memvid-env', 'Scripts', 'python.exe')
    if not os.path.exists(python_path):
        print(f"❌ Python executable not found: {python_path}")
        return False
    
    print(f"✅ Python executable found: {python_path}")
    
    try:
        # Start the bridge process
        process = subprocess.Popen(
            [python_path, bridge_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        print("✅ Bridge process started")
        
        # Wait for ready signal
        ready_line = process.stdout.readline()
        print(f"📡 Bridge output: {ready_line.strip()}")
        
        if 'ready' in ready_line:
            print("✅ Bridge is ready!")
            
            # Test ping
            ping_request = json.dumps({"operation": "ping", "params": {}, "id": "test1"}) + "\n"
            process.stdin.write(ping_request)
            process.stdin.flush()
            
            response_line = process.stdout.readline()
            print(f"📡 Ping response: {response_line.strip()}")
            
            try:
                response = json.loads(response_line)
                if response.get('success') and response.get('message') == 'pong':
                    print("✅ Ping test successful!")
                    return True
                else:
                    print(f"❌ Ping test failed: {response}")
            except json.JSONDecodeError:
                print(f"❌ Invalid JSON response: {response_line}")
        else:
            print(f"❌ Bridge not ready: {ready_line}")
            
        # Cleanup
        process.terminate()
        process.wait(timeout=5)
        
    except Exception as e:
        print(f"❌ Bridge test error: {e}")
        return False
    
    return False

if __name__ == '__main__':
    success = test_bridge()
    print(f"\n🎯 Bridge test result: {'SUCCESS' if success else 'FAILED'}")
    sys.exit(0 if success else 1) 
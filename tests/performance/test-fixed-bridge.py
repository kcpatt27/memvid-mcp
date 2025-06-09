#!/usr/bin/env python3
import json
import subprocess
import sys
import time

def test_fixed_bridge():
    print("Testing fixed Python bridge with directory source...")
    
    # Start the Python bridge
    bridge_process = subprocess.Popen(
        [sys.executable, 'src/lib/memvid-bridge.py'],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        cwd='.'
    )
    
    try:
        # Wait for ready signal
        print("Waiting for ready signal...")
        ready_line = bridge_process.stdout.readline()
        ready_signal = json.loads(ready_line.strip())
        print(f"Ready signal: {ready_signal}")
        
        if ready_signal.get('status') != 'ready':
            print("Bridge not ready!")
            return
        
        # Send memory bank creation request
        request = {
            "id": "test-1",
            "method": "encode",
            "params": {
                "sources": [
                    {
                        "type": "directory",
                        "path": "./memory-bank",
                        "options": {
                            "file_types": ["md"]
                        }
                    }
                ],
                "output_path": "./memory-banks/test-fixed-bridge.mp4"
            }
        }
        
        print(f"Sending request: {json.dumps(request, indent=2)}")
        
        # Send request
        bridge_process.stdin.write(json.dumps(request) + '\n')
        bridge_process.stdin.flush()
        
        # Read response
        print("Waiting for response...")
        response_line = bridge_process.stdout.readline()
        response = json.loads(response_line.strip())
        
        print(f"Response: {json.dumps(response, indent=2)}")
        
        # Read any additional output
        time.sleep(1)
        bridge_process.terminate()
        
        stderr_output = bridge_process.stderr.read()
        if stderr_output:
            print(f"Bridge stderr:\n{stderr_output}")
        
        return response.get('result', {}).get('success', False)
        
    except Exception as e:
        print(f"Test failed: {e}")
        bridge_process.terminate()
        return False

if __name__ == "__main__":
    success = test_fixed_bridge()
    print(f"Test {'PASSED' if success else 'FAILED'}") 
import os
import json
import time
import urllib.request
import websocket
import shutil
import glob
from typing import Dict, Any, List, Optional, Tuple

class ComfyUI:
    def __init__(self, server_address: str = "127.0.0.1:8188"):
        self.server_address = server_address
        self.output_dir = "/workspace/ComfyUI/output/"
        self.input_dir = "/workspace/ComfyUI/input/"
    
    def load_workflow(self, filename: str) -> Dict[str, Any]:
        """Load workflow from JSON file"""
        with open(filename, 'r', encoding='utf-8-sig') as file:
            return json.load(file)
    
    def queue_prompt(self, prompt_data: Dict[str, Any]) -> Dict[str, Any]:
        """Queue a prompt to ComfyUI server"""
        data = json.dumps({"prompt": prompt_data}).encode('utf-8')
        req = urllib.request.Request(f"http://{self.server_address}/prompt", data=data, headers={'Content-Type': 'application/json'})
        
        try:
            with urllib.request.urlopen(req) as response:
                response_data = json.loads(response.read())
                return response_data
        except urllib.error.HTTPError as e:
            error_content = e.read().decode("utf-8")
            raise Exception(f"HTTP Error {e.code}: {error_content}")
        except Exception as e:
            raise Exception(f"Failed to queue prompt: {str(e)}")
    
    def get_state(self, prompt_id: str, timeout: int = 1200) -> bool:
        """Wait for prompt execution to complete"""
        ws = websocket.WebSocket()
        try:
            ws.connect(f"ws://{self.server_address}/ws")
            start_time = time.time()
            
            while time.time() - start_time < timeout:
                try:
                    ws.settimeout(timeout)
                    message = ws.recv()
                    
                    if isinstance(message, str):
                        data = json.loads(message)
                        if data.get('type', "") == 'status':
                            if data.get('data', {}).get('status', {}).get('exec_info', {}).get('queue_remaining', 0) == 0:
                                return True
                    
                    if not self.is_server_running():
                        return False
                        
                except websocket.WebSocketTimeoutException:
                    break
                    
            return False
                    
        finally:
            try:
                ws.close()
            except Exception:
                pass
                
        return False
    
    def is_server_running(self) -> bool:
        """Check if ComfyUI server is running"""
        try:
            with urllib.request.urlopen(f"http://{self.server_address}/system_stats", timeout=5) as response:
                return response.getcode() == 200
        except:
            return False
    
    def copy_file_to_input(self, source_path: str, filename: str) -> str:
        """Copy file to ComfyUI input directory"""
        target_path = os.path.join(self.input_dir, filename)
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        shutil.copy2(source_path, target_path)
        return filename  # Return just the filename for workflow use
    
    def wait_for_output_files(self, pattern: str, extensions: List[str], timeout: int = 300) -> List[str]:
        """Wait for output files matching pattern and extensions"""
        start_time = time.time()
        existing_files = self.get_existing_files(pattern, extensions)
        
        while time.time() - start_time < timeout:
            current_files = self.get_existing_files(pattern, extensions)
            new_files = current_files - existing_files
            
            if new_files:
                return list(new_files)
            
            time.sleep(2)
        
        return []
    
    def get_existing_files(self, pattern: str, extensions: List[str]) -> set:
        """Get existing files matching pattern and extensions"""
        if not os.path.exists(self.output_dir):
            return set()
        
        all_files = os.listdir(self.output_dir)
        matching_files = set()
        
        for file in all_files:
            if any(file.lower().endswith(ext.lower()) for ext in extensions):
                if not pattern or pattern.lower() in file.lower():
                    matching_files.add(file)
        
        return matching_files
    
    def move_output_files(self, files: List[str], output_paths: List[str]) -> bool:
        """Move output files to target paths"""
        try:
            for i, file in enumerate(files):
                if i >= len(output_paths):
                    break
                
                source_path = os.path.join(self.output_dir, file)
                target_path = output_paths[i]
                
                os.makedirs(os.path.dirname(target_path), exist_ok=True)
                shutil.move(source_path, target_path)
            
            return True
        except Exception:
            return False
    
    def process_workflow(self, workflow: Dict[str, Any], pattern: str, output_paths: List[str], 
                        extensions: List[str] = ["mp4"], timeout: int = 300) -> bool:
        """
        Process a workflow: queue prompt, wait for completion, and move files
        
        Args:
            workflow: The workflow configuration
            pattern: Pattern to match output files
            output_paths: List of target paths for output files
            extensions: List of file extensions to look for
            timeout: Timeout in seconds
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Queue the prompt
            response = self.queue_prompt(workflow)
            prompt_id = response.get("prompt_id")
            
            if not prompt_id:
                return False
            
            # Wait for completion
            if not self.get_state(prompt_id, timeout):
                return False
            
            # Wait for output files
            output_files = self.wait_for_output_files(pattern, extensions, timeout)
            
            if not output_files:
                return False
            
            # Move files to target paths
            return self.move_output_files(output_files, output_paths)
            
        except Exception:
            return False

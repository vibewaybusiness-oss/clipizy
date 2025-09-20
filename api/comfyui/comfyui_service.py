import asyncio
import aiohttp
import json
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from datetime import datetime

@dataclass
class WorkflowResult:
    success: bool
    prompt_id: Optional[str] = None
    status: str = "pending"
    error: Optional[str] = None
    images: List[Dict[str, Any]] = None

class ComfyUIService:
    def __init__(self, pod_ip: str, port: int = 8188, pod_id: str = None):
        self.pod_ip = pod_ip
        self.port = port
        self.pod_id = pod_id
        # Use RunPod proxy URL if pod_id is available, otherwise use direct IP
        if pod_id:
            self.base_url = f"https://{pod_id}-{port}.proxy.runpod.net"
        else:
            self.base_url = f"http://{pod_ip}:{port}"
        self.session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def test_connection(self) -> bool:
        """Test connection to ComfyUI server"""
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()
            
            # Test the system_stats endpoint which is the most reliable indicator
            print(f"🔍 Testing ComfyUI connection to {self.base_url}/system_stats")
            async with self.session.get(f"{self.base_url}/system_stats", timeout=10) as response:
                print(f"📊 ComfyUI response: {response.status}")
                if response.status == 200:
                    # Verify it's actually ComfyUI by checking the response content
                    try:
                        data = await response.json()
                        if 'system' in data and 'comfyui_version' in data.get('system', {}):
                            print(f"✅ ComfyUI is running and accessible at {self.base_url}")
                            print(f"📋 ComfyUI version: {data['system'].get('comfyui_version', 'unknown')}")
                            return True
                        else:
                            print(f"❌ Response doesn't look like ComfyUI system stats")
                            return False
                    except Exception as e:
                        print(f"❌ Failed to parse ComfyUI response: {e}")
                        return False
                else:
                    print(f"❌ ComfyUI not responding properly (status: {response.status})")
                    return False
        except asyncio.TimeoutError:
            print(f"⏰ Timeout connecting to ComfyUI")
            return False
        except Exception as e:
            print(f"❌ ComfyUI connection failed: {e}")
            return False

    async def execute_workflow_data(self, workflow_data: Dict[str, Any], pattern: str, download_directory: str) -> Dict[str, Any]:
        """Execute workflow data on ComfyUI server"""
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()

            # Queue the prompt
            payload = {"prompt": workflow_data}
            async with self.session.post(
                f"{self.base_url}/prompt",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    prompt_id = result.get("prompt_id")
                    return {
                        "success": True,
                        "prompt_id": prompt_id,
                        "status": "queued"
                    }
                else:
                    error_text = await response.text()
                    return {
                        "success": False,
                        "error": f"HTTP {response.status}: {error_text}"
                    }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def get_history(self, prompt_id: str) -> Dict[str, Any]:
        """Get execution history for a prompt"""
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()

            async with self.session.get(f"{self.base_url}/history/{prompt_id}", timeout=10) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return {}
        except Exception:
            return {}

    async def get_system_stats(self) -> Dict[str, Any]:
        """Get ComfyUI system statistics"""
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()

            async with self.session.get(f"{self.base_url}/system_stats", timeout=10) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return {}
        except Exception:
            return {}

    async def health_check(self) -> Dict[str, Any]:
        """Comprehensive health check for ComfyUI server"""
        health_status = {
            "is_running": False,
            "endpoints_accessible": [],
            "error": None,
            "base_url": self.base_url,
            "comfyui_version": None,
            "system_info": None
        }
        
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()

            # Test the system_stats endpoint first (most reliable)
            try:
                async with self.session.get(f"{self.base_url}/system_stats", timeout=5) as response:
                    if response.status == 200:
                        data = await response.json()
                        if 'system' in data and 'comfyui_version' in data.get('system', {}):
                            health_status["endpoints_accessible"].append("/system_stats")
                            health_status["is_running"] = True
                            health_status["comfyui_version"] = data['system'].get('comfyui_version')
                            health_status["system_info"] = data.get('system', {})
                        else:
                            health_status["error"] = "Invalid ComfyUI response format"
                    else:
                        health_status["error"] = f"system_stats returned status {response.status}"
            except Exception as e:
                health_status["error"] = f"Failed to connect to system_stats: {e}"
                
            # Test other endpoints only if system_stats worked
            if health_status["is_running"]:
                other_endpoints = ["/history", "/prompt"]
                for endpoint in other_endpoints:
                    try:
                        async with self.session.get(f"{self.base_url}{endpoint}", timeout=3) as response:
                            if response.status == 200:
                                health_status["endpoints_accessible"].append(endpoint)
                    except Exception:
                        # Don't fail the health check for other endpoints
                        pass
                    
        except Exception as e:
            health_status["error"] = str(e)
            
        return health_status

    async def download_image(self, image_url: str, output_path: str) -> bool:
        """Download an image from ComfyUI server"""
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()

            async with self.session.get(image_url, timeout=30) as response:
                if response.status == 200:
                    with open(output_path, 'wb') as f:
                        async for chunk in response.content.iter_chunked(8192):
                            f.write(chunk)
                    return True
                else:
                    return False
        except Exception:
            return False

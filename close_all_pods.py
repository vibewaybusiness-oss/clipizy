#!/usr/bin/env python3

import asyncio
import sys
from pathlib import Path

# Add the api directory to the Python path
api_path = Path(__file__).parent / "api"
sys.path.insert(0, str(api_path))

from runpod.client import get_runpod_rest_client

async def close_all_pods(terminate=False, show_all=False):
    """
    Close all active pods.
    
    Args:
        terminate (bool): If True, terminate pods instead of stopping them.
                         Termination is more permanent than stopping.
        show_all (bool): If True, show all pods, not just active ones.
    """
    print("🔍 Fetching active pods...")
    
    try:
        # Get all pods using REST client
        rest_client = get_runpod_rest_client()
        result = await rest_client.getPods()
        
        if not result.success:
            print(f"❌ Failed to fetch pods: {result.error}")
            return
        
        # Filter for active pods
        all_pods = result.data or []
        active_pods = [p for p in all_pods if p.get("status") == "RUNNING"]
        
        if show_all:
            print(f"📋 Found {len(all_pods)} total pod(s):")
            for pod in all_pods:
                pod_id = pod.get('id', 'Unknown')
                pod_name = pod.get('name', 'Unnamed')
                status = pod.get('status', 'Unknown')
                print(f"   - {pod_name} ({pod_id}) - Status: {status}")
        else:
            if not active_pods:
                print("✅ No active pods found.")
                return
            
            print(f"📋 Found {len(active_pods)} active pod(s):")
            for pod in active_pods:
                pod_id = pod.get('id', 'Unknown')
                pod_name = pod.get('name', 'Unnamed')
                status = pod.get('status', 'Unknown')
                print(f"   - {pod_name} ({pod_id}) - Status: {status}")
        
        if not show_all and not active_pods:
            return
            
        pods_to_close = all_pods if show_all else active_pods
        
        if not pods_to_close:
            print("✅ No pods to process.")
            return
            
        print(f"\n{'🚫 Terminating' if terminate else '⏸️ Stopping'} all pods...")
        
        # Close each pod
        success_count = 0
        error_count = 0
        
        for pod in pods_to_close:
            pod_id = pod.get('id')
            pod_name = pod.get('name', 'Unnamed')
            
            if not pod_id:
                print(f"❌ Skipping pod {pod_name}: No ID found")
                error_count += 1
                continue
            
            try:
                if terminate:
                    result = await rest_client.terminatePod(pod_id)
                    action = "terminated"
                else:
                    result = await rest_client.stopPod(pod_id)
                    action = "stopped"
                
                if result.success:
                    print(f"✅ {action.capitalize()} pod: {pod_name} ({pod_id})")
                    success_count += 1
                else:
                    error_msg = result.error or 'Unknown error'
                    print(f"❌ Failed to {action} pod {pod_name} ({pod_id}): {error_msg}")
                    error_count += 1
                    
            except Exception as e:
                print(f"❌ Exception while {action}ing pod {pod_name} ({pod_id}): {str(e)}")
                error_count += 1
        
        print(f"\n📊 Summary:")
        print(f"   ✅ Successfully {action}ed: {success_count}")
        print(f"   ❌ Errors: {error_count}")
        
    except Exception as e:
        print(f"❌ Failed to fetch active pods: {str(e)}")
        sys.exit(1)

async def main():
    """Main function with command line argument parsing."""
    terminate = False
    show_all = False
    
    if len(sys.argv) > 1:
        for arg in sys.argv[1:]:
            if arg in ['--terminate', '-t']:
                terminate = True
            elif arg in ['--all', '-a']:
                show_all = True
            elif arg in ['--help', '-h']:
                print("Usage: python close_all_pods.py [--terminate|-t] [--all|-a] [--help|-h]")
                print("")
                print("Options:")
                print("  --terminate, -t    Terminate pods instead of stopping them")
                print("  --all, -a          Show and close all pods, not just active ones")
                print("  --help, -h         Show this help message")
                print("")
                print("Note: Termination is more permanent than stopping.")
                print("Stopped pods can be restarted, terminated pods cannot.")
                return
    
    await close_all_pods(terminate, show_all)

if __name__ == "__main__":
    asyncio.run(main())

import os
import random
from pathlib import Path
import json
import time
from PIL import Image
import shutil
from ..comfyui import ComfyUI
from ..config import ComfyUIConfig
from ...logger import Scripts

class Wan:
    def __init__(self):
        self.server_address = ComfyUIConfig.get_server_address()
        self.package_dir = os.path.dirname(__file__)
        self.comfyui = ComfyUI()
        self.scripts = Scripts("Wan")

    def generate_video_from_image_fast(self, 
                                  input_image_path: str,
                                  output_path: str = None,
                                  prompt: str = "",
                                  negative_prompt: str = "色调艳丽, 过曝, 静态, 细节模糊不清, 字幕, 风格, 作品, 画作, 画面, 静止, 整体发灰, 最差质量, 低质量, JPEG压缩残留, 丑陋的, 残缺的, 多余的手指, 画得不好的手部, 画得不好的脸部, 畸形的, 毁容的, 形态畸形的肢体, 手指融合, 静止不动的画面, 杂乱的背景, 三条腿, 背景人很多, 倒着走",
                                  width: int = 720,
                                  height: int = 406,
                                  num_frames: int = 85,
                                  target_fps: int = 24,
                                  seed = None,
                                  camera_motions: list = None,
                                  speed: float = 0.2):
        """
        Generate video from input image using Wan 2.2 image-to-video model
        
        Args:
            input_image_path (str): Path to the input image
            output_path (str): Path where the output video will be saved (optional)
            prompt (str): Positive prompt for video generation
            negative_prompt (str): Negative prompt for video generation
            width (int): Video width (default: 720)
            height (int): Video height (default: 406)
            num_frames (int): Number of frames (default: 85)
            target_fps (int): Frames per second (default: 24)
            seed (str): Seed for generation
            camera_motions (list): List of camera motion types - options: Static, Pan Up, Pan Down, Pan Left, Pan Right, Zoom In, Zoom Out, Roll Clockwise, Roll Anticlockwise, Tilt Down, Tilt Up, Tilt Left, Tilt Right (default: None for fast workflow)
            speed (float): Camera motion speed (default: 0.2)
            
        Returns:
            tuple: (bool, str) - (True if successful, result path or None)
        """
        
        try:
            self.scripts.log(f"Starting Wan 2.2 video generation Using seed: {seed} (type: {type(seed)})")

            # Choose workflow based on camera motions
            if camera_motions is None or len(camera_motions) == 0:
                # Use fast workflow
                self.scripts.log("Using fast workflow (no camera motions)")
                workflow_path = os.path.join(self.package_dir, "Wan2.2 Light Q5.json")
            else:
                # Use camera control workflow
                self.scripts.log(f"Using camera control workflow with motions: {camera_motions}")
                workflow_path = os.path.join(self.package_dir, "wan2.2_itv_camera_control.json")
            
            wan_workflow = self.comfyui.load_workflow(workflow_path)

            image_filename = f"wan_input_{seed}.png"
            comfyui_image_path = os.path.join(ComfyUIConfig.get_input_dir(), image_filename)
            shutil.copy2(input_image_path, comfyui_image_path)
            
            self.scripts.log(f"Prompt: {prompt}")
            self.scripts.log(f"Negative prompt: {negative_prompt}")
            self.scripts.log(f"Width: {width}")
            self.scripts.log(f"Height: {height}")
            self.scripts.log(f"Num frames: {num_frames}")
            self.scripts.log(f"Target FPS: {target_fps}")

            # Set workflow parameters based on chosen workflow
            if camera_motions is None or len(camera_motions) == 0:
                # Fast workflow parameters
                for node in wan_workflow["nodes"]:
                    if node["id"] == 6:
                        node["widgets_values"] = [prompt]
                    elif node["id"] == 7:
                        node["widgets_values"] = [negative_prompt]
                    elif node["id"] == 57:
                        node["widgets_values"] = [
                                                "enable",
                                                int(seed),
                                                "fixed",
                                                4,
                                                1,
                                                "euler",
                                                "simple",
                                                0,
                                                2,
                                                "enable"
                                            ]
                    elif node["id"] == 63:
                        node["widgets_values"]["frame_rate"] = int(target_fps)
                        node["widgets_values"]["filename_prefix"] = f"wan_{seed}"
                    elif node["id"] == 64:
                        node["widgets_values"] = [
                                                int(width),
                                                int(height),
                                                "lanczos",
                                                "crop",
                                                "0, 0, 0",
                                                "center",
                                                16,
                                                "cpu"
                                                ]
                    elif node["id"] == 52:
                        node["widgets_values"] = [image_filename]
                    elif node["id"] == 50:
                        node["widgets_values"] = [
                                                int(width),
                                                int(height),
                                                int(num_frames),
                                                1
                                                ]
            else:
                # Camera control workflow parameters
                # Set default camera motions if none provided
                if camera_motions is None:
                    camera_motions = ["Static"]
                
                # Ensure we have at least 6 motion types (pad with Static if needed)
                while len(camera_motions) < 6:
                    camera_motions.append("Static")
                
                # Take only the first 6 motions
                camera_motions = camera_motions[:6]
                
                self.scripts.log(f"Camera motions: {camera_motions}")

                # Update workflow parameters for camera control
                wan_workflow["127"]["inputs"]["positive_prompt"] = prompt
                wan_workflow["127"]["inputs"]["negative_prompt"] = negative_prompt
                wan_workflow["27"]["inputs"]["seed"] = seed
                wan_workflow["117"]["inputs"]["seed"] = seed
                wan_workflow["30"]["inputs"]["filename_prefix"] = f"wan_camera_{seed}"
                wan_workflow["30"]["inputs"]["frame_rate"] = target_fps
                wan_workflow["58"]["inputs"]["image"] = image_filename
                wan_workflow["97"]["inputs"]["width"] = width
                wan_workflow["97"]["inputs"]["height"] = height
                wan_workflow["63"]["inputs"]["num_frames"] = num_frames
                wan_workflow["139"]["inputs"]["num_frames"] = num_frames
                
                # Update camera control parameters from the list
                wan_workflow["142"]["inputs"]["motion_type1"] = camera_motions[0]
                wan_workflow["142"]["inputs"]["motion_type2"] = camera_motions[1]
                wan_workflow["142"]["inputs"]["motion_type3"] = camera_motions[2]
                wan_workflow["142"]["inputs"]["motion_type4"] = camera_motions[3]
                wan_workflow["142"]["inputs"]["motion_type5"] = camera_motions[4]
                wan_workflow["142"]["inputs"]["motion_type6"] = camera_motions[5]
                wan_workflow["142"]["inputs"]["speed"] = speed
                wan_workflow["142"]["inputs"]["frame_length"] = num_frames
            
            # Require output_path parameter
            if output_path is None:
                self.scripts.error("❌ output_path parameter is required but not specified")
                return False, None
            
            # Set pattern and download directory based on workflow
            if camera_motions is None or len(camera_motions) == 0:
                pattern = f"wan_{seed}"
                download_directory = ComfyUIConfig.get_output_dir()
            else:
                pattern = f"wan_camera_{seed}"
                download_directory = ComfyUIConfig.get_temp_dir()
            
            result = self.comfyui.process_generated_prompt(
                workflow=wan_workflow,
                output_path=output_path,
                download_directory=download_directory,
                pattern=pattern,
                extensions=ComfyUIConfig.VIDEO_EXTENSIONS,
                timeout=ComfyUIConfig.LONG_TIMEOUT
            )
            if result:
                self.scripts.log(f"✅ Wan 2.2 video generation completed successfully")
                return True, result
            else:
                self.scripts.error("❌ Wan 2.2 video generation failed during processing")
                return False, None
                
        except Exception as e:
            self.scripts.error(f"Error in Wan 2.2 video generation: {str(e)}")
            return False, None
        
    def generate_video_from_text_fast(self, 
                                  output_path: str = None,
                                  prompt: str = "",
                                  negative_prompt: str = "色调艳丽, 过曝, 静态, 细节模糊不清, 字幕, 风格, 作品, 画作, 画面, 静止, 整体发灰, 最差质量, 低质量, JPEG压缩残留, 丑陋的, 残缺的, 多余的手指, 画得不好的手部, 画得不好的脸部, 畸形的, 毁容的, 形态畸形的肢体, 手指融合, 静止不动的画面, 杂乱的背景, 三条腿, 背景人很多, 倒着走",
                                  width: int = 832,
                                  height: int = 480,
                                  num_frames: int = 121,
                                  frame_rate: int = 16,
                                  seed = None):
        """
        Generate video from text prompt using Wan 2.2 text-to-video model
        
        Args:
            output_path (str): Path where the output video will be saved (optional)
            prompt (str): Positive prompt for video generation
            negative_prompt (str): Negative prompt for video generation
            width (int): Video width (default: 832)
            height (int): Video height (default: 480)
            num_frames (int): Number of frames (default: 121)
            frame_rate (int): Frames per second (default: 16)
            seed (str): Seed for generation
            
        Returns:
            tuple: (bool, str) - (True if successful, result path or None)
        """
        
        try:
            self.scripts.log(f"Starting Wan 2.2 TTV (Text-to-Video) generation using seed: {seed} (type: {type(seed)})")

            # Load workflow
            workflow_path = os.path.join(self.package_dir, "wan2.2_t2v_lightx.json")
            wan_workflow = self.comfyui.load_workflow(workflow_path)
            
            # Update workflow parameters
            wan_workflow["6"]["inputs"]["text"] = prompt
            wan_workflow["7"]["inputs"]["text"] = negative_prompt
            wan_workflow["67"]["inputs"]["noise_seed"] = int(seed) if seed else random.randint(1, 2**63 - 1)
            wan_workflow["61"]["inputs"]["width"] = width
            wan_workflow["61"]["inputs"]["height"] = height
            wan_workflow["61"]["inputs"]["length"] = num_frames
            wan_workflow["28"]["inputs"]["frame_rate"] = frame_rate
            wan_workflow["28"]["inputs"]["filename_prefix"] = f"wan_ttv_{seed}"
            
            # Require output_path parameter
            if output_path is None:
                self.scripts.error("❌ output_path parameter is required but not specified")
                return False, None
            
            result = self.comfyui.process_generated_prompt(
                workflow=wan_workflow,
                output_path=output_path,
                download_directory=ComfyUIConfig.get_output_dir(),
                pattern=f"wan_ttv_{seed}",
                extensions=ComfyUIConfig.VIDEO_EXTENSIONS,
                timeout=ComfyUIConfig.LONG_TIMEOUT
            )
            
            if result:
                self.scripts.log(f"✅ Wan 2.2 TTV video generation completed successfully")
                return True, result
            else:
                self.scripts.error("❌ Wan 2.2 TTV video generation failed during processing")
                return False, None
                
        except Exception as e:
            self.scripts.error(f"Error in Wan 2.2 TTV video generation: {str(e)}")
            return False, None
        
    def generate_video_from_image_camera_control(self, 
                                  input_image_path: str,
                                  output_path: str = None,
                                  prompt: str = "",
                                  negative_prompt: str = "色调艳丽, 过曝, 静态, 细节模糊不清, 字幕, 风格, 作品, 画作, 画面, 静止, 整体发灰, 最差质量, 低质量, JPEG压缩残留, 丑陋的, 残缺的, 多余的手指, 画得不好的手部, 画得不好的脸部, 畸形的, 毁容的, 形态畸形的肢体, 手指融合, 静止不动的画面, 杂乱的背景, 三条腿, 背景人很多, 倒着走",
                                  width: int = 1280,
                                  height: int = 720,
                                  num_frames: int = 81,
                                  frame_rate: int = 16,
                                  seed = None,
                                  camera_motions: list = None,
                                  speed: float = 0.2):
        """
        Generate video from input image using Wan 2.2 image-to-video model with camera control
        
        Args:
            input_image_path (str): Path to the input image
            output_path (str): Path where the output video will be saved (optional)
            prompt (str): Positive prompt for video generation
            negative_prompt (str): Negative prompt for video generation
            width (int): Video width (default: 1280)
            height (int): Video height (default: 720)
            num_frames (int): Number of frames (default: 81)
            frame_rate (int): Frames per second (default: 16)
            seed (str): Seed for generation
            camera_motions (list): List of camera motion types - options: Static, Pan Up, Pan Down, Pan Left, Pan Right, Zoom In, Zoom Out, Roll Clockwise, Roll Anticlockwise, Tilt Down, Tilt Up, Tilt Left, Tilt Right (default: ["Static"])
            speed (float): Camera motion speed (default: 0.2)
            
        Returns:
            tuple: (bool, str) - (True if successful, result path or None)
        """
        
        try:
            self.scripts.log(f"Starting Wan 2.2 camera control video generation Using seed: {seed} (type: {type(seed)})")

            # Set default camera motions if none provided
            if camera_motions is None:
                camera_motions = ["Static"]
            
            # Ensure we have at least 6 motion types (pad with Static if needed)
            while len(camera_motions) < 6:
                camera_motions.append("Static")
            
            # Take only the first 6 motions
            camera_motions = camera_motions[:6]
            
            self.scripts.log(f"Camera motions: {camera_motions}")

            # Load workflow
            workflow_path = os.path.join(self.package_dir, "wan2.2_itv_camera_control.json")
            wan_workflow = self.comfyui.load_workflow(workflow_path)

            image_filename = f"wan_input_{seed}.png"
            comfyui_image_path = os.path.join(ComfyUIConfig.get_input_dir(), image_filename)
            shutil.copy2(input_image_path, comfyui_image_path)
            # Update workflow parameters
            wan_workflow["127"]["inputs"]["positive_prompt"] = prompt
            wan_workflow["127"]["inputs"]["negative_prompt"] = negative_prompt
            wan_workflow["27"]["inputs"]["seed"] = seed
            wan_workflow["117"]["inputs"]["seed"] = seed
            wan_workflow["30"]["inputs"]["filename_prefix"] = f"wan_camera_{seed}"
            wan_workflow["30"]["inputs"]["frame_rate"] = frame_rate
            wan_workflow["58"]["inputs"]["image"] = image_filename
            wan_workflow["97"]["inputs"]["width"] = width
            wan_workflow["97"]["inputs"]["height"] = height
            wan_workflow["63"]["inputs"]["num_frames"] = num_frames
            wan_workflow["139"]["inputs"]["num_frames"] = num_frames
            
            # Update camera control parameters from the list
            wan_workflow["142"]["inputs"]["motion_type1"] = camera_motions[0]
            wan_workflow["142"]["inputs"]["motion_type2"] = camera_motions[1]
            wan_workflow["142"]["inputs"]["motion_type3"] = camera_motions[2]
            wan_workflow["142"]["inputs"]["motion_type4"] = camera_motions[3]
            wan_workflow["142"]["inputs"]["motion_type5"] = camera_motions[4]
            wan_workflow["142"]["inputs"]["motion_type6"] = camera_motions[5]
            wan_workflow["142"]["inputs"]["speed"] = speed
            wan_workflow["142"]["inputs"]["frame_length"] = num_frames
            
            # Require output_path parameter
            if output_path is None:
                self.scripts.error("❌ output_path parameter is required but not specified")
                return False, None
            
            result = self.comfyui.process_generated_prompt(
                workflow=wan_workflow,
                output_path=output_path,
                download_directory=ComfyUIConfig.get_temp_dir(),
                pattern=f"wan_camera_{seed}",
                extensions=ComfyUIConfig.VIDEO_EXTENSIONS,
                timeout=ComfyUIConfig.LONG_TIMEOUT
            )
            time.sleep(5)
            if result:
                self.scripts.log(f"✅ Wan 2.2 camera control video generation completed successfully")
                return True, result
            else:
                self.scripts.error("❌ Wan 2.2 camera control video generation failed during processing")
                return False, None
                
        except Exception as e:
            self.scripts.error(f"Error in Wan 2.2 camera control video generation: {str(e)}")
            return False, None
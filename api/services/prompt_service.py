import json
import random
from pathlib import Path
from typing import Optional, List, Dict
from api.config.logging import get_prompt_logger

# Initialize logger
logger = get_prompt_logger()

# Path to your prompt JSON
PROMPTS_PATH = Path(__file__).resolve().parent.parent / "config" / "prompts_random.json"
PROMPT_RULES_PATH = Path(__file__).resolve().parent.parent / "config" / "prompt_rules.json"

# Load once at startup
try:
    with open(PROMPTS_PATH, encoding='utf-8') as f:
        PROMPTS = json.load(f)
    logger.info(f"Loaded prompts from {PROMPTS_PATH}")
    logger.info(f"Available prompt types: {list(PROMPTS.keys())}")
except Exception as e:
    logger.error(f"Failed to load prompts from {PROMPTS_PATH}: {str(e)}")
    PROMPTS = {}

# Load prompt rules
try:
    with open(PROMPT_RULES_PATH, encoding='utf-8') as f:
        PROMPT_RULES = json.load(f)
    logger.info(f"Loaded prompt rules from {PROMPT_RULES_PATH}")
except Exception as e:
    logger.error(f"Failed to load prompt rules from {PROMPT_RULES_PATH}: {str(e)}")
    PROMPT_RULES = {}


class PromptService:
    @staticmethod
    def _format_prompt(prompt_type: str, base_prompt: str, style: Optional[str] = None, instrumental: bool = False) -> str:
        """
        Format a prompt using the rules from prompt_rules.json
        
        Args:
            prompt_type: Type of prompt (music_prompts, image_prompts, video_prompts)
            base_prompt: The base prompt text
            style: Optional style modifier
            instrumental: Whether the music should be instrumental (for music_prompts)
        """
        # Get the rules for this prompt type
        rules = PROMPT_RULES.get(prompt_type, {})
        logger.debug(f"Looking for rules with key: {prompt_type}, found: {bool(rules)}")
        if not rules:
            logger.warning(f"No rules found for prompt type: {prompt_type}")
            return base_prompt
        
        # Start with the prefix
        formatted_prompt = rules.get("prompt_prefix", "")
        
        # Add the base prompt
        formatted_prompt += base_prompt
        
        # Add suffix
        formatted_prompt += rules.get("prompt_suffix", "")
        
        # Add style if provided
        if style and rules.get("style_true"):
            formatted_prompt += " " + rules["style_true"] + style
        
        # Add instrumental instruction for music
        if instrumental and rules.get("instrumental_true"):
            formatted_prompt += " " + rules["instrumental_true"]
            logger.info(f"Added instrumental instruction: {rules['instrumental_true']}")
        else:
            logger.info(f"Instrumental not added - instrumental: {instrumental}, has_rule: {bool(rules.get('instrumental_true'))}")
        
        logger.debug(f"Final formatted prompt: {formatted_prompt[:100]}...")
        return formatted_prompt

    @staticmethod
    def get_random_prompt(
        prompt_type: str,  # "music", "image", "video", "looped_video", "image_prompts", "video_prompts"
        categories: Optional[List[str]] = None,
        source: str = "json",  # "json", "gemini", "runpod"
        style: Optional[str] = None,
        instrumental: bool = False,
    ) -> Dict[str, str]:
        """
        Generate a prompt from local JSON, Gemini, or RunPod/local model.

        Args:
            prompt_type: type of content ("music", "image", "video", "looped_video", "image_prompts", "video_prompts")
            categories: optional categories (e.g. ["Ambient", "Synthwave"])
            source: "json", "gemini", or "runpod"
            style: optional style modifier
            instrumental: whether the music should be instrumental (for music_prompts)
        """
        logger.info(f"Generating random prompt - type: {prompt_type}, categories: {categories}, source: {source}, style: {style}, instrumental: {instrumental}")

        try:
            if source == "json":
                result = PromptService._get_from_json(prompt_type, categories, style, instrumental)
                logger.info(f"Generated prompt from JSON: {result.get('category', 'unknown')} - {result.get('prompt', '')[:50]}...")
                return result
            elif source == "gemini":
                result = PromptService._get_from_gemini(prompt_type, style)
                logger.info(f"Generated prompt from Gemini: {result.get('category', 'unknown')}")
                return result
            elif source == "runpod":
                result = PromptService._get_from_runpod(prompt_type, style)
                logger.info(f"Generated prompt from RunPod: {result.get('category', 'unknown')}")
                return result
            else:
                logger.error(f"Invalid prompt source: {source}")
                raise ValueError("Invalid prompt source")
        except Exception as e:
            logger.error(f"Error generating prompt: {str(e)}")
            raise

    @staticmethod
    def _get_from_json(prompt_type: str, categories: Optional[List[str]], style: Optional[str], instrumental: bool = False) -> Dict[str, str]:
        # Handle both old and new prompt type formats
        if prompt_type in ["image_prompts", "video_prompts"]:
            key = prompt_type  # Use directly for new format
        else:
            key = f"{prompt_type}_prompts"  # e.g. "music_prompts"
        
        logger.debug(f"Looking for prompt type key: {key}")
        
        if key not in PROMPTS:
            logger.error(f"Invalid prompt type: {prompt_type}. Available types: {list(PROMPTS.keys())}")
            raise ValueError(f"Invalid prompt type: {prompt_type}")

        # Handle different data structures
        if isinstance(PROMPTS[key], list):
            # For video_prompts which is a list
            prompt = random.choice(PROMPTS[key])
            category = "video"
        else:
            # For music_prompts and image_prompts which are objects with categories
            available_categories = list(PROMPTS[key].keys())
            logger.debug(f"Available categories for {key}: {available_categories}")
            
            # If specific categories are requested, try to find a match
            if categories:
                # Try exact match first
                matching_category = None
                for requested_category in categories:
                    if requested_category in available_categories:
                        matching_category = requested_category
                        break
                
                # If no exact match, try partial matching
                if not matching_category:
                    for requested_category in categories:
                        for available_category in available_categories:
                            if requested_category.lower() in available_category.lower() or available_category.lower() in requested_category.lower():
                                matching_category = available_category
                                break
                        if matching_category:
                            break
                
                if matching_category:
                    category = matching_category
                    logger.debug(f"Matched requested category '{categories}' to '{category}'")
                else:
                    # Fall back to random selection if no match found
                    category = random.choice(available_categories)
                    logger.warning(f"No matching category found for {categories}, using random: {category}")
            else:
                category = random.choice(available_categories)
                logger.debug(f"Selected random category: {category}")
            
            prompt = random.choice(PROMPTS[key][category])
        
        logger.debug(f"Selected prompt: {prompt[:100]}...")

        # Format the prompt using the rules
        logger.debug(f"Formatting prompt - key: {key}, instrumental: {instrumental}, style: {style}")
        formatted_prompt = PromptService._format_prompt(key, prompt, style, instrumental)
        logger.debug(f"Formatted prompt: {formatted_prompt[:100]}...")
        
        result = {"prompt": formatted_prompt, "category": category, "source": "json"}
        logger.info(f"Generated JSON prompt - Category: {category}, Length: {len(formatted_prompt)} chars")
        return result

    @staticmethod
    def _get_from_gemini(prompt_type: str, style: Optional[str]) -> Dict[str, str]:
        # Stub for Gemini integration (Google Generative AI)
        # Replace with actual Gemini client
        base_prompt = f"Generate a creative {prompt_type} prompt"
        if style:
            base_prompt += f" in style: {style}"

        # Example placeholder result
        return {"prompt": f"[Gemini] {base_prompt}", "category": "AI", "source": "gemini"}

    @staticmethod
    def _get_from_runpod(prompt_type: str, style: Optional[str]) -> Dict[str, str]:
        # Stub for RunPod/local model integration
        base_prompt = f"Generate a {prompt_type} prompt using local model"
        if style:
            base_prompt += f" with style: {style}"

        # Example placeholder result
        return {"prompt": f"[RunPod] {base_prompt}", "category": "AI", "source": "runpod"}

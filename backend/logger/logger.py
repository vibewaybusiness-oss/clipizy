"""
Simple logger for ComfyUI workflows
"""

class Scripts:
    """Simple logger class for ComfyUI workflows"""
    
    def __init__(self, name="ComfyUI"):
        self.name = name
    
    def log(self, message):
        """Log info message"""
        print(f"[{self.name}] {message}")
    
    def error(self, message):
        """Log error message"""
        print(f"[{self.name}] ERROR: {message}")
    
    def warning(self, message):
        """Log warning message"""
        print(f"[{self.name}] WARNING: {message}")
    
    def info(self, message):
        """Log info message"""
        self.log(message)

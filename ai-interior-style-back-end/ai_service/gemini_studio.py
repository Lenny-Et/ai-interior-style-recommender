import google.generativeai as genai
import os
from PIL import Image

def get_gemini_vision_model():
    # Make sure GEMINI_API_KEY is available in environment
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        genai.configure(api_key=api_key)
    # Using Gemini Pro Vision for image + text understanding
    return genai.GenerativeModel('gemini-pro-vision')

def orchestrate_design_studio(image_path: str, user_prompt: str, creativity_slider: float):
    """
    Accepts text + image from Node.js
    Applies 'Studio' parameters (creativity sliders)
    Returns structured JSON or modified design descriptions.
    """
    try:
        model = get_gemini_vision_model()
        img = Image.open(image_path)
        
        # Creativity slider mapping to temperature
        temperature = max(0.0, min(1.0, creativity_slider))
        
        prompt = f"""
        Act as an expert interior designer. Analyze the provided room image and the homeowner's request:
        "{user_prompt}"
        
        Provide a structured JSON output with:
        - "suggested_style": The name of the interior design style.
        - "color_palette": A list of hex codes.
        - "furniture_recommendations": A list of items to add or modify.
        - "layout_changes": Textual description of what to move.
        
        Ensure your response is highly creative and pushes boundaries if the creativity score is high.
        """
        
        response = model.generate_content(
            [prompt, img],
            generation_config=genai.types.GenerationConfig(
                temperature=temperature,
            )
        )
        
        return {
            "status": "success",
            "result": response.text
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

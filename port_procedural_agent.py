#!/usr/bin/env python3
"""
Port Procedural-Context Agent to Qwen Code CLI

This script ports the procedural art benchmark agent to Qwen (via Ollama) for fine-tuning.
It reads the current procedural_art_benchmark.py, sends it to Qwen for fine-tuning,
and saves the improved code to a new file.
"""

import requests
import sys
from pathlib import Path

def main():
    # Path to the procedural art benchmark file
    benchmark_file = Path(__file__).parent / "tools" / "procedural_art_benchmark.py"
    
    if not benchmark_file.exists():
        print(f"Error: {benchmark_file} not found")
        sys.exit(1)
    
    # Read the current code
    with open(benchmark_file, 'r', encoding='utf-8') as f:
        code = f.read()
    
    # Create the prompt
    prompt = f"""Fine-tune this procedural art benchmark code for better quality, efficiency, and features.
Make it more robust, add better error handling, improve the AI reference generation, and enhance the quality assessment.
Keep it Python-compatible and maintain the same API.

Current code:
{code}

Provide the improved code:"""
    
    print("Sending code to Qwen (Ollama API) for fine-tuning...")
    
    # Use Ollama API
    try:
        response = requests.post(
            'http://localhost:11434/api/generate',
            json={
                'model': 'qwen2.5-coder',
                'prompt': prompt,
                'stream': False
            },
            timeout=300
        )
        response.raise_for_status()
        result = response.json()
        improved_code = result['response'].strip()
        
        # Save to new file
        output_file = benchmark_file.with_name("procedural_art_benchmark_finetuned.py")
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(improved_code)
        
        print(f"Fine-tuned code saved to: {output_file}")
        print("Review the changes and replace the original file if satisfactory.")
        
    except requests.exceptions.RequestException as e:
        print(f"Error calling Ollama API: {e}")
        print("Make sure Ollama is running and qwen2.5-coder model is pulled.")
        sys.exit(1)

if __name__ == "__main__":
    main()
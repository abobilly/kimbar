#!/usr/bin/env python3
"""
Generate AI Reference Images for Benchmarking

This script generates AI reference images using HuggingFace models for the specified assets:
- fountain, gavel, scales, briefcase, law_book, witness_stand

These will be used to compare against procedural art in the benchmark system.
"""

import asyncio
import os
from pathlib import Path
from PIL import Image

# Add parent directory to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from tools.procedural_art_benchmark import generate_ai_reference

# Directory for AI reference images
AI_REF_DIR = Path(__file__).parent.parent / "generated" / "benchmarks" / "ai_refs"
AI_REF_DIR.mkdir(parents=True, exist_ok=True)

# Assets to generate AI references for
ASSETS_TO_GENERATE = [
    ("fountain", (32, 32)),
    ("gavel", (32, 32)),
    ("scales", (32, 32)),
    ("briefcase", (32, 32)),
    ("law_book", (32, 32)),
    ("witness_stand", (64, 64)),
]

async def generate_all_ai_references():
    """Generate AI reference images for all specified assets."""
    print(f"Generating AI reference images in: {AI_REF_DIR}")
    
    results = []
    
    for asset_name, size in ASSETS_TO_GENERATE:
        print(f"\nGenerating AI reference for: {asset_name} ({size[0]}x{size[1]})")
        
        try:
            # Generate AI reference
            ai_img = await generate_ai_reference(asset_name, size)
            
            if ai_img is not None:
                # Save the AI reference image
                output_path = AI_REF_DIR / f"{asset_name}.png"
                ai_img.save(output_path)
                print(f"  ✓ Saved: {output_path}")
                
                # Also save a version with _ai suffix for comparison
                alt_path = AI_REF_DIR / f"{asset_name}_ai_ref.png"
                ai_img.save(alt_path)
                print(f"  ✓ Saved alternate: {alt_path}")
                
                results.append((asset_name, True, str(output_path)))
            else:
                print(f"  - Failed to generate for {asset_name}")
                results.append((asset_name, False, None))

        except Exception as e:
            print(f"  - Error generating for {asset_name}: {e}")
            results.append((asset_name, False, None))

    # Summary
    print(f"\nGeneration Summary:")
    successful = sum(1 for _, success, _ in results if success)
    print(f"  Successful: {successful}/{len(ASSETS_TO_GENERATE)}")

    for asset_name, success, path in results:
        status = "+" if success else "-"
        print(f"  {status} {asset_name}: {'Success' if success else 'Failed'}")
        if path:
            print(f"      -> {path}")

    return results

if __name__ == "__main__":
    print("Starting AI reference image generation...")
    print("Target models: mrfakename/Z-Image-Turbo, black-forest-labs/FLUX.1-dev, stabilityai/stable-diffusion-xl-base-1.0")
    
    # Run async function
    asyncio.run(generate_all_ai_references())
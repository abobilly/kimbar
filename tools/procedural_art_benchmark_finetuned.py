"""
Procedural Art Benchmark System

This module provides evaluation and iterative improvement for procedural pixel art
generation using:
1. AI-generated reference images (via HuggingFace/Z-Image-Turbo)
2. Multi-dimensional quality assessment (aesthetic, technical, style consistency)
3. Comparison with state-of-the-art models
4. Iterative feedback loop for improvement

Usage:
    python tools/procedural_art_benchmark.py --benchmark fountain
    python tools/procedural_art_benchmark.py --compare all
    python tools/procedural_art_benchmark.py --iterate gavel --rounds 5
"""

import os
import sys
import json
import hashlib
import argparse
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any, Union
from dataclasses import dataclass, asdict
from datetime import datetime
import asyncio
import aiohttp

# Add parent dir for make_icons import
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from PIL import Image, ImageDraw, ImageFilter
    import numpy as np
except ImportError:
    print("PIL and numpy required: pip install pillow numpy")
    sys.exit(1)

# Optional: HuggingFace integration
try:
    from huggingface_hub import AsyncInferenceClient
    HF_AVAILABLE = True
except ImportError:
    HF_AVAILABLE = False
    print("Warning: huggingface_hub not available. Install with: pip install huggingface_hub")


# === CONFIGURATION ===
BENCHMARK_DIR = Path(__file__).parent.parent / "generated" / "benchmarks"
BENCHMARK_DIR.mkdir(parents=True, exist_ok=True)

# Quality dimensions based on ICE-Bench paper
QUALITY_DIMENSIONS = [
    "aesthetic_quality",      # Visual appeal, color harmony
    "technical_quality",      # Sharp edges, no artifacts, proper transparency
    "style_consistency",      # LPC/SNES style adherence
    "palette_efficiency",     # Color count, palette coherence
    "readability",            # Clear silhouette at small sizes
    "shading_quality",        # Proper 3-tone shading, light direction
]

# LPC Style Criteria (for procedural art)
LPC_STYLE_CRITERIA = {
    "perspective": "3/4 top-down view",
    "outline": "1px dark outline on all shapes",
    "shading": "2-3 step gradient (highlight → base → shadow)",
    "palette": "Limited (8-20 colors per asset)",
    "edges": "NO anti-aliasing, crisp pixels",
    "dithering": "Minimal, only for texture",
    "light_direction": "Top-left",
}


@dataclass
class BenchmarkResult:
    """Result of benchmarking a single asset."""
    asset_name: str
    dimensions: Dict[str, float]  # 0.0-1.0 scores
    overall_score: float
    issues: List[str]
    suggestions: List[str]
    timestamp: str
    reference_hash: Optional[str] = None

    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class ComparisonResult:
    """Result of comparing procedural vs AI-generated art."""
    asset_name: str
    procedural_score: float
    reference_score: float
    delta: float  # positive = procedural better
    dimension_deltas: Dict[str, float]
    winner: str

    def to_dict(self) -> Dict:
        return asdict(self)


# === IMAGE ANALYSIS FUNCTIONS ===

def count_colors(img: Image.Image) -> int:
    """Count unique colors in an image."""
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    colors = set()
    for pixel in img.getdata():
        if pixel[3] > 0:  # Non-transparent
            colors.add(pixel[:3])
    return len(colors)


def check_outline_presence(img: Image.Image) -> float:
    """Score presence of dark outlines (0.0-1.0)."""
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    arr = np.array(img)
    # Find edge pixels (adjacent to transparent)
    alpha = arr[:, :, 3]
    edges = np.zeros_like(alpha, dtype=bool)

    # Simple edge detection
    for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        shifted = np.roll(np.roll(alpha, dy, axis=0), dx, axis=1)
        edges |= (alpha > 0) & (shifted == 0)

    if not np.any(edges):
        return 0.5  # No edges to check

    # Check if edge pixels are dark
    edge_pixels = arr[edges]
    if len(edge_pixels) == 0:
        return 0.5

    # Calculate luminance of edge pixels
    luminance = 0.299 * edge_pixels[:, 0] + 0.587 * edge_pixels[:, 1] + 0.114 * edge_pixels[:, 2]
    dark_ratio = np.mean(luminance < 80)  # Dark = luminance < 80

    return min(1.0, dark_ratio * 1.5)  # Boost score slightly


def check_shading_steps(img: Image.Image) -> Tuple[float, int]:
    """
    Analyze shading quality and count shading steps.
    Returns (score, step_count).
    """
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    arr = np.array(img)
    alpha = arr[:, :, 3]

    # Get non-transparent pixels
    visible = alpha > 0
    if not np.any(visible):
        return 0.0, 0

    # Group by approximate hue to find shading steps per color family
    rgb = arr[visible][:, :3]

    # Simple luminance-based step detection
    luminance = 0.299 * rgb[:, 0] + 0.587 * rgb[:, 1] + 0.114 * rgb[:, 2]

    # Count unique luminance levels (with tolerance)
    unique_lum = np.unique(np.round(luminance / 20) * 20)
    step_count = len(unique_lum)

    # Ideal: 2-4 shading steps per color family
    if 2 <= step_count <= 5:
        score = 1.0
    elif step_count == 1:
        score = 0.3  # Flat shading
    elif step_count > 10:
        score = 0.6  # Too many steps (might be anti-aliased)
    else:
        score = 0.8

    return score, step_count


def check_anti_aliasing(img: Image.Image) -> float:
    """
    Check for anti-aliasing (undesirable in pixel art).
    Returns 1.0 for NO anti-aliasing (good), 0.0 for heavy AA.
    """
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    arr = np.array(img)
    alpha = arr[:, :, 3]

    # Count semi-transparent pixels (sign of anti-aliasing)
    semi_transparent = np.sum((alpha > 0) & (alpha < 255))
    total_visible = np.sum(alpha > 0)

    if total_visible == 0:
        return 1.0

    aa_ratio = semi_transparent / total_visible

    # Small amount might be intentional transparency
    if aa_ratio < 0.05:
        return 1.0
    elif aa_ratio < 0.15:
        return 0.7
    else:
        return max(0.0, 1.0 - aa_ratio * 2)


def calculate_color_harmony(img: Image.Image) -> float:
    """
    Score color harmony based on palette analysis.
    """
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    colors = []
    for pixel in img.getdata():
        if pixel[3] > 0:
            colors.append(pixel[:3])

    if len(colors) < 2:
        return 0.5

    # Convert to HSV-like for analysis
    unique_colors = list(set(colors))
    if len(unique_colors) < 2:
        return 0.7  # Monochromatic is okay

    # Simple harmony: check if colors are from limited palette families
    # (This is a simplified heuristic)
    color_count = len(unique_colors)

    if color_count <= 8:
        return 1.0  # Excellent - very limited
    elif color_count <= 16:
        return 0.9  # Good
    elif color_count <= 24:
        return 0.7  # Acceptable
    else:
        return max(0.3, 1.0 - (color_count - 24) * 0.02)


def analyze_readability(img: Image.Image) -> float:
    """
    Check if asset is readable at small sizes (clear silhouette).
    """
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    # Downsample to test readability
    small = img.resize((max(8, img.width // 4), max(8, img.height // 4)), Image.Resampling.NEAREST)

    arr = np.array(small)
    alpha = arr[:, :, 3]

    # Check if there's a clear shape
    visible_ratio = np.sum(alpha > 0) / alpha.size

    # Good readability: 15-85% fill (not too sparse, not solid block)
    if 0.15 <= visible_ratio <= 0.85:
        return 1.0
    elif 0.05 <= visible_ratio <= 0.95:
        return 0.7
    else:
        return 0.4


# === BENCHMARK FUNCTIONS ===

def benchmark_image(img: Image.Image, asset_name: str) -> BenchmarkResult:
    """
    Run full benchmark on a single image.
    """
    issues = []
    suggestions = []

    # Dimension scores
    dimensions = {}

    # 1. Aesthetic Quality (color harmony + overall appeal)
    harmony = calculate_color_harmony(img)
    dimensions["aesthetic_quality"] = harmony
    if harmony < 0.7:
        issues.append("Color palette may be too large or lack harmony")
        suggestions.append("Reduce to 8-16 colors and use consistent shading ramps")

    # 2. Technical Quality (no AA, proper transparency)
    aa_score = check_anti_aliasing(img)
    dimensions["technical_quality"] = aa_score
    if aa_score < 0.8:
        issues.append("Detected anti-aliasing or semi-transparent pixels")
        suggestions.append("Use only fully opaque or fully transparent pixels")

    # 3. Style Consistency (LPC adherence)
    outline_score = check_outline_presence(img)
    shading_score, step_count = check_shading_steps(img)
    dimensions["style_consistency"] = (outline_score + shading_score) / 2
    if outline_score < 0.6:
        issues.append("Missing or weak dark outlines")
        suggestions.append("Add 1px dark outline around all shapes")
    if shading_score < 0.7:
        issues.append(f"Shading has {step_count} steps (ideal: 2-4)")
        suggestions.append("Use 2-3 tone shading: highlight, base, shadow")

    # 4. Palette Efficiency
    color_count = count_colors(img)
    if color_count <= 8:
        dimensions["palette_efficiency"] = 1.0
    elif color_count <= 16:
        dimensions["palette_efficiency"] = 0.9
    elif color_count <= 24:
        dimensions["palette_efficiency"] = 0.7
    else:
        dimensions["palette_efficiency"] = max(0.3, 1.0 - (color_count - 24) * 0.03)
        issues.append(f"Palette has {color_count} colors (target: 8-20)")
        suggestions.append("Reduce colors by using consistent shading ramps")

    # 5. Readability
    dimensions["readability"] = analyze_readability(img)
    if dimensions["readability"] < 0.7:
        issues.append("Asset may not be readable at small sizes")
        suggestions.append("Strengthen silhouette and key features")

    # 6. Shading Quality
    dimensions["shading_quality"] = shading_score

    # Overall score (weighted average)
    weights = {
        "aesthetic_quality": 0.15,
        "technical_quality": 0.20,
        "style_consistency": 0.25,
        "palette_efficiency": 0.15,
        "readability": 0.15,
        "shading_quality": 0.10,
    }
    overall = sum(dimensions[k] * weights[k] for k in dimensions)

    return BenchmarkResult(
        asset_name=asset_name,
        dimensions=dimensions,
        overall_score=overall,
        issues=issues,
        suggestions=suggestions,
        timestamp=datetime.now().isoformat(),
    )


def generate_reference_prompt(asset_name: str, size: Tuple[int, int]) -> str:
    """
    Generate a prompt for AI image generation that matches LPC style.
    """
    base_prompts = {
        "fountain": "pixel art stone fountain with water, 16-bit SNES RPG style, top-down 3/4 view, limited palette, game asset, transparent background",
        "gavel": "pixel art wooden judge gavel, 16-bit SNES RPG style, top-down 3/4 view, limited palette, game asset, transparent background",
        "scales": "pixel art golden scales of justice, 16-bit SNES RPG style, top-down 3/4 view, limited palette, game asset, transparent background",
        "briefcase": "pixel art leather briefcase, 16-bit SNES RPG style, top-down 3/4 view, limited palette, game asset, transparent background",
        "law_book": "pixel art red law book with gold text, 16-bit SNES RPG style, top-down 3/4 view, limited palette, game asset, transparent background",
        "witness_stand": "pixel art wooden witness stand podium, 16-bit SNES RPG style, top-down 3/4 view, limited palette, game asset, transparent background",
    }

    # Generic prompt if not in dictionary
    prompt = base_prompts.get(
        asset_name,
        f"pixel art {asset_name.replace('_', ' ')}, 16-bit SNES RPG style, top-down 3/4 view, limited palette, game asset, transparent background"
    )

    return prompt


async def generate_ai_reference(asset_name: str, size: Tuple[int, int]) -> Optional[Image.Image]:
    """
    Generate an AI reference image using HuggingFace models with improved error handling.
    """
    if not HF_AVAILABLE:
        print("HuggingFace not available, skipping AI reference generation")
        return None

    try:
        # Use the mcp_hf-mcp-server_gr1_z_image_turbo_generate function
        # This would be called via MCP in practice
        prompt = generate_reference_prompt(asset_name, size)
        print(f"AI reference prompt: {prompt}")

        # Initialize HuggingFace client
        client = AsyncInferenceClient()

        # Try different models in order of preference with enhanced configuration
        models_to_try = [
            {
                "name": "mrfakename/Z-Image-Turbo",  # Fast pixel art model
                "params": {"num_inference_steps": 1}
            },
            {
                "name": "black-forest-labs/FLUX.1-dev",  # High quality
                "params": {"num_inference_steps": 20}
            },
            {
                "name": "stabilityai/stable-diffusion-xl-base-1.0",  # Standard fallback
                "params": {"num_inference_steps": 20}
            }
        ]

        for model_config in models_to_try:
            try:
                model_name = model_config["name"]
                params = model_config["params"]
                
                print(f"Trying model: {model_name}")
                
                # Generate image with the model
                result = await client.text_to_image(
                    prompt=prompt,
                    model=model_name,
                    height=size[1],
                    width=size[0],
                    **params
                )

                # Handle different return types from the API
                if hasattr(result, 'read'):  # It's a file-like object
                    from io import BytesIO
                    img = Image.open(BytesIO(result.read()))
                elif isinstance(result, bytes):  # It's bytes
                    from io import BytesIO
                    img = Image.open(BytesIO(result))
                elif isinstance(result, Image.Image):  # It's already a PIL Image
                    img = result
                else:
                    # Assume it's a path or URL
                    img = Image.open(result)

                # Resize to exact size if needed
                if img.size != size:
                    img = img.resize(size, Image.Resampling.NEAREST)

                print(f"Successfully generated AI reference with {model_name}")
                return img

            except Exception as model_error:
                print(f"Failed with {model_config['name']}: {model_error}")
                continue  # Try next model

        print("All models failed to generate image")
        return None

    except Exception as e:
        print(f"Error generating AI reference: {e}")
        return None


def compare_with_reference(
    procedural_img: Image.Image,
    reference_img: Image.Image,
    asset_name: str
) -> ComparisonResult:
    """
    Compare procedural art with AI-generated reference.
    """
    proc_result = benchmark_image(procedural_img, f"{asset_name}_procedural")
    ref_result = benchmark_image(reference_img, f"{asset_name}_reference")

    delta = proc_result.overall_score - ref_result.overall_score

    dimension_deltas = {}
    for dim in QUALITY_DIMENSIONS:
        dimension_deltas[dim] = proc_result.dimensions[dim] - ref_result.dimensions[dim]

    winner = "procedural" if delta >= 0 else "reference"

    return ComparisonResult(
        asset_name=asset_name,
        procedural_score=proc_result.overall_score,
        reference_score=ref_result.overall_score,
        delta=delta,
        dimension_deltas=dimension_deltas,
        winner=winner,
    )


# === ITERATIVE IMPROVEMENT ===

def generate_improvement_suggestions(result: BenchmarkResult) -> List[str]:
    """
    Generate specific code improvement suggestions based on benchmark.
    """
    suggestions = []

    if result.dimensions["style_consistency"] < 0.8:
        suggestions.append(
            "Add OUTLINE color as first palette entry and use for all shape outlines:\n"
            "d.polygon(points, fill=PALETTE[2], outline=PALETTE[0])"
        )

    if result.dimensions["shading_quality"] < 0.8:
        suggestions.append(
            "Implement 3-tone shading with highlight line:\n"
            "# Base shape\n"
            "d.rectangle([x, y, x2, y2], fill=PALETTE[2], outline=PALETTE[0])\n"
            "# Top highlight\n"
            "d.line([x+1, y+1, x2-1, y+1], fill=PALETTE[4], width=1)"
        )

    if result.dimensions["palette_efficiency"] < 0.8:
        suggestions.append(
            "Reduce colors by reusing palette entries:\n"
            "# Define palette once with 5 tones\n"
            "WOOD = [(26,15,10), (62,39,35), (139,69,19), (160,82,45), (205,133,63)]"
        )

    if result.dimensions["readability"] < 0.8:
        suggestions.append(
            "Strengthen silhouette by:\n"
            "1. Adding stronger outlines\n"
            "2. Increasing contrast between major elements\n"
            "3. Simplifying small details"
        )

    return suggestions


def save_benchmark_report(results: List[BenchmarkResult], output_path: Path):
    """Save benchmark results to JSON."""
    data = {
        "timestamp": datetime.now().isoformat(),
        "total_assets": len(results),
        "average_score": sum(r.overall_score for r in results) / len(results) if results else 0,
        "results": [r.to_dict() for r in results],
    }

    with open(output_path, "w") as f:
        json.dump(data, f, indent=2)

    print(f"Report saved to: {output_path}")


def print_benchmark_summary(results: List[BenchmarkResult]):
    """Print a summary of benchmark results."""
    print("\n" + "=" * 60)
    print("PROCEDURAL ART BENCHMARK SUMMARY")
    print("=" * 60)

    if not results:
        print("No results to display.")
        return

    avg_score = sum(r.overall_score for r in results) / len(results)
    print(f"\nAverage Score: {avg_score:.2%}")
    print(f"Total Assets: {len(results)}")

    # Dimension averages
    print("\nDimension Averages:")
    for dim in QUALITY_DIMENSIONS:
        avg = sum(r.dimensions[dim] for r in results) / len(results)
        status = "+" if avg >= 0.8 else "o" if avg >= 0.6 else "-"
        print(f"  {status} {dim}: {avg:.2%}")

    # Top issues
    all_issues = []
    for r in results:
        all_issues.extend(r.issues)

    if all_issues:
        print("\nCommon Issues:")
        from collections import Counter
        for issue, count in Counter(all_issues).most_common(5):
            print(f"  - {issue} ({count}x)")

    print("\n" + "=" * 60)


# === MAIN CLI ===

def main():
    parser = argparse.ArgumentParser(description="Procedural Art Benchmark System")
    parser.add_argument("--benchmark", "-b", help="Benchmark a specific asset or 'all'")
    parser.add_argument("--compare", "-c", help="Compare with AI reference")
    parser.add_argument("--iterate", "-i", help="Iterative improvement mode")
    parser.add_argument("--rounds", "-r", type=int, default=3, help="Iteration rounds")
    parser.add_argument("--output", "-o", help="Output report path")
    parser.add_argument("--image", help="Path to image to benchmark")

    args = parser.parse_args()

    if args.image:
        # Benchmark a specific image file
        img = Image.open(args.image)
        name = Path(args.image).stem
        result = benchmark_image(img, name)
        print_benchmark_summary([result])

        if result.issues:
            print("\nDetailed Issues:")
            for issue in result.issues:
                print(f"  - {issue}")

        if result.suggestions:
            print("\nSuggestions:")
            for sug in result.suggestions:
                print(f"  → {sug}")

        # Save report if requested
        if args.output:
            save_benchmark_report([result], Path(args.output))

    elif args.benchmark:
        print(f"Benchmarking: {args.benchmark}")
        print("Run with --image <path> to benchmark a specific image")

    else:
        parser.print_help()
        print("\n\nExample usage:")
        print("  python procedural_art_benchmark.py --image ../generated/icons/fountain.png")
        print("  python procedural_art_benchmark.py --image ../generated/icons/gavel.png --output report.json")


if __name__ == "__main__":
    main()
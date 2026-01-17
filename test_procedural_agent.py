#!/usr/bin/env python3
"""
Procedural Artist Agent - Testing and Iteration Script

This script allows you to test the procedural art generation and benchmark system,
and iteratively improve the code based on benchmark results.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from tools.procedural_art_benchmark_finetuned import (
    benchmark_image,
    generate_improvement_suggestions,
    QUALITY_DIMENSIONS
)
from PIL import Image

def test_single_asset(image_path):
    """Test a single asset and provide detailed feedback."""
    print(f"Testing asset: {image_path}")
    
    # Load image
    img = Image.open(image_path)
    name = Path(image_path).stem
    
    # Run benchmark
    result = benchmark_image(img, name)
    
    print(f"\nAsset: {name}")
    print(f"Overall Score: {result.overall_score:.2%}")
    
    print("\nDimension Scores:")
    for dim in QUALITY_DIMENSIONS:
        score = result.dimensions[dim]
        status = "+" if score >= 0.8 else "o" if score >= 0.6 else "-"
        print(f"  {status} {dim}: {score:.2%}")
    
    if result.issues:
        print(f"\nIssues Found ({len(result.issues)}):")
        for i, issue in enumerate(result.issues, 1):
            print(f"  {i}. {issue}")
    
    if result.suggestions:
        print(f"\nImprovement Suggestions ({len(result.suggestions)}):")
        for i, suggestion in enumerate(result.suggestions, 1):
            print(f"  {i}. {suggestion}")
    
    return result

def run_batch_test(image_dir):
    """Run tests on all images in a directory."""
    image_dir = Path(image_dir)
    image_paths = list(image_dir.glob("*.png"))
    
    if not image_paths:
        print(f"No PNG images found in {image_dir}")
        return
    
    print(f"Testing {len(image_paths)} images from {image_dir}")
    
    results = []
    for img_path in image_paths:
        print(f"\n{'='*50}")
        result = test_single_asset(img_path)
        results.append(result)
    
    # Summary
    print(f"\n{'='*50}")
    print("BATCH TEST SUMMARY")
    print(f"Assets tested: {len(results)}")
    
    avg_score = sum(r.overall_score for r in results) / len(results)
    print(f"Average score: {avg_score:.2%}")
    
    # Dimension averages
    print("\nDimension averages:")
    for dim in QUALITY_DIMENSIONS:
        avg = sum(r.dimensions[dim] for r in results) / len(results)
        print(f"  {dim}: {avg:.2%}")
    
    # Common issues
    all_issues = []
    for r in results:
        all_issues.extend(r.issues)
    
    if all_issues:
        print(f"\nTop issues across all assets:")
        from collections import Counter
        issue_counts = Counter(all_issues)
        for issue, count in issue_counts.most_common(5):
            print(f"  - {issue} ({count}/{len(results)} assets)")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Test and iterate on procedural art generation")
    parser.add_argument("--image", "-i", help="Test a single image file")
    parser.add_argument("--dir", "-d", help="Test all images in a directory")
    parser.add_argument("--benchmark-file", "-b", help="Path to benchmark file to use (default: finetuned version)")
    
    args = parser.parse_args()
    
    if args.image:
        test_single_asset(args.image)
    elif args.dir:
        run_batch_test(args.dir)
    else:
        parser.print_help()
        print("\nExamples:")
        print("  python test_procedural_agent.py -i vendor/props/legal/gavel_proc.png")
        print("  python test_procedural_agent.py -d vendor/props/legal/")
        print("  python test_procedural_agent.py -d generated/benchmarks/ai_refs/")


if __name__ == "__main__":
    main()
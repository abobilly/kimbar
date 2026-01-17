#!/usr/bin/env python3
"""
Run Benchmark Comparison Between Procedural and AI-Generated Art

This script compares the quality of procedural art vs AI-generated references
across the 6 quality dimensions and generates a comparison report.
"""

import json
import os
from pathlib import Path
from PIL import Image
from datetime import datetime

# Add parent directory to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from tools.procedural_art_benchmark import (
    benchmark_image,
    compare_with_reference,
    save_benchmark_report,
    QUALITY_DIMENSIONS,
    ComparisonResult
)

# Directories
PROCEDURAL_DIR = Path(__file__).parent.parent / "vendor" / "props" / "legal"
AI_REF_DIR = Path(__file__).parent.parent / "generated" / "benchmarks" / "ai_refs"
OUTPUT_DIR = Path(__file__).parent.parent / "generated" / "benchmarks"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def run_comparison_for_asset(asset_name):
    """Run comparison for a single asset."""
    print(f"\nComparing {asset_name}...")
    
    # Find procedural version
    proc_paths = list(PROCEDURAL_DIR.glob(f"*{asset_name}*_proc.png"))
    if not proc_paths:
        print(f"  - No procedural version found for {asset_name}")
        return None

    proc_path = proc_paths[0]
    print(f"  Procedural: {proc_path.name}")

    # Find AI reference version
    ai_paths = list(AI_REF_DIR.glob(f"{asset_name}.png")) + list(AI_REF_DIR.glob(f"{asset_name}_ai_ref.png"))
    if not ai_paths:
        print(f"  - No AI reference found for {asset_name}")
        return None

    ai_path = ai_paths[0]
    print(f"  AI Reference: {ai_path.name}")

    try:
        # Load images
        proc_img = Image.open(proc_path)
        ai_img = Image.open(ai_path)

        # Ensure same size for fair comparison
        if proc_img.size != ai_img.size:
            ai_img = ai_img.resize(proc_img.size, Image.Resampling.LANCZOS)
            print(f"  Resized AI image to match procedural: {proc_img.size}")

        # Run comparison
        comparison = compare_with_reference(proc_img, ai_img, asset_name)

        print(f"  Procedural Score: {comparison.procedural_score:.1%}")
        print(f"  AI Reference Score: {comparison.reference_score:.1%}")
        print(f"  Delta (Proc - AI): {comparison.delta:.1%}")
        print(f"  Winner: {comparison.winner}")

        return comparison

    except Exception as e:
        print(f"  - Error comparing {asset_name}: {e}")
        return None

def run_full_comparison(assets_list):
    """Run comparison for all specified assets."""
    print("Starting benchmark comparison...")
    print(f"Procedural assets: {PROCEDURAL_DIR}")
    print(f"AI references: {AI_REF_DIR}")
    
    comparisons = []

    for asset_name, _ in assets_list:
        comparison = run_comparison_for_asset(asset_name)
        if comparison:
            comparisons.append(comparison)

    # Generate comparison report
    if comparisons:
        report_data = {
            "timestamp": datetime.now().isoformat(),
            "total_comparisons": len(comparisons),
            "summary": {
                "procedural_avg": sum(c.procedural_score for c in comparisons) / len(comparisons),
                "ai_avg": sum(c.reference_score for c in comparisons) / len(comparisons),
                "avg_delta": sum(c.delta for c in comparisons) / len(comparisons),
                "procedural_wins": sum(1 for c in comparisons if c.winner == "procedural"),
                "ai_wins": sum(1 for c in comparisons if c.winner == "reference"),
            },
            "comparisons": [c.to_dict() for c in comparisons],
            "dimension_analysis": {}
        }

        # Calculate dimension deltas
        for dim in QUALITY_DIMENSIONS:
            dim_deltas = [c.dimension_deltas[dim] for c in comparisons]
            report_data["dimension_analysis"][dim] = {
                "avg_delta": sum(dim_deltas) / len(dim_deltas),
                "positive_count": sum(1 for d in dim_deltas if d > 0),  # Procedural wins
                "negative_count": sum(1 for d in dim_deltas if d < 0),  # AI wins
                "values": dim_deltas
            }

        # Save report
        report_path = OUTPUT_DIR / f"comparison_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_path, 'w') as f:
            json.dump(report_data, f, indent=2)

        print(f"\nComparison report saved to: {report_path}")

        # Print summary
        print(f"\nCOMPARISON SUMMARY")
        print(f"Total comparisons: {report_data['total_comparisons']}")
        print(f"Procedural average: {report_data['summary']['procedural_avg']:.1%}")
        print(f"AI average: {report_data['summary']['ai_avg']:.1%}")
        print(f"Average delta (Proc - AI): {report_data['summary']['avg_delta']:.1%}")
        print(f"Procedural wins: {report_data['summary']['procedural_wins']}")
        print(f"AI wins: {report_data['summary']['ai_wins']}")

        print(f"\nDIMENSION ANALYSIS (Positive = Procedural wins, Negative = AI wins)")
        for dim, analysis in report_data["dimension_analysis"].items():
            dim_name = dim.replace('_', ' ').title()
            avg_delta = analysis["avg_delta"]
            proc_wins = analysis["positive_count"]
            ai_wins = analysis["negative_count"]
            print(f"  {dim_name}: {avg_delta:+.1%} (Proc:{proc_wins}, AI:{ai_wins})")

        return report_data

    else:
        print("No comparisons were successful.")
        return None

def suggest_improvements(report_data):
    """Analyze comparison results and suggest improvements to procedural art."""
    if not report_data:
        print("No report data available for improvement suggestions.")
        return
    
    print(f"\nIMPROVEMENT SUGGESTIONS FOR PROCEDURAL ART")
    print("=" * 50)

    # Find dimensions where AI consistently outperforms procedural
    weaknesses = []
    for dim, analysis in report_data["dimension_analysis"].items():
        avg_delta = analysis["avg_delta"]
        if avg_delta < 0:  # AI wins on average
            weaknesses.append((dim, abs(avg_delta)))

    # Sort by magnitude of weakness
    weaknesses.sort(key=lambda x: x[1], reverse=True)

    if not weaknesses:
        print("Procedural art performs equally well or better than AI in all dimensions!")
    else:
        print("Dimensions where procedural art lags behind AI:")
        for dim, magnitude in weaknesses:
            dim_name = dim.replace('_', ' ').title()
            print(f"  - {dim_name}: {magnitude:.1%} deficit")

        print("\nSpecific code improvements to consider:")
        for dim, _ in weaknesses[:3]:  # Top 3 weaknesses
            if dim == "aesthetic_quality":
                print("    - Improve color harmony by using more consistent palettes")
                print("    - Add more sophisticated color selection algorithms")
            elif dim == "technical_quality":
                print("    - Ensure no anti-aliasing is applied to pixel art")
                print("    - Verify transparency handling is correct")
            elif dim == "style_consistency":
                print("    - Add consistent 1px dark outlines to all shapes")
                print("    - Implement standardized shading patterns")
            elif dim == "palette_efficiency":
                print("    - Limit color counts per asset (8-20 colors ideal)")
                print("    - Reuse palette entries more consistently")
            elif dim == "readability":
                print("    - Strengthen silhouettes and key features")
                print("    - Increase contrast between major elements")
            elif dim == "shading_quality":
                print("    - Implement proper 2-4 tone shading (highlight/base/shadow)")
                print("    - Add consistent light direction across assets")

    # Asset-specific insights
    print(f"\nASSET-SPECIFIC INSIGHTS")
    for comp in report_data.get("comparisons", []):
        asset = comp["asset_name"]
        delta = comp["delta"]
        if delta < 0:  # AI won
            print(f"  - {asset}: AI performs better by {abs(delta):.1%}")
        elif delta > 0:  # Procedural won
            print(f"  - {asset}: Procedural performs better by {delta:.1%}")
        else:
            print(f"  - {asset}: Equal performance")

if __name__ == "__main__":
    # Assets to compare
    ASSETS_TO_COMPARE = [
        ("fountain", (32, 32)),
        ("gavel", (32, 32)),
        ("scales", (32, 32)),
        ("briefcase", (32, 32)),
        ("law_book", (32, 32)),
        ("witness_stand", (64, 64)),
    ]
    
    # Run comparison
    report = run_full_comparison(ASSETS_TO_COMPARE)
    
    # Generate improvement suggestions
    suggest_improvements(report)
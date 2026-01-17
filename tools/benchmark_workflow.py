#!/usr/bin/env python3
"""
Master Script for Procedural Art Quality Improvement via AI Model Benchmarking

This script orchestrates the complete workflow:
1. Generates procedural art assets
2. Generates AI reference images using HuggingFace models
3. Runs benchmark comparison between procedural and AI art
4. Analyzes results and suggests improvements
"""

import asyncio
import subprocess
import sys
import json
from pathlib import Path
from datetime import datetime

def run_command(cmd, desc):
    """Run a shell command and return success status."""
    print(f"\n{desc}")
    print(f"   Command: {cmd}")

    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )

        if result.returncode == 0:
            print("   Success")
            if result.stdout.strip():
                print(f"   Output: {result.stdout.strip()[:200]}...")  # First 200 chars
            return True, result.stdout
        else:
            print(f"   Failed with return code: {result.returncode}")
            if result.stderr:
                print(f"   Error: {result.stderr[:200]}...")  # First 200 chars
            return False, result.stderr

    except subprocess.TimeoutExpired:
        print("   Command timed out")
        return False, "Timeout"
    except Exception as e:
        print(f"   Exception: {e}")
        return False, str(e)

def main():
    print("Kimbar: Procedural Art Quality Improvement via AI Benchmarking")
    print("=" * 70)

    start_time = datetime.now()
    print(f"Started at: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")

    # Step 1: Generate procedural art if not already present
    print("\nStep 1: Ensuring procedural art assets exist")
    proc_art_exists = Path("vendor/props/legal/scales_of_justice_proc.png").exists()

    if not proc_art_exists:
        print("   Generating procedural art assets...")
        success, _ = run_command("python make_icons.py", "Generate procedural art")
        if not success:
            print("   Failed to generate procedural art. Exiting.")
            return 1
    else:
        print("   Procedural art assets already exist")

    # Step 2: Generate AI reference images
    print("\nStep 2: Generating AI reference images")
    print("   This may take several minutes depending on model response times...")

    # Import and run the AI reference generation
    try:
        # Change to parent directory to import from tools
        import sys
        import os
        current_dir = os.path.dirname(__file__)
        parent_dir = os.path.dirname(current_dir)
        sys.path.insert(0, parent_dir)

        from tools.generate_ai_references import generate_all_ai_references
        print("   Starting AI reference generation...")
        asyncio.run(generate_all_ai_references())
        print("   AI reference generation completed")
    except Exception as e:
        print(f"   Error generating AI references: {e}")
        return 1

    # Step 3: Run benchmark comparison
    print("\nStep 3: Running benchmark comparison")
    success, output = run_command(
        "python tools/run_benchmark_comparison.py",
        "Run benchmark comparison"
    )

    if not success:
        print("   Benchmark comparison had issues, but continuing...")

    # Step 4: Run batch benchmark on procedural art
    print("\nStep 4: Running batch benchmark on procedural art")
    success, output = run_command(
        "python tools/batch_benchmark.py --category legal --json",
        "Run batch benchmark"
    )

    if success:
        # Parse the JSON output to get summary stats
        try:
            benchmark_data = json.loads(output)
            avg_score = benchmark_data.get("average_score", 0)
            total_assets = benchmark_data.get("total_assets", 0)
            print(f"   Average procedural art score: {avg_score:.1%} across {total_assets} assets")
        except:
            print("   Could not parse benchmark results")

    # Step 5: Generate final summary
    print("\nStep 5: Generating final summary")

    end_time = datetime.now()
    duration = end_time - start_time

    print("\n" + "=" * 70)
    print("BENCHMARK WORKFLOW COMPLETED")
    print(f"Duration: {duration}")
    print(f"Start: {start_time.strftime('%H:%M:%S')}")
    print(f"End: {end_time.strftime('%H:%M:%S')}")

    print("\nGenerated Files:")
    print("   - Procedural art: vendor/props/legal/*.png")
    print("   - AI references: generated/benchmarks/ai_refs/*.png")
    print("   - Benchmark reports: generated/benchmarks/*.json")
    print("   - Comparison reports: generated/benchmarks/comparison_report_*.json")
    print("   - Leaderboards: generated/benchmarks/leaderboard_*.md")
    print("   - Dimension analysis: generated/benchmarks/dimensions_*.md")

    print("\nNext Steps:")
    print("   1. Review comparison reports in generated/benchmarks/")
    print("   2. Identify dimensions where procedural art underperforms")
    print("   3. Apply suggested improvements to make_icons.py")
    print("   4. Re-run this workflow to measure improvement")

    print("\nKey Metrics:")
    if 'avg_score' in locals():
        print(f"   - Procedural art average score: {avg_score:.1%}")

    print("\nWorkflow completed successfully!")
    return 0

if __name__ == "__main__":
    sys.exit(main())
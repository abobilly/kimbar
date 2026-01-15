#!/usr/bin/env python3
"""
run_pipeline.py - Orchestrate the full Digital Tailor pipeline.

Usage:
    python run_pipeline.py --config config_justice_robes.json
    python run_pipeline.py  # Uses default justice robes config
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path


def run_step(script: str, args: list) -> bool:
    """Run a pipeline step and return success status."""
    cmd = [sys.executable, script] + args
    print(f"\n{'='*60}")
    print(f"Running: {' '.join(cmd)}")
    print('='*60)
    
    result = subprocess.run(cmd, cwd=Path(__file__).parent)
    return result.returncode == 0


def main():
    parser = argparse.ArgumentParser(description="Run the Digital Tailor pipeline")
    parser.add_argument("--config", default="config_justice_robes.json",
                        help="Config file path")
    parser.add_argument("--skip-slice", action="store_true",
                        help="Skip slicing step (reuse existing frames)")
    parser.add_argument("--validate-only", action="store_true",
                        help="Only run validation, no compositing")
    
    args = parser.parse_args()
    
    print("🧵 Digital Tailor Pipeline")
    print("=" * 60)
    
    config_args = ["--config", args.config]
    
    # Step 1: Slice
    if not args.skip_slice and not args.validate_only:
        print("\n📐 Phase 1: SLICE - Exploding sheets into frames...")
        if not run_step("01_slice.py", config_args):
            print("❌ Slicing failed!")
            return 1
    
    # Step 2: Tailor (composite + validate)
    print("\n✂️  Phase 2: TAILOR - Compositing and validating...")
    tailor_args = config_args.copy()
    if args.validate_only:
        tailor_args.append("--validate-only")
    
    if not run_step("02_tailor.py", tailor_args):
        print("⚠️  Tailoring completed with warnings (check skin leaks)")
    
    # Step 3: Stitch
    if not args.validate_only:
        print("\n🪡 Phase 3: STITCH - Reassembling sheets...")
        if not run_step("03_stitch.py", config_args):
            print("❌ Stitching failed!")
            return 1
    
    print("\n" + "=" * 60)
    print("✅ Pipeline complete!")
    print("=" * 60)
    
    # Print output locations
    with open(args.config, 'r') as f:
        config = json.load(f)
    
    print("\nOutput files:")
    for output in config.get("outputs", []):
        path = output["path"]
        # Resolve relative path
        full_path = (Path(__file__).parent / path).resolve()
        exists = "✓" if full_path.exists() else "✗"
        print(f"  {exists} {full_path}")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())

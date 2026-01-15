#!/bin/bash
# generate-sprites.sh - Generate character sprites using ULPC in WSL2
# 
# Usage (from Windows PowerShell):
#   wsl -d Ubuntu -- bash /mnt/c/Users/andre/lawchuck/badgey.org/kimbar/scripts/generate-sprites.sh [character_id]
#
# Or from npm:
#   npm run gen:sprites -- [character_id]
#
# If no character_id provided, generates ALL character specs

set -e

# Paths (Windows paths converted to WSL mount points)
PROJECT_ROOT="/mnt/c/Users/andre/lawchuck/badgey.org/kimbar"
VENDOR_ULPC="$PROJECT_ROOT/vendor/lpc/Universal-LPC-Spritesheet-Character-Generator"
CHAR_DIR="$PROJECT_ROOT/content/characters"
OUTPUT_DIR="$PROJECT_ROOT/generated/sprites"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

# Check if ULPC is available
check_ulpc() {
    if [ ! -d "$VENDOR_ULPC" ]; then
        error "ULPC not found at $VENDOR_ULPC"
        echo "Run: npm run fetch-vendor to download ULPC"
        exit 1
    fi
    
    if [ ! -f "$VENDOR_ULPC/cli.js" ]; then
        error "ULPC cli.js not found"
        exit 1
    fi
    
    info "ULPC found at $VENDOR_ULPC"
}

# Generate sprite for a single character spec
generate_character() {
    local spec_file="$1"
    local char_id=$(basename "$spec_file" .json)
    
    info "Generating sprite for: $char_id"
    
    # Read the CharacterSpec and extract ulpcArgs
    local ulpc_args=$(node -e "
        const fs = require('fs');
        const spec = JSON.parse(fs.readFileSync('$spec_file', 'utf-8'));
        
        // Build CLI args from ulpcArgs
        const args = spec.ulpcArgs || {};
        const parts = [];
        
        // Map our schema fields to ULPC CLI flags
        if (args.body) parts.push('--body=' + args.body);
        if (args.skin) parts.push('--skin=' + args.skin);
        if (args.hair) parts.push('--hair=' + args.hair);
        if (args.hairColor) parts.push('--haircolor=' + args.hairColor);
        if (args.eyes) parts.push('--eyes=' + args.eyes);
        if (args.nose) parts.push('--nose=' + args.nose);
        if (args.ears) parts.push('--ears=' + args.ears);
        if (args.torso) parts.push('--torso=' + args.torso);
        if (args.legs) parts.push('--legs=' + args.legs);
        if (args.feet) parts.push('--feet=' + args.feet);
        if (args.hands) parts.push('--hands=' + args.hands);
        if (args.accessory) parts.push('--accessory=' + args.accessory);
        
        console.log(parts.join(' '));
    " 2>/dev/null)
    
    if [ -z "$ulpc_args" ]; then
        warn "No ulpcArgs found for $char_id, skipping"
        return 1
    fi
    
    # Create output directory
    mkdir -p "$OUTPUT_DIR"
    
    # Run ULPC generator
    local output_file="$OUTPUT_DIR/${char_id}.png"
    
    (
        cd "$VENDOR_ULPC"
        node cli.js $ulpc_args --output="$output_file" 2>&1
    )
    
    if [ -f "$output_file" ]; then
        info "Generated: $output_file"
        return 0
    else
        error "Failed to generate sprite for $char_id"
        return 1
    fi
}

# Main execution
main() {
    info "ULPC Sprite Generator for Kim Bar"
    echo "================================="
    
    check_ulpc
    
    mkdir -p "$OUTPUT_DIR"
    
    local target="$1"
    local success=0
    local failed=0
    
    if [ -n "$target" ]; then
        # Generate specific character
        local spec_file="$CHAR_DIR/${target}.json"
        if [ ! -f "$spec_file" ]; then
            error "Character spec not found: $spec_file"
            exit 1
        fi
        
        if generate_character "$spec_file"; then
            ((success++))
        else
            ((failed++))
        fi
    else
        # Generate all characters
        info "Generating all character sprites..."
        
        for spec_file in "$CHAR_DIR"/*.json; do
            [ -f "$spec_file" ] || continue
            
            if generate_character "$spec_file"; then
                ((success++))
            else
                ((failed++))
            fi
        done
    fi
    
    echo ""
    echo "================================="
    info "Generation complete: $success succeeded, $failed failed"
    
    if [ $failed -gt 0 ]; then
        exit 1
    fi
}

main "$@"

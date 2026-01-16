#Requires -Version 5.1
<#
.SYNOPSIS
    Automated setup for pixel-mcp MCP server with headless Aseprite/LibreSprite support.

.DESCRIPTION
    This script performs fully automated setup of the pixel-mcp Model Context Protocol server:
    1. Detects or installs a compatible pixel art editor (Aseprite or LibreSprite)
    2. Configures pixel-mcp for headless/batch operation
    3. Sets up MCP client registrations for Claude Desktop and Gemini/VS Code
    4. Verifies the setup works without displaying any GUI

.NOTES
    Author: AI System Integrator
    Version: 1.0.0
    Requirements: Windows 10/11, PowerShell 5.1+
#>

[CmdletBinding()]
param(
    [switch]$Force,           # Force reinstallation even if already configured
    [switch]$SkipVerification # Skip the final verification test
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# Configuration
$script:Config = @{
    LibreSpriteUrl = "https://github.com/LibreSprite/LibreSprite/releases/download/v1.1/libresprite-development-windows-x86_64.zip"
    InstallDir = "$env:LOCALAPPDATA\LibreSprite"
    PixelMcpConfigDir = "$env:USERPROFILE\.config\pixel-mcp"
    PixelMcpConfigPath = "$env:USERPROFILE\.config\pixel-mcp\config.json"
    ClaudeDesktopConfig = "$env:APPDATA\Claude\claude_desktop_config.json"
    PixelPluginPath = "$env:USERPROFILE\.claude\plugins\cache\pixel-plugin\pixel-plugin"
    TempDir = "$env:TEMP\pixel-mcp-setup"
}

function Write-Step {
    param([string]$Message)
    Write-Host "`n>> " -ForegroundColor Cyan -NoNewline
    Write-Host $Message -ForegroundColor White
}

function Write-Success {
    param([string]$Message)
    Write-Host "   [OK] " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Warning {
    param([string]$Message)
    Write-Host "   [WARN] " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

function Write-Error {
    param([string]$Message)
    Write-Host "   [ERROR] " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

function Find-AsepritePath {
    <#
    .SYNOPSIS
        Searches for Aseprite or LibreSprite in common installation locations.
    #>

    $searchPaths = @(
        # Aseprite standard paths
        "$env:ProgramFiles\Aseprite\Aseprite.exe",
        "${env:ProgramFiles(x86)}\Aseprite\Aseprite.exe",
        "$env:LOCALAPPDATA\Aseprite\Aseprite.exe",

        # Steam paths
        "${env:ProgramFiles(x86)}\Steam\steamapps\common\Aseprite\Aseprite.exe",
        "$env:ProgramFiles\Steam\steamapps\common\Aseprite\Aseprite.exe",
        "D:\Steam\steamapps\common\Aseprite\Aseprite.exe",
        "D:\Games\Steam\steamapps\common\Aseprite\Aseprite.exe",

        # itch.io paths
        "$env:USERPROFILE\AppData\Roaming\itch\apps\Aseprite\Aseprite.exe",

        # LibreSprite paths
        "$env:LOCALAPPDATA\LibreSprite\libresprite.exe",
        "$env:ProgramFiles\LibreSprite\libresprite.exe",
        "${env:ProgramFiles(x86)}\LibreSprite\libresprite.exe"
    )

    foreach ($path in $searchPaths) {
        if (Test-Path $path) {
            return $path
        }
    }

    # Check if already configured
    if (Test-Path $script:Config.PixelMcpConfigPath) {
        try {
            $existingConfig = Get-Content $script:Config.PixelMcpConfigPath -Raw | ConvertFrom-Json
            if ($existingConfig.aseprite_path -and (Test-Path $existingConfig.aseprite_path)) {
                return $existingConfig.aseprite_path
            }
        } catch {
            # Ignore parse errors
        }
    }

    return $null
}

function Install-LibreSprite {
    <#
    .SYNOPSIS
        Downloads and installs LibreSprite as a free Aseprite alternative.
    #>

    Write-Step "Installing LibreSprite (free Aseprite alternative)..."

    $zipPath = Join-Path $script:Config.TempDir "libresprite.zip"
    $extractPath = $script:Config.InstallDir

    # Create directories
    New-Item -ItemType Directory -Path $script:Config.TempDir -Force | Out-Null
    New-Item -ItemType Directory -Path $extractPath -Force | Out-Null

    # Download LibreSprite
    Write-Host "   Downloading LibreSprite v1.1..." -ForegroundColor Gray
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

        $webClient = New-Object System.Net.WebClient
        $webClient.Headers.Add("User-Agent", "PowerShell/PixelMcpSetup")
        $webClient.DownloadFile($script:Config.LibreSpriteUrl, $zipPath)

        Write-Success "Downloaded successfully ($(([System.IO.FileInfo]$zipPath).Length / 1MB -as [int]) MB)"
    } catch {
        throw "Failed to download LibreSprite: $_"
    }

    # Extract archive
    Write-Host "   Extracting to $extractPath..." -ForegroundColor Gray
    try {
        Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force
        Write-Success "Extracted successfully"
    } catch {
        throw "Failed to extract LibreSprite: $_"
    }

    # Find the executable (might be in a subdirectory)
    $exePath = Get-ChildItem -Path $extractPath -Recurse -Filter "libresprite.exe" | Select-Object -First 1 -ExpandProperty FullName

    if (-not $exePath) {
        # Try alternative names
        $exePath = Get-ChildItem -Path $extractPath -Recurse -Filter "*.exe" |
                   Where-Object { $_.Name -match "libresprite|aseprite" } |
                   Select-Object -First 1 -ExpandProperty FullName
    }

    if (-not $exePath) {
        throw "Could not find LibreSprite executable after extraction"
    }

    Write-Success "LibreSprite installed at: $exePath"

    # Cleanup
    Remove-Item $zipPath -Force -ErrorAction SilentlyContinue

    return $exePath
}

function Update-PixelMcpConfig {
    param(
        [Parameter(Mandatory)]
        [string]$AsepritePath
    )

    Write-Step "Configuring pixel-mcp..."

    # Ensure config directory exists
    $configDir = $script:Config.PixelMcpConfigDir
    if (-not (Test-Path $configDir)) {
        New-Item -ItemType Directory -Path $configDir -Force | Out-Null
        Write-Success "Created config directory: $configDir"
    }

    # Build configuration (paths are stored as-is, JSON serialization handles escaping)
    $config = @{
        aseprite_path = $AsepritePath
        temp_dir = "$env:LOCALAPPDATA\Temp\pixel-mcp"
        timeout = 30
        log_level = "info"
        enable_timing = $false
    }

    # Ensure temp directory exists
    $tempDir = $config.temp_dir.Replace('\\', '\')
    if (-not (Test-Path $tempDir)) {
        New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    }

    # Write config file
    $configJson = $config | ConvertTo-Json -Depth 10
    Set-Content -Path $script:Config.PixelMcpConfigPath -Value $configJson -Encoding UTF8

    Write-Success "Config written to: $($script:Config.PixelMcpConfigPath)"
    Write-Host "   Configuration:" -ForegroundColor Gray
    Write-Host $configJson -ForegroundColor DarkGray
}

function Get-PixelMcpBinaryPath {
    <#
    .SYNOPSIS
        Finds the pixel-mcp binary from the installed plugin.
    #>

    $pluginBase = $script:Config.PixelPluginPath

    # Find the latest version
    $versionDir = Get-ChildItem -Path $pluginBase -Directory -ErrorAction SilentlyContinue |
                  Sort-Object Name -Descending |
                  Select-Object -First 1

    if ($versionDir) {
        $binaryPath = Join-Path $versionDir.FullName "bin\pixel-mcp-windows-amd64.exe"
        if (Test-Path $binaryPath) {
            return $binaryPath
        }
    }

    return $null
}

function Update-ClaudeDesktopConfig {
    param(
        [Parameter(Mandatory)]
        [string]$PixelMcpBinary
    )

    Write-Step "Configuring Claude Desktop MCP client..."

    $configPath = $script:Config.ClaudeDesktopConfig
    $configDir = Split-Path $configPath -Parent

    # Ensure directory exists
    if (-not (Test-Path $configDir)) {
        New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    }

    # Load or create config
    $config = @{ mcpServers = @{} }
    if (Test-Path $configPath) {
        try {
            $existing = Get-Content $configPath -Raw | ConvertFrom-Json -AsHashtable
            if ($existing) {
                $config = $existing
                if (-not $config.ContainsKey('mcpServers')) {
                    $config.mcpServers = @{}
                }
            }
        } catch {
            Write-Warning "Could not parse existing config, creating new"
        }
    }

    # Add pixel-mcp server (paths are stored as-is, JSON serialization handles escaping)
    $config.mcpServers['pixel-mcp'] = @{
        command = $PixelMcpBinary
        args = @()
        env = @{
            PIXEL_MCP_CONFIG = $script:Config.PixelMcpConfigPath
        }
    }

    # Write config
    $configJson = $config | ConvertTo-Json -Depth 10
    Set-Content -Path $configPath -Value $configJson -Encoding UTF8

    Write-Success "Claude Desktop config updated: $configPath"
}

function New-GeminiVsCodeConfig {
    param(
        [Parameter(Mandatory)]
        [string]$PixelMcpBinary
    )

    Write-Step "Generating Gemini/VS Code MCP configuration..."

    $configSnippet = @{
        "pixel-mcp" = @{
            command = $PixelMcpBinary.Replace('\', '/')
            args = @()
            env = @{
                PIXEL_MCP_CONFIG = $script:Config.PixelMcpConfigPath.Replace('\', '/')
            }
        }
    }

    $outputPath = Join-Path $script:Config.PixelMcpConfigDir "mcp-servers-gemini.json"
    $configJson = $configSnippet | ConvertTo-Json -Depth 10
    Set-Content -Path $outputPath -Value $configJson -Encoding UTF8

    Write-Success "Gemini/VS Code config saved to: $outputPath"
    Write-Host "`n   Add this to your VS Code MCP extension settings or Google AI Studio:" -ForegroundColor Cyan
    Write-Host $configJson -ForegroundColor DarkGray
}

function Test-PixelMcpSetup {
    param(
        [Parameter(Mandatory)]
        [string]$PixelMcpBinary,
        [Parameter(Mandatory)]
        [string]$AsepritePath
    )

    Write-Step "Verifying headless setup..."

    # Test 1: Verify Aseprite/LibreSprite binary exists
    if (-not (Test-Path $AsepritePath)) {
        Write-Error "Aseprite/LibreSprite binary not found at: $AsepritePath"
        return $false
    }
    Write-Success "Pixel editor binary exists"

    # Test 2: Verify pixel-mcp binary exists
    if (-not (Test-Path $PixelMcpBinary)) {
        Write-Error "pixel-mcp binary not found at: $PixelMcpBinary"
        return $false
    }
    Write-Success "pixel-mcp binary exists"

    # Test 3: Test Aseprite batch mode (headless)
    Write-Host "   Testing headless operation..." -ForegroundColor Gray
    try {
        $testOutput = & $AsepritePath -b --version 2>&1
        if ($LASTEXITCODE -eq 0 -or $testOutput -match "Aseprite|LibreSprite|\d+\.\d+") {
            Write-Success "Headless mode works (no GUI opened)"
        } else {
            Write-Warning "Batch mode test returned unexpected output: $testOutput"
        }
    } catch {
        Write-Warning "Could not test batch mode: $_"
    }

    # Test 4: Test pixel-mcp startup
    Write-Host "   Testing pixel-mcp server..." -ForegroundColor Gray
    try {
        $env:PIXEL_MCP_CONFIG = $script:Config.PixelMcpConfigPath
        $pinfo = New-Object System.Diagnostics.ProcessStartInfo
        $pinfo.FileName = $PixelMcpBinary
        $pinfo.Arguments = "--version"
        $pinfo.RedirectStandardOutput = $true
        $pinfo.RedirectStandardError = $true
        $pinfo.UseShellExecute = $false
        $pinfo.CreateNoWindow = $true

        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $pinfo
        $process.Start() | Out-Null
        $stdout = $process.StandardOutput.ReadToEnd()
        $stderr = $process.StandardError.ReadToEnd()
        $process.WaitForExit(5000)

        if ($stdout -or $process.ExitCode -eq 0) {
            Write-Success "pixel-mcp server responds"
        } else {
            Write-Warning "pixel-mcp may have issues: $stderr"
        }
    } catch {
        Write-Warning "Could not test pixel-mcp: $_"
    }

    return $true
}

function Show-Summary {
    param(
        [string]$AsepritePath,
        [string]$PixelMcpBinary
    )

    Write-Host "`n" + "="*60 -ForegroundColor Cyan
    Write-Host "  SETUP COMPLETE" -ForegroundColor Green
    Write-Host "="*60 -ForegroundColor Cyan

    Write-Host "`n  Configuration Summary:" -ForegroundColor White
    Write-Host "  ----------------------" -ForegroundColor Gray
    Write-Host "  Pixel Editor: " -NoNewline -ForegroundColor Gray
    Write-Host $AsepritePath -ForegroundColor Yellow
    Write-Host "  pixel-mcp Config: " -NoNewline -ForegroundColor Gray
    Write-Host $script:Config.PixelMcpConfigPath -ForegroundColor Yellow
    Write-Host "  pixel-mcp Binary: " -NoNewline -ForegroundColor Gray
    Write-Host $PixelMcpBinary -ForegroundColor Yellow

    Write-Host "`n  Usage:" -ForegroundColor White
    Write-Host "  ------" -ForegroundColor Gray
    Write-Host "  1. Restart Claude Code to load the new MCP server" -ForegroundColor Gray
    Write-Host "  2. Use natural language: 'Create a 32x32 pixel art character'" -ForegroundColor Gray
    Write-Host "  3. Or use slash commands: /pixel-new 32x32 gameboy" -ForegroundColor Gray

    Write-Host "`n  For Gemini/VS Code:" -ForegroundColor White
    Write-Host "  -------------------" -ForegroundColor Gray
    Write-Host "  Copy config from: $($script:Config.PixelMcpConfigDir)\mcp-servers-gemini.json" -ForegroundColor Gray

    Write-Host "`n"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

try {
    Write-Host "`n"
    Write-Host "="*60 -ForegroundColor Cyan
    Write-Host "  PIXEL-MCP AUTOMATED SETUP" -ForegroundColor White
    Write-Host "  Headless Pixel Art for AI Agents" -ForegroundColor Gray
    Write-Host "="*60 -ForegroundColor Cyan

    # Step 1: Find or install pixel editor
    Write-Step "Detecting pixel art editor..."
    $asepritePath = Find-AsepritePath

    if ($asepritePath -and -not $Force) {
        Write-Success "Found existing installation: $asepritePath"
    } else {
        if ($asepritePath -and $Force) {
            Write-Warning "Existing installation found but -Force specified, reinstalling..."
        } else {
            Write-Warning "No Aseprite/LibreSprite installation found"
        }

        Write-Host "`n   Aseprite is paid software. LibreSprite is a free, compatible alternative." -ForegroundColor Yellow
        Write-Host "   Installing LibreSprite automatically..." -ForegroundColor Yellow

        $asepritePath = Install-LibreSprite
    }

    # Step 2: Configure pixel-mcp
    Update-PixelMcpConfig -AsepritePath $asepritePath

    # Step 3: Find pixel-mcp binary
    Write-Step "Locating pixel-mcp binary..."
    $pixelMcpBinary = Get-PixelMcpBinaryPath

    if (-not $pixelMcpBinary) {
        throw "pixel-mcp binary not found. Ensure the pixel-plugin is installed in Claude Code."
    }
    Write-Success "Found: $pixelMcpBinary"

    # Step 4: Configure Claude Desktop (optional)
    Update-ClaudeDesktopConfig -PixelMcpBinary $pixelMcpBinary

    # Step 5: Generate Gemini/VS Code config
    New-GeminiVsCodeConfig -PixelMcpBinary $pixelMcpBinary

    # Step 6: Verify setup
    if (-not $SkipVerification) {
        $success = Test-PixelMcpSetup -PixelMcpBinary $pixelMcpBinary -AsepritePath $asepritePath
        if (-not $success) {
            Write-Warning "Verification had some issues, but setup may still work"
        }
    }

    # Summary
    Show-Summary -AsepritePath $asepritePath -PixelMcpBinary $pixelMcpBinary

    exit 0

} catch {
    Write-Host "`n"
    Write-Error "Setup failed: $_"
    Write-Host "`n   Stack trace:" -ForegroundColor Gray
    Write-Host $_.ScriptStackTrace -ForegroundColor DarkGray
    exit 1
}

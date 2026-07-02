param(
  [string]$EnvFile = "$PSScriptRoot\.env.local"
)

$ErrorActionPreference = "Stop"

if (Test-Path $EnvFile) {
  Get-Content -Path $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
      return
    }

    $key, $value = $line.Split("=", 2)
    $key = $key.Trim()
    $value = $value.Trim().Trim('"').Trim("'")
    if ($key) {
      [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
  }
}

py -3 "$PSScriptRoot\avareno_bridge.py"

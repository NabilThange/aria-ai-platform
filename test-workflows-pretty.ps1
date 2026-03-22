# PowerShell script to pretty-print workflow JSON

Write-Host "`n=== Available Workflows ===" -ForegroundColor Cyan

$response = curl http://localhost:9991/workflows 2>$null
$workflows = $response | ConvertFrom-Json

foreach ($workflow in $workflows) {
    Write-Host "`n📦 $($workflow.name)" -ForegroundColor Green
    Write-Host "   Description: $($workflow.description)" -ForegroundColor White
    Write-Host "   Version: $($workflow.version)" -ForegroundColor Gray
    Write-Host "   Timeout: $($workflow.timeout_ms)ms" -ForegroundColor Gray
    Write-Host "   Variables:" -ForegroundColor Yellow
    
    foreach ($var in $workflow.variables) {
        $required = if ($var.required) { "required" } else { "optional" }
        $default = if ($var.default) { " (default: $($var.default))" } else { "" }
        Write-Host "      - $($var.name) [$($var.type), $required]$default" -ForegroundColor White
        Write-Host "        $($var.description)" -ForegroundColor DarkGray
    }
}

Write-Host ""

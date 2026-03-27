# Test writeFile with base64 encoding (the correct way)

Write-Host "=== Testing Desktop writeFile with Base64 Encoding ===" -ForegroundColor Cyan

$testContent = @"
# Research Report: Quantum Computing Breakthroughs 2025

## Executive Summary
This report analyzes recent quantum computing advancements, including:
- Error correction improvements
- Scalability challenges
- Real-world applications

## Key Findings
1. **IBM's 1000+ qubit processor** - Major milestone achieved
2. **Google's quantum supremacy** - Demonstrated computational advantage
3. **Commercial applications** - Drug discovery, cryptography, optimization

## Conclusion
Quantum computing is transitioning from research to practical applications.

Special characters test: é, ñ, ü, 中文, 日本語, emoji: 🚀 ✅ 💻
"@

Write-Host "`nTest content length: $($testContent.Length) characters" -ForegroundColor Yellow

# Convert to base64 (this is what the workflow should do)
$bytes = [System.Text.Encoding]::UTF8.GetBytes($testContent)
$base64 = [Convert]::ToBase64String($bytes)

Write-Host "Base64 length: $($base64.Length) characters" -ForegroundColor Yellow

# Call desktop API with base64-encoded content
$body = @{
    action = "write_file"
    path = "/home/user/Desktop/test-encoding-base64.txt"
    data = $base64
} | ConvertTo-Json

Write-Host "`nSending writeFile request with base64 encoding..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Method POST -Uri "http://localhost:9990/computer-use" `
        -Headers @{"Content-Type"="application/json"} `
        -Body $body
    
    Write-Host "`n✅ WriteFile response:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 3) -ForegroundColor Gray
    
    # Read file back
    Write-Host "`nReading file back..." -ForegroundColor Yellow
    $readBody = @{
        action = "read_file"
        path = "/home/user/Desktop/test-encoding-base64.txt"
    } | ConvertTo-Json
    
    $readResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:9990/computer-use" `
        -Headers @{"Content-Type"="application/json"} `
        -Body $readBody
    
    Write-Host "`n✅ ReadFile response:" -ForegroundColor Green
    Write-Host "Success: $($readResponse.success)" -ForegroundColor Gray
    
    # Decode the base64 response
    $decodedBytes = [Convert]::FromBase64String($readResponse.data)
    $decodedText = [System.Text.Encoding]::UTF8.GetString($decodedBytes)
    
    Write-Host "Decoded data length: $($decodedText.Length)" -ForegroundColor Gray
    Write-Host "First 200 chars:" -ForegroundColor Gray
    Write-Host $decodedText.Substring(0, [Math]::Min(200, $decodedText.Length)) -ForegroundColor DarkGray
    
    # Check if content matches
    if ($decodedText -eq $testContent) {
        Write-Host "`n✅ Content matches PERFECTLY!" -ForegroundColor Green
        Write-Host "All special characters preserved: é, ñ, ü, 中文, 日本語, 🚀 ✅ 💻" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Content DOES NOT match!" -ForegroundColor Red
        Write-Host "Expected length: $($testContent.Length)" -ForegroundColor Yellow
        Write-Host "Actual length: $($decodedText.Length)" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "`n❌ Error: $_" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor DarkRed
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
Write-Host "Check the file on desktop: /home/user/Desktop/test-encoding-base64.txt" -ForegroundColor Yellow

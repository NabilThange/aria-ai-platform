# Test writeFile encoding issue
# This will help us understand what's going wrong

Write-Host "=== Testing Desktop writeFile Encoding ===" -ForegroundColor Cyan

# Test content with special characters
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
Write-Host "First 100 chars: $($testContent.Substring(0, 100))" -ForegroundColor Gray

# Call desktop API to write file
$body = @{
    action = "write_file"
    path = "/home/user/Desktop/test-encoding.txt"
    data = $testContent
} | ConvertTo-Json

Write-Host "`nSending writeFile request..." -ForegroundColor Yellow
Write-Host "Body preview: $($body.Substring(0, [Math]::Min(200, $body.Length)))" -ForegroundColor DarkGray

try {
    $response = Invoke-RestMethod -Method POST -Uri "http://localhost:9990/computer-use" `
        -Headers @{"Content-Type"="application/json"} `
        -Body $body
    
    Write-Host "`n✅ WriteFile response:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 3) -ForegroundColor Gray
    
    # Now read the file back to see what was actually written
    Write-Host "`nReading file back..." -ForegroundColor Yellow
    $readBody = @{
        action = "read_file"
        path = "/home/user/Desktop/test-encoding.txt"
    } | ConvertTo-Json
    
    $readResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:9990/computer-use" `
        -Headers @{"Content-Type"="application/json"} `
        -Body $readBody
    
    Write-Host "`n✅ ReadFile response:" -ForegroundColor Green
    Write-Host "Success: $($readResponse.success)" -ForegroundColor Gray
    Write-Host "Data length: $($readResponse.data.Length)" -ForegroundColor Gray
    Write-Host "First 200 chars of data:" -ForegroundColor Gray
    Write-Host $readResponse.data.Substring(0, [Math]::Min(200, $readResponse.data.Length)) -ForegroundColor DarkGray
    
    # Check if content matches
    if ($readResponse.data -eq $testContent) {
        Write-Host "`n✅ Content matches perfectly!" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Content DOES NOT match!" -ForegroundColor Red
        Write-Host "Expected length: $($testContent.Length)" -ForegroundColor Yellow
        Write-Host "Actual length: $($readResponse.data.Length)" -ForegroundColor Yellow
        
        # Show encoding difference
        Write-Host "`nExpected first 100 chars:" -ForegroundColor Yellow
        Write-Host $testContent.Substring(0, 100) -ForegroundColor DarkGray
        Write-Host "`nActual first 100 chars:" -ForegroundColor Yellow
        Write-Host $readResponse.data.Substring(0, [Math]::Min(100, $readResponse.data.Length)) -ForegroundColor DarkGray
    }
    
} catch {
    Write-Host "`n❌ Error: $_" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor DarkRed
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
Write-Host "Check the file on desktop: /home/user/Desktop/test-encoding.txt" -ForegroundColor Yellow

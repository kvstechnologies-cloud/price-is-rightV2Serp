# AWS App Runner Deployment Helper
Write-Host "AWS App Runner Deployment Helper" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green

# Check AWS CLI
try {
    aws --version | Out-Null
    Write-Host "AWS CLI is installed and ready" -ForegroundColor Green
}
catch {
    Write-Host "AWS CLI not found" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Ready to deploy to AWS App Runner!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Open AWS App Runner Console" -ForegroundColor White
Write-Host "2. Create new service from GitHub" -ForegroundColor White
Write-Host "3. Use apprunner.yaml configuration" -ForegroundColor White
Write-Host "4. Add your API keys as environment variables" -ForegroundColor White
Write-Host ""

$openConsole = Read-Host "Open AWS App Runner console now? (y/N)"
if ($openConsole -eq "y" -or $openConsole -eq "Y") {
    Start-Process "https://console.aws.amazon.com/apprunner/"
    Write-Host "Opening AWS console..." -ForegroundColor Green
}

Write-Host ""
Write-Host "See AWS_APP_RUNNER_DEPLOYMENT.md for detailed instructions" -ForegroundColor Cyan

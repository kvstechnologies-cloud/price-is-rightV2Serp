# AWS App Runner Deployment Script (PowerShell)
# This script helps deploy the Insurance Pricing System to AWS App Runner

Write-Host "🚀 AWS App Runner Deployment Script" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green

# Check if AWS CLI is installed
try {
    aws --version | Out-Null
    Write-Host "✅ AWS CLI is installed" -ForegroundColor Green
}
catch {
    Write-Host "❌ AWS CLI is not installed. Please install it first." -ForegroundColor Red
    Write-Host "   Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html" -ForegroundColor Yellow
    exit 1
}

# Check if AWS CLI is configured
try {
    aws sts get-caller-identity | Out-Null
    Write-Host "✅ AWS CLI is configured" -ForegroundColor Green
}
catch {
    Write-Host "❌ AWS CLI is not configured. Please run 'aws configure' first." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 For this deployment, you'll need:" -ForegroundColor Cyan
Write-Host "   1. Your GitHub repository URL" -ForegroundColor White
Write-Host "   2. Your SERPAPI_KEY" -ForegroundColor White
Write-Host "   3. Your OPENAI_API_KEY" -ForegroundColor White
Write-Host ""

Write-Host "🌐 Manual Deployment Steps:" -ForegroundColor Yellow
Write-Host "1. Go to AWS App Runner Console: https://console.aws.amazon.com/apprunner/" -ForegroundColor White
Write-Host "2. Click 'Create service'" -ForegroundColor White
Write-Host "3. Select 'Source code repository'" -ForegroundColor White
Write-Host "4. Connect your GitHub repository" -ForegroundColor White
Write-Host "5. Select branch: main" -ForegroundColor White
Write-Host "6. Use configuration file: apprunner.yaml" -ForegroundColor White
Write-Host "7. Service name: insurance-pricing-system" -ForegroundColor White
Write-Host "8. Add environment variables:" -ForegroundColor White
Write-Host "   - SERPAPI_KEY=your_key_here" -ForegroundColor Gray
Write-Host "   - OPENAI_API_KEY=your_key_here" -ForegroundColor Gray
Write-Host "9. Click Create and deploy" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Would you like to open the AWS App Runner console now? (y/N)"
if ($choice -match "^[Yy]$") {
    Start-Process "https://console.aws.amazon.com/apprunner/"
    Write-Host "✅ Opening AWS App Runner console..." -ForegroundColor Green
}

Write-Host ""
Write-Host "📖 For detailed step-by-step instructions, see:" -ForegroundColor Cyan
Write-Host "   AWS_APP_RUNNER_DEPLOYMENT.md" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Ready for deployment!" -ForegroundColor Green

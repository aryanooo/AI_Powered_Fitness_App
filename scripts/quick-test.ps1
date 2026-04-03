param(
  [string]$BaseUrl = "http://localhost:8000"
)

$ErrorActionPreference = "Stop"

Write-Host "Testing backend at $BaseUrl"

$health = Invoke-RestMethod -Uri "$BaseUrl/api/v1/utils/health-check/" -Method Get
Write-Host "Health: ok=$($health.ok) db=$($health.db)"

$openapi = Invoke-RestMethod -Uri "$BaseUrl/api/v1/openapi.json" -Method Get
Write-Host "OpenAPI title: $($openapi.info.title)"

$random = Get-Random -Minimum 1000 -Maximum 9999
$email = "student$random@example.com"
$password = "Password$random!"

$signupBody = @{
  email = $email
  password = $password
  full_name = "Test User $random"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BaseUrl/api/v1/users/signup" -Method Post -Body $signupBody -ContentType "application/json" | Out-Null
Write-Host "Signup OK for $email"

$token = Invoke-RestMethod -Uri "$BaseUrl/api/v1/login/access-token" -Method Post -Body @{
  username = $email
  password = $password
  grant_type = "password"
} -ContentType "application/x-www-form-urlencoded"

Write-Host "Login OK. Token type: $($token.token_type)"

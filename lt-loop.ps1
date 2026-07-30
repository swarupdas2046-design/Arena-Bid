$subdomain = "bidarena-test-55"
while($true) {
    Write-Host "Starting localtunnel on $subdomain..."
    npx -y localtunnel --port 5173 --subdomain $subdomain
    Start-Sleep -Seconds 2
}

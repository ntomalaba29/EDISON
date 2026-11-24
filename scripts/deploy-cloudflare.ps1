[CmdletBinding()]
param(
    [switch]$CreateR2Bucket
)

$ErrorActionPreference = 'Stop'
$expectedAccountId = 'f44b66fc6b8662b48c3234a414fd914e'
$bucketName = 'edison-staging-media'
$workerUrl = 'https://edison.ntomalaba29.workers.dev'
$repoRoot = Split-Path -Parent $PSScriptRoot

Push-Location $repoRoot
try {
    $whoamiOutput = (& npx.cmd wrangler whoami 2>&1 | Out-String)
    if ($LASTEXITCODE -ne 0) {
        throw "Wrangler authentication check failed:`n$whoamiOutput"
    }
    if ($whoamiOutput -notmatch [regex]::Escape($expectedAccountId)) {
        throw "Wrangler is not authenticated to EDISON's configured Cloudflare account ($expectedAccountId)."
    }

    $bucketListOutput = (& npx.cmd wrangler r2 bucket list 2>&1 | Out-String)
    if ($LASTEXITCODE -ne 0) {
        throw "R2 is not enabled or bucket listing failed. Enable R2 in the Cloudflare dashboard first. No resources were created.`n$bucketListOutput"
    }

    if ($bucketListOutput -notmatch [regex]::Escape($bucketName)) {
        if (-not $CreateR2Bucket) {
            throw "R2 bucket '$bucketName' is missing. After enabling R2 and reviewing its billing terms, run: npm run deploy:cloudflare:create-bucket"
        }

        Write-Host "This will create the empty R2 bucket '$bucketName' in account $expectedAccountId."
        Write-Host 'The bucket itself has no stored objects; future storage and operations are subject to Cloudflare R2 pricing and limits.'
        $confirmation = Read-Host "Type CREATE to continue"
        if ($confirmation -cne 'CREATE') {
            throw 'Bucket creation was not confirmed; no Cloudflare resource was created.'
        }

        & npx.cmd wrangler r2 bucket create $bucketName
        if ($LASTEXITCODE -ne 0) {
            throw "Could not create R2 bucket '$bucketName'."
        }
    }

    & npx.cmd wrangler d1 migrations list edison-staging --remote
    if ($LASTEXITCODE -ne 0) {
        throw 'Remote D1 migration status check failed; deployment stopped.'
    }

    & npm.cmd run lint
    if ($LASTEXITCODE -ne 0) {
        throw 'TypeScript validation failed; deployment stopped.'
    }

    & npm.cmd test -- tests/workerCompatibility.test.ts
    if ($LASTEXITCODE -ne 0) {
        throw 'Focused Worker media compatibility tests failed; deployment stopped.'
    }

    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) {
        throw 'Production build failed; deployment stopped.'
    }

    & npx.cmd wrangler deploy
    if ($LASTEXITCODE -ne 0) {
        throw 'Wrangler deployment failed.'
    }

    foreach ($path in @('/', '/api/health')) {
        $response = Invoke-WebRequest -Uri "$workerUrl$path" -Method Get -TimeoutSec 30 -UseBasicParsing
        if ($response.StatusCode -ne 200) {
            throw "Post-deploy smoke check failed for $path with HTTP $($response.StatusCode)."
        }
        Write-Host "PASS $path (HTTP $($response.StatusCode))"
    }

    $compatibility = Invoke-RestMethod -Uri "$workerUrl/api/_cloudflare/compatibility" -Method Get -TimeoutSec 30
    if (-not $compatibility.mediaStorageConfigured -or -not $compatibility.mediaUploadReady) {
        throw 'Post-deploy compatibility check says R2 media uploads are not ready.'
    }
    Write-Host 'PASS R2 binding is configured and media uploads are reported ready.'
    Write-Host "Deployment verified at $workerUrl"
}
finally {
    Pop-Location
}

Set-Location -Path "extension"

if (Test-Path "out") {
    Remove-Item -Recurse -Force "out"
}

npm run buildall

Set-Location -Path "out"

Compress-Archive -Path * -DestinationPath "../../SCU-Schedule-Helper.zip"
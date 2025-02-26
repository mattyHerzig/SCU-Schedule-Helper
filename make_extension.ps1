Remove-Item -Recurse -Force "SCU-Schedule-Helper.zip"

Set-Location -Path "extension"

if (Test-Path "out") {
    Remove-Item -Recurse -Force "out"
}

npm run buildall

Set-Location -Path "out"

Compress-Archive -Force -Path * -DestinationPath "../../SCU-Schedule-Helper.zip"

Set-Location -Path "../../"
param([string]$Device, [string]$Phase = 'core', [switch]$SkipInstall)
$ErrorActionPreference = 'Stop'
$sdkPath = $env:ANDROID_HOME
if (-not $sdkPath) { $sdkPath = $env:ANDROID_SDK_ROOT }
$adbPath = Join-Path $sdkPath 'platform-tools\adb.exe'
$sdkJar = Join-Path $sdkPath 'platforms\android-35\android.jar'
$toolDirectory = Get-ChildItem -LiteralPath (Join-Path $sdkPath 'build-tools') -Directory | Sort-Object { [version]$_.Name } -Descending | Select-Object -First 1
$testOutput = Join-Path $PSScriptRoot 'build\device-tests'
$targetClasses = Join-Path $PSScriptRoot 'build\classes'
$testClasses = Join-Path $testOutput 'classes'
$testDex = Join-Path $testOutput 'dex'
function Check-Exit([string]$Step) { if ($LASTEXITCODE -ne 0) { throw "$Step failed ($LASTEXITCODE)" } }
if (-not $SkipInstall) {
    New-Item -ItemType Directory -Force -Path $testOutput, $testClasses, $testDex | Out-Null
    Push-Location $PSScriptRoot
    try {
    & javac -encoding UTF-8 --release 8 -classpath "$sdkJar;build\classes" -d 'build\device-tests\classes' 'device-tests\DeviceVerification.java'
    Check-Exit 'Compile instrumentation'
    $testClassFiles = Get-ChildItem -LiteralPath 'build\device-tests\classes' -Recurse -Filter '*.class' | ForEach-Object { Resolve-Path -LiteralPath $_.FullName -Relative }
    & (Join-Path $toolDirectory.FullName 'd8.bat') --lib $sdkJar --classpath 'build\classes' --min-api 26 --output 'build\device-tests\dex' @testClassFiles
    Check-Exit 'Instrumentation DEX'
    } finally { Pop-Location }
    Push-Location $testOutput
    try {
        & (Join-Path $toolDirectory.FullName 'aapt2.exe') link -I $sdkJar --manifest '..\..\device-tests\AndroidManifest.xml' -o unsigned.apk
        Check-Exit 'Instrumentation package'
        & jar uf unsigned.apk -C dex classes.dex
        Check-Exit 'Instrumentation DEX package'
        & (Join-Path $toolDirectory.FullName 'zipalign.exe') -f -p 4 unsigned.apk aligned.apk
        Check-Exit 'Instrumentation alignment'
        & (Join-Path $toolDirectory.FullName 'apksigner.bat') sign --ks (Join-Path $PSScriptRoot 'build\debug.keystore') --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android --out verification.apk aligned.apk
        Check-Exit 'Instrumentation signing'
    } finally { Pop-Location }
    & $adbPath -s $Device install -r (Join-Path $testOutput 'verification.apk')
    Check-Exit 'Install instrumentation'
}
$result = & $adbPath -s $Device shell am instrument -w -r -e phase $Phase com.xiaozhang.island.verification/com.xiaozhang.island.DeviceVerification
$result | Write-Output
Check-Exit 'Run device verification'
if (($result -join "`n") -notmatch 'INSTRUMENTATION_CODE: -1' -or ($result -join "`n") -match 'FAILED after') { throw 'Device verification did not pass.' }

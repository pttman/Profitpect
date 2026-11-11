param([string]$Sdk = $env:ANDROID_HOME, [switch]$SkipWebBuild)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
if (-not $Sdk) { $Sdk = $env:ANDROID_SDK_ROOT }
if (-not $Sdk -or -not (Test-Path -LiteralPath $Sdk)) { throw 'Set ANDROID_HOME to an installed Android SDK.' }
$platform = Join-Path $Sdk 'platforms\android-35\android.jar'
if (-not (Test-Path -LiteralPath $platform)) { throw 'Install Android SDK platform 35.' }
$buildTools = Get-ChildItem -LiteralPath (Join-Path $Sdk 'build-tools') -Directory | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'aapt2.exe') } | Sort-Object { [version]$_.Name } -Descending | Select-Object -First 1
if (-not $buildTools) { throw 'Install Android SDK build-tools 35 or newer.' }
$toolsPath = $buildTools.FullName
$build = Join-Path $PSScriptRoot 'build'
$classes = Join-Path $build 'classes'
$dex = Join-Path $build 'dex'
$assets = Join-Path $build 'assets\web'
New-Item -ItemType Directory -Force -Path $build, $classes, $dex, $assets | Out-Null
function Check-Exit([string]$Step) { if ($LASTEXITCODE -ne 0) { throw "$Step failed ($LASTEXITCODE)" } }
Push-Location $projectRoot
try {
    if (-not $SkipWebBuild) { & npm.cmd run build; Check-Exit 'Web build' }
    # Assets are built into a disposable build directory, never copied over authored sources.
    $assetsAbsolute = [System.IO.Path]::GetFullPath($assets)
    $buildAbsolute = [System.IO.Path]::GetFullPath($build) + [System.IO.Path]::DirectorySeparatorChar
    if (-not $assetsAbsolute.StartsWith($buildAbsolute, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Asset output is outside the build directory.' }
    Remove-Item -LiteralPath $assetsAbsolute -Recurse -Force
    New-Item -ItemType Directory -Force -Path $assetsAbsolute | Out-Null
    Copy-Item -Path (Join-Path $projectRoot 'dist\*') -Destination $assetsAbsolute -Recurse -Force
    $sources = Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'app\src\main\java') -Recurse -Filter '*.java' | ForEach-Object { $_.FullName }
    & javac -encoding UTF-8 --release 8 -classpath $platform -d $classes @sources
    Check-Exit 'Java compilation'
    $classFiles = Get-ChildItem -LiteralPath $classes -Recurse -Filter '*.class' | ForEach-Object { $_.FullName }
    & (Join-Path $toolsPath 'd8.bat') --lib $platform --min-api 26 --output $dex @classFiles
    Check-Exit 'DEX compilation'
    $unsigned = Join-Path $build 'unsigned.apk'
    Push-Location $build
    try {
        & (Join-Path $toolsPath 'aapt2.exe') compile --dir '..\app\src\main\res' -o 'resources.zip'
        Check-Exit 'Android resource compilation'
        & (Join-Path $toolsPath 'aapt2.exe') link -I $platform --manifest '..\app\src\main\AndroidManifest.xml' resources.zip -o 'unsigned.apk'
        Check-Exit 'APK packaging'
        # aapt2 on Windows writes backslashes for nested -A assets. jar uses portable ZIP paths.
        & jar uf unsigned.apk -C . assets -C dex classes.dex
        Check-Exit 'Web assets and DEX packaging'
        $archiveEntries = & jar tf unsigned.apk
        if ($archiveEntries -notcontains 'assets/web/index.html' -or ($archiveEntries | Where-Object { $_.Contains('\') })) { throw 'APK asset paths are not portable.' }
    } finally { Pop-Location }
    $aligned = Join-Path $build 'aligned.apk'
    & (Join-Path $toolsPath 'zipalign.exe') -f -p 4 $unsigned $aligned
    Check-Exit 'APK alignment'
    $key = Join-Path $build 'debug.keystore'
    if (-not (Test-Path -LiteralPath $key)) {
        & keytool -genkeypair -keystore $key -storepass android -keypass android -alias androiddebugkey -dname 'CN=Android Debug,O=Android,C=US' -keyalg RSA -keysize 2048 -validity 10000
        Check-Exit 'Debug signing key'
    }
    $apk = Join-Path $build 'xiaozhang-debug.apk'
    & (Join-Path $toolsPath 'apksigner.bat') sign --ks $key --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android --out $apk $aligned
    Check-Exit 'APK signing'
    & (Join-Path $toolsPath 'apksigner.bat') verify $apk
    Check-Exit 'APK verification'
    Write-Output "APK: $apk"
} finally { Pop-Location }

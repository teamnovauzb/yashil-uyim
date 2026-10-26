$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
$taskRelease = if ($env:YASHILUYIM_RELEASE_DIR) { $env:YASHILUYIM_RELEASE_DIR } else { Join-Path $taskRoot 'releases/google-play-1.0.0' }
$taskVersion = if ($env:YASHILUYIM_VERSION_NAME) { $env:YASHILUYIM_VERSION_NAME } else { '1.0.0' }
$taskCode = if ($env:YASHILUYIM_VERSION_CODE) { $env:YASHILUYIM_VERSION_CODE } else { '1' }
$taskPublicDir = if ($env:YASHILUYIM_PUBLIC_BUNDLE_DIR) { $env:YASHILUYIM_PUBLIC_BUNDLE_DIR } else { 'dist-public' }
$taskAab = [IO.Compression.ZipFile]::OpenRead((Join-Path $taskRelease "yashil-uyim-$taskVersion-$taskCode.aab"))
$taskApk = [IO.Compression.ZipFile]::OpenRead((Join-Path $taskRelease "yashil-uyim-$taskVersion-$taskCode.apk"))
function Read-ZipText($Archive, $Name) {
    $taskEntry = $Archive.GetEntry($Name)
    if (-not $taskEntry) { throw "Missing native asset: $Name" }
    $taskReader = [IO.StreamReader]::new($taskEntry.Open())
    try { return $taskReader.ReadToEnd() } finally { $taskReader.Dispose() }
}
try {
    $taskPlugins = Read-ZipText $taskAab 'base/assets/capacitor.plugins.json' | ConvertFrom-Json
    $taskNames = @($taskPlugins.pkg | Sort-Object)
    if (($taskNames -join ',') -ne '@capacitor/app,@capacitor/browser') { throw 'Unexpected native plugin' }
    $taskHtml = Read-ZipText $taskAab 'base/assets/public/index.html'
    $taskMatch = [regex]::Match($taskHtml, 'src="(/assets/[^" ]+\.js)"')
    if (-not $taskMatch.Success) { throw 'Guest entry script missing' }
    $taskAsset = $taskMatch.Groups[1].Value
    $taskBundleJs = Read-ZipText $taskAab ('base/assets/public' + $taskAsset)
    $taskApkJs = Read-ZipText $taskApk ('assets/public' + $taskAsset)
    $taskBuiltJs = [IO.File]::ReadAllText((Join-Path $taskRoot ($taskPublicDir + $taskAsset)))
    if ($taskBundleJs -cne $taskApkJs -or $taskBundleJs -cne $taskBuiltJs) { throw 'AAB/APK guest code differs from verified build' }
    foreach ($taskForbidden in @('/api/auth/start', '/api/tickets/checkout', 'Telegram orqali kirish', 'html5-qrcode')) {
        if ($taskBundleJs.Contains($taskForbidden)) { throw 'Legacy/private entry in native release' }
    }
    $taskReportPath = Join-Path $taskRelease 'BUILD-VERIFICATION.json'
    $taskReport = Get-Content -LiteralPath $taskReportPath -Raw | ConvertFrom-Json
    $taskReport | Add-Member -NotePropertyName nativePlugins -NotePropertyValue $taskNames -Force
    $taskReport | Add-Member -NotePropertyName aabApkGuestAssetsIdentical -NotePropertyValue $true -Force
    if ($env:YASHILUYIM_OBFUSCATION -eq 'true') {
        $taskMapping = Read-ZipText $taskAab 'BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map'
        $taskSidecar = [IO.File]::ReadAllText((Join-Path $taskRelease 'mapping.txt'))
        if ($taskMapping -cne $taskSidecar) { throw 'Mapping sidecar differs from this exact AAB' }
        $taskReport | Add-Member -NotePropertyName exactMappingVerified -NotePropertyValue $true -Force
    }
    [IO.File]::WriteAllText($taskReportPath, ($taskReport | ConvertTo-Json -Depth 8))
    'Verified actual AAB/APK assets: identical guest bundle, App/Browser plugins only, no private entry points'
} finally { $taskAab.Dispose(); $taskApk.Dispose() }

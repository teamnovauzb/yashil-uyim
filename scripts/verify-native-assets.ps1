$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
$taskRelease = Join-Path $taskRoot 'releases/google-play-1.0.0'
$taskAab = [IO.Compression.ZipFile]::OpenRead((Join-Path $taskRelease 'yashil-uyim-1.0.0-1.aab'))
$taskApk = [IO.Compression.ZipFile]::OpenRead((Join-Path $taskRelease 'yashil-uyim-1.0.0-1.apk'))
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
    $taskBuiltJs = [IO.File]::ReadAllText((Join-Path $taskRoot ('dist-public' + $taskAsset)))
    if ($taskBundleJs -cne $taskApkJs -or $taskBundleJs -cne $taskBuiltJs) { throw 'AAB/APK guest code differs from verified build' }
    foreach ($taskForbidden in @('/api/auth/start', '/api/tickets/checkout', 'Telegram orqali kirish', 'html5-qrcode')) {
        if ($taskBundleJs.Contains($taskForbidden)) { throw 'Legacy/private entry in native release' }
    }
    $taskReportPath = Join-Path $taskRelease 'BUILD-VERIFICATION.json'
    $taskReport = Get-Content -LiteralPath $taskReportPath -Raw | ConvertFrom-Json
    $taskReport | Add-Member -NotePropertyName nativePlugins -NotePropertyValue $taskNames -Force
    $taskReport | Add-Member -NotePropertyName aabApkGuestAssetsIdentical -NotePropertyValue $true -Force
    [IO.File]::WriteAllText($taskReportPath, ($taskReport | ConvertTo-Json -Depth 8))
    'Verified actual AAB/APK assets: identical guest bundle, App/Browser plugins only, no private entry points'
} finally { $taskAab.Dispose(); $taskApk.Dispose() }

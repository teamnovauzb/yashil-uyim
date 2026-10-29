"""Inspect the exported IPA on Windows; this does not replace macOS codesign validation."""
import datetime
import hashlib
import json
import pathlib
import plistlib
import subprocess
import tarfile
import zipfile

root = pathlib.Path(__file__).resolve().parent.parent
out = root / 'releases/app-store-1.0.0'
ipa = out / 'yashil-uyim-1.0.0-1.ipa'
build = json.loads((root / '.local/eas-production-build.json').read_text(encoding='utf-8'))
assert build['id'] == '950ba344-a3d9-4b5b-a1ee-fde6e918ccf1'
assert build['status'] == 'FINISHED' and build['distribution'] == 'STORE'
assert build['app']['id'] == '8b5efc38-b70d-498b-860e-d420f8b3ff55'
assert not build['isForIosSimulator']
verification = out / 'cloud-build'
verification.mkdir(exist_ok=True)
with zipfile.ZipFile(ipa) as archive:
    prefix = 'Payload/App.app/'
    info = plistlib.loads(archive.read(prefix + 'Info.plist'))
    assert info['CFBundleIdentifier'] == 'uz.teamnova.yashiluyim'
    assert info['CFBundleDisplayName'] == 'Yashil Uyim'
    assert info['CFBundleShortVersionString'] == '1.0.0'
    assert info['CFBundleVersion'] == '1'
    assert info['UIDeviceFamily'] == [1]
    assert int(info['DTSDKName'].replace('iphoneos', '').split('.')[0]) >= 26
    assert info['ITSAppUsesNonExemptEncryption'] is False
    assert not any(key.endswith('UsageDescription') for key in info)
    config = json.loads(archive.read(prefix + 'capacitor.config.json'))
    assert sorted(config['packageClassList']) == ['AppPlugin', 'CAPBrowserPlugin']
    assert not config.get('server', {}).get('url')
    manifest_names = [n for n in archive.namelist() if n.endswith('PrivacyInfo.xcprivacy')]
    assert len(manifest_names) >= 3
    for name in manifest_names:
        manifest = plistlib.loads(archive.read(name))
        assert manifest['NSPrivacyTracking'] is False
    resources = plistlib.loads(archive.read(prefix + '_CodeSignature/CodeResources'))['files2']
    js_names = [n for n in archive.namelist() if n.startswith(prefix + 'public/assets/') and n.endswith('.js')]
    assert js_names
    for name in js_names:
        data = archive.read(name)
        relative = name[len(prefix):]
        assert data == (root / '.local/eas-yashiluyim-ios-1.0.0-1/ios/App' / relative).read_bytes()
        assert resources[relative]['hash2'] == hashlib.sha256(data).digest()
        for forbidden in [b'/api/auth/start', b'/api/tickets/checkout', b'html5-qrcode']:
            assert forbidden not in data
    simulator_file = root / '.local/ios-native-refresh/artifacts/simulator-app.tar.gz'
    with tarfile.open(simulator_file) as simulator:
        members = [m for m in simulator.getmembers() if m.isfile() and '/public/assets/' in m.name and m.name.endswith('.js')]
        assert len(members) == len(js_names)
        for member in members:
            suffix = member.name[member.name.index('/public/assets/'):]
            assert simulator.extractfile(member).read() == archive.read('Payload/App.app' + suffix)
    (verification / 'installed-icon.png').write_bytes(archive.read(prefix + 'AppIcon60x60@2x.png'))
    profile_file = root / '.local/yashiluyim-embedded.mobileprovision'
    profile_file.write_bytes(archive.read(prefix + 'embedded.mobileprovision'))
    decoded = root / '.local/yashiluyim-profile.plist'
    openssl = pathlib.Path('C:/Program Files/Git/usr/bin/openssl.exe')
    subprocess.run([str(openssl), 'cms', '-verify', '-inform', 'DER', '-in', str(profile_file), '-noverify', '-out', str(decoded)], check=True, capture_output=True)
    profile = plistlib.loads(decoded.read_bytes())
    assert profile['TeamIdentifier'] == ['HB4NQBS6LM']
    assert profile['Entitlements']['application-identifier'] == 'HB4NQBS6LM.uz.teamnova.yashiluyim'
    assert profile['Entitlements']['get-task-allow'] is False
    assert not profile.get('ProvisionedDevices') and not profile.get('ProvisionsAllDevices')
    assert profile['ExpirationDate'] > datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
report = {
    'buildId': build['id'], 'projectId': build['app']['id'], 'status': build['status'],
    'bundleId': info['CFBundleIdentifier'], 'version': info['CFBundleShortVersionString'], 'build': info['CFBundleVersion'],
    'sha256': hashlib.sha256(ipa.read_bytes()).hexdigest(), 'bytes': ipa.stat().st_size,
    'sdk': info['DTSDKName'], 'minimumIOS': info['MinimumOSVersion'], 'deviceFamilies': info['UIDeviceFamily'],
    'isSimulator': False, 'distribution': 'App Store', 'appleTeamId': profile['TeamIdentifier'][0],
    'profileCmsSignatureVerifiedWithoutTrustChain': True, 'profileAppIdentityAndExpiryVerified': True,
    'guestJavaScriptMatchesSourceSnapshot': True, 'sealedResourceHashesMatch': True,
    'nativeSimulatorJavaScriptMatchesSignedIPA': True,
    'privacyManifestsIncluded': manifest_names, 'sensitivePermissionUsageDescriptions': False,
    'localMacOSCodeSignatureVerificationPerformed': False, 'physicalDeviceTested': False,
    'verificationTime': datetime.datetime.now(datetime.timezone.utc).isoformat(),
}
store_state = json.loads((root / 'store/release-status.json').read_text(encoding='utf-8'))
report['appStoreConnectUploaded'] = store_state['ios']['uploadState'] == 'FINISHED'
report['appleProcessingState'] = store_state['ios']['appleProcessingState']
report['appleProcessedBuildId'] = store_state['ios']['processedBuildId']
report['appReviewSubmitted'] = store_state['initialReviewActuallySubmitted']
(verification / 'IPA-VERIFICATION.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, indent=2))

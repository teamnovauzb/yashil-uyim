const {spawnSync}=require('node:child_process');const fs=require('node:fs');const path=require('node:path');
if(process.platform!=='darwin')throw Error('Run only on the isolated EAS macOS builder');
function run(command,args,capture=false){const r=spawnSync(command,args,{encoding:'utf8',...(capture?{}:{stdio:'inherit'})});if(r.status!==0)throw Error(command+' failed');return r.stdout?.trim()}
fs.mkdirSync('artifacts',{recursive:true});
const runtimes=JSON.parse(run('xcrun',['simctl','list','runtimes','--json'],true)).runtimes.filter(r=>r.isAvailable&&r.name.startsWith('iOS')).sort((a,b)=>b.version.localeCompare(a.version,undefined,{numeric:true}));
const devices=JSON.parse(run('xcrun',['simctl','list','devices','available','--json'],true)).devices;
let selected;
for(const runtime of runtimes){selected=(devices[runtime.identifier]||[]).find(d=>d.name.includes('Pro Max'));if(selected)break}
if(!selected)throw Error('No large-display iPhone Simulator is available');
if(selected.state!=='Booted')run('xcrun',['simctl','boot',selected.udid]);
run('xcrun',['simctl','bootstatus',selected.udid,'-b']);
run('set-env',['IOS_SIMULATOR_UDID',selected.udid]);
run('xcrun',['simctl','status_bar',selected.udid,'override','--time','9:41','--dataNetwork','wifi','--wifiMode','active','--wifiBars','3','--batteryState','charged','--batteryLevel','100']);
run('xcodebuild',['-project','ios/App.xcodeproj','-scheme','App','-configuration','Release','-sdk','iphonesimulator','-destination','id='+selected.udid,'-derivedDataPath','build-simulator','CODE_SIGNING_ALLOWED=NO','build']);
const app=path.resolve('build-simulator/Build/Products/Release-iphonesimulator/App.app');
run('xcrun',['simctl','install',selected.udid,app]);
run('xcrun',['simctl','launch',selected.udid,'uz.teamnova.yashiluyim']);
run('tar',['-czf','artifacts/simulator-app.tar.gz','-C',path.dirname(app),'App.app']);
fs.writeFileSync('artifacts/SIMULATOR.json',JSON.stringify({device:selected.name,udid:selected.udid,xcode:run('xcodebuild',['-version'],true),nativeAppBuilt:true,source:'same bundled Supabase guest entry as the signed build; simulator binary compiled separately',capturedOnActualSimulator:true},null,2));

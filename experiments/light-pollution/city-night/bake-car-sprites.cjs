/* Production rebuild uses selected Seedream paintings; never substitute procedural guides. */
const {spawnSync}=require('child_process'),path=require('path');
const result=spawnSync(process.env.PYTHON||'python',[path.join(__dirname,'tooling/vehicle-variants/pack.py'),process.argv[2]||path.join(__dirname,'tooling/vehicle-variants/sources')],{stdio:'inherit'});
if(result.status!==0)process.exitCode=result.status??1;else{const geometry=spawnSync(process.execPath,[path.join(__dirname,'tooling/vehicle-variants/create-pose-guides.cjs'),path.join(__dirname,'tooling/vehicle-variants/sources'),'--mesh'],{stdio:'inherit'});process.exitCode=geometry.status??1;}

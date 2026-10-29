const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),policy=require('./readme-policy.json'),errors=[];
const sections=['当前功能与状态','职责边界','文件与子目录索引','使用方法','公开接口与数据','依赖与解耦策略','验证与已知限制'];let checked=0;
function walk(dir){const relative=path.relative(root,dir).replaceAll('\\','/');if(Object.keys(policy.immutableSubtrees).some(p=>relative===p||relative.startsWith(p+'/')))return;
 const file=path.join(dir,'README.md');if(!fs.existsSync(file))errors.push(relative+': missing README.md');else{
  checked++;const text=fs.readFileSync(file,'utf8');for(const section of sections)if(!text.includes('## '+section))errors.push(relative+': missing section '+section);
  for(const m of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){const target=m[1].split('#')[0];if(!target||/^(?:https?:|mailto:|data:)/.test(target))continue;const resolved=path.resolve(dir,decodeURI(target));if(!fs.existsSync(resolved))errors.push(relative+': broken link '+target);}
  for(const command of text.matchAll(/(?:node|python) (experiments\/light-pollution\/[^\s`]+\.(?:cjs|js|py))/g))if(!fs.existsSync(path.resolve(root,'../..',command[1])))errors.push(relative+': missing command '+command[1]);
  for(const entry of fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory()&&!policy.excludedDirectoryNames.includes(e.name))){const child=path.relative(root,path.join(dir,entry.name)).replaceAll('\\','/');if(Object.hasOwn(policy.immutableSubtrees,child))continue;if(!text.includes(entry.name+'/README.md'))errors.push(relative+': missing child index '+entry.name);}
 }
 for(const e of fs.readdirSync(dir,{withFileTypes:true}))if(e.isDirectory()&&!policy.excludedDirectoryNames.includes(e.name))walk(path.join(dir,e.name));
}walk(root);if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`PASS ${checked} directory READMEs, seven sections, local links and child indexes; immutable snapshots explicitly excluded`);

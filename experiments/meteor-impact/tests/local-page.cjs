/* The GLB loader needs an HTTP origin. Each test owns an isolated local server. */
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
module.exports=async function localPage(){
 const root=path.resolve(__dirname,'../../..');
 const server=http.createServer((request,response)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(request.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)){response.writeHead(403).end();return;}
  try{if(!fs.statSync(file).isFile())throw Error('not a file');}catch{response.writeHead(404).end();return;}
  response.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(response);
 });
 await new Promise((resolve,reject)=>{server.on('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return {url:`http://127.0.0.1:${server.address().port}/experiments/meteor-impact/index.html`,close:()=>new Promise(resolve=>server.close(resolve))};
};

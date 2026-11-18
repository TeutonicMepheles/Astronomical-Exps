export function localSolarStages(skyAt,{start=Math.PI-.08,end=Math.PI+.08}={}){
 const gap=(phi,inner=false)=>{const q=skyAt(phi);return q.sep-(inner?Math.abs(q.sunR-q.moonR):q.sunR+q.moonR);};
 const samples=Array.from({length:321},(_,i)=>start+(end-start)*i/320);
 let best=0;for(let i=1;i<samples.length;i++)if(gap(samples[i])<gap(samples[best]))best=i;
 if(gap(samples[best])>=0)return [];
 const solve=(a,b,inner=false)=>{for(let i=0;i<48;i++){const mid=(a+b)/2;if((gap(a,inner)<=0)===(gap(mid,inner)<=0))a=mid;else b=mid;}return(a+b)/2;};
 let left=best,right=best;while(left>0&&gap(samples[left])<=0)left--;while(right<samples.length-1&&gap(samples[right])<=0)right++;
 if(left===0&&gap(samples[left])<=0||right===samples.length-1&&gap(samples[right])<=0)return [];
 const first=solve(samples[left],samples[left+1]),last=solve(samples[right-1],samples[right]);
 let a=first,b=last;for(let i=0;i<48;i++){const x=a+(b-a)/3,y=b-(b-a)/3;if(gap(x)<gap(y))b=y;else a=x;}const mid=(a+b)/2,q=skyAt(mid),central=q.sep<=Math.abs(q.sunR-q.moonR),annular=q.moonR<q.sunR;
 return [{name:'初亏',phi:first,kind:'contact'},central?{name:annular?'环食始':'食既',phi:solve(first,mid,true),kind:'contact'}:{name:'偏食加深',phi:(first+mid)/2,kind:'teaching'}, {name:'食甚',phi:mid,kind:'maximum'},central?{name:annular?'环食终':'生光',phi:solve(mid,last,true),kind:'contact'}:{name:'偏食减退',phi:(mid+last)/2,kind:'teaching'}, {name:'复圆',phi:last,kind:'contact'}];
}

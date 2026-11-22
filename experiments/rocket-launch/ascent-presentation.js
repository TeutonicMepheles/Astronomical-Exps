// Camera framing for the launch model.
export function ascentView(progress,{pullback=.7,rise=10,span=70,height=800,center=400}={}){const p=Math.max(0,Math.min(1,progress)),zoom=1/(1+pullback*p);return{zoom,rise:rise*p,offset:-rise*p/span*height*zoom,center};}

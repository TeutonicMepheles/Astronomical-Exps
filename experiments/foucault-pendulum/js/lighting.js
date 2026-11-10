export const defaultLighting={highlightColor:'#e9e9f7',highlightStrength:.51,highlightRange:1.53,highlightGrain:4,highlightGrainScale:3.35,rimColor:'#a5aec0',rimStrength:1.18,ambientColor:'#7f7de8',ambientStrength:.75};
export const lighting={...defaultLighting};
export const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
// Latitude-grid dash: dashLen/gap in DEGREES of geographic longitude.
export const defaultGrid={dashLen:4,dashGap:2};
export const grid={...defaultGrid};
// Pedestal (meridian ring) placement + contact-shadow strength. x/y = the
// ring's circle CENTRE (aligned to the globe centre); scale anchors at the centre.
export const defaultPedestal={x:370,y:415,scale:0.37,baseShadow:0.62,ballShadow:0.52};
export const pedestal={...defaultPedestal};
// Presentation-only filters for the hall artwork; these do not change any
// experiment value or the separately rendered wall-screen content.
export const defaultBackground={brightness:.86,contrast:1.2};
export const background={...defaultBackground};

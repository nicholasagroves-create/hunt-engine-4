// Reusable drag-to-rotate compass rose mechanic. No DOM persistence.
const NS="http://www.w3.org/2000/svg";
const node=(tag,attrs={},label)=>{const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(label!==undefined)e.textContent=label;return e;};
const normalize=n=>((n%360)+360)%360;
export function mountCompass(host,{puzzle,onSubmit}){
 const config=puzzle.mechanicConfig||{},symbols=config.symbols||["sun","star","moon","cloud","anchor","mountain","tree","wave"];
 const correct=Number.isInteger(config.targetSymbolIndex)?config.targetSymbolIndex:0;
 const svg=node("svg",{viewBox:"0 0 440 440",class:"compass-svg",role:"img","aria-label":"Rotate the compass rose to point East toward the sun"});
 const defs=node("defs"),gradient=node("linearGradient",{id:"compass-gold",x1:"0",y1:"0",x2:"1",y2:"1"});
 for(const [offset,color] of [["0%","#fff0b0"],["35%","#c79843"],["65%","#f7d78c"],["100%","#926a2e"]])gradient.append(node("stop",{offset,"stop-color":color}));defs.append(gradient);svg.append(defs);
 svg.append(node("circle",{cx:220,cy:220,r:219,fill:"#10283a"}));
 const drawSymbol=(g,name)=>{
  const common={fill:"none",stroke:"#e6c17b","stroke-width":2.3,"stroke-linecap":"round","stroke-linejoin":"round"};
  const paths={sun:["M-12 0 A12 12 0 1 0 12 0 A12 12 0 1 0 -12 0","M0 -23 V-18 M0 18 V23 M-23 0 H-18 M18 0 H23 M-16 -16 L-13 -13 M13 13 L16 16 M16 -16 L13 -13 M-13 13 L-16 16"],star:["M0 -23 L5 -7 L22 -7 L9 3 L14 20 L0 10 L-14 20 L-9 3 L-22 -7 L-5 -7 Z"],moon:["M12 -19 A22 22 0 1 0 12 19 A17 17 0 0 1 12 -19 Z"],cloud:["M-22 10 H18 A10 10 0 0 0 18 -10 A14 14 0 0 0 -9 -13 A12 12 0 0 0 -22 10 Z"],anchor:["M0 -23 V15 M-9 -15 H9 M-21 6 Q-18 25 0 25 Q18 25 21 6 M-21 6 L-14 11 M21 6 L14 11","M-5 -20 A5 5 0 1 0 5 -20 A5 5 0 1 0 -5 -20"],mountain:["M-24 18 L-6 -16 L4 0 L13 -12 L26 18 Z","M-12 -5 L-6 1 L0 -5"],tree:["M0 25 V8 M-19 8 L0 -22 L19 8 Z M-15 -2 H15"],wave:["M-25 -8 Q-12 -19 0 -8 T25 -8 M-25 4 Q-12 -7 0 4 T25 4 M-25 16 Q-12 5 0 16 T25 16"]};
  for(const d of paths[name]||paths.star)g.append(node("path",{d,...common}));
 };
 symbols.slice(0,8).forEach((symbol,i)=>{const a=i*Math.PI/4,px=220+193*Math.sin(a),py=220-193*Math.cos(a);const g=node("g",{transform:`translate(${px} ${py})`});g.append(node("circle",{r:25,fill:"#163449",stroke:"#5f7a83","stroke-width":1.4}));drawSymbol(g,symbol);svg.append(g);});
 const guide=node("g",{"aria-hidden":"true"});guide.append(node("circle",{cx:220,cy:220,r:168,fill:"none",stroke:"#6f8d8f","stroke-width":1.5}));for(let i=0;i<8;i++){const a=i*Math.PI/4;guide.append(node("line",{x1:220+161*Math.sin(a),y1:220-161*Math.cos(a),x2:220+175*Math.sin(a),y2:220-175*Math.cos(a),stroke:"#e6c17b","stroke-width":2.5}));}svg.append(guide);
 const wheel=node("g",{class:"compass-wheel"});wheel.append(node("circle",{cx:220,cy:220,r:125,fill:"#122a3d",stroke:"url(#compass-gold)","stroke-width":5}));
 wheel.append(node("circle",{cx:220,cy:220,r:113,fill:"none",stroke:"#ba9454","stroke-width":2}));
 for(let i=0;i<48;i++){const a=i*Math.PI/24;wheel.append(node("line",{x1:220+115*Math.sin(a),y1:220-115*Math.cos(a),x2:220+(i%6===0?105:110)*Math.sin(a),y2:220-(i%6===0?105:110)*Math.cos(a),stroke:"#d6b16c","stroke-width":i%6===0?2.5:1}));}
 const rose=node("g",{transform:"translate(220 220)"});
 for(let i=0;i<8;i++){const a=i*45,major=i%2===0;rose.append(node("path",{d:major?"M0 -90 L17 0 L0 90 L-17 0 Z":"M0 -76 L10 0 L0 76 L-10 0 Z",transform:`rotate(${a})`,fill:major?"url(#compass-gold)":"#b28b4b",stroke:"#e8c785","stroke-width":1}));}
 rose.append(node("circle",{r:9,fill:"#f5d992",stroke:"#7c592a","stroke-width":2}));wheel.append(rose);
 ["N","E","S","W"].forEach((label,i)=>{const a=i*Math.PI/2;wheel.append(node("text",{x:220+146*Math.sin(a),y:220-146*Math.cos(a)+7,"text-anchor":"middle",fill:"#f0ce85","font-size":24,"font-family":"Georgia,serif","font-weight":"bold"},label));});
 svg.append(wheel);host.append(svg);
 let angle=0,start=null,drag=false;
 const render=()=>wheel.setAttribute("transform",`rotate(${angle} 220 220)`);
 const point=e=>{const r=svg.getBoundingClientRect(),x=(e.clientX-r.left)*440/r.width-220,y=(e.clientY-r.top)*440/r.height-220;return {x,y,theta:Math.atan2(y,x)*180/Math.PI};};
 svg.addEventListener("pointerdown",e=>{const p=point(e);if(Math.hypot(p.x,p.y)>164)return;drag=true;start=p.theta;svg.setPointerCapture(e.pointerId);});
 svg.addEventListener("pointermove",e=>{if(!drag)return;const next=point(e).theta;let delta=next-start;if(delta>180)delta-=360;if(delta< -180)delta+=360;angle=normalize(angle+delta);start=next;render();});
 const finish=()=>{if(!drag)return;drag=false;angle=normalize(Math.round(angle/45)*45);render();};
 svg.addEventListener("pointerup",finish);svg.addEventListener("pointercancel",finish);
 const feedback=document.createElement("p");feedback.className="puzzle-feedback";feedback.setAttribute("role","status");
 const button=document.createElement("button");button.type="button";button.className="primary-button";button.textContent="Set compass";button.addEventListener("click",()=>{const eastDirection=normalize(angle+90);const target=normalize(correct*45);if(Math.abs(((eastDirection-target+540)%360)-180)>1){feedback.textContent="Not quite. Turn the compass and try again.";return;}onSubmit();});
 host.append(button,feedback);
 return {get angle(){return angle;}};
}

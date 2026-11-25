import {resolveDiscovery,parseDiscoveryInput} from "../core/discovery.js";
import {openCameraScanner} from "./scanner.js";
// Task 7: configurable application shell. Mechanics and scanner arrive in Phase 2.
const DEFAULT_NAV=[
 {id:"archive",label:"Archive",icon:"▦"},
 {id:"scan",label:"Scan",icon:"⌾",prominent:true},
 {id:"transmissions",label:"Messages",icon:"✉",module:"transmissions"},
 {id:"finale",label:"Finale",icon:"✦",module:"finale"}
];
const DEFAULT_ARCHIVE=[
 {id:"characters",label:"Characters",layout:"characters",module:"characters"},
 {id:"journal",label:"Journal",layout:"journal",module:"journal"},
 {id:"inventory",label:"Inventory",layout:"inventory",module:"inventory"}
];
const ICONS={archive:"▦",scan:"⌾",transmissions:"✉",finale:"✦",characters:"◉",journal:"▤",inventory:"◇"};
const validId=v=>typeof v==="string"&&/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(v);
function resolveTabs(config,fallback,modules){
 const source=Array.isArray(config)?config:fallback;
 return source.filter(t=>t&&validId(t.id)&&t.enabled!==false&&(!t.module||modules[t.module]!==false))
  .map(t=>({id:t.id,label:String(t.label||t.id),icon:String(t.icon||ICONS[t.id]||"◇"),layout:String(t.layout||t.id),prominent:t.prominent===true}));
}
function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
function btn(text,fn,cls=""){const node=el("button",cls,text);node.type="button";node.addEventListener("click",fn);return node;}
function listPanel(title,description,entries,open){
 const section=el("section","collection");
 section.append(el("h2","section-heading",title),el("p","muted",description));
 if(!entries.length)section.append(el("p","empty-state","Nothing here yet. Keep exploring!"));
 for(const item of entries)section.append(btn(item.title,()=>open(item),"collection-item"));
 return section;
}
export function mountShell(root,{game,content,store}){
 const nav=resolveTabs(game.navigation,DEFAULT_NAV,game.modules||{});
 const archive=resolveTabs(game.archiveTabs,DEFAULT_ARCHIVE,game.modules||{});
 if(!nav.length)throw Error("Adventure needs at least one navigation destination");
 const transition=game.shell?.transition||"fade";
 const save=store.read();
 let screen=nav.some(t=>t.id===save.navigation.lastMeaningfulScreen)?save.navigation.lastMeaningfulScreen:nav[0].id;
 let tab=archive.some(t=>t.id===save.navigation.archiveTab)?save.navigation.archiveTab:archive[0]?.id;
 let selected=save.navigation.archiveItemId||null;
 let detail=null, puzzle=false, scanning=false, manual=false, scanMessage="", activePuzzle=null, scannerSession=null, onboarding=!save.onboarding.completed&&game.onboarding?.enabled!==false;
 const scrolls={...(save.navigation.archiveScroll||{})};
 let screenScroll=0;
 const wrapper=el("div","app-shell");
 root.replaceChildren(wrapper);
 const persist=mutator=>{try{store.transact(mutator);return true;}catch(e){window.alert(e.message);return false;}};
 const remember=()=>{
  persist(s=>{s.navigation.lastMeaningfulScreen=screen;s.navigation.archiveTab=tab||null;s.navigation.archiveItemId=selected;s.navigation.archiveScroll=scrolls;});
 };
 function stopScanner(){if(scannerSession){scannerSession.stop();scannerSession=null;}scanning=false;}
 function switchScreen(id){
  if(puzzle||onboarding)return;
  stopScanner();manual=false;scanMessage="";
  if(screen==="archive")captureScroll();
  screen=id;detail=null;remember();render();if(id==="scan")startScanner();
 }
 function captureScroll(){
  const pane=wrapper.querySelector(".screen-body");
  if(pane&&screen==="archive"&&tab)scrolls[tab]=pane.scrollTop;
 }
 function switchTab(id){
  captureScroll();tab=id;selected=null;detail=null;remember();render();
 }
 function openItem(item){
  selected=item.id;detail=item;remember();render();
 }
 function startOnboarding(){
  if(!persist(s=>{s.onboarding.completed=true;if(game.tutorial?.enabled!==true)s.onboarding.tutorialCompleted=true;}))return;
  onboarding=false;remember();render();
 }
async function startScanner(){
  if(onboarding||puzzle||screen!=="scan")return;
  stopScanner();manual=false;scanMessage="";scanning=true;render();
  const video=wrapper.querySelector("#scanner-video");
  if(!video)return;
  const session=openCameraScanner(video,{onCode:raw=>handleDiscovery(raw),onError:message=>{scanMessage=message;scanning=false;render();}});
  scannerSession=session;
  try{await session.start();}catch(e){if(scannerSession===session){scanMessage=e.message||"Camera unavailable";scanning=false;render();}}
 }
 function handleDiscovery(raw){
  const parsed=parseDiscoveryInput(raw,game.id,location.href);
  if(!parsed.ok){scanMessage=parsed.message;render();return;}
  const result=resolveDiscovery(parsed.code,content.puzzles||[],store.read());
  if(!result.ok){scanMessage=result.message;render();return;}
  stopScanner();manual=false;scanMessage="";
  if(result.status==="locked"){scanMessage="This discovery is locked. Complete its prerequisites first.";render();return;}
  if(result.status==="ready"){try{store.discoverPuzzle(result.puzzle.id);}catch(e){scanMessage=e.message;render();return;}}
  activePuzzle=result.puzzle;puzzle=true;render();
 }
 function renderScanner(body){
  const head=el("header","screen-header");head.append(el("h1","","Scan"));body.append(head);
  const area=el("section","scanner-panel");
  if(manual){
   area.append(el("h2","","Enter discovery code"),el("p","muted","Enter the five-character code printed beneath the QR."));
   const form=el("form","code-form");
   const input=el("input","code-input");input.type="text";input.maxLength=5;input.autocomplete="off";input.autocapitalize="characters";input.spellcheck=false;input.placeholder="A7K3P";input.setAttribute("aria-label","Five-character discovery code");input.setAttribute("pattern","[A-Za-z0-9]{5}");input.required=true;
   input.addEventListener("input",()=>{input.value=input.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,5);});
   form.append(input,btn("Find discovery",()=>{if(input.reportValidity())handleDiscovery(input.value);},"primary-button"));
   form.addEventListener("submit",event=>{event.preventDefault();if(input.reportValidity())handleDiscovery(input.value);});
   area.append(form,btn("← Back to camera",()=>{manual=false;startScanner();},"back-button"));
  }else{
   const camera=el("div","camera-frame");
   const video=el("video","camera-video");video.id="scanner-video";video.autoplay=true;video.playsInline=true;video.muted=true;video.setAttribute("aria-label","Live QR camera");
   camera.append(video,el("div","camera-guide"));area.append(camera);
   area.append(el("p","muted","Point your camera at a hunt QR code."));
   if(!scanning)area.append(btn("Open camera",startScanner,"primary-button"));
   area.append(btn("Can't scan? Enter a 5-character code",()=>{stopScanner();manual=true;scanMessage="";render();},"manual-link"));
  }
  if(scanMessage){const error=el("p","scanner-message",scanMessage);error.setAttribute("role","status");area.append(error);}
  body.append(area);
 }
  function renderArchive(body){
  const head=el("header","screen-header");head.append(el("h1","", "The Archive"));body.append(head);
  if(!archive.length){body.append(el("p","empty-state","No archive collections enabled for this adventure."));return;}
  if(archive.length>1){
   const tabs=el("div","archive-tabs");tabs.setAttribute("role","tablist");tabs.setAttribute("aria-label","Archive collections");
   for(const t of archive){const b=btn(t.label,()=>switchTab(t.id),"archive-tab"+(tab===t.id?" active":""));b.setAttribute("role","tab");b.setAttribute("aria-selected",String(tab===t.id));tabs.append(b);}
   body.append(tabs);
  }
  const pane=el("div","screen-body");body.append(pane);
  const t=archive.find(t=>t.id===tab)||archive[0];
  if(!t)return;
  if(detail){
   pane.append(btn("← Back to "+t.label,()=>{detail=null;render();},"back-button"));
   pane.append(el("h2","",detail.title),el("p","muted","Content view placeholder · "+t.label));
  }else if(t.layout==="characters"){
   const revealed=new Set(store.read().characters.revealed);
   const items=(content.characters||[]).filter(c=>revealed.has(c.id)).map(c=>({id:c.id,title:c.name||c.title||c.id}));
   pane.append(listPanel("Your characters","Characters and their puzzle tiles appear here as the story unfolds.",items,openItem));
  }else if(t.layout==="journal"){
   const unlocked=new Set(store.read().journals.unlocked);
   const items=(content.journals||[]).filter(j=>unlocked.has(j.id)).map(j=>({id:j.id,title:j.title||j.id}));
   pane.append(listPanel("Your journal","Collected story entries, in the order this adventure defines.",items,openItem));
  }else if(t.layout==="inventory"){
   const collected=new Set(store.read().inventory.collected);
   const items=(content.inventory||[]).filter(i=>collected.has(i.id)).map(i=>({id:i.id,title:i.name||i.title||i.id}));
   pane.append(listPanel("Your inventory","Items you've collected on your journey.",items,openItem));
  }else{
   pane.append(listPanel(t.label,"Custom collection template · content presentation will be supplied by this adventure.",[],openItem));
  }
  requestAnimationFrame(()=>{if(wrapper.contains(pane))pane.scrollTop=scrolls[tab]||0;});
 }
 function renderContent(body){
  if(screen==="archive"){renderArchive(body);return;}
  if(screen==="scan"){renderScanner(body);return;}
  const t=nav.find(t=>t.id===screen);
  const heading=t?.label||screen;
  body.append(el("header","screen-header",undefined));
  body.lastChild.append(el("h1","",heading));
  const panel=el("section","feature-panel");
  if(screen==="transmissions"){
   panel.append(el("div","feature-icon","✉"),el("h2","","Transmissions"),el("p","muted","Clues and messages will appear here when the adventure sends them."));
  }else if(screen==="finale"){
   panel.append(el("div","feature-icon","✦"),el("h2","","Final mechanism"),el("p","muted","Your adventure's final challenge will be available when its conditions are met."));
  }else{
   panel.append(el("h2","",heading),el("p","muted","This adventure destination is ready for its content."));
  }
  body.append(panel);
 }
 function render(){
  wrapper.replaceChildren();
  wrapper.className="app-shell transition-"+(transition==="none"?"none":"fade");
  if(onboarding){
   const intro=el("main","welcome");
   const icon=el("img","welcome-icon");icon.src="./icon-192.png";icon.alt="Hunt compass";
   intro.append(icon,el("p","eyebrow","HUNT ENGINE 4.0 · DEV"),el("h1","",game.name),el("p","muted","Your adventure starts here."));
   if(game.tutorial?.enabled===true){
    intro.append(el("p","muted","This adventure requires a tutorial before regular navigation. Tutorial playback will be connected in Phase 2."));
    intro.append(el("p","fine-print","Navigation remains locked until the tutorial is implemented."));
   }else intro.append(btn("Start adventure",startOnboarding,"primary-button"));
   wrapper.append(intro);return;
  }
  if(puzzle){
   const full=el("main","puzzle-screen");
   const top=el("header","puzzle-header");
   top.append(btn("✕ Exit",()=>{puzzle=false;activePuzzle=null;render();},"exit-button"),el("span","puzzle-label",activePuzzle?.title||"Puzzle"));
   full.append(top);
   const inner=el("section","puzzle-placeholder");inner.append(el("h1","",activePuzzle?.title||"Puzzle workspace"),el("p","muted","Discovery recognized. Puzzle mechanics arrive in a later Phase 2 task. Exit returns without completing this puzzle."));full.append(inner);
   wrapper.append(full);return;
  }
  const top=el("header","app-topbar");
  const identity=el("div","brand");identity.append(el("span","brand-mark","✦"),el("span","",game.name));top.append(identity);
  top.append(el("span","dev-label","DEV"));
  wrapper.append(top);
  const body=el("main","app-content");body.id="main-content";renderContent(body);wrapper.append(body);
  const bottom=el("nav","bottom-nav");bottom.setAttribute("aria-label","Main navigation");
  for(const t of nav){
   const b=btn("",()=>switchScreen(t.id),"nav-item"+(t.prominent?" prominent":"")+(screen===t.id?" active":""));
   b.setAttribute("aria-label",t.label);if(screen===t.id)b.setAttribute("aria-current","page");
   b.append(el("span","nav-icon",t.icon),el("span","nav-label",t.label));bottom.append(b);
  }
  wrapper.append(bottom);
 }
 render();
 if(!onboarding&&screen==="scan")requestAnimationFrame(startScanner);
 const params=new URL(location.href).searchParams;
 const incoming=params.get("code");
 if(incoming){history.replaceState(null,"",location.pathname+location.hash);if(!onboarding){screen="scan";remember();render();handleDiscovery(incoming);}else{persist(s=>{s.onboarding.pendingInitialQr=incoming;});}}
 window.addEventListener("pagehide",stopScanner);
}

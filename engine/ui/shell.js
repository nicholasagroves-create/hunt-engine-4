import {mountCompass} from "./compass.js";
import {openCurrentChain,currentChain} from "../core/story-controller.js";
import {createPuzzleController} from "../core/puzzle-controller.js";
import {openingSteps,nextOpeningStep,canSkipOpeningStep} from "../core/onboarding.js";
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
 const opening=openingSteps(game,content);
 let screen=nav.some(t=>t.id===save.navigation.lastMeaningfulScreen)?save.navigation.lastMeaningfulScreen:nav[0].id;
 let tab=archive.some(t=>t.id===save.navigation.archiveTab)?save.navigation.archiveTab:archive[0]?.id;
 let selected=save.navigation.archiveItemId||null;
 let tutorialPreview=false, tutorialStep=null, detail=null, puzzle=false, scanning=false, manual=false, scanMessage="", activePuzzle=null, puzzleController=null, puzzleReplay=false, scannerSession=null, replayOpening=false, onboarding=!save.onboarding.completed&&game.onboarding?.enabled!==false;
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
 function advanceOpening(step,skipped=false){
  if(step.type==="tutorial-puzzle")return;
  if(!replayOpening&&step.grants){if(!persist(s=>{for(const id of step.grants.journals||[])if(!s.journals.unlocked.includes(id))s.journals.unlocked.push(id);for(const id of step.grants.inventory||[])if(!s.inventory.collected.includes(id))s.inventory.collected.push(id);for(const id of step.grants.achievements||[])if(!s.achievements.includes(id))s.achievements.push(id);}))return;}
  if(!replayOpening&&step.id==="dev-narrative"&&!store.read().story.completedChains.length){try{openCurrentChain(store,content.storyChains||[]);}catch(e){window.alert(e.message);return;}}
  if(step.type==="access"){
   const input=wrapper.querySelector("#player-access-name");
   const name=input?.value.trim();
   if(!name){input?.focus();return;}
   if(!persist(s=>{s.player.name=name.slice(0,100);s.player.access="active";if(!replayOpening)s.onboarding.completedScreens.push(step.id);} ))return;
  }else if(!replayOpening){
   if(!persist(s=>{const key=skipped?"skippedScreens":"completedScreens";s.onboarding[key].push(step.id);
    if(step.type==="launch"){s.onboarding.completed=true;s.onboarding.tutorialCompleted=game.tutorial?.enabled!==true;}
   }))return;
  }
  if(step.type==="launch"){
   replayOpening=false;onboarding=false;
   const pending=store.read().onboarding.pendingInitialQr;
   if(pending&&!store.read().onboarding.rescanPromptShown){
    persist(s=>{s.onboarding.rescanPromptShown=true;s.onboarding.pendingInitialQr=null;});
    screen="scan";remember();render();
    scanMessage="Opening complete. Scan the discovery code again to begin the puzzle.";render();return;
   }
   remember();render();return;
  }
  render();
 }
 function renderOpening(){
  const step=replayOpening?opening[replayIndex]:nextOpeningStep(opening,store.read());
  if(!step){onboarding=false;replayOpening=false;render();return;}
  const stage=el("main","opening-stage opening-"+step.type);
  stage.append(el("p","eyebrow","HUNT ENGINE 4.0 · OPENING TEST"));
  const count=replayOpening?replayIndex+1:Math.max(1,opening.findIndex(s=>s.id===step.id)+1);
  stage.append(el("p","opening-progress","Stage "+count+" of "+opening.length));
  const headings={access:"Player access",studio:"Studio introduction",sponsor:"Sponsor presentation",title:"Adventure title",narrative:"Narrative introduction",instruction:"Instructions",launch:"Adventure launch","tutorial-puzzle":"Interactive tutorial"};
  stage.append(el("h1","",step.presentation?.heading||headings[step.type]||step.id));
  for(const block of step.contentBlocks||[]){
   if(block.type==="text")stage.append(el("p","opening-copy",block.text));
   else if(block.type==="image"){const img=el("img","opening-media");img.src=block.src;img.alt=block.alt||"";stage.append(img);}
   else if(block.type==="audio"||block.type==="video"){const media=el(block.type,"opening-media");media.controls=true;media.src=block.src;stage.append(media);if(block.transcript)stage.append(el("p","muted",block.transcript));}
   else if(block.type==="document")stage.append(el("p","muted",block.caption||"Document available in the adventure."));
  }
  if(step.type==="access"&&!replayOpening){
   const input=el("input","opening-name");input.id="player-access-name";input.type="text";input.maxLength=100;input.autocomplete="name";input.placeholder="Your name";input.value=store.read().player.name||"";input.setAttribute("aria-label","Player name");stage.append(input);
  }
  if(step.type==="tutorial-puzzle"){
   const target=(content.puzzles||[]).find(p=>p.id===step.puzzleId);
   if(!target){stage.append(el("p","muted","Tutorial puzzle missing."));}
   else if(!store.read().journals.unlocked.includes(target.mechanicConfig?.requiredJournalId)&&!replayOpening){stage.append(el("p","muted","Journal 1 must be unlocked before the tutorial."));}
   else stage.append(btn("Begin compass puzzle",()=>{activePuzzle=target;tutorialStep=step;tutorialPreview=replayOpening;puzzleReplay=tutorialPreview;puzzleController=createPuzzleController({puzzle:target,store,storyChains:content.storyChains||[],replay:tutorialPreview,tutorialShelfCharacterId:store.read().story.completedChains.length?(content.storyChains||[])[0]?.archiveAssignment:null});puzzle=true;render();},"primary-button"));
  }else{
   stage.append(btn(step.type==="launch"?"Enter adventure":step.type==="access"?"Continue":"Continue",()=>{if(replayOpening){if(replayIndex<opening.length-1){replayIndex++;render();}else{replayOpening=false;render();}}else advanceOpening(step);},"primary-button"));
   if(!replayOpening&&canSkipOpeningStep(step))stage.append(btn("Skip this screen",()=>advanceOpening(step,true),"opening-skip"));
  }
  if(replayOpening)stage.append(btn("Exit preview",()=>{replayOpening=false;render();},"opening-skip"));
  wrapper.append(stage);
 }
 let replayIndex=0;
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
  activePuzzle=result.puzzle;puzzleReplay=false;puzzleController=createPuzzleController({puzzle:activePuzzle,store,storyChains:content.storyChains||[]});puzzle=true;render();
 }
 function replayTile(puzzleId){
  const target=(content.puzzles||[]).find(p=>p.id===puzzleId);
  if(!target){window.alert("This puzzle is no longer in the adventure packet.");return;}
  stopScanner();activePuzzle=target;puzzleReplay=true;
  puzzleController=createPuzzleController({puzzle:target,store,storyChains:content.storyChains||[],replay:true});
  puzzle=true;render();
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
  const active=currentChain(content.storyChains||[],store.read());
  const head=el("header","screen-header");head.append(el("h1","", "The Archive"));body.append(head);
  if(active){const status=el("div","story-status");status.append(el("strong","",`Story chapter ${active.sequence}`),el("p","muted",store.read().story.openedChains.includes(active.id)?"Chapter opened. Complete an eligible puzzle to advance.":"A new chapter is ready."));if(!store.read().story.openedChains.includes(active.id))status.append(btn("Open chapter",()=>{try{openCurrentChain(store,content.storyChains);render();}catch(e){window.alert(e.message);}},"primary-button"));body.append(status);}else if((content.storyChains||[]).length)body.append(el("p","story-status","All test chapters completed."));
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
   pane.append(el("h2","",detail.title));
   if(t.layout==="characters"){
    const assigned=store.read().characters.tiles.filter(tile=>tile.characterId===detail.id);
    const shelf=el("section","character-shelf");shelf.append(el("h3","","Completed puzzles"));
    if(!assigned.length)shelf.append(el("p","muted","No completed puzzle tiles on this shelf yet."));
    for(const tile of assigned){const source=(content.puzzles||[]).find(p=>p.id===tile.puzzleId);
     const card=btn("",()=>replayTile(tile.puzzleId),"puzzle-tile");
     card.append(el("span","puzzle-tile-icon","✓"),el("span","puzzle-tile-title",source?.title||tile.puzzleId),el("span","puzzle-tile-action","Replay puzzle"));
     shelf.append(card);
    }
    pane.append(shelf);
   }else if(t.layout==="journal"){
    for(const block of detail.contentBlocks||[])if(block.type==="text")pane.append(el("p","journal-entry",block.text));
   }else pane.append(el("p","muted","Content view placeholder · "+t.label));
  }else if(t.layout==="characters"){
   const revealed=new Set(store.read().characters.revealed);
   const items=(content.characters||[]).filter(c=>revealed.has(c.id)).map(c=>({id:c.id,title:c.name||c.title||c.id}));
   pane.append(listPanel("Your characters","Characters and their puzzle tiles appear here as the story unfolds.",items,openItem));
  }else if(t.layout==="journal"){
   const unlocked=new Set(store.read().journals.unlocked);
   const items=(content.journals||[]).filter(j=>unlocked.has(j.id)).map(j=>({id:j.id,title:j.title||j.id,contentBlocks:j.contentBlocks}));
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
  if(puzzle){
   const full=el("main","puzzle-screen");
   const top=el("header","puzzle-header");
   top.append(btn("✕ Exit",()=>{puzzle=false;activePuzzle=null;puzzleController=null;puzzleReplay=false;tutorialStep=null;render();},"exit-button"),el("span","puzzle-label",activePuzzle?.title||"Puzzle"));
   full.append(top);
   const inner=el("section","puzzle-placeholder");
   inner.append(el("h1","",activePuzzle?.title||"Puzzle workspace"));
   if(puzzleController?.completed){
    inner.append(el("p","puzzle-success",puzzleReplay?"✓ Replay solved":"✓ Puzzle completed"),el("p","muted",puzzleReplay?"Your original completion and shelf placement are unchanged.":"This discovery is already recorded. Reopening it never awards progress twice."));
    if(!puzzleReplay&&store.read().puzzles.completed.includes(activePuzzle?.id))inner.append(btn("Replay puzzle",()=>{puzzleReplay=true;puzzleController=createPuzzleController({puzzle:activePuzzle,store,storyChains:content.storyChains||[],replay:true});render();},"primary-button"));
    if(tutorialStep){inner.append(btn("Continue",()=>{if(!tutorialPreview)persist(s=>{if(!s.onboarding.completedScreens.includes(tutorialStep.id))s.onboarding.completedScreens.push(tutorialStep.id);s.onboarding.tutorialCompleted=true;});puzzle=false;activePuzzle=null;puzzleController=null;puzzleReplay=false;tutorialStep=null;if(tutorialPreview){tutorialPreview=false;if(replayOpening){replayIndex++;}else{screen="archive";tab="characters";detail=null;}}render();},"primary-button"));}
    if(activePuzzle?.advancesStory&&!puzzleReplay)inner.append(el("p","muted","Check Archive → Journal for story updates."));
   }else if(activePuzzle?.mechanic==="compass-rotation"){
    for(const instruction of activePuzzle.instructions||[])if(instruction.type==="text")inner.append(el("p","muted",instruction.text));
    mountCompass(inner,{puzzle:activePuzzle,onSubmit:()=>{const result=puzzleController.submit();if(result.status==="completed")render();}});
   }else if(activePuzzle?.mechanic==="answer-entry"){
    for(const instruction of activePuzzle.instructions||[])if(instruction.type==="text")inner.append(el("p","muted",instruction.text));
    const input=el("input","puzzle-answer");input.type="text";input.autocomplete="off";input.autocapitalize="characters";input.spellcheck=false;input.placeholder="Your answer";input.setAttribute("aria-label","Puzzle answer");
    const status=el("p","puzzle-feedback");status.setAttribute("role","status");
    const form=el("form","puzzle-form");form.append(input);
    const submit=btn("Submit answer",()=>{puzzleController.setAnswer(input.value);const result=puzzleController.submit();if(result.status==="completed")render();else status.textContent=result.message||"";},"primary-button");
    form.append(submit);form.addEventListener("submit",event=>{event.preventDefault();submit.click();});
    inner.append(form,status,el("p","fine-print","Exit discards your unfinished answer."));
   }else inner.append(el("p","muted","This mechanic is not installed yet. Exit without recording a completion."));
   full.append(inner);
   wrapper.append(full);return;
  }
  if(onboarding||replayOpening){renderOpening();return;}
  const top=el("header","app-topbar");
  const identity=el("div","brand");identity.append(el("span","brand-mark","✦"),el("span","",game.name));top.append(identity);
  top.append(btn("Replay opening",()=>{stopScanner();replayIndex=0;replayOpening=true;render();},"dev-replay"));
  if(game.tutorial?.enabled)top.append(btn("Complete tutorial",()=>{const step=opening.find(s=>s.type==="tutorial-puzzle");if(!step)return;stopScanner();activePuzzle=(content.puzzles||[]).find(p=>p.id===step.puzzleId);if(!activePuzzle)return;tutorialStep=step;tutorialPreview=false;puzzleReplay=store.read().puzzles.completed.includes(activePuzzle.id);puzzleController=createPuzzleController({puzzle:activePuzzle,store,storyChains:content.storyChains||[],replay:puzzleReplay,tutorialShelfCharacterId:(content.storyChains||[])[0]?.archiveAssignment});puzzle=true;render();},"dev-replay"));
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
 if(incoming){history.replaceState(null,"",location.pathname+location.hash);if(!onboarding){screen="scan";remember();render();handleDiscovery(incoming);}else{const parsed=parseDiscoveryInput(incoming,game.id,location.href);if(parsed.ok)persist(s=>{s.onboarding.pendingInitialQr=parsed.code;});}}
 window.addEventListener("pagehide",stopScanner);
}

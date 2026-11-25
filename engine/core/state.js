// Durable accomplishments only; never persist unfinished puzzle attempts.
export const SAVE_VERSION=1;
const valid=id=>typeof id==="string"&&/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(id);
const clone=value=>JSON.parse(JSON.stringify(value));
const unique=items=>[...new Set(items)];
const ids=value=>unique(Array.isArray(value)?value.filter(valid):[]);
const object=value=>value!==null&&typeof value==="object"&&!Array.isArray(value);
export function newSave(gameId){
 if(!valid(gameId))throw Error("Invalid game ID");
 return {saveVersion:SAVE_VERSION,gameId,revision:0,player:{name:null,access:"unverified"},
 onboarding:{completed:false,completedScreens:[],skippedScreens:[],tutorialSteps:[],tutorialCompleted:false,pendingInitialQr:null,rescanPromptShown:false},
 puzzles:{discovered:[],completed:[]},story:{openedChains:[],completedChains:[],activeChainId:null},
 characters:{revealed:[],completed:[],biographySections:[],tiles:[]},
 journals:{unlocked:[],read:[]},inventory:{collected:[],applied:[]},
 transmissions:{active:[],dismissed:[],pending:[]},achievements:[],
 finale:{completed:false,masteryCompleted:false},
 navigation:{lastMeaningfulScreen:null,lastViewedCharacterId:null,latestTileCharacterId:null},
 settings:{muted:false}};
}
function normalize(raw,gameId){
 if(!object(raw)||raw.saveVersion!==SAVE_VERSION||raw.gameId!==gameId)throw Error("Incompatible save");
 const s=newSave(gameId);
 s.revision=Number.isSafeInteger(raw.revision)&&raw.revision>=0?raw.revision:0;
 s.player.name=typeof raw.player?.name==="string"?raw.player.name.slice(0,100):null;
 s.player.access=["unverified","active","recovery-needed"].includes(raw.player?.access)?raw.player.access:"unverified";
 for(const k of ["completedScreens","skippedScreens","tutorialSteps"])s.onboarding[k]=ids(raw.onboarding?.[k]);
 for(const k of ["completed","tutorialCompleted","rescanPromptShown"])s.onboarding[k]=raw.onboarding?.[k]===true;
 s.onboarding.pendingInitialQr=valid(raw.onboarding?.pendingInitialQr)?raw.onboarding.pendingInitialQr:null;
 for(const k of ["discovered","completed"])s.puzzles[k]=ids(raw.puzzles?.[k]);
 for(const k of ["openedChains","completedChains"])s.story[k]=ids(raw.story?.[k]);
 s.story.activeChainId=valid(raw.story?.activeChainId)?raw.story.activeChainId:null;
 for(const k of ["revealed","completed","biographySections"])s.characters[k]=ids(raw.characters?.[k]);
 s.characters.tiles=Array.isArray(raw.characters?.tiles)?raw.characters.tiles.filter(t=>object(t)&&valid(t.puzzleId)&&valid(t.characterId)).map(t=>({puzzleId:t.puzzleId,characterId:t.characterId})):[];
 for(const k of ["unlocked","read"])s.journals[k]=ids(raw.journals?.[k]);
 for(const k of ["collected","applied"])s.inventory[k]=ids(raw.inventory?.[k]);
 for(const k of ["active","dismissed","pending"])s.transmissions[k]=ids(raw.transmissions?.[k]);
 s.achievements=ids(raw.achievements);
 s.finale.completed=raw.finale?.completed===true;
 s.finale.masteryCompleted=raw.finale?.masteryCompleted===true;
 for(const k of ["lastMeaningfulScreen","lastViewedCharacterId","latestTileCharacterId"])s.navigation[k]=valid(raw.navigation?.[k])?raw.navigation[k]:null;
 s.settings.muted=raw.settings?.muted===true;
 return s;
}
export function createSaveStore(gameId,storage=globalThis.localStorage){
 const key="hunt4:save:"+gameId;let state;
 try{const saved=storage.getItem(key);state=saved===null?newSave(gameId):normalize(JSON.parse(saved),gameId);}
 catch(error){throw Error("Save could not be read; existing progress preserved: "+error.message);}
 const read=()=>clone(state);
 function transact(mutator){
  const draft=clone(state);mutator(draft);const next=normalize(draft,gameId);next.revision=state.revision+1;
  try{storage.setItem(key,JSON.stringify(next));}
  catch(error){throw Error("Progress could not be saved: "+error.message);}
  state=next;return read();
 }
 function award(section,field,id){
  if(!valid(id))throw Error("Invalid ID");
  if(state[section][field].includes(id))return read();
  return transact(s=>s[section][field].push(id));
 }
 return {read,transact,
  discoverPuzzle:id=>award("puzzles","discovered",id),
  unlockJournal:id=>award("journals","unlocked",id),
  collectItem:id=>award("inventory","collected",id),
  earnAchievement(id){
   if(!valid(id))throw Error("Invalid ID");
   if(state.achievements.includes(id))return read();
   return transact(s=>s.achievements.push(id));
  },
  completePuzzle({puzzleId,chainId=null,openingJournals=[],closingJournals=[],inventory=[],achievements=[],tileCharacterId=null}={}){
   if(!valid(puzzleId)||chainId!==null&&!valid(chainId)||tileCharacterId!==null&&!valid(tileCharacterId))throw Error("Invalid completion ID");
   if(state.puzzles.completed.includes(puzzleId))return {awarded:false,save:read()};
   if(![...openingJournals,...closingJournals,...inventory,...achievements].every(valid))throw Error("Invalid reward ID");
   const save=transact(s=>{
    s.puzzles.discovered=unique([...s.puzzles.discovered,puzzleId]);s.puzzles.completed.push(puzzleId);
    s.journals.unlocked=unique([...s.journals.unlocked,...openingJournals,...closingJournals]);
    s.inventory.collected=unique([...s.inventory.collected,...inventory]);
    s.achievements=unique([...s.achievements,...achievements]);
    if(chainId&&!s.story.completedChains.includes(chainId))s.story.completedChains.push(chainId);
    if(tileCharacterId){s.characters.tiles.push({puzzleId,characterId:tileCharacterId});s.navigation.latestTileCharacterId=tileCharacterId;}
   });
   return {awarded:true,save};
  }
 };
}

import {newSave,createSaveStore} from "./state.js";
const assert=(v,msg)=>{if(!v)throw Error(msg);};
const db=new Map(),storage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,v)};
const s=createSaveStore("home-edition",storage);
assert(s.read().puzzles.completed.length===0,"initial");
s.discoverPuzzle("p1");
const r=s.completePuzzle({puzzleId:"p1",chainId:"c1",openingJournals:["j1"],closingJournals:["j2"],inventory:["key"],achievements:["first"],tileCharacterId:"megan"});
assert(r.awarded&&r.save.revision===2,"atomic completion");
assert(!s.completePuzzle({puzzleId:"p1"}).awarded,"idempotent");
const loaded=createSaveStore("home-edition",storage).read();
assert(loaded.journals.unlocked.join(",")==="j1,j2","journals");
assert(loaded.characters.tiles[0].characterId==="megan","tile");
assert(!("attempts" in loaded.puzzles),"no attempt persistence");
assert(createSaveStore("other-game",storage).read().puzzles.completed.length===0,"game isolation");
db.set("hunt4:save:home-edition",JSON.stringify({...newSave("home-edition"),saveVersion:999}));
let protectedSave=false;try{createSaveStore("home-edition",storage);}catch(e){protectedSave=e.message.includes("preserved");}
assert(protectedSave&&JSON.parse(db.get("hunt4:save:home-edition")).saveVersion===999,"protect incompatible saves");
console.log("Save-state tests passed");

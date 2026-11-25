import {validateSchema} from "./validate.js";
const definitions = {puzzles:"puzzle",storyChains:"story-chain",characters:"character",journals:"journal",inventory:"inventory",transmissions:"transmission",achievements:"achievement",skins:"skin",openingScreens:"opening-screen"};
const schemaUrl = name => new URL("../schemas/"+name+".schema.json",import.meta.url);
async function json(url) { const response=await fetch(url); if (!response.ok) throw Error("Could not load "+url.pathname+" ("+response.status+")"); try {return await response.json();} catch {throw Error("Invalid JSON in "+url.pathname);} }
function referenceChecks(game,content) {
  const errors=[], index={};
  for (const [kind,records] of Object.entries(content)) index[kind]=new Set(records.map(r=>r.id));
  const check=(kind,id,where)=>{if(!index[kind].has(id))errors.push(where+": unknown "+kind+" ID "+id);};
  const rewards=(arr,where)=>{for(const [i,id] of (arr||[]).entries()) if(!index.inventory.has(id)&&!index.achievements.has(id))errors.push(where+"["+i+"]: unknown reward "+id);};
  for(const [i,p] of content.puzzles.entries()){
    if(p.entryMethod==="qr" && game.modules?.qr===false)errors.push("puzzles["+i+"]: QR module disabled");
    rewards(p.rewards,"puzzles["+i+"].rewards");
  }
  const sequences=new Set();
  for(const [i,s] of content.storyChains.entries()){
    const where="storyChains["+i+"]";
    if(sequences.has(s.sequence))errors.push(where+": duplicate story sequence "+s.sequence);
    sequences.add(s.sequence);
    for(const id of s.openingEntries||[])check("journals",id,where+".openingEntries");
    for(const id of s.closingEntries||[])check("journals",id,where+".closingEntries");
    if(s.archiveAssignment)check("characters",s.archiveAssignment,where+".archiveAssignment");
    for(const id of s.characterCompletion||[])check("characters",id,where+".characterCompletion");
    rewards(s.rewards,where+".rewards");
  }
  for(const [i,t] of content.transmissions.entries())check("puzzles",t.targetPuzzleId,"transmissions["+i+"].targetPuzzleId");
  for(const [i,a] of content.achievements.entries())rewards(a.rewards,"achievements["+i+"].rewards");
  for(const [i,s] of content.openingScreens.entries()){
    const where="openingScreens["+i+"]";
    for(const id of s.grants?.journals||[])check("journals",id,where+".grants.journals");
    for(const id of s.grants?.inventory||[])check("inventory",id,where+".grants.inventory");
    for(const id of s.grants?.achievements||[])check("achievements",id,where+".grants.achievements");
  }
  for(const id of game.openingSequence?.screenIds||[])check("openingScreens",id,"openingSequence.screenIds");
  if(game.openingSequence?.studioDefaultId)check("openingScreens",game.openingSequence.studioDefaultId,"openingSequence.studioDefaultId");
  for(const step of game.tutorial?.steps||[])check(step.type==="puzzle"?"puzzles":"openingScreens",step.id,"tutorial.steps");
  if(game.skinId)check("skins",game.skinId,"skinId");
  if(game.launch?.archive?.defaultCharacterId)check("characters",game.launch.archive.defaultCharacterId,"launch.archive.defaultCharacterId");
  const requirements={characters:"characters",journal:"journals",inventory:"inventory",transmissions:"transmissions",achievements:"achievements"};
  for(const [module,kind] of Object.entries(requirements))if(game.modules?.[module]===false&&content[kind].length)errors.push(kind+": content present while module disabled");
  return errors;
}
export async function loadAdventure(gameId) {
  if(!/^[a-z0-9][a-z0-9-]*$/.test(gameId))throw Error("Invalid adventure ID");
  const base=new URL("../../games/"+gameId+"/",import.meta.url);
  const game=await json(new URL("game.json",base));
  const schemas=await Promise.all(["game",...Object.values(definitions)].map(async name=>[name,await json(schemaUrl(name))]));
  const schema=Object.fromEntries(schemas);
  const errors=validateSchema(game,schema.game,"game");
  if(game.id!==gameId)errors.push("game.id does not match selected adventure");
  if(errors.length)throw Error("Adventure validation failed: "+errors.join("; "));
  const content={};
  for(const [kind,definition] of Object.entries(definitions)) {
    const path=game.content[kind];
    const url=new URL(path,base);
    if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname))throw Error("Content path escapes adventure: "+kind);
    const records=await json(url);
    if(!Array.isArray(records)){errors.push(kind+": expected an array");continue;}
    content[kind]=records;
    const seen=new Set();
    for(const [i,record] of records.entries()){
      errors.push(...validateSchema(record,schema[definition],kind+"["+i+"]"));
      if(record && typeof record.id==="string"){if(seen.has(record.id))errors.push(kind+": duplicate ID "+record.id);seen.add(record.id);}
    }
  }
  if(!errors.length)errors.push(...referenceChecks(game,content));
  if(errors.length)throw Error("Adventure validation failed: "+errors.join("; "));
  return {game,content};
}

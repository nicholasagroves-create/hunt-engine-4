// Story progression is independent of QR scan order and puzzle mechanics.
const uniq=items=>[...new Set(items)];
export function orderedChains(chains){return [...chains].sort((a,b)=>a.sequence-b.sequence);}
export function currentChain(chains,save){return orderedChains(chains).find(c=>!save.story.completedChains.includes(c.id))||null;}
export function openCurrentChain(store,chains){
 const chain=currentChain(chains,store.read());
 if(!chain)return null;
 if(store.read().story.openedChains.includes(chain.id))return chain;
 store.transact(s=>{
  if(s.story.openedChains.includes(chain.id))return;
  s.story.openedChains.push(chain.id);s.story.activeChainId=chain.id;
  s.journals.unlocked=uniq([...s.journals.unlocked,...(chain.openingEntries||[])]);
  if(chain.archiveAssignment)s.characters.revealed=uniq([...s.characters.revealed,chain.archiveAssignment]);
 });
 return chain;
}
export function completeWithStory(store,puzzle,chains){
 const save=store.read();
 if(save.puzzles.completed.includes(puzzle.id))return {awarded:false,chain:null,save};
 const chain=puzzle.advancesStory===true?currentChain(chains,save):null;
 const rewards=puzzle.rewards||[];
 const result=store.completePuzzle({
  puzzleId:puzzle.id,chainId:chain?.id||null,
  openingJournals:chain?.openingEntries||[],closingJournals:chain?.closingEntries||[],
  inventory:rewards.filter(id=>!id.startsWith("achievement:")),
  achievements:rewards.filter(id=>id.startsWith("achievement:")).map(id=>id.slice(12)),
  tileCharacterId:chain?.archiveAssignment||null
 });
 if(result.awarded&&chain){
  store.transact(s=>{
   s.story.openedChains=uniq([...s.story.openedChains,chain.id]);
   s.story.activeChainId=null;
   if(chain.archiveAssignment)s.characters.revealed=uniq([...s.characters.revealed,chain.archiveAssignment]);
   s.characters.completed=uniq([...s.characters.completed,...(chain.characterCompletion||[])]);
  });
 }
 return {...result,chain};
}

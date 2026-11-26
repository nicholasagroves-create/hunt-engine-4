// Phase 2: mechanic-independent puzzle lifecycle. Attempts are never persisted.
export function createPuzzleController({puzzle,store}){
 let answer="",feedback="",finished=false;
 const alreadyCompleted=store.read().puzzles.completed.includes(puzzle.id);
 function setAnswer(value){answer=String(value).slice(0,100);}
 function submit(){
  if(finished||alreadyCompleted)return {status:"completed",awarded:false};
  if(puzzle.mechanic!=="answer-entry")return {status:"unsupported",message:"This mechanic is not installed yet."};
  const expected=String(puzzle.solution??"").trim().toUpperCase();
  if(!expected)return {status:"unsupported",message:"This puzzle has no configured solution."};
  if(answer.trim().toUpperCase()!==expected){feedback="Not quite. Try again.";return {status:"incorrect",message:feedback};}
  // Future story controller will supply chain and journal rewards.
  const inventory=[],achievements=[];
  for(const id of puzzle.rewards||[]){if(id.startsWith("achievement:"))achievements.push(id.slice(12));else inventory.push(id);}
  const result=store.completePuzzle({puzzleId:puzzle.id,inventory,achievements});
  finished=true;feedback="Puzzle completed!";
  return {status:"completed",awarded:result.awarded,message:feedback};
 }
 return {setAnswer,submit,get feedback(){return feedback;},get completed(){return finished||alreadyCompleted;},get answer(){return answer;},get puzzle(){return puzzle;}};
}

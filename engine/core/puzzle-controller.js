// Phase 2: mechanic-independent puzzle lifecycle. Attempts are never persisted.
import {completeWithStory} from "./story-controller.js";
export function createPuzzleController({puzzle,store,storyChains=[]}){
 let answer="",feedback="",finished=false;
 const alreadyCompleted=store.read().puzzles.completed.includes(puzzle.id);
 function setAnswer(value){answer=String(value).slice(0,100);}
 function submit(){
  if(finished||alreadyCompleted)return {status:"completed",awarded:false};
  if(puzzle.mechanic!=="answer-entry")return {status:"unsupported",message:"This mechanic is not installed yet."};
  const expected=String(puzzle.solution??"").trim().toUpperCase();
  if(!expected)return {status:"unsupported",message:"This puzzle has no configured solution."};
  if(answer.trim().toUpperCase()!==expected){feedback="Not quite. Try again.";return {status:"incorrect",message:feedback};}
  const result=completeWithStory(store,puzzle,storyChains);
  finished=true;feedback="Puzzle completed!";
  return {status:"completed",awarded:result.awarded,message:feedback};
 }
 return {setAnswer,submit,get feedback(){return feedback;},get completed(){return finished||alreadyCompleted;},get answer(){return answer;},get puzzle(){return puzzle;}};
}

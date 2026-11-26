// Content-driven opening sequence. Never completes tutorial puzzles by itself.
export function openingSteps(game,content){
 const screens=new Map((content.openingScreens||[]).map(s=>[s.id,s]));
 const steps=(game.openingSequence?.screenIds||[]).map(id=>screens.get(id)).filter(Boolean);
 if(game.tutorial?.enabled)for(const item of game.tutorial.steps||[])steps.push(item.type==="instruction"?screens.get(item.id):{id:item.id,type:"tutorial-puzzle",puzzleId:item.id});
 return [...steps.filter(Boolean),{id:"adventure-launch",type:"launch",contentBlocks:[{type:"text",text:"Opening sequence complete. Your adventure is ready."}]}];
}
export function nextOpeningStep(steps,save){
 const done=new Set([...save.onboarding.completedScreens,...save.onboarding.skippedScreens]);
 return steps.find(step=>!done.has(step.id))||null;
}
export function canSkipOpeningStep(step){return ["studio","sponsor","narrative","instruction"].includes(step.type)&&step.skippable===true;}

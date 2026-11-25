import {activeGame} from "../game-selection.js";
import {loadAdventure} from "./core/content.js";
const title=document.querySelector("#game"),status=document.querySelector("#status");
try {
  const {game,content}=await loadAdventure(activeGame);
  title.textContent=game.name;
  const total=Object.values(content).reduce((n,records)=>n+records.length,0);
  status.textContent="Adventure validated · "+total+" content records ready";
} catch(error) {
  status.textContent="Content error · "+error.message;
  console.error("Hunt adventure loading failed",error);
}
if("serviceWorker" in navigator)navigator.serviceWorker.register(new URL("../service-worker.js",import.meta.url)).catch(error=>{status.textContent+=" · Offline setup failed";console.error(error);});

import {activeGame} from "../game-selection.js";
import {loadAdventure} from "./core/content.js";
import {createSaveStore} from "./core/state.js";
import {mountShell} from "./ui/shell.js";
const root=document.querySelector("#app");
try{
 const {game,content}=await loadAdventure(activeGame);
 const store=createSaveStore(game.id);
 mountShell(root,{game,content,store});
}catch(error){
 root.replaceChildren();
 const main=document.createElement("main");main.className="loading";
 const h=document.createElement("h1");h.textContent="Unable to start adventure";
 const p=document.createElement("p");p.setAttribute("role","alert");p.textContent=error.message;
 main.append(h,p);root.append(main);console.error("Hunt adventure loading failed",error);
}
if("serviceWorker" in navigator)navigator.serviceWorker.register(new URL("../service-worker.js",import.meta.url)).catch(console.error);

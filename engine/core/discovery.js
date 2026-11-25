// One resolver for QR payloads and printed five-character discovery codes.
export const CODE_PATTERN=/^[A-Z0-9]{5}$/;
export function parseDiscoveryInput(raw,gameId,baseUrl){
 const value=String(raw||"").trim();
 if(CODE_PATTERN.test(value.toUpperCase()))return {ok:true,code:value.toUpperCase()};
 let url;try{url=new URL(value,baseUrl);}catch{return {ok:false,message:"This is not a hunt discovery code."};}
 const expected=new URL(baseUrl);
 if(url.origin!==expected.origin||url.pathname.replace(/\/$/,"")!==expected.pathname.replace(/\/$/,""))return {ok:false,message:"This QR belongs to another destination."};
 const code=url.searchParams.get("code")?.toUpperCase();
 const adventure=url.searchParams.get("game");
 if(adventure&&adventure!==gameId)return {ok:false,message:"This QR belongs to another adventure."};
 if(!code||!CODE_PATTERN.test(code))return {ok:false,message:"This QR does not contain a valid five-character discovery code."};
 return {ok:true,code};
}
export function resolveDiscovery(code,puzzles,save){
 if(!CODE_PATTERN.test(code))return {ok:false,message:"Enter exactly five letters or numbers."};
 const matches=puzzles.filter(p=>p.discoveryCode?.toUpperCase()===code&&p.enabled!==false);
 if(matches.length!==1)return {ok:false,message:"Discovery code not recognized for this adventure."};
 const puzzle=matches[0];
 if(save.puzzles.completed.includes(puzzle.id))return {ok:true,status:"completed",puzzle};
 // A real prerequisite controller will replace this conservative rule in Phase 2.
 if(Array.isArray(puzzle.prerequisites)&&puzzle.prerequisites.length)return {ok:true,status:"locked",puzzle};
 return {ok:true,status:"ready",puzzle};
}

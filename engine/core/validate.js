// Small, dependency-free validator for the JSON Schema keywords used by Hunt packets.
// Unrecognized schema keywords are rejected rather than silently ignored.
const supported = new Set(["$schema","title","type","required","properties","additionalProperties","items","minLength","minimum","minItems","uniqueItems","enum","const","pattern","allOf","if","then","else","description"]);
const object = v => v !== null && typeof v === "object" && !Array.isArray(v);
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
function walk(value, schema, path, errors) {
  if (!object(schema)) { errors.push(path + ": invalid schema"); return; }
  for (const key of Object.keys(schema)) if (!supported.has(key)) errors.push(path + ": unsupported schema keyword " + key);
  if ("type" in schema) {
    const ok = {object:object(value),array:Array.isArray(value),string:typeof value==="string",boolean:typeof value==="boolean",number:typeof value==="number"&&Number.isFinite(value),integer:Number.isInteger(value)}[schema.type];
    if (!ok) { errors.push(path + ": expected " + schema.type); return; }
  }
  if ("const" in schema && !same(value,schema.const)) errors.push(path + ": must equal " + JSON.stringify(schema.const));
  if (schema.enum && !schema.enum.some(v=>same(v,value))) errors.push(path + ": value not in enum");
  if (typeof value==="string") {
    if (schema.minLength!==undefined && value.length<schema.minLength) errors.push(path + ": string too short");
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(path + ": pattern mismatch");
  }
  if (typeof value==="number" && schema.minimum!==undefined && value<schema.minimum) errors.push(path + ": below minimum");
  if (Array.isArray(value)) {
    if (schema.minItems!==undefined && value.length<schema.minItems) errors.push(path + ": too few items");
    if (schema.uniqueItems && value.some((v,i)=>value.slice(0,i).some(p=>same(p,v)))) errors.push(path + ": duplicate items");
    if (schema.items) value.forEach((v,i)=>walk(v,schema.items,path+"["+i+"]",errors));
  }
  if (object(value)) {
    for (const k of schema.required||[]) if (!(k in value)) errors.push(path + ": missing " + k);
    for (const [k,v] of Object.entries(value)) {
      if (schema.properties && k in schema.properties) walk(v,schema.properties[k],path+"."+k,errors);
      else if (schema.additionalProperties===false) errors.push(path + ": unknown property " + k);
      else if (object(schema.additionalProperties)) walk(v,schema.additionalProperties,path+"."+k,errors);
    }
  }
  for (const sub of schema.allOf||[]) walk(value,sub,path,errors);
  if (schema.if) {
    const matches=[];
    walk(value,schema.if,path,matches);
    if (!matches.length && schema.then) walk(value,schema.then,path,errors);
    if (matches.length && schema.else) walk(value,schema.else,path,errors);
  }
}
export function validateSchema(value,schema,path="$") { const errors=[]; walk(value,schema,path,errors); return errors; }

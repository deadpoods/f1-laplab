import {simulate,defaultScenario,contributions,sensitivity,compare} from './engine.mjs';
let db;
const cache=new Map();
const cached=s=>{const key=JSON.stringify(s);if(cache.has(key))return cache.get(key);const r=simulate(db,s);cache.set(key,r);if(cache.size>25)cache.delete(cache.keys().next().value);return r;};
export function run(dbArg,a,b){
 db=dbArg;
 const result=cached(a),reference=cached({...defaultScenario(db,a.circuit),driver:a.driver,car:a.car}),other=cached(b);
 return {result,reference,other,contribution:contributions(db,a),sensitivity:sensitivity(db,a),comparison:compare(result,other)};
}
if(typeof self!=='undefined'&&typeof window==='undefined')self.onmessage=e=>{
 const {type,id,a,b}=e.data;
 if(type==='init'){db=e.data.db;self.postMessage({type:'ready'});return;}
 try{self.postMessage({type:'result',id,...run(db,a,b)});}catch(err){self.postMessage({type:'error',id,message:err.message});}
};

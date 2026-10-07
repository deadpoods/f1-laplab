import {parameterSweep,simulateStint} from './lab.mjs';
self.onmessage=e=>{const {id,type,db,scenario,options}=e.data;try{const result=type==='sweep'?parameterSweep(db,scenario,options):type==='stint'?simulateStint(db,scenario,options):null;if(!result)throw Error('Unknown experiment.');self.postMessage({id,result});}catch(error){self.postMessage({id,error:error.message});}};

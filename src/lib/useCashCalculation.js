import { useEffect, useRef, useState } from 'react';

export function useCashCalculation({ calculate, workflow, payload, enabled = true, initialValue = null, delay = 120 }) {
  const [calculation,setCalculation]=useState(initialValue);
  const [error,setError]=useState('');
  const requestId=useRef(0);
  useEffect(()=>{
    if(!enabled||!calculate)return undefined;
    const id=++requestId.current;
    const timer=setTimeout(()=>{
      calculate(workflow,payload).then((result)=>{
        if(id!==requestId.current)return;
        setCalculation(result);setError('');
      }).catch((failure)=>{if(id===requestId.current)setError(failure.message);});
    },delay);
    return()=>clearTimeout(timer);
  },[calculate,delay,enabled,payload,workflow]);
  return { calculation,error };
}

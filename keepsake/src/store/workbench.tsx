import {createContext, useContext, useEffect, useReducer, useState, type ReactNode} from 'react';
import {transitionWorkbench, WORKBENCH_DURATION, type WorkbenchEvent, type WorkbenchPhase} from '../lib/workbench';
import {useReducedMotion} from '../hooks/useReducedMotion';
import {useNav} from './nav';

export const Context = createContext<{phase: WorkbenchPhase; send: (event: WorkbenchEvent)=>void; binderId:string|null; setBinderId:(id:string|null)=>void; openBinder:(id:string)=>void}>({phase:'room',send:()=>{},binderId:null,setBinderId:()=>{},openBinder:()=>{}});
export function WorkbenchProvider({children}:{children:ReactNode}) {
  const {view,goDesk,go,isVisitor} = useNav();
  const [binderId,setBinderId]=useState<string|null>(null);
  useEffect(()=>{if(isVisitor||!['room','book'].includes(view))setBinderId(null);},[isVisitor,view]);
  const reduced = useReducedMotion();
  const [phase,send] = useReducer(transitionWorkbench,'room');
  useEffect(()=>{if(view==='book')send('inspect');else if(phase!=='room')send('leave');},[view,phase]);
  useEffect(()=>{
    if(!(phase in WORKBENCH_DURATION))return;
    const timer=window.setTimeout(()=>{
      if(phase==='leaving'&&view==='book')goDesk();
      send('settled');
    },reduced?0:WORKBENCH_DURATION[phase as keyof typeof WORKBENCH_DURATION]);
    return()=>window.clearTimeout(timer);
  },[phase,reduced,goDesk,view]);
  return <Context.Provider value={{phase,send,binderId,setBinderId,openBinder:(id)=>{if(!isVisitor){setBinderId(id);go('book');}}}}>{children}</Context.Provider>;
}
export const useWorkbench=()=>useContext(Context);

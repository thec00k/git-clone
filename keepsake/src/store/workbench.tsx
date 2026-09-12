import {createContext, useCallback, useContext, useEffect, useReducer, type ReactNode} from 'react';
import {transitionWorkbench, WORKBENCH_DURATION, type WorkbenchEvent, type WorkbenchPhase} from '../lib/workbench';
import {useReducedMotion} from '../hooks/useReducedMotion';
import {useNav} from './nav';
import {useApp} from './appStore';

export const Context = createContext<{phase: WorkbenchPhase; send: (event: WorkbenchEvent)=>void; binderId:string|null; setBinderId:(id:string|null)=>void; openBinder:(id:string)=>void}>({phase:'room',send:()=>{},binderId:null,setBinderId:()=>{},openBinder:()=>{}});
export function WorkbenchProvider({children}:{children:ReactNode}) {
  const {view,goDesk,go,isVisitor} = useNav();
  const {state,update}=useApp();
  const savedBinderId=state.deskBinderId;
  const binderId=!isVisitor&&savedBinderId&&state.cardBinders?.some(b=>b.id===savedBinderId)?savedBinderId:null;
  const setBinderId=useCallback((id:string|null)=>update(s=>({...s,deskBinderId:id??undefined,...(id?{activeBookId:null}:{})})),[update]);
  useEffect(()=>{if(savedBinderId&&!state.cardBinders?.some(b=>b.id===savedBinderId))setBinderId(null);},[savedBinderId,state.cardBinders,setBinderId]);
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

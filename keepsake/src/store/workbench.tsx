import {createContext, useContext, useEffect, useReducer, type ReactNode} from 'react';
import {transitionWorkbench, WORKBENCH_DURATION, type WorkbenchEvent, type WorkbenchPhase} from '../lib/workbench';
import {useReducedMotion} from '../hooks/useReducedMotion';
import {useNav} from './nav';

export const Context = createContext<{phase: WorkbenchPhase; send: (event: WorkbenchEvent)=>void}>({phase:'room',send:()=>{}});
export function WorkbenchProvider({children}:{children:ReactNode}) {
  const {view,goDesk} = useNav();
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
  return <Context.Provider value={{phase,send}}>{children}</Context.Provider>;
}
export const useWorkbench=()=>useContext(Context);

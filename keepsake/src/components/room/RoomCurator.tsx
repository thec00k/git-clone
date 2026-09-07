import {useEffect} from 'react';
import {useApp} from '../../store/appStore';
import {useNav} from '../../store/nav';
import {tourAlreadyFinished} from '../../lib/tour';
/** Welcome only. Persistent discoveries are owned by DiscoverySystem across views. */
export function RoomCurator(_props:{visible?:boolean}){
 const {state}=useApp();const {startTour,isVisitor}=useNav();
 useEffect(()=>{
  if(isVisitor||tourAlreadyFinished(state.progress.completedTour))return;
  const timer=window.setTimeout(startTour,900);return()=>clearTimeout(timer);
 },[isVisitor,state.progress.completedTour,startTour]);
 return null;
}

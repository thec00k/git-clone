import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ElementView} from '../components/ElementView';
import type {PageElement} from '../types/scrapbook';
import '../index.css';
function Test(){
 const [element,setElement]=useState<PageElement>({id:'caption',type:'caption',text:'A summer memory',fontSize:5,color:'#222',x:50,y:50,w:40,rotation:0,z:1});
 const [count,setCount]=useState(0);
 return <><div className="ks-page" style={{position:'relative',width:600,height:700,containerType:'inline-size',margin:60,background:'#eee'}}><ElementView element={element} selected onSelect={()=>{}} onMove={()=>{}} onTransform={(_,patch)=>{setElement(e=>({...e,...patch} as PageElement));setCount(c=>c+1);}} onEditText={(_,text)=>setElement(e=>({...e,text} as PageElement))}/></div><output>{JSON.stringify({element,count})}</output></>;
}createRoot(document.getElementById('root')!).render(<Test/>);

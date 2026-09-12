import {createRoot} from 'react-dom/client';
import {AppProvider} from '../store/appStore';
import {CardBinders} from '../components/CardBinders';
createRoot(document.getElementById('root')!).render(<AppProvider><CardBinders onClose={()=>{location.href='/';}}/></AppProvider>);

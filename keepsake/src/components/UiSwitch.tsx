import type {ReactNode} from 'react';

/** Shared binary setting; the label remains stable for assistive technology. */
export function UiSwitch({checked,onChange,children}:{checked:boolean;onChange:()=>void;children:ReactNode}) {
  return <button type="button" className="ks-ui-switch" role="switch" aria-checked={checked} onClick={onChange}>
    <span className="ks-ui-switch-label">{children}</span>
    <span className="ks-ui-switch-state" aria-hidden="true">{checked?'On':'Off'}<i className="ks-ui-switch-track"/></span>
  </button>;
}

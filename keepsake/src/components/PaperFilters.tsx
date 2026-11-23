// SVG filters shared by the paper controls: a "goo" merge that melts paper
// slips out of each other, and a rough hand-cut edge with an ink outline.
export function PaperFilters({id}: {id: string}) {
  return (
    <svg width="0" height="0" style={{position: 'absolute'}} aria-hidden="true" focusable="false">
      <defs>
        <filter id={`${id}-goo`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
          <feColorMatrix in="blur" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 22 -9" result="goo" />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" result="body" />
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap
            in="body"
            in2="noise"
            scale="3.5"
            xChannelSelector="R"
            yChannelSelector="G"
            result="cut"
          />
          <feMorphology in="cut" operator="dilate" radius="1.1" result="thick" />
          <feFlood floodColor="#3a2e22" result="ink" />
          <feComposite in="ink" in2="thick" operator="in" result="outline" />
          <feGaussianBlur in="thick" stdDeviation="3" result="soft" />
          <feOffset in="soft" dy="4" result="drop" />
          <feFlood floodColor="#2a1c10" floodOpacity="0.3" />
          <feComposite in2="drop" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="outline" />
            <feMergeNode in="cut" />
          </feMerge>
        </filter>
        <filter id={`${id}-cut`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="3" result="noise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="4"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <pattern id={`${id}-grain`} patternUnits="userSpaceOnUse" width="220" height="220">
          <image
            href="/textures/paper-warm-cream.webp"
            width="220"
            height="220"
            preserveAspectRatio="xMidYMid slice"
          />
        </pattern>
      </defs>
    </svg>
  );
}

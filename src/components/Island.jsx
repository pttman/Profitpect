function Tree({ x, y, scale = 1, color = "#92af7c" }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path
        d="M0 0 0-48"
        stroke="#9a9670"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <ellipse cx="-7" cy="-51" rx="23" ry="29" fill={color} />
      <ellipse cx="12" cy="-58" rx="23" ry="31" fill={color} />
      <ellipse cx="1" cy="-76" rx="21" ry="27" fill={color} />
      <path
        d="M-1-32 0-70m0 25 13-15m-13 2-12-10"
        fill="none"
        stroke="#789765"
        strokeWidth="2"
        strokeLinecap="round"
        opacity=".45"
      />
    </g>
  );
}

export default function Island({ stage = 0, className = "" }) {
  return (
    <svg
      className={`island-art ${className}`}
      viewBox="0 0 600 365"
      role="img"
      aria-label="海面上的温暖小岛，有小屋、树木和蜿蜒小路"
    >
      <defs>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#d7e9e3" />
          <stop offset="1" stopColor="#edf3e7" />
        </linearGradient>
        <linearGradient id="grass" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#e2e7b9" />
          <stop offset="1" stopColor="#b9d0a1" />
        </linearGradient>
        <linearGradient id="soil" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#b8c3a2" />
          <stop offset="1" stopColor="#d8d0ae" />
        </linearGradient>
        <radialGradient id="sunGlow">
          <stop stopColor="#f6e5b2" stopOpacity=".8" />
          <stop offset="1" stopColor="#f6e5b2" stopOpacity="0" />
        </radialGradient>
        <filter id="islandShadow">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      <circle cx="443" cy="63" r="54" fill="url(#sunGlow)" />
      <circle cx="443" cy="63" r="22" fill="#f3d994" />
      <g fill="#fff" opacity=".75">
        <path d="M103 75c-6-14 15-24 24-10 9-21 38-13 36 5 21-3 25 15 6 15h-64c-15 0-16-11-2-10Z" />
        <path d="M439 115c-5-9 7-15 14-10 6-13 23-9 23 3 13-1 16 10 3 10h-40Z" />
      </g>
      <g fill="none" stroke="#83a799" strokeWidth="2" strokeLinecap="round">
        <path d="m325 66 6-3 6 3m13-12 5-3 5 3" />
      </g>
      <ellipse cx="299" cy="287" rx="199" ry="48" fill="url(#sea)" />
      <g fill="none" stroke="#b0cec3" strokeWidth="1.4" opacity=".8">
        <ellipse
          cx="299"
          cy="284"
          rx="221"
          ry="54"
          strokeDasharray="65 24 24 45"
        />
        <path d="M91 292H64m45-35H87m416 27h27m-79 44h29M152 326h-24" />
      </g>
      <ellipse
        cx="297"
        cy="272"
        rx="148"
        ry="25"
        fill="#8bab99"
        opacity=".25"
        filter="url(#islandShadow)"
      />
      <path
        d="M139 225q-12 40 29 62l112 33q26 8 56-6l111-55q21-16 13-43Z"
        fill="url(#soil)"
      />
      <path
        d="m158 257 7 24m31-17 1 24m39-14 2 28m57-22 1 30m46-40 2 25m41-48 2 27m34-45 2 20"
        stroke="#aab796"
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".5"
      />
      <path
        d="M160 195 270 143q25-11 48-3l118 40q45 15 22 43-8 10-24 19l-100 48q-28 12-55 5l-115-35q-53-17-25-48 6-7 21-17Z"
        fill="#e8dfbd"
      />
      <path
        d="m168 194 107-48q22-9 43-2l112 38q38 12 17 37l-114 57q-25 11-50 4l-113-33q-45-13-21-39 6-6 19-14Z"
        fill="url(#grass)"
      />
      <path
        d="M289 175c-30 20-42 41-19 52s54-4 62 9-8 29-20 45"
        fill="none"
        stroke="#efe5c4"
        strokeWidth="17"
      />
      <path d="m194 226 19-8 15 5-19 9Z" fill="#a9c3b6" />
      <path d="m193 226 16 6 19-9v6l-19 9-16-6Z" fill="#8eafa3" />
      <ellipse cx="210" cy="223" rx="14" ry="3" fill="#cfdfd0" />
      <Tree x={391} y={211} scale={0.88} />
      <Tree x={163} y={222} scale={0.47} color="#a1ba8b" />
      <Tree x={425} y={220} scale={0.52} color="#b0c68b" />
      <g transform="translate(280 125)">
        <path d="m-5 38 37-19 40 17-36 21Z" fill="#c0c897" opacity=".4" />
        <path d="M0 20 33 5l37 15v47L33 84 0 69Z" fill="#f4ebd2" />
        <path d="m33 34 37-14v47L33 84Z" fill="#e4d9b9" />
        <path d="m-7 24 29-42 17 7 40 32-46 18Z" fill="#d79980" />
        <path d="m22-18 41 17 16 24-40-34Z" fill="#bd806b" />
        <path d="m-7 24 29-42 17 7-6 48Z" fill="#e4ad92" />
        <path d="M12 58V40l11-5v25Z" fill="#6e9280" />
        <path d="m44 49 14-6v15l-14 6Z" fill="#8eaf9e" />
        <path d="m49 47 0 15m-5-6 14-6" stroke="#e4d9b9" strokeWidth="2" />
        <path d="m52-1 0-19 10 4V7" fill="#dfd0b0" />
        <path d="m5 71 21-10 9 5-22 10Z" fill="#c8bfa2" />
      </g>
      <g fill="#a3bb87">
        <ellipse cx="221" cy="175" rx="7" ry="3" />
        <ellipse cx="356" cy="245" rx="10" ry="4" />
        <ellipse cx="233" cy="253" rx="11" ry="4" />
      </g>
      {stage >= 1 && (
        <g transform="translate(244 216)">
          <path
            d="M0 8V-5m0 5c-12-1-14-10-12-12C0-13 1-5 0 0Zm0-2c10 0 15-6 12-10C3-12 0-6 0-2Z"
            stroke="#75986a"
            strokeWidth="2"
            fill="#a3bf80"
          />
          <ellipse cx="0" cy="9" rx="7" ry="3" fill="#b9c793" />
        </g>
      )}
      {stage >= 2 && (
        <g transform="translate(354 219)">
          <path d="m-8 4 26-13 15 6L7 10Z" fill="#b79a70" />
          <path d="m-8-5 26-13v7L-8 2Z" fill="#c9ad80" />
          <path
            d="M-5 4v11m31-13v-10M9 8v11"
            stroke="#9e8968"
            strokeWidth="3"
          />
        </g>
      )}
      {stage >= 3 && (
        <g>
          <Tree x={214} y={194} scale={0.64} color="#b3c688" />
          <path
            d="m376 102 5-3 5 3m-17 9 4-2 4 2"
            fill="none"
            stroke="#83a799"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      )}
      {stage >= 4 && (
        <g transform="translate(386 251)">
          <path d="M0 0 3-35h10L17 0Z" fill="#f4e9cf" />
          <path d="M3-29h10v5H3Zm-2 23h15v5H1Z" fill="#cda18b" />
          <path d="M1-35v-9h14v9Z" fill="#e8d69b" />
          <path d="m-2-44 10-8 10 8Z" fill="#70917e" />
          <ellipse
            cx="8"
            cy="-38"
            rx="28"
            ry="12"
            fill="#f7e4a0"
            opacity=".18"
          />
        </g>
      )}
      <g fill="#f8f3d3">
        <circle cx="181" cy="241" r="2" />
        <circle cx="187" cy="235" r="2" />
        <circle cx="347" cy="180" r="2" />
      </g>
      <path
        d="M248 310q18 5 38 1"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        opacity=".75"
      />
    </svg>
  );
}

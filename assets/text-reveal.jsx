/* TextReveal — adapted for browser React (CDN) + Babel standalone
   Original: Next.js/shadcn component
   Changes: removed 'use client', TypeScript, style jsx → injected <style> */

(function () {
  const CSS = `
    .text-reveal-container {
      --bg-color: transparent;
      --text-color: var(--text, #E2E8F0);
      --btn-bg: rgba(255,255,255,.06);
      --btn-text: var(--text, #E2E8F0);
      --btn-border: rgba(255,255,255,.12);
      --btn-hover: rgba(255,255,255,.10);
      --shine-color: rgba(255,255,255,.12);
      --container-border: transparent;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      background-color: var(--bg-color);
      color: var(--text-color);
      border: 1px solid var(--container-border);
      border-radius: 12px;
      overflow: hidden;
      min-height: 220px;
      width: 100%;
      transition: background-color 0.3s ease, color 0.3s ease;
    }
    .text-reveal-wrapper { position: relative; z-index: 10; }
    .text-reveal-title {
      font-family: var(--f-display, 'Sora', sans-serif);
      font-size: clamp(2rem, 5vw, 3.5rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.1;
      margin: 0;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      color: var(--text-color);
    }
    .text-reveal-char {
      display: inline-block;
      opacity: 0;
      filter: blur(12px);
      transform: translateY(40%) scale(1.1) translateZ(0);
      animation: tr-cinematic-reveal 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      animation-delay: calc(0.04s * var(--index));
      will-change: transform, opacity, filter;
    }
    .text-reveal-replay {
      margin-top: 2rem;
      position: relative;
      padding: 0.65rem 1.4rem;
      background-color: var(--btn-bg);
      color: var(--btn-text);
      border: 1px solid var(--btn-border);
      border-radius: 9999px;
      font-family: var(--f-body, 'Manrope', sans-serif);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      overflow: hidden;
      backdrop-filter: blur(8px);
    }
    .text-reveal-replay:hover {
      background-color: var(--btn-hover);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0,0,0,.2);
    }
    .text-reveal-replay:active { transform: translateY(0); }
    .text-reveal-shine {
      position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
      background: linear-gradient(90deg, transparent, var(--shine-color), transparent);
      transform: skewX(-20deg);
      animation: tr-shine 4s infinite;
      pointer-events: none;
    }
    @keyframes tr-cinematic-reveal {
      0%   { opacity: 0; filter: blur(12px); transform: translateY(40%) scale(1.1); }
      50%  { opacity: 0.7; filter: blur(4px); }
      100% { opacity: 1; filter: blur(0); transform: translateY(0) scale(1); }
    }
    @keyframes tr-shine {
      0%   { left: -100%; }
      20%  { left: 200%; }
      100% { left: 200%; }
    }
    @media (prefers-reduced-motion: reduce) {
      .text-reveal-char {
        opacity: 1 !important; transform: none !important;
        filter: none !important; animation: none !important;
      }
    }
  `;

  if (!document.getElementById('text-reveal-styles')) {
    const style = document.createElement('style');
    style.id = 'text-reveal-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  window.TextReveal = function TextReveal({ word = "Cinematic Reveal", className = "" }) {
    const [key, window.React.useState ? React.useState(0)[1] && 0 : 0] = [0, () => {}];
    const [animKey, setAnimKey] = React.useState(0);

    const replay = () => setAnimKey(k => k + 1);

    return React.createElement('div', { className: `text-reveal-container ${className}` },
      React.createElement('div', { key: animKey, className: 'text-reveal-wrapper' },
        React.createElement('h1', { className: 'text-reveal-title', 'aria-label': word },
          word.split('').map((char, i) =>
            React.createElement('span', {
              key: `${animKey}-${i}`,
              className: 'text-reveal-char',
              style: { '--index': i }
            }, char === ' ' ? ' ' : char)
          )
        )
      ),
      React.createElement('button', { className: 'text-reveal-replay', onClick: replay },
        React.createElement('span', null, 'Replay'),
        React.createElement('div', { className: 'text-reveal-shine' })
      )
    );
  };
})();

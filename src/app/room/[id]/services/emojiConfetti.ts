const EMOJI_COUNT = 32;
const Z_INDEX = 99999;
const MAX_ACTIVE_ANIMATIONS = 96;
let activeAnimations = 0;

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function triggerEmojiConfetti(emoji: string): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const cleanups: Array<() => void> = [];
  const startX = window.innerWidth / 2;
  const startY = window.innerHeight * 0.52;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const availableSlots = Math.max(0, MAX_ACTIVE_ANIMATIONS - activeAnimations);
  const particleCount = Math.min(EMOJI_COUNT, availableSlots);

  for (let i = 0; i < particleCount; i += 1) {
    const particle = document.createElement('span');
    const side = Math.random() < 0.5 ? -1 : 1;
    const initialBurstX = randomBetween(12, 64) * side;
    const initialBurstY = randomBetween(-50, -20);
    const peakX = randomBetween(90, viewportWidth * 0.28) * side;
    const peakY = -randomBetween(viewportHeight * 0.22, viewportHeight * 0.45);
    const edgeX = randomBetween(viewportWidth * 0.34, viewportWidth * 0.52) * side;
    const fallY = randomBetween(viewportHeight * 0.44, viewportHeight * 0.62);
    const duration = randomBetween(2400, 3800);
    const rotation = randomBetween(-720, 720);
    const size = randomBetween(28, 46);
    const delay = randomBetween(0, 140);

    particle.textContent = emoji;
    particle.style.position = 'fixed';
    particle.style.left = `${startX}px`;
    particle.style.top = `${startY}px`;
    particle.style.fontSize = `${size}px`;
    particle.style.lineHeight = '1';
    particle.style.pointerEvents = 'none';
    particle.style.userSelect = 'none';
    particle.style.zIndex = String(Z_INDEX);
    particle.style.transform = 'translate(-50%, -50%)';

    document.body.appendChild(particle);
    activeAnimations += 1;

    const animation = particle.animate(
      [
        {
          transform: 'translate(-50%, -50%) translate(0px, 0px) rotate(0deg) scale(1)',
          opacity: 1,
        },
        {
          transform: `translate(-50%, -50%) translate(${initialBurstX}px, ${initialBurstY}px) rotate(${rotation * 0.2}deg) scale(1.02)`,
          opacity: 1,
          offset: 0.15,
        },
        {
          transform: `translate(-50%, -50%) translate(${peakX}px, ${peakY}px) rotate(${rotation * 0.62}deg) scale(1)`,
          opacity: 0.98,
          offset: 0.5,
        },
        {
          transform: `translate(-50%, -50%) translate(${edgeX}px, ${fallY}px) rotate(${rotation}deg) scale(0.82)`,
          opacity: 0,
        },
      ],
      {
        duration,
        delay,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        fill: 'forwards',
      }
    );

    let removed = false;
    const removeParticle = () => {
      if (removed) return;
      removed = true;
      animation.onfinish = null;
      animation.oncancel = null;
      animation.cancel();
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
      }
      activeAnimations = Math.max(0, activeAnimations - 1);
      window.clearTimeout(timeoutId);
    };

    animation.onfinish = removeParticle;
    animation.oncancel = removeParticle;
    const timeoutId = window.setTimeout(removeParticle, duration + delay + 250);
    cleanups.push(removeParticle);
  }

  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}

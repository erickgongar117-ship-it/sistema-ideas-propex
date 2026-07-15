"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { Volume2, X } from "lucide-react";
import { ProbocaCoin } from "@/components/proboca-coin";

const fallingCoins = [
  { left: 5, delay: 0, duration: 3.5, drift: 42, scale: 0.7 },
  { left: 13, delay: 0.55, duration: 3.9, drift: -34, scale: 0.9 },
  { left: 21, delay: 0.2, duration: 4.2, drift: 28, scale: 0.65 },
  { left: 30, delay: 0.85, duration: 3.7, drift: -48, scale: 1 },
  { left: 39, delay: 0.35, duration: 4.4, drift: 36, scale: 0.8 },
  { left: 48, delay: 0.05, duration: 3.8, drift: -22, scale: 1.05 },
  { left: 57, delay: 0.7, duration: 4.1, drift: 44, scale: 0.72 },
  { left: 66, delay: 0.28, duration: 3.6, drift: -38, scale: 0.92 },
  { left: 75, delay: 0.95, duration: 4.3, drift: 30, scale: 0.66 },
  { left: 84, delay: 0.42, duration: 3.9, drift: -26, scale: 1 },
  { left: 93, delay: 0.12, duration: 4.25, drift: 32, scale: 0.76 },
  { left: 9, delay: 1.2, duration: 3.8, drift: -30, scale: 0.64 },
  { left: 25, delay: 1.45, duration: 4.15, drift: 40, scale: 0.84 },
  { left: 43, delay: 1.1, duration: 3.65, drift: -36, scale: 0.7 },
  { left: 61, delay: 1.35, duration: 4.35, drift: 26, scale: 0.9 },
  { left: 79, delay: 1.05, duration: 3.75, drift: -44, scale: 0.68 },
  { left: 89, delay: 1.55, duration: 4.05, drift: 34, scale: 0.86 }
];

function removeRewardParameter() {
  const url = new URL(window.location.href);
  url.searchParams.delete("coins");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export function ProbocaCoinsCelebration({ amount }: { amount: number }) {
  const [visible, setVisible] = useState(true);

  const playCoinSound = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const start = context.currentTime + 0.02;
      [
        { at: 0, frequency: 988, volume: 0.12 },
        { at: 0.08, frequency: 1319, volume: 0.1 },
        { at: 0.17, frequency: 1568, volume: 0.08 }
      ].forEach((note) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(note.frequency, start + note.at);
        oscillator.frequency.exponentialRampToValueAtTime(note.frequency * 1.08, start + note.at + 0.08);
        gain.gain.setValueAtTime(0.0001, start + note.at);
        gain.gain.exponentialRampToValueAtTime(note.volume, start + note.at + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + note.at + 0.24);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start + note.at);
        oscillator.stop(start + note.at + 0.25);
      });
      window.setTimeout(() => void context.close(), 900);
    } catch {
      // Some browsers block automatic audio; the replay control remains available.
    }
  }, []);

  useEffect(() => {
    removeRewardParameter();
    const soundTimer = window.setTimeout(playCoinSound, 180);
    const closeTimer = window.setTimeout(() => setVisible(false), 5200);
    return () => {
      window.clearTimeout(soundTimer);
      window.clearTimeout(closeTimer);
    };
  }, [playCoinSound]);

  if (!visible) return null;

  return (
    <div aria-labelledby="proboca-coins-title" aria-live="polite" aria-modal="true" className="proboca-coins-celebration" role="dialog">
      <div aria-hidden className="proboca-coins-rain">
        {fallingCoins.map((coin, index) => (
          <span
            className="proboca-coins-falling"
            key={`${coin.left}-${coin.delay}`}
            style={{
              "--coin-delay": `${coin.delay}s`,
              "--coin-drift": `${coin.drift}px`,
              "--coin-duration": `${coin.duration}s`,
              "--coin-left": `${coin.left}%`,
              "--coin-scale": coin.scale,
              "--coin-spin": `${index % 2 === 0 ? 900 : -900}deg`
            } as CSSProperties}
          >
            <ProbocaCoin size="lg" />
          </span>
        ))}
      </div>

      <section className="proboca-coins-dialog">
        <button aria-label="Cerrar celebracion" className="proboca-coins-close" onClick={() => setVisible(false)} title="Cerrar" type="button">
          <X aria-hidden className="h-5 w-5" />
        </button>
        <div className="proboca-coins-hero-coin"><ProbocaCoin size="xl" /></div>
        <p className="proboca-coins-eyebrow">Idea finalizada</p>
        <h2 id="proboca-coins-title">ProbocaCoins entregadas</h2>
        <p className="proboca-coins-amount">+{amount.toLocaleString("es-MX")}</p>
        <p className="proboca-coins-message">La mejora quedo cerrada y la recompensa fue registrada.</p>
        <button className="proboca-coins-sound" onClick={playCoinSound} type="button">
          <Volume2 aria-hidden className="h-4 w-4" />Repetir sonido
        </button>
      </section>
    </div>
  );
}

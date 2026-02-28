/**
 * Animation Control Panel
 */

import { useState } from 'react';
import { useAnimation } from '../../hooks/useAnimation';
import { AnimationPattern } from '../../types/robot';
import { InfoTooltip } from './InfoTooltip';

export function AnimationPanel() {
  const { startAnimation, stopAnimation, pauseAnimation } = useAnimation();
  
  const [pattern, setPattern] = useState<AnimationPattern>(AnimationPattern.SINE_WAVE);
  const [amplitude, setAmplitude] = useState(0.3);
  const [frequency, setFrequency] = useState(0.3);
  const [speed, setSpeed] = useState(1.0);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleStart = () => {
    startAnimation({ pattern, amplitude, frequency, speed });
    setIsAnimating(true);
  };

  const handleStop = () => {
    stopAnimation();
    setIsAnimating(false);
  };

  const handlePause = () => {
    pauseAnimation();
    setIsAnimating(false);
  };

  return (
    <div className="animation-panel">
      <h3>Animation <InfoTooltip title="Animation">Animate robot joints using various patterns: Sine Wave, Circular, Wave, or Random motion.</InfoTooltip></h3>

      <div className="animation-controls">
        <div className="control-group">
          <label>Pattern</label>
          <select value={pattern} onChange={(e) => setPattern(e.target.value as AnimationPattern)}>
            <option value="sine_wave">Sine Wave</option>
            <option value="circular">Circular</option>
            <option value="wave">Wave</option>
            <option value="random">Random</option>
          </select>
        </div>
        
        <div className="control-group">
          <label>Amplitude: {amplitude.toFixed(2)}</label>
          <input
            type="range"
            min={0.1}
            max={1.0}
            step={0.1}
            value={amplitude}
            onChange={(e) => setAmplitude(parseFloat(e.target.value))}
          />
        </div>
        
        <div className="control-group">
          <label>Frequency: {frequency.toFixed(2)}</label>
          <input
            type="range"
            min={0.1}
            max={2.0}
            step={0.1}
            value={frequency}
            onChange={(e) => setFrequency(parseFloat(e.target.value))}
          />
        </div>
        
        <div className="control-group">
          <label>Speed: {speed.toFixed(2)}</label>
          <input
            type="range"
            min={0.1}
            max={3.0}
            step={0.1}
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
          />
        </div>
        
        <div className="button-group">
          <button onClick={handleStart} disabled={isAnimating}>
            Start
          </button>
          <button onClick={handlePause} disabled={!isAnimating}>
            Pause
          </button>
          <button onClick={handleStop} disabled={!isAnimating}>
            Stop
          </button>
        </div>
      </div>
    </div>
  );
}

export default AnimationPanel;

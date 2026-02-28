/**
 * Joint Control Panel
 */

import { useSessionStore } from '../../stores/sessionStore';
import { InfoTooltip } from './InfoTooltip';

interface JointControlProps {
  onJointChange?: (index: number, value: number) => void;
}

export function JointControl({ onJointChange }: JointControlProps) {
  const { robotInfo, jointPositions, setJointPositions } = useSessionStore();

  if (!robotInfo) {
    return (
      <div className="joint-control">
        <h3>Joint Controls <InfoTooltip title="Joint Controls">Manually adjust each joint's position using sliders. Values are in radians.</InfoTooltip></h3>
        <p>No robot loaded</p>
      </div>
    );
  }

  const handleSliderChange = (index: number, value: number) => {
    const newPositions = [...jointPositions];
    newPositions[index] = value;
    setJointPositions(newPositions);
    
    if (onJointChange) {
      onJointChange(index, value);
    }
  };

  return (
    <div className="joint-control">
      <h3>Joint Controls <InfoTooltip title="Joint Controls">Manually adjust each joint's position using sliders. Values are in radians.</InfoTooltip></h3>
      <div className="joint-sliders">
        {robotInfo.jointNames.map((name: string, index: number) => (
          <div key={name} className="joint-slider">
            <label>{name}</label>
            <div className="slider-container">
              <input
                type="range"
                min={robotInfo.lowerLimits[index]}
                max={robotInfo.upperLimits[index]}
                step={0.01}
                value={jointPositions[index] || 0}
                onChange={(e) => handleSliderChange(index, parseFloat(e.target.value))}
              />
              <span className="value">{(jointPositions[index] || 0).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default JointControl;

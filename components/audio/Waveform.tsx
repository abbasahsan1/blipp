import { View } from 'react-native';

import { cn } from '@/lib/utils';

interface WaveformProps {
  /** Normalized bar heights between 0 and 1. */
  data: number[];
  /** Playback progress between 0 and 1. */
  progress?: number;
  height?: number;
  barWidth?: number;
  gap?: number;
  /** Downsamples the data to at most this many bars. */
  bars?: number;
  activeClassName?: string;
  inactiveClassName?: string;
  className?: string;
}

function sample(data: number[], bars?: number): number[] {
  if (!bars || bars >= data.length) return data;
  const step = data.length / bars;
  return Array.from({ length: bars }, (_, index) => data[Math.floor(index * step)]);
}

export function Waveform({
  data,
  progress = 0,
  height = 32,
  barWidth = 3,
  gap = 2,
  bars,
  activeClassName = 'bg-accent',
  inactiveClassName = 'bg-wave-track',
  className,
}: WaveformProps) {
  const values = sample(data, bars);
  const activeCount = Math.round(Math.min(1, Math.max(0, progress)) * values.length);

  return (
    <View
      className={cn('flex-row items-center overflow-hidden', className)}
      style={{ height, columnGap: gap }}
    >
      {values.map((value, index) => (
        <View
          // eslint-disable-next-line react/no-array-index-key -- bars are a fixed-size array derived from `data`/`bars` each render, with no stable id and no reordering/insertion, so position is a valid and stable identity
          key={`${value.toFixed(4)}-${index}`}
          className={cn('rounded-full', index < activeCount ? activeClassName : inactiveClassName)}
          style={{ width: barWidth, height: Math.max(3, Math.round(value * height)) }}
        />
      ))}
    </View>
  );
}

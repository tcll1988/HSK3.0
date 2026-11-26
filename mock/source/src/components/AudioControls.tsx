import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  AlertCircle,
  Radio,
  Headphones,
  Mic,
} from 'lucide-react';
import type { AudioSegment, TimelineEntry } from '../types';
import { formatTime } from '../hooks/useExamAudio';

const RATES = [0.75, 1.0, 1.25];

interface ClipPlayButtonProps {
  clipKey: string;
  segment: AudioSegment;
  label?: string;
  activeClipKey: string | null;
  isPlaying: boolean;
  clipProgress: number;
  playbackRate: number;
  audioError?: string | null;
  onToggleClip: (key: string, seg: AudioSegment) => void;
  onChangeRate: (rate: number) => void;
  compact?: boolean;
}

export const ClipPlayButton: React.FC<ClipPlayButtonProps> = ({
  clipKey,
  segment,
  label = 'この問題の音声を再生',
  activeClipKey,
  isPlaying,
  clipProgress,
  playbackRate,
  audioError,
  onToggleClip,
  onChangeRate,
  compact = false,
}) => {
  const isThisClip = activeClipKey === clipKey;
  const isThisPlaying = isThisClip && isPlaying;
  const dur = Math.max(0, segment.end - segment.start);

  return (
    <div className="space-y-1.5">
      <div
        className={`flex flex-wrap items-center gap-2.5 rounded-2xl border transition ${
          isThisClip
            ? 'border-[#C83E2B]/40 bg-[#FFF8F6]'
            : 'border-[#E6DFD1] bg-[#FAF8F4]'
        } ${compact ? 'px-3 py-2' : 'px-3.5 py-2.5'}`}
      >
        <button
          type="button"
          onClick={() => onToggleClip(clipKey, segment)}
          className={`inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-xs transition ${
            isThisPlaying
              ? 'bg-[#A63122] hover:bg-[#8E291C]'
              : 'bg-[#C83E2B] hover:bg-[#B13524]'
          }`}
        >
          {isThisPlaying ? (
            <>
              <Pause className="h-3.5 w-3.5 fill-current" />
              一時停止
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current" />
              {label}
            </>
          )}
        </button>

        <div className="flex min-w-[120px] flex-1 items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E6DFD1]">
            <div
              className="h-full rounded-full bg-[#C83E2B] transition-all duration-150"
              style={{ width: `${isThisClip ? Math.round(clipProgress * 100) : 0}%` }}
            />
          </div>
          <span className="shrink-0 font-mono text-[11px] font-semibold text-[#6B7280]">
            {formatTime(segment.start)}–{formatTime(segment.end)} ({Math.round(dur)}秒)
          </span>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-[#E6DFD1] bg-white p-0.5">
          {RATES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onChangeRate(r)}
              className={`cursor-pointer rounded-md px-2 py-0.5 text-[11px] font-bold transition ${
                playbackRate === r
                  ? 'bg-[#1E3A5F] text-white'
                  : 'text-[#57606A] hover:bg-[#F3EFE8]'
              }`}
            >
              {r}x
            </button>
          ))}
        </div>
      </div>

      {audioError && isThisClip && (
        <div className="flex items-center gap-1.5 rounded-xl border border-[#F3C6BE] bg-[#FFF2F0] px-3 py-1.5 text-xs text-[#A63122]">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{audioError}</span>
        </div>
      )}
    </div>
  );
};

interface FullAudioBarProps {
  hasSecondaryTrack: boolean;
  activeTrack: 'primary' | 'secondary';
  isPlaying: boolean;
  activeClipKey: string | null;
  currentTime: number;
  duration: number;
  playbackRate: number;
  autoFollow: boolean;
  currentTimelineItem: TimelineEntry | null;
  audioError?: string | null;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onChangeRate: (rate: number) => void;
  onToggleAutoFollow: () => void;
  onSwitchTrack: (track: 'primary' | 'secondary') => void;
}

export const FullAudioBar: React.FC<FullAudioBarProps> = ({
  hasSecondaryTrack,
  activeTrack,
  isPlaying,
  activeClipKey,
  currentTime,
  duration,
  playbackRate,
  autoFollow,
  currentTimelineItem,
  audioError,
  onTogglePlay,
  onSeek,
  onChangeRate,
  onToggleAutoFollow,
  onSwitchTrack,
}) => {
  const isFullPlaying = activeClipKey === 'full' && isPlaying;
  const pct = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div className="rounded-2xl border border-[#E6DFD1] bg-white px-4 py-3 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF2F0] px-2.5 py-0.5 text-xs font-bold text-[#C83E2B]">
            <Volume2 className="h-3.5 w-3.5" />
            公式通し音声
          </span>

          {hasSecondaryTrack && (
            <div className="inline-flex rounded-lg border border-[#E6DFD1] bg-[#FAF8F4] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => onSwitchTrack('primary')}
                className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 font-bold transition ${
                  activeTrack === 'primary'
                    ? 'bg-[#1E3A5F] text-white'
                    : 'text-[#57606A] hover:text-[#1F2328]'
                }`}
              >
                <Headphones className="h-3 w-3" />
                聴力録音
              </button>
              <button
                type="button"
                onClick={() => onSwitchTrack('secondary')}
                className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 font-bold transition ${
                  activeTrack === 'secondary'
                    ? 'bg-[#C83E2B] text-white'
                    : 'text-[#57606A] hover:text-[#1F2328]'
                }`}
              >
                <Mic className="h-3 w-3" />
                口試録音
              </button>
            </div>
          )}

          {currentTimelineItem && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#DCE6F2] bg-[#EEF4FA] px-2.5 py-0.5 text-xs font-semibold text-[#1E3A5F]">
              <Radio className="h-3 w-3 text-[#C83E2B]" />
              再生中：{currentTimelineItem.labelJa}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleAutoFollow}
            className={`cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
              autoFollow
                ? 'border-[#1E3A5F]/30 bg-[#EEF4FA] text-[#1E3A5F]'
                : 'border-[#E6DFD1] bg-white text-[#6B7280]'
            }`}
          >
            音声に自動追従：{autoFollow ? 'ON' : 'OFF'}
          </button>

          <div className="flex items-center gap-0.5 rounded-lg border border-[#E6DFD1] bg-[#FAF8F4] p-0.5">
            {RATES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onChangeRate(r)}
                className={`cursor-pointer rounded-md px-2 py-0.5 text-[11px] font-bold transition ${
                  playbackRate === r
                    ? 'bg-[#1E3A5F] text-white'
                    : 'text-[#57606A] hover:bg-white'
                }`}
              >
                {r}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-2.5">
        <button
          type="button"
          onClick={onTogglePlay}
          className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[#C83E2B] text-white shadow-xs transition hover:bg-[#B13524]"
          aria-label={isFullPlaying ? '一時停止' : '再生'}
        >
          {isFullPlaying ? (
            <Pause className="h-4 w-4 fill-current" />
          ) : (
            <Play className="h-4 w-4 fill-current" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onSeek(Math.max(0, currentTime - 10))}
          className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#E6DFD1] bg-[#FAF8F4] text-[#4B5563] hover:bg-[#EFEAE0]"
          title="10秒戻る"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onSeek(Math.min(duration, currentTime + 10))}
          className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#E6DFD1] bg-[#FAF8F4] text-[#4B5563] hover:bg-[#EFEAE0]"
          title="10秒進む"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>

        <div className="flex flex-1 items-center gap-2.5">
          <span className="w-11 shrink-0 text-right font-mono text-xs font-semibold text-[#1F2328]">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(1, duration)}
            step={0.5}
            value={Math.min(currentTime, Math.max(1, duration))}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="hsk-slider w-full cursor-pointer"
            style={{
              background: `linear-gradient(to right, #C83E2B ${pct}%, #E6DFD1 ${pct}%)`,
            }}
            aria-label="音声再生位置"
          />
          <span className="w-11 shrink-0 font-mono text-xs font-medium text-[#6B7280]">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {audioError && (
        <div className="mt-2 flex items-center gap-1.5 rounded-xl border border-[#F3C6BE] bg-[#FFF2F0] px-3 py-1.5 text-xs text-[#A63122]">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{audioError}</span>
        </div>
      )}
    </div>
  );
};

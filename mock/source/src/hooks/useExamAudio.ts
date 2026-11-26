import { useCallback, useEffect, useRef, useState } from 'react';
import type { AudioSegment } from '../types';
import { resolveAssetUrl } from '../data/registry';

export interface ActiveClip {
  key: string; // e.g. 'q-1', 'grp-hsk5-l1', 'full'
  start: number;
  end: number;
  track: 'primary' | 'secondary';
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function useExamAudio(
  primaryUrl?: string,
  primaryDuration = 0,
  secondaryUrl?: string,
  secondaryDuration = 0
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeClipRef = useRef<ActiveClip | null>(null);
  const loadedTrackRef = useRef<'primary' | 'secondary' | null>(null);
  const pendingSeekRef = useRef<{ time: number; autoPlay: boolean; rate: number } | null>(null);

  const [activeTrack, setActiveTrack] = useState<'primary' | 'secondary'>('primary');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(primaryDuration);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [activeClipKey, setActiveClipKey] = useState<string | null>(null);
  const [clipProgress, setClipProgress] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);

  const getTrackUrl = useCallback(
    (track: 'primary' | 'secondary') => {
      if (track === 'secondary' && secondaryUrl) return resolveAssetUrl(secondaryUrl);
      return resolveAssetUrl(primaryUrl);
    },
    [primaryUrl, secondaryUrl]
  );

  const getTrackDefaultDuration = useCallback(
    (track: 'primary' | 'secondary') =>
      track === 'secondary' ? secondaryDuration : primaryDuration,
    [primaryDuration, secondaryDuration]
  );

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.setAttribute('playsinline', 'true');
    audioRef.current = audio;
    loadedTrackRef.current = null;
    activeClipRef.current = null;
    setIsPlaying(false);
    setActiveClipKey(null);
    setClipProgress(0);
    setCurrentTime(0);
    setAudioError(null);
    setActiveTrack('primary');
    setDuration(primaryDuration);

    if (primaryUrl) {
      audio.src = resolveAssetUrl(primaryUrl);
      loadedTrackRef.current = 'primary';
    }

    const applyPendingSeek = () => {
      const pending = pendingSeekRef.current;
      if (!pending) return;
      pendingSeekRef.current = null;
      try {
        audio.currentTime = pending.time;
        audio.playbackRate = pending.rate;
      } catch {
        // Safari strict seek timing fallback
      }
      if (pending.autoPlay) {
        audio
          .play()
          .then(() => setAudioError(null))
          .catch(() => {
            setAudioError(
              '音声の再生がブロックされました。もう一度再生ボタンを押してください。'
            );
          });
      }
    };

    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
      applyPendingSeek();
    };

    const onCanPlay = () => applyPendingSeek();

    const onTimeUpdate = () => {
      const t = audio.currentTime;
      setCurrentTime(t);
      const clip = activeClipRef.current;
      if (clip && clip.key !== 'full') {
        const len = Math.max(0.1, clip.end - clip.start);
        const pct = Math.min(1, Math.max(0, (t - clip.start) / len));
        setClipProgress(pct);
        if (t >= clip.end) {
          audio.pause();
          setIsPlaying(false);
          setActiveClipKey(null);
          setClipProgress(0);
          activeClipRef.current = null;
        }
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setActiveClipKey(null);
      setClipProgress(0);
      activeClipRef.current = null;
    };

    const onPause = () => setIsPlaying(false);
    const onPlay = () => {
      setIsPlaying(true);
      setAudioError(null);
    };
    const onError = () => {
      setIsPlaying(false);
      setAudioError(
        '音声ファイルの読み込みに失敗しました。ローカル環境またはGitHub Pages上でMP3が配置されているかご確認ください。'
      );
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('error', onError);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('error', onError);
      audio.src = '';
    };
  }, [primaryUrl, primaryDuration]);

  const ensureTrackAndSeek = useCallback(
    (track: 'primary' | 'secondary', targetTime: number, autoPlay: boolean) => {
      const audio = audioRef.current;
      if (!audio) return;
      const url = getTrackUrl(track);
      if (!url) {
        setAudioError('この問題に対応する音声ファイルが見つかりません。');
        return;
      }

      const safeTime = Math.max(0, targetTime);
      setActiveTrack(track);

      if (loadedTrackRef.current !== track) {
        audio.pause();
        loadedTrackRef.current = track;
        setDuration(getTrackDefaultDuration(track));
        pendingSeekRef.current = { time: safeTime, autoPlay, rate: playbackRate };
        audio.src = url;
        audio.load();
        return;
      }

      if (audio.readyState < 1) {
        pendingSeekRef.current = { time: safeTime, autoPlay, rate: playbackRate };
        audio.load();
        return;
      }

      pendingSeekRef.current = null;
      try {
        audio.currentTime = safeTime;
        audio.playbackRate = playbackRate;
      } catch {
        pendingSeekRef.current = { time: safeTime, autoPlay, rate: playbackRate };
        return;
      }

      if (autoPlay) {
        audio
          .play()
          .then(() => setAudioError(null))
          .catch(() => {
            setAudioError(
              '音声の再生がブロックされました。もう一度再生ボタンを押してください。'
            );
          });
      }
    },
    [getTrackUrl, getTrackDefaultDuration, playbackRate]
  );

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    pendingSeekRef.current = null;
    audio.pause();
    activeClipRef.current = null;
    setActiveClipKey(null);
    setClipProgress(0);
    setIsPlaying(false);
  }, []);

  const toggleClip = useCallback(
    (key: string, seg: AudioSegment) => {
      const audio = audioRef.current;
      if (!audio) return;
      const track = seg.track === 'secondary' && secondaryUrl ? 'secondary' : 'primary';

      if (activeClipRef.current?.key === key) {
        if (!audio.paused) {
          audio.pause();
          return;
        }
        if (audio.currentTime >= seg.end - 0.25 || audio.currentTime < seg.start - 0.5) {
          ensureTrackAndSeek(track, seg.start, true);
        } else {
          audio.playbackRate = playbackRate;
          audio.play().catch(() => {});
        }
        return;
      }

      activeClipRef.current = { key, start: seg.start, end: seg.end, track };
      setActiveClipKey(key);
      setClipProgress(0);
      ensureTrackAndSeek(track, seg.start, true);
    },
    [ensureTrackAndSeek, playbackRate, secondaryUrl]
  );

  const toggleFullPlay = useCallback(
    (track: 'primary' | 'secondary' = activeTrack) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (activeClipRef.current?.key === 'full' && loadedTrackRef.current === track) {
        if (!audio.paused) {
          audio.pause();
        } else {
          audio.playbackRate = playbackRate;
          audio.play().catch(() => {});
        }
        return;
      }

      const maxDur = getTrackDefaultDuration(track);
      activeClipRef.current = { key: 'full', start: 0, end: maxDur || 9999, track };
      setActiveClipKey('full');
      setClipProgress(0);
      const startFrom = loadedTrackRef.current === track ? audio.currentTime : 0;
      ensureTrackAndSeek(track, startFrom, true);
    },
    [activeTrack, ensureTrackAndSeek, getTrackDefaultDuration, playbackRate]
  );

  const seekFull = useCallback(
    (time: number, track: 'primary' | 'secondary' = activeTrack, autoPlay = true) => {
      const maxDur = duration || getTrackDefaultDuration(track) || 9999;
      const clamped = Math.max(0, Math.min(maxDur, time));
      activeClipRef.current = { key: 'full', start: 0, end: maxDur, track };
      setActiveClipKey('full');
      setCurrentTime(clamped);
      ensureTrackAndSeek(track, clamped, autoPlay);
    },
    [activeTrack, duration, ensureTrackAndSeek, getTrackDefaultDuration]
  );

  const switchTrack = useCallback(
    (track: 'primary' | 'secondary') => {
      if (track === activeTrack) return;
      stop();
      setActiveTrack(track);
      setCurrentTime(0);
      setDuration(getTrackDefaultDuration(track));
      const audio = audioRef.current;
      const url = getTrackUrl(track);
      if (audio && url) {
        loadedTrackRef.current = track;
        audio.src = url;
        audio.load();
      }
    },
    [activeTrack, getTrackDefaultDuration, getTrackUrl, stop]
  );

  const changeRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  return {
    activeTrack,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    activeClipKey,
    clipProgress,
    audioError,
    stop,
    toggleClip,
    toggleFullPlay,
    seekFull,
    switchTrack,
    changeRate,
  };
}

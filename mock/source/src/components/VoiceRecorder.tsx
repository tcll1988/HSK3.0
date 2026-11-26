import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Play, RotateCcw, Clock, AlertCircle } from 'lucide-react';
import { formatTime } from '../hooks/useExamAudio';

interface VoiceRecorderProps {
  prepSeconds?: number;
  speakSeconds?: number;
  memoValue: string;
  onMemoChange: (val: string) => void;
  placeholder?: string;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  prepSeconds,
  speakSeconds,
  memoValue,
  onMemoChange,
  placeholder = '発話の構成メモ・キーワード・スクリプトを自由に記入できます（マイクなしでも練習可能）',
}) => {
  const [recording, setRecording] = useState(false);
  const [recordUrl, setRecordUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [timerMode, setTimerMode] = useState<'idle' | 'prep' | 'speak'>('idle');
  const [remaining, setRemaining] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (recordUrl) URL.revokeObjectURL(recordUrl);
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    };
  }, [recordUrl]);

  useEffect(() => {
    if (timerMode === 'idle' || remaining <= 0) return;
    const id = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setTimerMode('idle');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerMode, remaining]);

  const startTimer = (mode: 'prep' | 'speak', secs: number) => {
    setTimerMode(mode);
    setRemaining(secs);
  };

  const startRecording = async () => {
    setMicError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicError('このブラウザではマイク録音が利用できません。下のメモ欄とタイマーで練習できます。');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (recordUrl) URL.revokeObjectURL(recordUrl);
        setRecordUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      if (speakSeconds) startTimer('speak', speakSeconds);
    } catch {
      setMicError('マイクのアクセス権限が許可されませんでした。ブラウザ設定をご確認いただくか、メモ欄で練習してください。');
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    setRecording(false);
    setTimerMode('idle');
  };

  return (
    <div className="space-y-3 rounded-2xl border border-[#DCE6F2] bg-[#F7FAFE] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[#1E3A5F]">
          <Mic className="h-4 w-4 text-[#C83E2B]" />
          スピーキング録音＆タイマー練習
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {prepSeconds && prepSeconds > 0 && (
            <button
              type="button"
              onClick={() => startTimer('prep', prepSeconds)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#D4DFEE] bg-white px-2.5 py-1 text-xs font-semibold text-[#1E3A5F] hover:bg-[#EEF4FA]"
            >
              <Clock className="h-3.5 w-3.5" />
              準備 {formatTime(prepSeconds)}
            </button>
          )}
          {speakSeconds && speakSeconds > 0 && (
            <button
              type="button"
              onClick={() => startTimer('speak', speakSeconds)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#F0CFC9] bg-white px-2.5 py-1 text-xs font-semibold text-[#C83E2B] hover:bg-[#FFF5F3]"
            >
              <Clock className="h-3.5 w-3.5" />
              解答 {formatTime(speakSeconds)}
            </button>
          )}
          {timerMode !== 'idle' && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E3A5F] px-2.5 py-1 font-mono text-xs font-bold text-white">
              {timerMode === 'prep' ? '準備中' : '発話中'} {formatTime(remaining)}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {!recording ? (
          <button
            type="button"
            onClick={startRecording}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#C83E2B] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#B13524]"
          >
            <Mic className="h-4 w-4" />
            {recordUrl ? '録音し直す' : '自分の発話を録音する'}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#1F2328] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-black"
          >
            <Square className="h-3.5 w-3.5 fill-current text-[#EF4444]" />
            録音を停止
          </button>
        )}

        {recordUrl && (
          <div className="flex flex-1 items-center gap-2">
            <Play className="h-3.5 w-3.5 shrink-0 text-[#2E7D5B]" />
            <audio controls src={recordUrl} className="h-9 flex-1" />
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(recordUrl);
                setRecordUrl(null);
              }}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#D4DFEE] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#57606A] hover:bg-[#F3EFE8]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              消去
            </button>
          </div>
        )}
      </div>

      {micError && (
        <div className="flex items-center gap-1.5 rounded-xl border border-[#F3C6BE] bg-[#FFF2F0] px-3 py-1.5 text-xs text-[#A63122]">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{micError}</span>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-semibold text-[#4B5563]">
          発話メモ・回答ドラフト（任意・自動保存）
        </label>
        <textarea
          rows={3}
          value={memoValue}
          onChange={(e) => onMemoChange(e.target.value)}
          placeholder={placeholder}
          lang="zh-CN"
          className="font-zh w-full rounded-xl border border-[#D4DFEE] bg-white px-3.5 py-2.5 text-sm leading-relaxed text-[#1F2328] outline-none transition focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/15"
        />
      </div>
    </div>
  );
};

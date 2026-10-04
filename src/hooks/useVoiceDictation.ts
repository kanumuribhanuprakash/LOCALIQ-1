import { useState, useEffect, useRef, useCallback } from 'react';
import {
  voiceRecordingService,
  VoiceRecordingState,
  VoiceRecordingErrorInfo,
  MAX_RECORDING_SECONDS,
} from '../services/voiceRecordingService';
import {
  clientLocalASRService,
  AudioTranscriptionResult,
} from '../services/clientLocalASRService';
import { useApp } from '../context/AppContext';

export type LocalDictationState =
  | 'idle'
  | 'requesting_permission'
  | 'recording'
  | 'stopping'
  | 'transcribing'
  | 'review'
  | 'empty_speech'
  | 'error';

export interface UseVoiceDictationReturn {
  state: LocalDictationState;
  elapsedSeconds: number;
  formattedTimer: string;
  transcriptionProgress: { percent: number; message: string };
  errorMessage: { title: string; body: string } | null;
  transcriptResult: AudioTranscriptionResult | null;
  editedTranscript: string;
  setEditedTranscript: (text: string) => void;
  recordedDuration: number;
  isSavingToKB: boolean;
  savedToKBSuccess: boolean;
  backendInfo: { device: 'webgpu' | 'wasm'; label: string };
  isHandsFree: boolean;
  audioLevel: number;
  speechDetected: boolean;
  toggleHandsFree: (force?: boolean) => Promise<void>;
  startRecording: (options?: { enableSilenceDetection?: boolean }) => Promise<void>;
  stopAndTranscribe: (autoSubmit?: boolean) => Promise<void>;
  cancelRecording: () => void;
  askAssistant: () => void;
  saveToKnowledgeBase: () => Promise<void>;
  dismiss: () => void;
  rerecord: () => Promise<void>;
}

export function useVoiceDictation(
  onTranscriptSubmitted: (query: string) => void
): UseVoiceDictationReturn {
  const { saveVoiceTranscript, logActivity } = useApp();

  const [state, setState] = useState<LocalDictationState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [formattedTimer, setFormattedTimer] = useState<string>('00:00');
  const [transcriptionProgress, setTranscriptionProgress] = useState<{
    percent: number;
    message: string;
  }>({ percent: 0, message: '' });
  const [errorMessage, setErrorMessage] = useState<{ title: string; body: string } | null>(null);

  const [transcriptResult, setTranscriptResult] = useState<AudioTranscriptionResult | null>(null);
  const [editedTranscript, setEditedTranscript] = useState<string>('');
  const [recordedDuration, setRecordedDuration] = useState<number>(0);

  const [isSavingToKB, setIsSavingToKB] = useState<boolean>(false);
  const [savedToKBSuccess, setSavedToKBSuccess] = useState<boolean>(false);

  // Hands-Free Voice Activation States
  const [isHandsFree, setIsHandsFree] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [speechDetected, setSpeechDetected] = useState<boolean>(false);

  const backendInfo = clientLocalASRService.getBackendInfo();
  const abortSignalRef = useRef<AbortController | null>(null);
  const isHandsFreeRef = useRef<boolean>(false);
  isHandsFreeRef.current = isHandsFree;
  const stateRef = useRef<LocalDictationState>('idle');
  stateRef.current = state;
  const stopAndTranscribeRef = useRef<(autoSubmit?: boolean) => Promise<void>>(() => Promise.resolve());

  useEffect(() => {
    const unsubscribe = voiceRecordingService.subscribe({
      onStateChange: (recState: VoiceRecordingState) => {
        if (recState === 'requesting_permission') {
          setState('requesting_permission');
        } else if (recState === 'recording') {
          setState('recording');
        } else if (recState === 'stopping') {
          setState('stopping');
        } else if (recState === 'idle') {
          setState((prev) =>
            prev === 'recording' || prev === 'stopping' || prev === 'requesting_permission'
              ? 'idle'
              : prev
          );
        }
      },
      onTimerTick: (secs, formatted) => {
        setElapsedSeconds(secs);
        setFormattedTimer(formatted);
      },
      onAudioLevel: (level: number) => {
        setAudioLevel(level);
      },
      onSpeechDetected: () => {
        setSpeechDetected(true);
      },
      onSilenceDetected: () => {
        // When hands-free is enabled, auto-stop and transcribe on silence!
        if (isHandsFreeRef.current && stateRef.current === 'recording') {
          stopAndTranscribeRef.current(true);
        }
      },
      onError: (err: VoiceRecordingErrorInfo) => {
        setState('error');
        setErrorMessage({
          title: err.title,
          body: err.message,
        });
      },
      onLimitReached: () => {
        logActivity(
          'processing',
          'Max Recording Duration Reached',
          'Automatic stop at 60s limit. Processing audio locally.'
        );
      },
    });

    return () => {
      unsubscribe();
      voiceRecordingService.cleanup();
      if (abortSignalRef.current) {
        abortSignalRef.current.abort();
      }
    };
  }, [logActivity]);

  const startRecording = useCallback(
    async (options?: { enableSilenceDetection?: boolean }) => {
      setErrorMessage(null);
      setTranscriptResult(null);
      setEditedTranscript('');
      setSavedToKBSuccess(false);
      setSpeechDetected(false);

      try {
        await voiceRecordingService.startRecording({
          maxDuration: MAX_RECORDING_SECONDS,
          enableSilenceDetection: options?.enableSilenceDetection ?? isHandsFreeRef.current,
          silenceThresholdMs: 1600,
          speechThreshold: 0.05,
        });
      } catch (err: any) {
        setState('error');
        setErrorMessage({
          title: 'Microphone Initialization Failed',
          body: err?.message || 'Unable to access microphone.',
        });
      }
    },
    []
  );

  const stopAndTranscribe = useCallback(
    async (autoSubmit?: boolean) => {
      try {
        const audioBlob = await voiceRecordingService.stopRecording();
        if (!audioBlob || audioBlob.size === 0) {
          if (isHandsFreeRef.current) {
            setState('idle');
          } else {
            setState('empty_speech');
          }
          return;
        }

        setRecordedDuration(elapsedSeconds);
        setState('transcribing');
        setTranscriptionProgress({
          percent: 10,
          message: 'Preparing audio buffer locally...',
        });

        const abortController = new AbortController();
        abortSignalRef.current = abortController;

        const result = await clientLocalASRService.transcribe(audioBlob, {
          signal: abortController.signal,
          onProgress: (prog) => {
            setTranscriptionProgress({
              percent: prog.percent,
              message: prog.message,
            });
          },
        });

        if (!result.isMeaningful || !result.text.trim()) {
          if (isHandsFreeRef.current) {
            setState('idle');
          } else {
            setState('empty_speech');
          }
          return;
        }

        const recognizedText = result.text.trim();
        setTranscriptResult(result);
        setEditedTranscript(recognizedText);

        const shouldAutoSubmit = autoSubmit || isHandsFreeRef.current;
        if (shouldAutoSubmit) {
          logActivity(
            'processing',
            'Hands-Free Voice Query Submitted',
            `Recognized "${recognizedText}" via browser-local Whisper (${backendInfo.device.toUpperCase()}). Auto-submitting to assistant.`,
            { durationSeconds: result.durationSeconds, model: result.modelName }
          );
          setState('idle');
          setTranscriptResult(null);
          setEditedTranscript('');
          onTranscriptSubmitted(recognizedText);
        } else {
          setState('review');
          logActivity(
            'processing',
            'Local Audio Transcribed',
            `Recognized ${result.text.length} characters in ${result.durationFormatted} via browser-local Whisper (${backendInfo.device.toUpperCase()}).`,
            { durationSeconds: result.durationSeconds, model: result.modelName }
          );
        }
      } catch (err: any) {
        if (err?.name === 'AbortError' || err?.message?.includes('cancelled')) {
          setState('idle');
          return;
        }
        console.error('Local transcription error:', err);
        setState('error');
        setErrorMessage({
          title: 'Local Transcription Failed',
          body: 'Local transcription failed. Your recording was not uploaded. Try recording again.',
        });
      } finally {
        abortSignalRef.current = null;
      }
    },
    [elapsedSeconds, backendInfo.device, logActivity, onTranscriptSubmitted]
  );
  stopAndTranscribeRef.current = stopAndTranscribe;

  const cancelRecording = useCallback(() => {
    voiceRecordingService.cancelRecording();
    if (abortSignalRef.current) {
      abortSignalRef.current.abort();
      abortSignalRef.current = null;
    }
    clientLocalASRService.cancel();
    setState('idle');
    setAudioLevel(0);
    setSpeechDetected(false);
    setErrorMessage(null);
    setTranscriptResult(null);
    setEditedTranscript('');
    setSavedToKBSuccess(false);
  }, []);

  const toggleHandsFree = useCallback(
    async (force?: boolean) => {
      const nextVal = force !== undefined ? force : !isHandsFreeRef.current;
      setIsHandsFree(nextVal);
      isHandsFreeRef.current = nextVal;

      if (nextVal) {
        if (stateRef.current === 'idle') {
          await startRecording({ enableSilenceDetection: true });
        }
        logActivity(
          'processing',
          'Hands-Free Voice Activation Enabled',
          'Hands-free voice query entry is active. Speak clearly; silence detection will auto-transcribe and submit your query.'
        );
      } else {
        if (stateRef.current === 'recording' || stateRef.current === 'requesting_permission') {
          cancelRecording();
        }
        logActivity(
          'processing',
          'Hands-Free Voice Activation Disabled',
          'Hands-free voice mode turned off. Switched back to push-to-talk voice entry.'
        );
      }
    },
    [cancelRecording, logActivity, startRecording]
  );

  const dismiss = useCallback(() => {
    cancelRecording();
  }, [cancelRecording]);

  const rerecord = useCallback(async () => {
    cancelRecording();
    await startRecording();
  }, [cancelRecording, startRecording]);

  const askAssistant = useCallback(() => {
    const trimmed = editedTranscript.trim();
    if (!trimmed) return;

    setState('idle');
    setTranscriptResult(null);
    setEditedTranscript('');

    onTranscriptSubmitted(trimmed);
  }, [editedTranscript, onTranscriptSubmitted]);

  const saveToKnowledgeBase = useCallback(async () => {
    const trimmed = editedTranscript.trim();
    if (!trimmed || isSavingToKB) return;

    setIsSavingToKB(true);
    try {
      await saveVoiceTranscript(trimmed, recordedDuration);
      setSavedToKBSuccess(true);
    } catch (err) {
      console.error('Failed to save transcript to knowledge base:', err);
    } finally {
      setIsSavingToKB(false);
    }
  }, [editedTranscript, isSavingToKB, recordedDuration, saveVoiceTranscript]);

  return {
    state,
    elapsedSeconds,
    formattedTimer,
    transcriptionProgress,
    errorMessage,
    transcriptResult,
    editedTranscript,
    setEditedTranscript,
    recordedDuration,
    isSavingToKB,
    savedToKBSuccess,
    backendInfo,
    isHandsFree,
    audioLevel,
    speechDetected,
    toggleHandsFree,
    startRecording,
    stopAndTranscribe,
    cancelRecording,
    askAssistant,
    saveToKnowledgeBase,
    dismiss,
    rerecord,
  };
}

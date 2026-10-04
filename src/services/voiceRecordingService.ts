/**
 * LOCALIQ Voice Recording Service (voiceRecordingService.ts)
 * 
 * Provides an air-gapped, zero-cloud browser microphone recording controller
 * using standard HTML5 MediaRecorder and navigator.mediaDevices.
 * 
 * Guarantees:
 * - 100% In-Browser: Audio binary data is never transmitted to any external server or API.
 * - Permission On-Demand: Never requests microphone access until explicitly invoked by the user.
 * - Safe Memory Bounds: Enforces conservative maximum recording duration (60s) to protect browser memory.
 * - Complete Track Cleanup: Explicitly stops all MediaStreamTracks on stop or cancel.
 * - Robust Error Mapping: Distinctly handles permission denied, no hardware, and unsupported browsers.
 */

export type VoiceRecordingState =
  | 'idle'
  | 'requesting_permission'
  | 'recording'
  | 'stopping'
  | 'processing'
  | 'transcribing'
  | 'review'
  | 'error';

export type VoiceRecordingErrorType =
  | 'permission_denied'
  | 'no_device'
  | 'not_supported'
  | 'recorder_error'
  | 'limit_reached';

export interface VoiceRecordingErrorInfo {
  type: VoiceRecordingErrorType;
  title: string;
  message: string;
}

export interface VoiceRecordingListener {
  onStateChange?: (state: VoiceRecordingState) => void;
  onTimerTick?: (seconds: number, formatted: string) => void;
  onError?: (error: VoiceRecordingErrorInfo) => void;
  onLimitReached?: () => void;
  onAudioLevel?: (level: number) => void;
  onSpeechDetected?: () => void;
  onSilenceDetected?: () => void;
}

export interface StartRecordingOptions {
  maxDuration?: number;
  enableSilenceDetection?: boolean;
  silenceThresholdMs?: number; // duration of silence after speech to trigger, default 1600ms
  speechThreshold?: number; // audio level threshold to count as speech, default 0.06
}

export const MAX_RECORDING_SECONDS = 60; // 60 seconds max to protect browser memory

export class VoiceRecordingService {
  private static instance: VoiceRecordingService | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private state: VoiceRecordingState = 'idle';
  private timerInterval: any = null;
  private elapsedSeconds: number = 0;
  private maxDurationSeconds: number = MAX_RECORDING_SECONDS;
  private listeners: Set<VoiceRecordingListener> = new Set();
  private selectedMimeType: string = '';
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private levelInterval: any = null;
  private currentAudioLevel: number = 0;
  private hasDetectedSpeechInSession: boolean = false;

  private constructor() {}

  public static getInstance(): VoiceRecordingService {
    if (!VoiceRecordingService.instance) {
      VoiceRecordingService.instance = new VoiceRecordingService();
    }
    return VoiceRecordingService.instance;
  }

  public subscribe(listener: VoiceRecordingListener): () => void {
    this.listeners.add(listener);
    // Initial state push
    listener.onStateChange?.(this.state);
    listener.onTimerTick?.(this.elapsedSeconds, this.formatSeconds(this.elapsedSeconds));
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(newState: VoiceRecordingState) {
    this.state = newState;
    this.listeners.forEach((l) => l.onStateChange?.(newState));
  }

  public getState(): VoiceRecordingState {
    return this.state;
  }

  public getElapsedSeconds(): number {
    return this.elapsedSeconds;
  }

  public getAudioLevel(): number {
    return this.currentAudioLevel;
  }

  public hasSpeechBeenDetected(): boolean {
    return this.hasDetectedSpeechInSession;
  }

  /**
   * Validates if the current browser environment supports microphone capture.
   */
  public isSupported(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return false;
    }
    return Boolean(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof window.MediaRecorder !== 'undefined'
    );
  }

  /**
   * Resolves the optimal supported audio MIME type.
   */
  private getSupportedMimeType(): string {
    if (typeof MediaRecorder === 'undefined') return '';
    const preferredTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];
    for (const type of preferredTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  }

  /**
   * Starts microphone recording after requesting user permission.
   * Supports optional silence detection for hands-free voice-activation workflows.
   */
  public async startRecording(
    optionsOrMaxDuration: number | StartRecordingOptions = MAX_RECORDING_SECONDS
  ): Promise<void> {
    if (!this.isSupported()) {
      const err: VoiceRecordingErrorInfo = {
        type: 'not_supported',
        title: 'Microphone Not Supported',
        message: 'Microphone input is not available in this browser or device.',
      };
      this.setState('error');
      this.listeners.forEach((l) => l.onError?.(err));
      return;
    }

    const options: StartRecordingOptions =
      typeof optionsOrMaxDuration === 'number'
        ? { maxDuration: optionsOrMaxDuration }
        : optionsOrMaxDuration || {};

    const maxDuration = options.maxDuration || MAX_RECORDING_SECONDS;
    const enableSilence = Boolean(options.enableSilenceDetection);
    const silenceTimeoutMs = options.silenceThresholdMs ?? 1600;
    const speechThreshold = options.speechThreshold ?? 0.05;

    // Clean up any stale sessions
    this.cleanup();

    this.maxDurationSeconds = maxDuration;
    this.elapsedSeconds = 0;
    this.recordedChunks = [];
    this.currentAudioLevel = 0;
    this.hasDetectedSpeechInSession = false;
    this.setState('requesting_permission');

    try {
      // 1. Request microphone permission explicitly
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.mediaStream = stream;

      // 2. Set up AudioContext AnalyserNode for volume feedback and hands-free silence detection
      if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioContextClass();
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.3;
          source.connect(analyser);

          this.audioContext = audioCtx;
          this.analyserNode = analyser;

          const freqData = new Uint8Array(analyser.frequencyBinCount);
          let silenceStart: number | null = null;

          this.levelInterval = setInterval(() => {
            if (this.state !== 'recording' || !this.analyserNode) return;
            this.analyserNode.getByteFrequencyData(freqData);
            let sum = 0;
            for (let i = 0; i < freqData.length; i++) {
              sum += freqData[i];
            }
            const avg = sum / (freqData.length || 1);
            // Normalized 0.0 to 1.0 (with slight sensitivity boost for quiet voices)
            const normalized = Math.min(1, Number((avg / 90).toFixed(3)));
            this.currentAudioLevel = normalized;
            this.listeners.forEach((l) => l.onAudioLevel?.(normalized));

            if (enableSilence) {
              if (normalized >= speechThreshold) {
                if (!this.hasDetectedSpeechInSession) {
                  this.hasDetectedSpeechInSession = true;
                  this.listeners.forEach((l) => l.onSpeechDetected?.());
                }
                silenceStart = null;
              } else if (this.hasDetectedSpeechInSession) {
                const now = Date.now();
                if (silenceStart === null) {
                  silenceStart = now;
                } else if (now - silenceStart >= silenceTimeoutMs) {
                  // Trigger silence detection for hands-free auto-stop
                  silenceStart = null;
                  this.listeners.forEach((l) => l.onSilenceDetected?.());
                }
              }
            }
          }, 80);
        } catch (audioErr) {
          console.warn('AudioContext level monitoring not initialized:', audioErr);
        }
      }

      // 3. Configure MediaRecorder
      const mimeType = this.getSupportedMimeType();
      this.selectedMimeType = mimeType;

      const recorderOptions: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, recorderOptions);
      this.mediaRecorder = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      recorder.onerror = (event: Event) => {
        console.error('MediaRecorder error:', event);
        const err: VoiceRecordingErrorInfo = {
          type: 'recorder_error',
          title: 'Recording Error',
          message: 'An error occurred during audio recording. Please try again.',
        };
        this.cleanup();
        this.setState('error');
        this.listeners.forEach((l) => l.onError?.(err));
      };

      // 4. Start Recording with 250ms chunk slicing
      recorder.start(250);
      this.setState('recording');

      // 5. Start timer
      this.elapsedSeconds = 0;
      this.listeners.forEach((l) =>
        l.onTimerTick?.(0, this.formatSeconds(0))
      );

      this.timerInterval = setInterval(() => {
        this.elapsedSeconds += 1;
        const formatted = this.formatSeconds(this.elapsedSeconds);
        this.listeners.forEach((l) => l.onTimerTick?.(this.elapsedSeconds, formatted));

        // Auto-stop at max recording duration
        if (this.elapsedSeconds >= this.maxDurationSeconds) {
          this.listeners.forEach((l) => l.onLimitReached?.());
          this.stopRecording();
        }
      }, 1000);
    } catch (error: any) {
      this.cleanup();
      this.setState('error');

      let errInfo: VoiceRecordingErrorInfo;
      const errorName = error?.name || '';

      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        errInfo = {
          type: 'permission_denied',
          title: 'Microphone Access Denied',
          message:
            'Microphone access was denied. Allow microphone access in your browser settings and try again.',
        };
      } else if (
        errorName === 'NotFoundError' ||
        errorName === 'DevicesNotFoundError'
      ) {
        errInfo = {
          type: 'no_device',
          title: 'No Microphone Detected',
          message: 'No microphone was detected on this device.',
        };
      } else {
        errInfo = {
          type: 'not_supported',
          title: 'Microphone Unavailable',
          message:
            error?.message ||
            'Microphone input is not available in this browser or device.',
        };
      }

      this.listeners.forEach((l) => l.onError?.(errInfo));
    }
  }

  /**
   * Stops recording, releases microphone tracks, and resolves the captured Blob.
   */
  public async stopRecording(): Promise<Blob | null> {
    if (this.state !== 'recording' || !this.mediaRecorder) {
      return null;
    }

    this.setState('stopping');
    this.stopTimer();

    return new Promise<Blob | null>((resolve) => {
      const recorder = this.mediaRecorder;
      if (!recorder) {
        this.cleanup();
        this.setState('idle');
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const mimeType = this.selectedMimeType || 'audio/webm';
        const finalBlob = new Blob(this.recordedChunks, { type: mimeType });

        // Release all active audio tracks
        this.stopAllAudioTracks();
        this.mediaRecorder = null;
        this.mediaStream = null;
        this.recordedChunks = [];

        this.setState('processing');
        resolve(finalBlob);
      };

      try {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        } else {
          recorder.onstop?.(new Event('stop'));
        }
      } catch (err) {
        console.error('Error stopping MediaRecorder:', err);
        this.cleanup();
        this.setState('idle');
        resolve(null);
      }
    });
  }

  /**
   * Cancels the active recording immediately:
   * Stops MediaRecorder, stops audio tracks, discards audio chunks,
   * resets timer, and transitions back to 'idle'.
   */
  public cancelRecording(): void {
    this.stopTimer();

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.onstop = null; // Detach listener so it doesn't emit blob
        this.mediaRecorder.stop();
      } catch (_) {}
    }

    this.stopAllAudioTracks();
    this.mediaRecorder = null;
    this.mediaStream = null;
    this.recordedChunks = [];
    this.elapsedSeconds = 0;
    this.setState('idle');
  }

  /**
   * Completely stops all tracks of the active MediaStream and AudioContext.
   */
  private stopAllAudioTracks(): void {
    if (this.levelInterval) {
      clearInterval(this.levelInterval);
      this.levelInterval = null;
    }
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (_) {}
      this.audioContext = null;
      this.analyserNode = null;
    }
    this.currentAudioLevel = 0;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      this.mediaStream = null;
    }
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  public cleanup(): void {
    this.stopTimer();
    this.stopAllAudioTracks();
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (_) {}
    }
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.elapsedSeconds = 0;
    this.currentAudioLevel = 0;
    this.hasDetectedSpeechInSession = false;
    this.state = 'idle';
  }

  /**
   * Formats elapsed seconds into MM:SS.
   */
  public formatSeconds(totalSeconds: number): string {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

export const voiceRecordingService = VoiceRecordingService.getInstance();

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  Square,
  RotateCcw,
  Send,
  X,
  ShieldCheck,
  AlertCircle,
  Loader2,
  BookmarkPlus,
  Check,
  Volume2,
} from 'lucide-react';
import { MAX_RECORDING_SECONDS } from '../../../services/voiceRecordingService';
import { UseVoiceDictationReturn } from '../../../hooks/useVoiceDictation';

export interface VoiceDictationPanelProps {
  voice: UseVoiceDictationReturn;
}

export const VoiceDictationPanel: React.FC<VoiceDictationPanelProps> = ({ voice }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when review state is active
  useEffect(() => {
    if (voice.state === 'review') {
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.select();
        }
      }, 100);
    }
  }, [voice.state]);

  if (voice.state === 'idle') {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        role="region"
        aria-live="polite"
        aria-label="Voice dictation interface"
        className="w-full mb-3 p-4 rounded-2xl bg-[#060E18] border border-cyan-500/30 shadow-2xl shadow-cyan-950/50 backdrop-blur-md"
      >
        {/* STATE: Requesting Permission */}
        {voice.state === 'requesting_permission' && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 animate-pulse">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white font-sans">
                  Requesting Microphone Access...
                </div>
                <div className="text-[11px] text-slate-400 font-sans">
                  Grant browser microphone permission to begin local recording.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={voice.cancelRecording}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-sans transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        {/* STATE: Recording */}
        {voice.state === 'recording' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Left: Indicator & Timer */}
              <div className="flex items-center gap-3">
                {/* Pulsing record dot / audio activity */}
                <div
                  className={`relative flex items-center justify-center w-8 h-8 rounded-xl border transition-all ${
                    voice.isHandsFree
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                  }`}
                >
                  <span className="relative flex h-3 w-3">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        voice.isHandsFree ? 'bg-emerald-400' : 'bg-rose-400'
                      }`}
                    ></span>
                    <span
                      className={`relative inline-flex rounded-full h-3 w-3 ${
                        voice.isHandsFree ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    ></span>
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold tracking-wide font-mono uppercase ${
                        voice.isHandsFree ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      {voice.isHandsFree ? 'Hands-Free Listening' : 'Recording'}
                    </span>
                    <span className="text-xs font-mono font-bold text-white bg-black/40 px-2 py-0.5 rounded border border-white/10">
                      {voice.formattedTimer}
                    </span>
                    {voice.isHandsFree && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        {voice.speechDetected ? 'Speech Detected' : 'Waiting for voice...'}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-300 font-sans">
                    {voice.isHandsFree
                      ? 'Speak your question clearly. Silence pauses will auto-transcribe and submit hands-free.'
                      : 'Speak clearly. Audio remains 100% inside your browser.'}
                  </div>
                </div>
              </div>

              {/* Right: Audio Wave Meter & Actions */}
              <div className="flex items-center gap-2">
                {/* Audio wave bars responding to voice.audioLevel */}
                <div
                  className="flex items-center gap-1 px-2.5 py-1 bg-black/40 rounded-lg border border-white/10 h-7"
                  title={`Microphone Level: ${Math.round(voice.audioLevel * 100)}%`}
                >
                  <span
                    className={`w-1 rounded-full transition-all duration-75 ${
                      voice.isHandsFree ? 'bg-emerald-400' : 'bg-cyan-400'
                    }`}
                    style={{
                      height: `${Math.max(4, Math.min(22, (voice.audioLevel || 0.1) * 35))}px`,
                    }}
                  ></span>
                  <span
                    className={`w-1 rounded-full transition-all duration-75 ${
                      voice.isHandsFree ? 'bg-emerald-400' : 'bg-cyan-400'
                    }`}
                    style={{
                      height: `${Math.max(6, Math.min(22, (voice.audioLevel || 0.15) * 45))}px`,
                    }}
                  ></span>
                  <span
                    className={`w-1 rounded-full transition-all duration-75 ${
                      voice.isHandsFree ? 'bg-emerald-400' : 'bg-cyan-400'
                    }`}
                    style={{
                      height: `${Math.max(8, Math.min(22, (voice.audioLevel || 0.2) * 55))}px`,
                    }}
                  ></span>
                  <span
                    className={`w-1 rounded-full transition-all duration-75 ${
                      voice.isHandsFree ? 'bg-emerald-400' : 'bg-cyan-400'
                    }`}
                    style={{
                      height: `${Math.max(5, Math.min(22, (voice.audioLevel || 0.12) * 40))}px`,
                    }}
                  ></span>
                  <span
                    className={`w-1 rounded-full transition-all duration-75 ${
                      voice.isHandsFree ? 'bg-emerald-400' : 'bg-cyan-400'
                    }`}
                    style={{
                      height: `${Math.max(4, Math.min(22, (voice.audioLevel || 0.08) * 30))}px`,
                    }}
                  ></span>
                </div>

                {/* Cancel button */}
                <button
                  type="button"
                  id="cancel-voice-recording-btn"
                  onClick={voice.cancelRecording}
                  className="px-3 py-1.5 rounded-xl bg-[#0D1826] hover:bg-[#152538] border border-white/10 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Discard audio and cancel recording"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>

                {/* Stop & Transcribe button (or Send Now in hands-free) */}
                <button
                  type="button"
                  id="stop-voice-recording-btn"
                  onClick={() => voice.stopAndTranscribe(voice.isHandsFree)}
                  className={`px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                    voice.isHandsFree
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-emerald-600/30'
                      : 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 shadow-rose-600/30'
                  }`}
                  title={
                    voice.isHandsFree
                      ? 'Send now without waiting for silence'
                      : 'Stop recording and transcribe locally'
                  }
                >
                  {voice.isHandsFree ? (
                    <>
                      <Send className="w-3 h-3" />
                      <span>Send Query Now</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-3 h-3 fill-current" />
                      <span>Stop & Transcribe</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Privacy Badge */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <ShieldCheck className="w-3 h-3 text-cyan-400" />
                <span>
                  {voice.isHandsFree
                    ? 'Air-gapped voice activation. Whisper ASR runs on-device.'
                    : 'Air-gapped voice capture. Never uploaded or transmitted.'}
                </span>
              </span>
              <span className="text-slate-500">
                {MAX_RECORDING_SECONDS - voice.elapsedSeconds}s remaining
              </span>
            </div>
          </div>
        )}

        {/* STATE: Stopping / Transcribing */}
        {(voice.state === 'stopping' || voice.state === 'transcribing') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white font-sans">
                      {voice.state === 'stopping'
                        ? 'Finalizing audio buffer...'
                        : 'Transcribing locally on device...'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      {voice.backendInfo.label}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-sans">
                    {voice.transcriptionProgress.message ||
                      'Executing Whisper ONNX neural inference...'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={voice.cancelRecording}
                className="px-3 py-1.5 rounded-xl bg-[#0D1826] hover:bg-[#152538] border border-white/10 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-[#030910] rounded-full h-1.5 overflow-hidden border border-white/5">
              <div
                className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(15, voice.transcriptionProgress.percent || 25)}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <ShieldCheck className="w-3 h-3 text-cyan-400" />
                <span>Whisper runs entirely inside your browser (zero cloud APIs).</span>
              </span>
              <span className="text-slate-500">Audio length: {voice.formattedTimer}</span>
            </div>
          </div>
        )}

        {/* STATE: Review Transcript */}
        {voice.state === 'review' && (
          <div className="space-y-3">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  <Mic className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-white font-sans">
                  Voice Query Transcribed
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  {voice.transcriptResult?.durationFormatted || voice.formattedTimer}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                  {voice.backendInfo.label}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-300">
                <ShieldCheck className="w-3 h-3 text-cyan-400" />
                <span>Processed 100% locally</span>
              </div>
            </div>

            {/* Editable Transcript Textarea */}
            <div>
              <label
                htmlFor="voice-transcript-editor"
                className="block text-[11px] font-medium text-slate-400 mb-1.5"
              >
                Review & edit recognized query before asking:
              </label>
              <textarea
                id="voice-transcript-editor"
                ref={textareaRef}
                rows={3}
                value={voice.editedTranscript}
                onChange={(e) => voice.setEditedTranscript(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    voice.askAssistant();
                  }
                }}
                placeholder="Transcribed voice query..."
                className="w-full p-3 rounded-xl bg-[#030910] border border-cyan-500/30 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 font-sans resize-none transition-colors"
              />
            </div>

            {/* Timestamp segments if available */}
            {voice.transcriptResult?.segments && voice.transcriptResult.segments.length > 1 && (
              <div className="max-h-24 overflow-y-auto rounded-lg bg-[#02070D] p-2 border border-white/5 text-[11px] font-mono space-y-1">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Timestamped Segments ({voice.transcriptResult.segments.length})
                </div>
                {voice.transcriptResult.segments.map((seg, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-slate-300">
                    <span className="text-cyan-400 shrink-0">
                      [{seg.locationLabel.replace('Audio Transcript ', '')}]
                    </span>
                    <span>{seg.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              {/* Left: Re-record & Dismiss */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="rerecord-voice-btn"
                  onClick={voice.rerecord}
                  className="px-3 py-1.5 rounded-xl bg-[#0D1826] hover:bg-[#152538] border border-white/10 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Discard this transcript and record again"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Re-record</span>
                </button>

                <button
                  type="button"
                  id="dismiss-voice-btn"
                  onClick={voice.dismiss}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
              </div>

              {/* Right: Save to KB & Ask Assistant */}
              <div className="flex items-center gap-2">
                {/* Optional Requirement 17: Save to Knowledge Base */}
                <button
                  type="button"
                  id="save-voice-to-kb-btn"
                  disabled={voice.isSavingToKB || voice.savedToKBSuccess || !voice.editedTranscript.trim()}
                  onClick={voice.saveToKnowledgeBase}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
                    voice.savedToKBSuccess
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-[#0D1826] hover:bg-[#152538] text-slate-300 hover:text-white border-white/10'
                  }`}
                  title="Index this transcript into the Knowledge Base for future RAG queries"
                >
                  {voice.savedToKBSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Saved to Knowledge</span>
                    </>
                  ) : voice.isSavingToKB ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Indexing...</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Save to Knowledge Base</span>
                    </>
                  )}
                </button>

                {/* Ask Assistant */}
                <button
                  type="button"
                  id="ask-voice-transcript-btn"
                  disabled={!voice.editedTranscript.trim()}
                  onClick={voice.askAssistant}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 cursor-pointer disabled:opacity-40"
                >
                  <span>Ask Assistant</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STATE: Empty Speech Detected */}
        {voice.state === 'empty_speech' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white font-sans">
                  No speech was detected.
                </div>
                <div className="text-[11px] text-slate-400 font-sans">
                  Try speaking closer to the microphone or record again.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/5">
              <button
                type="button"
                onClick={voice.dismiss}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={voice.rerecord}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Record Again</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE: Error */}
        {voice.state === 'error' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-rose-300 font-sans">
                  {voice.errorMessage?.title || 'Microphone or Transcription Error'}
                </div>
                <div className="text-[11px] text-slate-300 font-sans mt-0.5">
                  {voice.errorMessage?.body || 'An error occurred during local recording.'}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
              <span className="text-[10px] font-mono text-cyan-300 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Your recording was not uploaded.</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={voice.dismiss}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={voice.rerecord}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

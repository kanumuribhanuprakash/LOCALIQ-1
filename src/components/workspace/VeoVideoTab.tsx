import React, { useState, useRef, useEffect } from 'react';
import {
  Film,
  Upload,
  Play,
  Pause,
  Download,
  RotateCcw,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Maximize2,
  Volume2,
  VolumeX,
  X,
  Video,
  FileVideo,
  Database,
  Layers,
  Cloud,
  ShieldAlert,
  AlertTriangle,
  FolderOpen,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { veoVideoService, GeneratedVeoVideoItem } from '../../services/veoVideoService';

export const VeoVideoTab: React.FC = () => {
  const { files, logActivity, addUploadedFiles } = useApp();

  // Photo state
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoMimeType, setPhotoMimeType] = useState<string>('image/png');
  const [photoFileName, setPhotoFileName] = useState<string>('');
  const [photoFileSize, setPhotoFileSize] = useState<string>('');
  const [isFromKnowledgeBase, setIsFromKnowledgeBase] = useState<boolean>(false);
  const [showKBImagePicker, setShowKBImagePicker] = useState<boolean>(false);

  // Configuration
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
  const [prompt, setPrompt] = useState<string>(
    'Cinematic slow push-in with warm sunlight flare and ambient particle drift'
  );

  // Cloud disclosure modal state
  const [showConsentModal, setShowConsentModal] = useState<boolean>(false);
  const [hasAcknowledgedCloudDisclosure, setHasAcknowledgedCloudDisclosure] = useState<boolean>(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progressInfo, setProgressInfo] = useState<{
    stage: string;
    percent: number;
    elapsedSeconds: number;
  }>({
    stage: '',
    percent: 0,
    elapsedSeconds: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [currentVideo, setCurrentVideo] = useState<GeneratedVeoVideoItem | null>(null);
  const [videoHistory, setVideoHistory] = useState<GeneratedVeoVideoItem[]>([]);
  const [savedToKB, setSavedToKB] = useState<boolean>(false);

  // Video playback
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Filter Knowledge Base for existing image files
  const kbImageFiles = (files || []).filter(
    (f) =>
      Boolean(f) &&
      (f.category === 'image' ||
        ['png', 'jpg', 'jpeg', 'webp'].includes((f.extension || '').toLowerCase()) ||
        Boolean((f.originalName || f.name || '').match(/\.(png|jpe?g|webp)$/i)))
  );

  const promptPresets = [
    {
      title: 'Cinematic Push-In',
      prompt: 'Cinematic slow push-in with warm sunlight flare, ambient particle drift, and shallow depth of field',
    },
    {
      title: 'Dynamic Drone Orbit',
      prompt: 'Dynamic drone orbit with natural atmospheric movement, gentle cloud shifts, and realistic perspective parallax',
    },
    {
      title: 'Ambient Breeze & Motion',
      prompt: 'Subtle organic motion with gentle wind blowing through scene, natural lighting shimmer, and realistic physics',
    },
    {
      title: 'Golden Hour Time-Lapse',
      prompt: 'Golden hour time-lapse with shifting warm shadows, vibrant sky gradations, and cinematic high-contrast lighting',
    },
  ];

  // Process an uploaded local image file
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, JPEG, or WEBP).');
      return;
    }

    setError(null);
    setPhotoFileName(file.name);
    setPhotoFileSize(`${(file.size / 1024).toFixed(1)} KB`);
    setPhotoMimeType(file.type || 'image/png');
    setIsFromKnowledgeBase(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPhotoBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Sample photos to try immediately
  const loadSamplePhoto = (type: 'mountain' | 'cyberpunk') => {
    setError(null);
    setIsFromKnowledgeBase(false);
    if (type === 'mountain') {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 1280, 720);
        grad.addColorStop(0, '#0F2027');
        grad.addColorStop(0.5, '#203A43');
        grad.addColorStop(1, '#2C5364');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1280, 720);

        ctx.fillStyle = '#FFA726';
        ctx.beginPath();
        ctx.arc(640, 260, 90, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0a192f';
        ctx.beginPath();
        ctx.moveTo(100, 720);
        ctx.lineTo(450, 320);
        ctx.lineTo(800, 720);
        ctx.fill();

        ctx.fillStyle = '#112240';
        ctx.beginPath();
        ctx.moveTo(500, 720);
        ctx.lineTo(950, 360);
        ctx.lineTo(1300, 720);
        ctx.fill();

        const dataUrl = canvas.toDataURL('image/png');
        setPhotoBase64(dataUrl);
        setPhotoMimeType('image/png');
        setPhotoFileName('sample-alpine-sunrise.png');
        setPhotoFileSize('342 KB');
      }
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 1280;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 720, 1280);
        grad.addColorStop(0, '#1a0826');
        grad.addColorStop(0.5, '#0c1b33');
        grad.addColorStop(1, '#03071e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 720, 1280);

        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 6;
        ctx.strokeRect(160, 340, 400, 600);

        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 4;
        ctx.strokeRect(200, 380, 320, 520);

        const dataUrl = canvas.toDataURL('image/png');
        setPhotoBase64(dataUrl);
        setPhotoMimeType('image/png');
        setPhotoFileName('sample-cyber-neon.png');
        setPhotoFileSize('395 KB');
      }
    }
  };

  // Select an image from local Knowledge Base (with explicit user warning)
  const handleSelectKBImage = (kbFile: (typeof files)[0]) => {
    const formattedSizeStr = kbFile.formattedSize || `${((kbFile.sizeBytes || 0) / 1024).toFixed(1)} KB`;

    if (kbFile.imagePreviewUrl) {
      setPhotoBase64(kbFile.imagePreviewUrl);
      setPhotoMimeType(
        kbFile.extension === 'png' ? 'image/png' :
        kbFile.extension === 'webp' ? 'image/webp' : 'image/jpeg'
      );
      setPhotoFileName(kbFile.name);
      setPhotoFileSize(formattedSizeStr);
      setIsFromKnowledgeBase(true);
      setShowKBImagePicker(false);
      setError(null);
      return;
    }

    // If the file has a dataUrl or we synthesize a canvas preview
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 1280, 720);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '36px sans-serif';
      ctx.fillText(kbFile.name, 100, 360);
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Imported from Local Knowledge Base for Veo Video Studio', 100, 420);
    }
    const dataUrl = canvas.toDataURL('image/png');

    setPhotoBase64(dataUrl);
    setPhotoMimeType('image/png');
    setPhotoFileName(kbFile.name);
    setPhotoFileSize(formattedSizeStr);
    setIsFromKnowledgeBase(true);
    setShowKBImagePicker(false);
    setError(null);
  };

  // Trigger generation or open disclosure modal
  const handleGenerateClick = () => {
    if (!photoBase64) {
      setError('Please select or upload a photo first to generate a video.');
      return;
    }

    if (!hasAcknowledgedCloudDisclosure) {
      setShowConsentModal(true);
      return;
    }

    executeCloudGeneration();
  };

  const executeCloudGeneration = async () => {
    if (!photoBase64) return;

    setIsGenerating(true);
    setError(null);
    setSavedToKB(false);
    setProgressInfo({
      stage: 'Initiating Veo 3.1 video generation request...',
      percent: 5,
      elapsedSeconds: 0,
    });

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      logActivity(
        'processing',
        'Veo Video Generation Started (Cloud)',
        `Generating ${aspectRatio} video using Google Veo: "${prompt.slice(0, 60)}..." [Cloud Service]`
      );

      const generatedItem = await veoVideoService.generateVideo({
        imageBase64: photoBase64,
        mimeType: photoMimeType,
        prompt: prompt.trim(),
        aspectRatio,
        resolution,
        onProgress: (prog) => {
          setProgressInfo(prog);
        },
        signal: abortController.signal,
      });

      setCurrentVideo(generatedItem);
      setVideoHistory((prev) => [generatedItem, ...prev]);

      logActivity(
        'processing',
        'Veo Video Generation Complete (Cloud)',
        `Successfully generated ${aspectRatio} video (${(generatedItem.blobSize / (1024 * 1024)).toFixed(2)} MB) via Google Veo. Downloaded to temporary memory.`
      );
    } catch (err: any) {
      if (err?.message?.includes('aborted')) {
        setError('Generation cancelled by user.');
      } else {
        console.error('Veo video generation error:', err);
        setError(
          err?.message ||
            'Veo is unavailable because this optional cloud service requires network access.'
        );
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  const handleSaveToKnowledgeBase = async () => {
    if (!currentVideo) return;
    try {
      // Create a local metadata text document to index in the knowledge base
      const fileName = `veo-video-${Date.now()}-${aspectRatio.replace(':', 'x')}.mp4`;
      const metadataText = `[Veo Video Asset Metadata]
File Name: ${fileName}
Generated via Google Veo: veo-3.1-fast-generate-preview
Aspect Ratio: ${currentVideo.aspectRatio} (${currentVideo.aspectRatio === '16:9' ? 'Landscape' : 'Portrait'})
Resolution: ${currentVideo.resolution}
Motion Prompt: ${currentVideo.prompt}
Source Image: ${photoFileName || 'Uploaded photo'}
Generated At: ${currentVideo.createdAt}
Asset Note: This text record indexes the video prompt and technical parameters locally into your IndexedDB vector store. The MP4 video file itself was generated via an optional cloud service and is not uploaded to any remote server.`;

      const blob = new Blob([metadataText], { type: 'text/plain' });
      const file = new File([blob], `${fileName}.txt`, { type: 'text/plain' });

      await addUploadedFiles([file]);
      setSavedToKB(true);

      logActivity(
        'upload',
        'Video Asset Metadata Indexed Locally',
        `Indexed Veo video metadata for "${fileName}" into local vector store.`
      );
    } catch (err) {
      console.error('Failed to save video metadata to knowledge base:', err);
    }
  };

  return (
    <div id="veo-video-tab-root" className="space-y-8 pb-16">
      {/* PERSISTENT VISUAL INDICATOR: OPTIONAL CLOUD FEATURE */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-sans">
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4 shrink-0 text-amber-400" />
          <span className="font-semibold tracking-wide uppercase font-mono text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-200">
            OPTIONAL CLOUD FEATURE
          </span>
          <span className="hidden sm:inline text-amber-300/90">
            Veo Video Studio sends photo and prompt data to Google Cloud. LOCALIQ Core RAG remains 100% browser-local.
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-[11px] text-amber-400 font-mono">
          <Info className="w-3.5 h-3.5" />
          <span>Requires Network</span>
        </div>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0C1523] via-[#091522] to-[#0D1B2A] border border-cyan-500/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5" />
              <span>Google Veo Video Studio</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-semibold flex items-center gap-1">
              <Cloud className="w-3 h-3" />
              <span>External Cloud Service</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[10px] font-mono">
              Model: veo-3.1-fast-generate-preview
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-sans">
            Photo-to-Video Generation
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-sans">
            Animate photos with realistic motion vectors and cinematic atmospheric lighting.
            Videos are rendered via Google Veo cloud infrastructure and streamed directly back to your browser.
          </p>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 shrink-0 relative z-10">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Fast Neural Rendering</span>
          </div>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Input Form (Photo Upload & Settings) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Card 1: Photo Upload */}
          <div className="p-6 rounded-3xl bg-[#08121D] border border-cyan-500/20 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white font-sans">1. Source Photo</h3>
              </div>
              <div className="flex items-center gap-2">
                {kbImageFiles.length > 0 && !photoBase64 && (
                  <button
                    type="button"
                    onClick={() => setShowKBImagePicker(!showKBImagePicker)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer font-mono"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Choose from Knowledge Base</span>
                  </button>
                )}
                {photoBase64 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoBase64(null);
                      setPhotoFileName('');
                      setIsFromKnowledgeBase(false);
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Remove photo</span>
                  </button>
                )}
              </div>
            </div>

            {/* Knowledge Base Image Picker Dropdown (if triggered) */}
            {showKBImagePicker && (
              <div className="p-4 rounded-2xl bg-[#050C14] border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white font-sans flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Select an image from Knowledge Base</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowKBImagePicker(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {kbImageFiles.map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => handleSelectKBImage(file)}
                      className="w-full text-left p-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-xs text-slate-300 hover:text-white flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span className="truncate max-w-[80%]">{file.name}</span>
                      <span className="text-[10px] font-mono text-cyan-400">{file.formattedSize || `${((file.sizeBytes || 0) / 1024).toFixed(1)} KB`}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Warning if source photo is from Knowledge Base */}
            {photoBase64 && isFromKnowledgeBase && (
              <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-300">
                    ⚠️ Privacy Notice: Selected image is from local Knowledge Base
                  </p>
                  <p className="text-amber-200/90 text-[11px] leading-relaxed">
                    Generating a video will transmit this image ("{photoFileName}") and your prompt to Google's cloud servers. It will leave your local device.
                  </p>
                </div>
              </div>
            )}

            {/* Dropzone / Preview */}
            {!photoBase64 ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-cyan-500/30 hover:border-cyan-400/60 bg-[#050C14] hover:bg-[#071322] rounded-2xl p-8 text-center transition-all cursor-pointer group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform shadow-lg shadow-cyan-500/10">
                  <Upload className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">
                    Click to select photo or drag and drop
                  </p>
                  <p className="text-xs text-slate-400 font-sans">
                    Supports PNG, JPG, JPEG, and WEBP formats
                  </p>
                </div>

                {/* Quick Sample Photos */}
                <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-center gap-2">
                  <span className="text-[11px] text-slate-400 font-mono">Or try demo:</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadSamplePhoto('mountain');
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors"
                  >
                    Landscape 16:9
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadSamplePhoto('cyberpunk');
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-colors"
                  >
                    Portrait 9:16
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-cyan-500/30 bg-[#050C14] group">
                <img
                  src={photoBase64}
                  alt="Uploaded source photo"
                  className="w-full h-64 object-cover object-center"
                />

                {/* Overlay with info */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 flex items-center justify-between text-xs font-mono text-slate-300">
                  <div className="truncate max-w-[70%]">
                    <p className="text-white font-medium truncate">{photoFileName || 'Photo Selected'}</p>
                    <p className="text-[11px] text-cyan-300">{photoFileSize}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition-colors cursor-pointer"
                  >
                    Change photo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-400 font-sans italic">
              Photos uploaded here are exclusively processed for this video generation session and are never automatically added to your Knowledge Base or accessed by Core RAG.
            </p>
          </div>

          {/* Card 2: Aspect Ratio & Motion Prompt */}
          <div className="p-6 rounded-3xl bg-[#08121D] border border-cyan-500/20 shadow-xl space-y-5">
            {/* Aspect Ratio Selector (Mandatory 16:9 or 9:16) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200 font-sans flex items-center gap-1.5">
                  <span>2. Target Aspect Ratio</span>
                  <span className="text-[10px] text-cyan-400 font-mono">(Veo Requirement)</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* 16:9 Landscape */}
                <button
                  type="button"
                  id="veo-aspect-16-9-btn"
                  onClick={() => setAspectRatio('16:9')}
                  className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                    aspectRatio === '16:9'
                      ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400/30'
                      : 'bg-[#050C14] hover:bg-[#091522] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="w-14 h-8 rounded-lg border-2 border-current flex items-center justify-center text-[10px] font-mono font-bold">
                    16:9
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold">Landscape</p>
                    <p className="text-[10px] text-slate-400">Desktop / Presentation</p>
                  </div>
                </button>

                {/* 9:16 Portrait */}
                <button
                  type="button"
                  id="veo-aspect-9-16-btn"
                  onClick={() => setAspectRatio('9:16')}
                  className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                    aspectRatio === '9:16'
                      ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400/30'
                      : 'bg-[#050C14] hover:bg-[#091522] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="w-8 h-12 rounded-lg border-2 border-current flex items-center justify-center text-[10px] font-mono font-bold">
                    9:16
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold">Portrait</p>
                    <p className="text-[10px] text-slate-400">Mobile / Social Reel</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Prompt Input */}
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-slate-200 font-sans flex items-center justify-between">
                <span>3. Cinematic Motion Prompt</span>
                <span className="text-[10px] text-slate-400 font-mono">Describes camera & scene physics</span>
              </label>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe how the camera moves and what elements animate..."
                rows={3}
                className="w-full px-4 py-3 rounded-2xl bg-[#050C14] border border-cyan-500/30 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 transition-colors resize-none font-sans"
              />

              {/* Prompt Presets */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                  Quick Motion Styles:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {promptPresets.map((preset) => (
                    <button
                      key={preset.title}
                      type="button"
                      onClick={() => setPrompt(preset.prompt)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-500/30 text-[11px] text-slate-300 hover:text-cyan-200 transition-colors cursor-pointer"
                    >
                      {preset.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Resolution Selector */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-slate-300 font-medium">Output Resolution:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setResolution('720p')}
                  className={`px-2.5 py-1 rounded-lg font-mono text-xs transition-colors cursor-pointer ${
                    resolution === '720p'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  720p (Fast)
                </button>
                <button
                  type="button"
                  onClick={() => setResolution('1080p')}
                  className={`px-2.5 py-1 rounded-lg font-mono text-xs transition-colors cursor-pointer ${
                    resolution === '1080p'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  1080p (Full HD)
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-rose-300">Generation Notice</p>
                  <p className="text-rose-200/90">{error}</p>
                </div>
              </div>
            )}

            {/* Action Button: Generate */}
            <div className="pt-2">
              {isGenerating ? (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-full py-3.5 rounded-2xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel Generation</span>
                </button>
              ) : (
                <button
                  type="button"
                  id="veo-generate-btn"
                  onClick={handleGenerateClick}
                  disabled={!photoBase64}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-amber-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-cyan-500/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <Cloud className="w-4 h-4 text-amber-300" />
                  <span>Generate Video with Veo ({aspectRatio})</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Video Player & Output Display */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-6 rounded-3xl bg-[#08121D] border border-cyan-500/20 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white font-sans">
                  Video Preview & Player
                </h3>
              </div>
              {currentVideo && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono flex items-center gap-1">
                  <span>Temporary Session Video</span>
                </span>
              )}
            </div>

            {/* Generating State with Progress */}
            {isGenerating && (
              <div className="p-8 rounded-2xl bg-[#050C14] border border-cyan-500/30 text-center space-y-5">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 animate-pulse" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-cyan-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-cyan-400">
                    <Film className="w-6 h-6 animate-pulse" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-white font-sans">
                    Veo 3.1 Neural Video Synthesis
                  </h4>
                  <p className="text-xs text-slate-300 font-sans max-w-sm mx-auto">
                    {progressInfo.stage || 'Synthesizing motion vectors...'}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-black/50 rounded-full h-2 overflow-hidden border border-white/5">
                  <div
                    className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-amber-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressInfo.percent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
                  <span>Elapsed: {progressInfo.elapsedSeconds}s</span>
                  <span className="text-cyan-300">
                    Aspect Ratio: {aspectRatio} • {resolution}
                  </span>
                  <span>{progressInfo.percent}%</span>
                </div>
              </div>
            )}

            {/* Video Player (when generated) */}
            {!isGenerating && currentVideo && (
              <div className="space-y-4">
                {/* Ephemeral video storage warning */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-amber-300">Temporary Session Video</p>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">
                      This MP4 video is held in browser session memory. It will disappear upon page refresh, browser close, or logout. Click <strong>Download MP4</strong> below to save a permanent copy to your local drive.
                    </p>
                  </div>
                </div>

                <div
                  className={`relative rounded-2xl overflow-hidden bg-black border border-cyan-500/30 flex items-center justify-center ${
                    currentVideo.aspectRatio === '9:16' ? 'max-h-[500px]' : 'max-h-[360px]'
                  }`}
                >
                  <video
                    ref={videoRef}
                    src={currentVideo.videoUrl}
                    controls
                    loop={isLooping}
                    muted={isMuted}
                    autoPlay
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    className="w-full h-full object-contain rounded-2xl"
                  />
                </div>

                {/* Video Info Details */}
                <div className="p-4 rounded-2xl bg-[#050C14] border border-white/5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-white truncate max-w-xs font-sans">
                      {currentVideo.prompt}
                    </span>
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        {currentVideo.aspectRatio}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/5 text-slate-400">
                        {(currentVideo.blobSize / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
                    {/* Download Button */}
                    <a
                      href={currentVideo.videoUrl}
                      download={`veo-video-${Date.now()}.mp4`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download MP4 (Local Disk)</span>
                    </a>

                    {/* Save to Knowledge Base Button */}
                    <button
                      type="button"
                      onClick={handleSaveToKnowledgeBase}
                      disabled={savedToKB}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                        savedToKB
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-[#0D1826] hover:bg-white/5 text-slate-300 border-white/10'
                      }`}
                    >
                      {savedToKB ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Metadata Saved Locally</span>
                        </>
                      ) : (
                        <>
                          <Database className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Index Metadata in Local KB</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State when no video generated yet and not generating */}
            {!isGenerating && !currentVideo && (
              <div className="p-12 rounded-2xl bg-[#050C14] border border-white/5 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center mx-auto">
                  <FileVideo className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-slate-200 font-sans">
                    No Video Generated Yet
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto font-sans">
                    Select a photo on the left, set your aspect ratio (16:9 or 9:16), and click
                    Generate to animate your photo with Veo 3.1.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Session History Gallery */}
          {videoHistory.length > 0 && (
            <div className="p-6 rounded-3xl bg-[#08121D] border border-cyan-500/20 shadow-xl space-y-4">
              <h4 className="text-xs font-semibold text-slate-300 font-sans uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Session Gallery ({videoHistory.length})</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {videoHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setCurrentVideo(item)}
                    className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all ${
                      currentVideo?.id === item.id
                        ? 'border-cyan-400 ring-1 ring-cyan-400/40 shadow-lg shadow-cyan-500/20'
                        : 'border-white/10 hover:border-cyan-500/40'
                    }`}
                  >
                    <div className="aspect-video bg-black flex items-center justify-center overflow-hidden">
                      {item.sourceImageThumbnail ? (
                        <img
                          src={item.sourceImageThumbnail}
                          alt="Thumbnail"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <Film className="w-6 h-6 text-slate-500" />
                      )}
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                        <Play className="w-6 h-6 text-white drop-shadow" />
                      </div>
                    </div>
                    <div className="p-2 bg-[#050C14] text-[10px] font-mono text-slate-300 flex items-center justify-between">
                      <span className="text-cyan-300">{item.aspectRatio}</span>
                      <span className="text-slate-400">
                        {(item.blobSize / (1024 * 1024)).toFixed(1)}MB
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CLOUD DISCLOSURE & CONSENT MODAL (STEP 18C-2A PART 2) */}
      {showConsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full rounded-3xl bg-[#09131F] border border-amber-500/40 shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-sans">
                  External Cloud Service Disclosure
                </h3>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  OPTIONAL CLOUD FEATURE
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
              <p className="font-medium text-amber-200">
                Veo Video Generation is an optional cloud feature.
              </p>
              <p>
                Your selected image and generation prompt will be sent to Google Cloud for video generation.
              </p>
              <p className="text-slate-400">
                LOCALIQ Core RAG remains browser-local and does not require this service.
              </p>
              <p className="text-amber-300/90 font-medium">
                Do not upload confidential documents, private images, or sensitive information unless you are comfortable sending them to the external service.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowConsentModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConsentModal(false);
                  setHasAcknowledgedCloudDisclosure(true);
                  executeCloudGeneration();
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                Continue to Cloud Generation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

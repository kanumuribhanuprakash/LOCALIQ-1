/**
 * Service for generating videos from photos using Google Veo (model: veo-3.1-fast-generate-preview).
 * Handles the 3-step lifecycle:
 * 1. POST /api/generate-video (starts operation with session auth)
 * 2. POST /api/video-status (polls until completed)
 * 3. POST /api/video-download (retrieves MP4 blob)
 * 
 * ISOLATION GUARANTEES:
 * - This service is strictly an optional cloud feature.
 * - Core LOCALIQ RAG never imports or depends on this service.
 * - Transmits only the user's explicitly selected photo and motion prompt.
 * - Handles offline / network failures truthfully without affecting local RAG.
 */

import { getActiveSession } from './localAuthService';

export interface GenerateVeoVideoOptions {
  imageBase64: string;
  mimeType: string;
  prompt: string;
  aspectRatio: '16:9' | '9:16';
  resolution?: '720p' | '1080p';
  onProgress?: (progress: { stage: string; percent: number; elapsedSeconds: number }) => void;
  signal?: AbortSignal;
}

export interface GeneratedVeoVideoItem {
  id: string;
  videoUrl: string;
  prompt: string;
  aspectRatio: '16:9' | '9:16';
  resolution: string;
  model: string;
  createdAt: string;
  sourceImageThumbnail?: string;
  blobSize: number;
}

class VeoVideoService {
  private static instance: VeoVideoService | null = null;

  public static getInstance(): VeoVideoService {
    if (!VeoVideoService.instance) {
      VeoVideoService.instance = new VeoVideoService();
    }
    return VeoVideoService.instance;
  }

  /**
   * Helper to build authenticated headers using current local session.
   */
  private getAuthHeaders(): Record<string, string> {
    const session = getActiveSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (session?.token) {
      headers['Authorization'] = `Bearer ${session.token}`;
      headers['x-localiq-session-token'] = session.token;
      headers['x-localiq-user-id'] = session.userId;
    } else {
      // Fallback session identifier for unauthenticated demo state
      headers['x-localiq-user-id'] = 'demo-analyst-default';
    }

    return headers;
  }

  /**
   * Generates a video from a photo using Veo 3.1 Fast.
   * Handles network isolation, session authentication, and truthful failure reporting.
   */
  public async generateVideo(options: GenerateVeoVideoOptions): Promise<GeneratedVeoVideoItem> {
    const {
      imageBase64,
      mimeType,
      prompt,
      aspectRatio,
      resolution = '720p',
      onProgress,
      signal,
    } = options;

    const startTime = Date.now();
    const getElapsed = () => Math.round((Date.now() - startTime) / 1000);

    const headers = this.getAuthHeaders();

    onProgress?.({
      stage: 'Submitting photo to Veo 3.1 neural video pipeline...',
      percent: 5,
      elapsedSeconds: getElapsed(),
    });

    if (signal?.aborted) throw new Error('Operation aborted');

    // 1. Start generation
    let startRes: Response;
    try {
      startRes = await fetch('/api/generate-video', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          imageBase64,
          mimeType,
          prompt,
          aspectRatio,
          resolution,
        }),
        signal,
      });
    } catch (netErr: any) {
      if (netErr?.name === 'AbortError' || signal?.aborted) {
        throw new Error('Operation aborted');
      }
      // Truthful error message required by Step 18C-2A Part 6
      throw new Error(
        'Veo is unavailable because this optional cloud service requires network access.'
      );
    }

    if (!startRes.ok) {
      const errData = await startRes.json().catch(() => ({ error: startRes.statusText }));
      if (startRes.status === 401 || startRes.status === 403) {
        throw new Error(
          errData.error || 'Authentication required: You must be logged into your workspace to use Veo Video Studio.'
        );
      }
      if (startRes.status === 429) {
        throw new Error(
          errData.error || 'Rate limit reached: Maximum video generation requests exceeded. Please wait a moment.'
        );
      }
      throw new Error(errData.error || `Failed to initiate Veo video generation (${startRes.status})`);
    }

    const { operationName } = await startRes.json();
    if (!operationName) {
      throw new Error('Server did not return a valid Veo operation name');
    }

    // 2. Poll until complete
    let isDone = false;
    let pollCount = 0;
    const maxPollAttempts = 150; // up to ~6 minutes with 2.5s intervals

    const stageMessages = [
      'Veo 3.1 analyzing photo composition and key visual landmarks...',
      'Synthesizing continuous 3D motion vectors & depth map...',
      'Generating fluid camera physics and realistic lighting transitions...',
      'Rendering temporal coherence across video frames...',
      'Synthesizing atmospheric motion and photorealistic detail...',
      'Finalizing MP4 video encoding and preparing download buffer...',
    ];

    while (!isDone && pollCount < maxPollAttempts) {
      if (signal?.aborted) throw new Error('Operation aborted');

      await new Promise((resolve) => setTimeout(resolve, 2500));
      pollCount++;

      const stageIndex = Math.min(stageMessages.length - 1, Math.floor(pollCount / 3));
      const simulatedPercent = Math.min(90, 10 + Math.round(pollCount * 2.8));

      onProgress?.({
        stage: stageMessages[stageIndex],
        percent: simulatedPercent,
        elapsedSeconds: getElapsed(),
      });

      let pollRes: Response;
      try {
        pollRes = await fetch('/api/video-status', {
          method: 'POST',
          headers,
          body: JSON.stringify({ operationName }),
          signal,
        });
      } catch (pollNetErr: any) {
        if (pollNetErr?.name === 'AbortError' || signal?.aborted) {
          throw new Error('Operation aborted');
        }
        throw new Error(
          'Veo is unavailable because this optional cloud service requires network access.'
        );
      }

      if (!pollRes.ok) {
        const errData = await pollRes.json().catch(() => ({ error: pollRes.statusText }));
        if (pollRes.status === 429) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        throw new Error(errData.error || `Error polling video status (${pollRes.status})`);
      }

      const statusData = await pollRes.json();
      if (statusData.error) {
        throw new Error(`Veo generation failed: ${statusData.error}`);
      }

      if (statusData.done) {
        isDone = true;
      }
    }

    if (!isDone) {
      throw new Error('Video generation timed out. Please try again.');
    }

    // 3. Download MP4 stream
    onProgress?.({
      stage: 'Streaming generated high-definition video from Veo to your browser...',
      percent: 95,
      elapsedSeconds: getElapsed(),
    });

    let dlRes: Response;
    try {
      dlRes = await fetch('/api/video-download', {
        method: 'POST',
        headers,
        body: JSON.stringify({ operationName }),
        signal,
      });
    } catch (dlNetErr: any) {
      if (dlNetErr?.name === 'AbortError' || signal?.aborted) {
        throw new Error('Operation aborted');
      }
      throw new Error(
        'Veo is unavailable because this optional cloud service requires network access.'
      );
    }

    if (!dlRes.ok) {
      const errData = await dlRes.json().catch(() => ({ error: dlRes.statusText }));
      throw new Error(errData.error || `Failed to download video stream (${dlRes.status})`);
    }

    const videoBlob = await dlRes.blob();
    const videoUrl = URL.createObjectURL(videoBlob);

    onProgress?.({
      stage: 'Video generation complete!',
      percent: 100,
      elapsedSeconds: getElapsed(),
    });

    const item: GeneratedVeoVideoItem = {
      id: `veo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      videoUrl,
      prompt: prompt || 'Photo animation',
      aspectRatio,
      resolution,
      model: 'veo-3.1-fast-generate-preview',
      createdAt: new Date().toISOString(),
      sourceImageThumbnail: imageBase64.startsWith('data:')
        ? imageBase64
        : `data:${mimeType};base64,${imageBase64}`,
      blobSize: videoBlob.size,
    };

    return item;
  }
}

export const veoVideoService = VeoVideoService.getInstance();

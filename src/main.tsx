import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { ClientPdfService } from './services/clientPdfService';
import { localOcrService } from './services/localOcrService';
import { DOCXProcessor } from './services/processors/docxProcessor';
import { ImageOCRProcessor } from './services/processors/imageOcrProcessor';
import { AudioTranscriptionProcessor } from './services/processors/audioTranscriptionProcessor';
import { localEmbeddingService } from './services/localEmbeddingService';
import { clientVectorIndexService } from './services/clientVectorIndexService';
import { clientLexicalSearchService } from './services/clientLexicalSearchService';
import { clientRAGService } from './services/clientRAGService';
import { clientBackupService } from './services/clientBackupService';
import { ClientChunkingService } from './services/clientChunkingService';
import { clientLocalASRService } from './services/clientLocalASRService';
import { clientLocalLLMService } from './services/clientLocalLLMService';
import { voiceRecordingService } from './services/voiceRecordingService';

// Expose on window for in-browser testing, verification, and diagnostics
if (typeof window !== 'undefined') {
  (window as any).__localiq = {
    ClientPdfService,
    localOcrService,
    DOCXProcessor,
    ImageOCRProcessor,
    AudioTranscriptionProcessor,
    localEmbeddingService,
    clientVectorIndexService,
    clientLexicalSearchService,
    clientRAGService,
    clientBackupService,
    ClientChunkingService,
    clientLocalASRService,
    clientLocalLLMService,
    voiceRecordingService,
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);


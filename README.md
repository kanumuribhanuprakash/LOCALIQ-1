# LOCALIQ — Private Multimodal Offline RAG System

[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Transformers.js](https://img.shields.io/badge/%F0%9F%A4%97%20Transformers.js-v3-FFD21E)](https://huggingface.co/docs/transformers.js)
[![ONNX Runtime](https://img.shields.io/badge/ONNX_Runtime-WebAssembly%20%2F%20WebGPU-005CED)](https://onnxruntime.ai/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 1. Overview

**LOCALIQ** is a private, client-side multimodal Retrieval-Augmented Generation (RAG) platform. Core LOCALIQ processing is browser-local and designed for zero user-data egress: documents, audio recordings, voice dictation, vector embeddings, full-text indexes, and LLM text generation execute entirely within the client browser runtime using WebAssembly (WASM), WebGPU, and IndexedDB.

---

## 2. Problem Statement

Traditional RAG and generative AI systems require sending proprietary documents, confidential enterprise reports, medical records, or personal audio recordings to third-party cloud APIs. This architecture introduces:

* **Data Exposure & Privacy Risks:** Sensitive records, proprietary code, or PII leave the user device and are transmitted over external networks.
* **Vendor Lock-in & Telemetry:** Cloud dependency means user activities, prompt histories, and documents are tracked or subject to usage telemetry.
* **Hallucination & Fabrication:** Cloud LLMs often invent facts, fabricate function names, or generate ungrounded claims when evidence is missing.
* **Single Failure Domain:** Cloud outages or network disconnects render document intelligence tools completely unusable.

---

## 3. Solution

LOCALIQ eliminates cloud data transit for core knowledge operations by running all embedding, indexing, retrieval, and inference models directly inside the modern browser:

* **100% Client-Side Knowledge Pipeline:** Document parsing (PDF, DOCX, TXT, Images), speech transcription (Whisper), neural embedding generation (`all-MiniLM-L6-v2`), and LLM synthesis (`SmolLM-135M-Instruct`) execute locally on the user machine.
* **Hybrid Dense + Lexical Retrieval:** Combines exact cosine similarity on 384-dimensional dense vectors with BM25-style lexical keyword coverage and structured identifier matching.
* **Strict Quality Gate & Zero-Evidence Refusal:** Enforces a rigid $0.35$ similarity threshold. If zero document evidence is found, the system deterministically refuses to answer rather than hallucinating from model weights.
* **Grounded Integrity ($\text{ANSWER} \subseteq \text{EVIDENCE}$):** Restricts answers to retrieved text, validating function names, credentials, and facts with clickable provenance citations.

---

## 4. Key Features

* **Multimodal Document Processing:** Ingests PDF documents (`pdfjs-dist`), Word files (`mammoth`), plain text/markdown, images (`tesseract.js` OCR), and audio files or live microphone recordings (`whisper-tiny.en` ONNX).
* **Neural Vector Embeddings:** Computes 384-dimensional unit L2-normalized embeddings on-device using `@huggingface/transformers` (`all-MiniLM-L6-v2`).
* **Persistent Local Vector Index:** Stores vectors in IndexedDB (`localiq_vector_index_db`) with composite key user isolation (`${userId}::${vectorId}`).
* **Deterministic Intent & Source Scoping:** Resolves document-specific queries (e.g., code extraction) to active documents while preserving vault-wide search for natural multi-document factual queries.
* **On-Device LLM Synthesis:** Runs quantized `SmolLM-135M-Instruct` in ONNX runtime via WebGPU with multi-threaded WASM CPU fallback and streaming token generation.
* **Verifiable Interactive Citations:** Highlights exact document chunks, page numbers, and similarity metrics for every factual claim.
* **Client-Side Encrypted Backup & Restore:** Exports and restores entire vaults using AES-256-GCM encryption with PBKDF2 key derivation (100,000 iterations) and anti-tamper authentication tags.
* **Hands-Free Voice Dictation:** Audio capture with 16kHz mono resampling, RMS silence detection, and local speech-to-text.

---

## 5. Architecture

```mermaid
flowchart TD
    subgraph Client_Browser_Runtime [Core LOCALIQ: Browser-Local Execution (Zero User-Data Egress)]
        direction TB
        Input[Document / Image / Audio / Live Mic] --> Extractor[Multimodal Extractors\nPDF.js | Mammoth | Tesseract WASM | Whisper ONNX]
        Extractor --> Chunker[Semantic Chunking Engine\nParagraph boundaries & 120-char word overlap]
        Chunker --> Embedder[Neural Embedding Engine\nTransformers.js all-MiniLM-L6-v2 384-D]
        Chunker --> LexicalIndex[Client Lexical Inverted Index\nBM25 + Synonym Groups + Identifier Regex]
        Embedder --> IDB[(IndexedDB Local Storage\nlocaliq_vector_index_db\nUser-Scoped Key Isolation)]

        Query[User Natural Language Query] --> IntentEngine[Query Intent Classifier & Document Scoping]
        IntentEngine --> Retriever[Hybrid Retrieval Engine\nDense Cosine + Lexical Fusion]
        IDB --> Retriever
        LexicalIndex --> Retriever

        Retriever --> QualityGate{Evidence Gate\nThreshold >= 0.35?}
        QualityGate -- No Chunks Met --> Refusal[Deterministic Refusal\nLLM Halted for Safety]
        QualityGate -- Chunks Met --> PromptBuilder[Grounded Prompt Assembler\nStrict <GROUNDING_CONTEXT> Delimiters]

        PromptBuilder --> LocalLLM[Local LLM Inference\nSmolLM-135M-Instruct ONNX q4\nWebGPU / WASM CPU]
        LocalLLM --> Validator[Post-Generation Grounding Validator\nIdentifier & Citation Check]
        Validator --> Output[Grounded Answer with Clickable Citations]
    end

    subgraph Cloud_Boundary [Optional Cloud Service (Explicit Network Boundary)]
        direction TB
        VeoUI[Veo Video Studio UI] -. Explicit Action .-> ServerProxy[/api/generate-video\nSession Auth + Rate Limiting]
        ServerProxy -. External API .-> VeoAPI[Google GenAI / Veo Video API]
    end
```

---

## 6. Privacy by Architecture

Core LOCALIQ processing is browser-local and designed for zero user-data egress:

* **Core User Data:** Documents, extracted text, chunks, image OCR data, audio recordings, speech transcripts, vector embeddings, search queries, chat histories, and backup archives reside exclusively in browser memory and local IndexedDB. They are **never** uploaded to an external server or cloud AI provider.
* **Model Weight Downloads vs. Offline Operation:** Neural model weights (`all-MiniLM-L6-v2`, `whisper-tiny.en`, `SmolLM-135M-Instruct`) and OCR engine files (`tesseract.js` traineddata) are fetched once over HTTPS upon first usage and persistently cached in the browser's Cache Storage (`caches.open`). After initial caching, core features operate without network access.
* **Optional Veo Cloud Feature:** The Veo Video Studio (`/api/generate-video`) is an intentionally cloud-based feature isolated from Core RAG. It requires explicit user navigation, authenticated session tokens (`tok_*`), server-side API key proxying, and strict sliding-window rate limits (5 requests/minute).

---

## 7. Security Architecture

All security mechanisms are implemented using standard, audited cryptographic primitives:

* **Password Security:** Web Crypto API PBKDF2 key derivation using HMAC-SHA-256 with 100,000 iterations and a cryptographically secure 16-byte random salt (`crypto.getRandomValues`).
* **Session Tokens:** Cryptographically secure 24-byte random tokens (`tok_*`). Passwords and secrets are never stored in plaintext or written to disk.
* **Multi-User Isolation:** IndexedDB vector and embedding stores partition records using composite keys (`${userId}::${vectorId}`). Vector queries and outline retrievals strictly filter by the authenticated session `userId`.
* **Client-Side Encrypted Backup:** Backups are encrypted client-side using authenticated **AES-256-GCM** with a 12-byte random IV and PBKDF2 key derivation (100,000 iterations). 
* **Tamper Detection:** AES-GCM 128-bit authentication tags immediately reject corrupted or manipulated backup files. Incorrect passwords fail deterministically during key derivation and decryption.
* **Zero Credential Backup Policy:** Backup files contain only document metadata, text chunks, embeddings, and conversation histories. They never contain password hashes, salts, or session tokens.
* **Prompt Injection Defense:** Retrieved document chunks are strictly quarantined inside `<GROUNDING_CONTEXT>` delimiters with system-level refusal rules preventing prompt override.

---

## 8. Multimodal Pipeline

| Input Format | Local Processing Engine | Output Representation | Provenance Metadata |
|---|---|---|---|
| **PDF (`.pdf`)** | `pdfjs-dist` (v6) with page-by-page streaming + canvas fallback | Structured chunks | Page number, item count, digital vs. scanned status |
| **DOCX (`.docx`)** | `mammoth` (v1) AST parser + `docx` (v9) section analyzer | Clean structured markdown | Section index, heading hierarchy, paragraph index |
| **TXT / Markdown (`.txt`, `.md`)** | Native browser UTF-8 stream parser | Clean paragraph chunks | Character offset, line number |
| **Image (`.jpg`, `.png`, `.webp`)**| `tesseract.js` (v7) WASM with local traineddata | High-accuracy OCR text | Image dimensions, OCR confidence percentage |
| **Audio File (`.wav`, `.mp3`, `.m4a`)**| WebAudio 16kHz mono PCM decoder + Whisper ONNX | Timestamped transcript | Sampling rate, audio duration, segment index |
| **Microphone Speech** | `MediaRecorder` API + 16kHz resampler + Whisper ONNX | Real-time text dictation | Silence detection flag, audio buffer length |

---

## 9. RAG Pipeline

```text
1. Ingestion      → User drops file (PDF/DOCX/TXT/Image/Audio) or speaks via live microphone.
2. Extraction     → Format-specific local extractor decodes raw text or transcribes audio on-device.
3. Chunking       → Semantic chunker splits text along 5-level hierarchy (paragraph, sentence, line, word, char).
4. Embeddings     → Transformers.js all-MiniLM-L6-v2 computes 384-dimensional unit L2-normalized dense vectors.
5. Indexing       → Vectors stored in IndexedDB (localiq_vector_index_db) with composite userId keys.
6. Lexical Search → Query parsed into direct tokens, structured identifiers, and expanded synonym groups.
7. Hybrid Ranking → Transparent weighted fusion (0.65 Dense Cosine Similarity + 0.35 Lexical Match Score).
8. Evidence Gate  → Minimum threshold (0.35) applied; below-threshold noise chunks discarded.
9. Grounded Prompt→ Accepted evidence formatted into strict <GROUNDING_CONTEXT> section with source anchors.
10. Local LLM     → SmolLM-135M-Instruct ONNX generates streaming response strictly from evidence.
11. Validation    → Verifies citation markers [1], checks that function/variable names exist in evidence.
12. Safety Gate   → If 0 chunks meet threshold, LLM inference halts and returns safe refusal.
```

### Retrieval Scoping Improvement (Step 23.1.1)

LOCALIQ implements intelligent query scoping:
* **Explicit Filename References:** Queries matching exact filenames (e.g., *"What does CN-Module-3 Study notes.pdf say about TCP?"*) are scoped strictly to the named document.
* **Document-Scoped Code Extraction:** Queries targeting active program implementations (e.g., *"What are the main functions in this program?"*) remain scoped to the active code document, preventing unrelated files from leaking into context.
* **Natural Semantic References:** Natural phrases (e.g., *"in his resume"*) are treated as vault-wide queries, searching all eligible documents across the vault and allowing the relevant resume chunks to be retrieved without manual scope switching.

---

## 10. Verified Step 23.1.1 Debugging Result

### Retrieval Scope Debugging Summary

During testing, the query:
> *"What is Bhanu Prakash's degree in his resume?"*

was returning zero accepted evidence chunks (`0/4 met ≥ 0.35`) because it was erroneously scoped to the previously active DOCX file (`MinMax and Undo Redo Using Stacks.docx`).

**Root Causes Identified:**
1. **Semantic Reference Confusion:** A natural reference (`"in his resume"`) was flagged as an explicit mention, triggering hard single-document scoping.
2. **Unconditional `fileId` Parameter:** `clientRAGService.ts` passed `fileId` into vector search even when `requiresDocumentScope` was false.
3. **Missing Lexical Synonyms:** The lexical search engine lacked synonym groups for education and academic credentials (`degree`, `bachelor`, `btech`, `education`, `qualification`).

**Verified Fixes Implemented:**
1. Distinctive keyword patterns set `isExplicitMention: false`, keeping natural category queries vault-wide (`FACTUAL_POINT_QUERY`).
2. `clientRAGService.ts` passes `fileId` only when `requiresDocumentScope === true`.
3. Added comprehensive `degree`, `education`, and `resume` synonym groups to `clientLexicalSearchService.ts`.

**Verified Results:**
* Resume query resolved as `FACTUAL_POINT_QUERY` with `requiresDocumentScope: false`.
* Vault-wide search retrieved resume chunks with dense similarity $0.5759$ and $0.4440$ (both $\ge 0.35$).
* DOCX code extraction queries (`"What are the main functions in this program?"`) remained strictly document-scoped.
* Explicit filename queries (`"What does CN-Module-3 Study notes.pdf say?"`) remained source-scoped.
* TypeScript compilation (`tsc --noEmit`) and Vite production build passed cleanly.

---

## 11. Verification

### Step 22 Release Verification Suite
LOCALIQ completed the Step 22 Release Validation Suite with 100% compliance:

* **Total Validation Checks:** 44
* **Passed:** 44
* **Failed:** 0
* **Partial:** 0
* **Status:** FROZEN & READY FOR DEMONSTRATION

| Category | Checks | Result |
|---|---|---|
| Ingestion & Local Multimodal Processing | 8 | 8 / 8 PASS |
| On-Device Neural Embeddings (384-D) | 6 | 6 / 6 PASS |
| IndexedDB Vector & Lexical Hybrid Search | 8 | 8 / 8 PASS |
| Grounding, Anti-Hallucination & Refusal | 8 | 8 / 8 PASS |
| Local LLM (SmolLM-135M) Token Generation | 4 | 4 / 4 PASS |
| Voice Dictation & Whisper Transcription | 4 | 4 / 4 PASS |
| AES-256-GCM Backup, Restore & Isolation | 6 | 6 / 6 PASS |

### Step 23.1.1 Retrieval Verification
* **TypeScript Compilation:** 0 errors (`npm run lint`).
* **Vite Production Build:** Success (`npm run build`).
* **Vault-Wide & Scoped Query Routing:** Verified.

---

## 12. Limitations

* **Initial Model Download:** First execution requires network access to download ONNX weights (`all-MiniLM-L6-v2`: ~90MB, `whisper-tiny.en`: ~150MB, `SmolLM-135M-Instruct`: ~135MB) and Tesseract WASM assets. Subsequent operations use browser cache.
* **Hardware Dependence:** Local inference speed depends on client GPU (WebGPU) or multi-core CPU capabilities.
* **WebGPU Availability:** Supported on modern Chrome, Edge, and Safari; falls back to multi-threaded WASM CPU on unsupported browsers.
* **Legacy Formats:** Binary legacy `.doc` files (pre-2007 OLE compound formats) are unsupported; `.docx` is fully supported.
* **Cloud Separation:** The optional Veo Video Studio requires network connectivity and a valid API key proxy.

---

## 13. Quick Start

### Prerequisites
* Node.js 18+ or 20+
* Modern browser with WebAssembly and WebGPU support (Chrome 113+, Edge 113+, Safari 18+)

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### Type Checking & Linting
```bash
npm run lint
```

### Production Build
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

---

## 14. Project Structure

```text
localiq/
├── docs/
│   ├── FINAL_DEMO_RUNBOOK.md                 # 5-minute live demo script
│   ├── INTERVIEW_QA.md                       # Comprehensive 30+ technical interview Q&A
│   ├── LINKEDIN_PROJECT_DESCRIPTION.md       # Professional portfolio summary
│   ├── PROJECT_PRESENTATION.md               # 12-slide technical presentation
│   ├── RELEASE_FREEZE.md                     # Baseline freeze specification
│   ├── RESUME_DESCRIPTION.md                 # Resume bullet points & technical summary
│   ├── STEP_23_1_GROUNDED_ANSWER_INTEGRITY_REPORT.md  # Grounding & scoping audit
│   └── STEP_23_PORTFOLIO_DOCUMENTATION_REPORT.md      # Documentation verification report
├── public/
│   ├── GLearn-MonkeyBanana.pdf               # Test PDF document
│   ├── LOCALIQ_Test_Knowledge_Document.pdf   # Standard multimodal evaluation document
│   ├── Sample_Audio_LOCALIQ.wav              # Test audio recording
│   ├── Sample_Candidate_Resume.txt           # Test resume document
│   ├── Sample_Receipt_OCR.jpg                # Test OCR image
│   ├── Sample_Student_Assignment.txt         # Test assignment document
│   └── Sample_Technical_Brief.docx           # Test DOCX file
├── src/
│   ├── components/
│   │   ├── auth/                             # Authentication modals & forms
│   │   ├── common/                           # Buttons, badges, and modal dialogs
│   │   ├── layout/                           # App header, navigation, and layout
│   │   └── workspace/                        # Assistant, KnowledgeBase, Audio, Video tabs
│   ├── context/
│   │   └── AppContext.tsx                    # Central application state & action dispatcher
│   ├── hooks/                                # Custom React hooks (voice dictation, etc.)
│   ├── services/
│   │   ├── processors/                       # PDF, DOCX, TXT, OCR processors
│   │   ├── clientChunkingService.ts          # Semantic text chunking engine
│   │   ├── clientLexicalSearchService.ts     # Inverted index BM25 lexical search
│   │   ├── clientPdfService.ts               # Streaming PDF text & canvas extraction
│   │   ├── clientQueryIntentService.ts       # Query intent & document scoping router
│   │   ├── clientRAGService.ts               # Main hybrid RAG pipeline & LLM generation
│   │   ├── clientSemanticSearchService.ts    # Dense vector search orchestrator
│   │   ├── clientVectorIndexService.ts       # IndexedDB vector database & hybrid fusion
│   │   ├── localEmbeddingService.ts          # Transformers.js all-MiniLM-L6-v2 wrapper
│   │   ├── localLLMService.ts                # SmolLM-135M ONNX browser inference engine
│   │   ├── localOcrService.ts                # Tesseract.js WASM OCR wrapper
│   │   └── localWhisperService.ts            # Whisper-tiny ONNX speech transcription
│   ├── types.ts                              # Core TypeScript interface definitions
│   ├── App.tsx                               # Top-level React view switcher
│   └── main.tsx                              # Application entry point
├── package.json
├── server.ts                                 # Express dev/prod server with Veo proxy
├── tsconfig.json
└── vite.config.ts
```

---

## 15. Demo Flow

A structured 5-minute live demonstration script:

1. **Sign In:** Authenticate with a local user profile using PBKDF2 salted derivation.
2. **Ingest Document:** Upload `Sample_Technical_Brief.docx` or `LOCALIQ_Test_Knowledge_Document.pdf`.
3. **Show Local Processing:** Observe page-by-page extraction, semantic chunking, and 384-D vector generation in real time.
4. **Ask Grounded Question:** Query *"What algorithm is used to explore states in the Monkey Banana problem?"*
5. **Inspect Retrieval Trace:** Open the diagnostics panel to review cosine similarity, lexical score, and hybrid rank.
6. **Verify Citation:** Click source marker `[1]` to highlight the exact source chunk and page.
7. **Ask Unsupported Question:** Query *"What is the capital of France?"*
8. **Demonstrate Refusal:** Verify zero-evidence quality gate stops LLM invocation and returns a safe grounded refusal.
9. **Activate Microphone:** Click the microphone button to initiate WebAudio recording.
10. **Local Transcription:** Speak a query and observe Whisper ONNX transcribing locally.
11. **Submit Voice Query:** Execute RAG search directly from the generated transcript.
12. **Export Backup:** Navigate to Settings, enter a password, and export an AES-256-GCM encrypted `.localiq` archive.
13. **Restore Backup:** Wipe active session data and restore the vault from the encrypted backup.
14. **Explain Privacy Boundary:** Highlight that all core operations generated 0 external network requests.
15. **Demonstrate Cloud Boundary:** Explain that the optional Veo Video Studio is an explicitly isolated cloud feature.

---

## 16. Future Work

* **Quantized Vector Indexing:** Implementing scalar and Product Quantization (PQ) to scale IndexedDB vector capacity beyond 50,000 vectors.
* **Expanded Local LLM Choices:** Adding dynamic selection for SmolLM2-360M and Qwen2.5-0.5B ONNX models for devices with higher GPU memory.
* **Cross-Encoder Reranking:** Introducing lightweight browser-local reranking models (e.g., `bge-reranker-small`) for enhanced top-K precision.
* **Multi-Page OCR Streaming:** Web Worker backgrounding for batch OCR processing across 50+ page scanned documents.

---

## License

This project is licensed under the MIT License.

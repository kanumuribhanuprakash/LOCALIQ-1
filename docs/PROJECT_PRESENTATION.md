# LOCALIQ — Project Presentation Slide Deck

A 12-slide comprehensive presentation covering the technical architecture, algorithms, privacy guarantees, and verified engineering results of **LOCALIQ — Private Multimodal Offline RAG System**.

---

### Slide 1: Title & Introduction
* **Title:** LOCALIQ — Private Multimodal Offline RAG System
* **Subtitle:** An On-Device Intelligence Platform with Zero User-Data Egress
* **Presenter:** Student Software Engineering Portfolio Presentation
* **Tech Stack:** React 19, TypeScript, Transformers.js, ONNX Runtime Web, WebGPU/WASM, IndexedDB
* **Suggested Visual:** LOCALIQ logo with a lock shield and an in-browser workflow diagram showing documents $\rightarrow$ vectors $\rightarrow$ local LLM.

---

### Slide 2: The Problem
* **Title:** The Privacy Dilemma of Modern Generative AI
* **Bullets:**
  * **Data Egress:** Standard RAG pipelines transmit confidential enterprise documents, medical records, and audio recordings to third-party cloud APIs.
  * **Telemetry & Logging:** Cloud providers store prompts, chat histories, and usage patterns, violating compliance and user trust.
  * **Hallucination Risk:** Cloud models frequently fabricate facts, functions, and citations when source documents lack explicit evidence.
  * **Network Fragility:** Complete loss of intelligence capability during network disconnects or API service outages.
* **Suggested Visual:** Contrast diagram: Cloud AI showing data flying out to external servers vs. a secure on-device boundary.

---

### Slide 3: Motivation & Engineering Goals
* **Title:** Engineering Goals: Air-Gapped Precision on Client Hardware
* **Bullets:**
  * **Zero User-Data Transmission:** User data must never leave the client's browser runtime.
  * **Standard Hardware Execution:** Run efficient neural models using modern web standards (WebGPU / WebAssembly) without specialized server hardware.
  * **Zero-Hallucination Quality Gate:** Enforce the invariant $\text{ANSWER} \subseteq \text{EVIDENCE}$; reject unanswerable queries deterministically.
  * **Multi-Format Ingestion:** Seamlessly parse PDFs, Word documents, scanned images, and voice recordings on-device.
* **Suggested Visual:** Three core pillars graphic: Privacy by Architecture, Multimodal Ingestion, Grounded Answer Integrity.

---

### Slide 4: The LOCALIQ Solution
* **Title:** The Solution: An In-Browser Multimodal Knowledge Engine
* **Bullets:**
  * **Browser-Local Execution:** Ingestion, OCR, ASR, chunking, embeddings, vector indexing, and generation run 100% on the client.
  * **Dense + Lexical Hybrid Search:** Fuses 384-D dense embeddings (`all-MiniLM-L6-v2`) with BM25 inverted index token matching in IndexedDB.
  * **Deterministic Query Routing:** Distinguishes source-scoped queries (e.g., code extraction) from vault-wide factual searches.
  * **Grounded Synthesis:** On-device `SmolLM-135M-Instruct` generates streaming responses with clickable citation markers.
* **Suggested Visual:** End-to-end pipeline infographic highlighting on-device icons (PDF $\rightarrow$ Embed $\rightarrow$ IDB $\rightarrow$ LLM $\rightarrow$ Citation).

---

### Slide 5: System Architecture
* **Title:** High-Level System Architecture & Component Interaction
* **Bullets:**
  * **Presentation Layer:** React 19 SPA with Tailwind CSS v4, real-time diagnostics drawer, and hands-free voice controls.
  * **Storage Engine:** Browser IndexedDB with composite primary keys (`${userId}::${vectorId}`) ensuring multi-tenant isolation.
  * **Model Runtime:** Transformers.js v3 running ONNX Runtime Web via WebGPU with multi-threaded WASM CPU fallback.
  * **Cryptographic Boundary:** Native Web Crypto API managing PBKDF2 hashing, AES-256-GCM encryption, and HMAC tamper checks.
* **Suggested Visual:** Mermaid flowchart illustrating client-side storage, model runtime, and retrieval components with clear network boundary demarcation.

---

### Slide 6: Multimodal Ingestion Pipeline
* **Title:** Local Multimodal Ingestion: From Raw Files to Clean Chunks
* **Bullets:**
  * **PDFs (`pdfjs-dist`):** Page-by-page streaming extraction with automatic scanned page detection and canvas fallback.
  * **Word Documents (`mammoth`):** Converts `.docx` XML structures into clean hierarchical markdown while preserving tables.
  * **Scanned Images (`tesseract.js`):** Client-side WebAssembly OCR extracting text from images with confidence scoring.
  * **Speech & Audio (Whisper ONNX):** 16kHz WebAudio PCM resampler feeding `whisper-tiny.en` for real-time local transcription.
* **Suggested Visual:** Table showing input formats (PDF, DOCX, JPG, WAV) mapped to local libraries and structured chunk outputs.

---

### Slide 7: The RAG & Hybrid Retrieval Engine
* **Title:** Hybrid Retrieval: Fusing Dense Semantics and Lexical Precision
* **Bullets:**
  * **5-Level Semantic Chunking:** Paragraph, sentence, line, word, and character boundary preservation with 120-char sliding overlap.
  * **384-D Neural Embeddings:** Exact cosine similarity calculated as dot products over unit L2-normalized dense vectors.
  * **Lexical Inverted Index:** BM25 term coverage, structured regex identifier recognition, and bidirectional synonym expansion.
  * **Transparent Fusion:** Linear score combination ($0.65 \times \text{Semantic} + 0.35 \times \text{Lexical}$) evaluated against a strict 0.35 threshold.
* **Suggested Visual:** Vector space graphic showing dense vector clustering combined with exact token match score calculation.

---

### Slide 8: Privacy & Cryptographic Security
* **Title:** Security by Architecture: Audited Cryptographic Standards
* **Bullets:**
  * **User Authentication:** Web Crypto API PBKDF2 (HMAC-SHA-256) with 100,000 iterations and 16-byte random salts.
  * **Client-Side Encrypted Backup:** AES-256-GCM authenticated encryption with 12-byte IVs; zero password or credential leakage.
  * **Tamper Proofing:** 128-bit authentication tags reject corrupted, modified, or incorrectly authenticated backup archives.
  * **Prompt Injection Defense:** Document chunks isolated strictly within `<GROUNDING_CONTEXT>` delimiters to prevent system prompt override.
* **Suggested Visual:** Security architecture diagram showing PBKDF2 derivation, AES-GCM encryption flow, and IndexedDB key isolation.

---

### Slide 9: Voice Dictation & Local Neural Inference
* **Title:** On-Device Speech Recognition & Streaming LLM Generation
* **Bullets:**
  * **Hands-Free Dictation:** Real-time RMS silence detection (1500ms window) with automatic speech cutoff and transcription dispatch.
  * **Local Whisper Execution:** Browser-local `whisper-tiny.en` transcribes voice queries without streaming audio to external APIs.
  * **Quantized LLM Inference:** `SmolLM-135M-Instruct` 4-bit ONNX executes streaming token generation directly in-browser.
  * **Clickable Verifiable Citations:** Responses include interactive markers (`[1]`) that scroll to exact source text, page, and chunk.
* **Suggested Visual:** UI screenshot mockup showing the chat interface, streaming answer tokens, and interactive citation popovers.

---

### Slide 10: Retrieval Scoping Debugging & Verified Fix (Step 23.1.1)
* **Title:** Case Study: Debugging Retrieval Scope Regression (Step 23.1.1)
* **Bullets:**
  * **The Failure:** Query *"What is Bhanu Prakash's degree in his resume?"* returned 0 results (`0/4 met ≥ 0.35`).
  * **Root Cause:** A natural phrase was mistakenly classified as an explicit document scope, restricting the search to an unrelated active DOCX file.
  * **The Fix:**
    1. Distinguish explicit filename references (source-scoped) from natural category queries (vault-wide).
    2. Pass `fileId` filter only when `requiresDocumentScope === true`.
    3. Added education and academic credential synonym groups (`degree`, `bachelor`, `btech`, `education`).
  * **Verified Result:** Resume retrieved vault-wide with 0.57+ similarity; DOCX code extraction queries remained strictly scoped.
* **Suggested Visual:** Before/After routing tree diagram illustrating the separation between scoped code queries and vault-wide factual queries.

---

### Slide 11: Limitations & Future Roadmap
* **Title:** Architectural Limitations & Future Engineering Milestones
* **Bullets:**
  * **Current Limitations:**
    * First-launch requires ~375MB initial download of ONNX model weights before offline caching takes effect.
    * Inference speed depends on client GPU/CPU capabilities (WebGPU recommended).
    * Binary legacy `.doc` files (pre-2007) are unsupported; `.docx` is fully supported.
  * **Future Roadmap:**
    * Product Quantization (PQ) for scaling IndexedDB capacity past 50,000 vectors.
    * Client-side cross-encoder rerankers (`bge-reranker-small`) for refined top-K ranking.
    * Dynamic model selection for devices with high VRAM (SmolLM2-360M, Qwen2.5-0.5B).
* **Suggested Visual:** Roadmap timeline graphic showing current baseline vs. future optimization milestones.

---

### Slide 12: Conclusion & Verification Summary
* **Title:** Conclusion: Production-Grade Privacy-First Retrieval
* **Bullets:**
  * **Full Verification Passed:** Step 22 Release Audit: 44/44 automated checks passed (100% compliance).
  * **Integrity Invariant Maintained:** Strict 0.35 similarity threshold and zero-evidence refusal gate preserved without compromise.
  * **Zero Cloud Data Egress:** All user documents, audio recordings, vectors, and chat histories remain strictly in client browser memory.
  * **Release Status:** Frozen, verified, and ready for deployment and live demonstration.
* **Suggested Visual:** Summary checklist graphic with green checkmarks across all core subsystems (Ingestion, Hybrid Search, Grounding, LLM, Security).

# LOCALIQ — LinkedIn Project Description

*Suggested Title: Building LOCALIQ: A 100% On-Device Multimodal RAG System in the Browser*

---

### Project Overview

Excited to share **LOCALIQ**, an on-device multimodal Retrieval-Augmented Generation (RAG) platform I designed and built! 🚀

Most modern generative AI applications rely on third-party cloud APIs to process private documents, transcribe audio, generate embeddings, and synthesize responses. While powerful, this creates significant privacy risks for sensitive personal notes, medical records, legal briefs, and proprietary codebase files.

I built **LOCALIQ** to explore a privacy-first question: *Can a complete, high-quality multimodal RAG pipeline execute entirely on client hardware inside a standard web browser?*

The answer is **yes**.

---

### The Problem
Traditional enterprise and personal knowledge retrieval systems introduce:
1. **Data Egress:** Private documents and audio must leave the machine and traverse external networks.
2. **Hallucination & Fabrication:** Cloud models often invent facts, function names, and citations when source evidence is lacking.
3. **Vendor Telemetry:** Cloud AI APIs log queries, prompts, and session tokens.
4. **Network Brittleness:** Users lose complete access to their knowledge base during network disconnects.

---

### The Architecture & Solution

Core LOCALIQ processing is browser-local and designed for zero user-data egress:

1. **Browser-Local Multimodal Ingestion:**
   * **PDF Documents:** Structured text extraction and scanned page detection via `pdfjs-dist`.
   * **Word Documents:** AST parsing and hierarchical markdown decomposition via `mammoth`.
   * **Images & Scans:** On-device OCR using `tesseract.js` WebAssembly and local trained language data.
   * **Audio & Voice Dictation:** 16kHz WebAudio PCM recording transcribed on-device using Hugging Face Transformers.js running `whisper-tiny.en` ONNX.

2. **5-Level Semantic Chunking & Neural Embeddings:**
   * Text is parsed into coherent chunks along paragraph and sentence boundaries with 120-character sliding word overlaps.
   * Dense vector embeddings (384 dimensions) are generated directly in-browser using `all-MiniLM-L6-v2` with strict unit L2 normalization.

3. **Hybrid Dense + Lexical Retrieval in IndexedDB:**
   * Vector records are persisted in IndexedDB (`localiq_vector_index_db`) with multi-user composite key isolation (`userId::vectorId`).
   * Retrieval combines exact inner-product **Cosine Similarity** (0.65 weight) with a browser-local **BM25 Lexical Inverted Index** (0.35 weight), structured identifier regexes, and synonym expansions.

4. **Zero-Hallucination Quality Gate & Grounding:**
   * Enforces a strict **0.35 similarity threshold**. If no document evidence meets the threshold, the system deterministically refuses to answer rather than fabricating details.
   * Prompts are assembled using strict `<GROUNDING_CONTEXT>` delimiters to prevent prompt injection.
   * Verified invariant: $\text{ANSWER} \subseteq \text{EVIDENCE}$.

5. **On-Device LLM Inference:**
   * Runs 4-bit quantized `SmolLM-135M-Instruct` in browser memory via WebGPU with multi-threaded WebAssembly CPU fallback.
   * Streams tokens with interactive citation markers (`[1]`, `[2]`) linked directly to exact source chunks and pages.

6. **Client-Side Encrypted Backup & Restore:**
   * Full workspace export/import encrypted with authenticated **AES-256-GCM** and PBKDF2 key derivation (100,000 iterations). Includes tamper detection tags and zero-credential backup policies.

---

### Privacy by Architecture

* **Zero User-Data Transmission:** User documents, transcripts, vectors, search queries, and chat histories are processed in browser memory and local IndexedDB.
* **Persistent Model Weight Caching:** ONNX models are fetched once and cached in the browser's Cache Storage (`caches.open`). Once cached, core operations require zero network access.
* **Optional Cloud Boundary:** An optional AI Video Studio (Veo) is isolated behind an authenticated server proxy (`/api/generate-video`) with strict rate limiting, clearly demarcating local vs. cloud features.

---

### Key Technical Challenge & Verification: Retrieval Scoping (Step 23.1.1)

During multi-document testing, an interesting regression emerged: asking *"What is Bhanu Prakash's degree in his resume?"* failed because the query was mistakenly scoped to an active code document (`MinMax.docx`).

I resolved this by:
* Distinguishing **explicit filename mentions** (scoped to that file) from **natural document-category references** (vault-wide factual queries).
* Ensuring `fileId` filters are only applied when `requiresDocumentScope === true`.
* Expanding lexical synonym groups for academic credentials (`degree`, `bachelor`, `btech`, `education`).

Verified results: the resume was retrieved vault-wide with 0.57+ similarity, while code extraction queries remained strictly scoped to the active document.

---

### Verification & Testing
* **Step 22 Release Verification:** 44/44 automated validation checks passed (100% compliance across multimodal ingestion, embeddings, hybrid search, grounding, LLM generation, voice dictation, and backup encryption).
* **Step 23.1.1 Audit:** Verified cross-document retrieval, scoped code extraction, and clean compilation (`tsc --noEmit` and Vite production build: 0 errors).
* **Release Status:** Frozen and production-ready.

---

### Limitations
* First-time launch requires an initial network download of ONNX model weights (~90MB for embeddings, ~135MB for LLM, ~150MB for Whisper).
* Inference speed depends on client GPU/CPU capabilities (WebGPU recommended).
* Legacy binary `.doc` files (pre-2007) are unsupported; `.docx` is fully supported.
* Optional Veo video generation requires network connectivity.

---

### Technologies Used
`React 19` • `TypeScript` • `Vite` • `Tailwind CSS v4` • `Transformers.js` • `ONNX Runtime Web` • `WebGPU / WebAssembly` • `IndexedDB` • `PDF.js` • `Mammoth.js` • `Tesseract.js` • `Web Crypto API` • `WebAudio API`

Check out the repository for the full architecture diagrams and implementation runbooks!

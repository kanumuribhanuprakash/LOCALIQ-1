# LOCALIQ — Resume Descriptions

This document provides verified, production-accurate resume descriptions for **LOCALIQ — Private Multimodal Offline RAG System**. All statements are backed by actual codebase implementation and the frozen validation audit (Step 22: 44/44 checks passed, Step 23.1.1 retrieval scoping verified).

---

## A. One-Line Version

> Built **LOCALIQ**, an on-device multimodal RAG platform in React/TypeScript executing document parsing, Whisper ASR, all-MiniLM-L6-v2 embeddings, and SmolLM-135M LLM inference directly in the browser via WebGPU/WASM and IndexedDB with zero cloud data egress.

---

## B. Two-Line Version

> Engineered **LOCALIQ**, a privacy-focused multimodal Retrieval-Augmented Generation (RAG) system running entirely inside the client browser using WebGPU, WebAssembly, and IndexedDB. Integrated on-device Whisper speech-to-text, 384-D dense vector indexing, BM25 hybrid ranking, and SmolLM-135M inference with a strict 0.35 similarity quality gate to eliminate ungrounded hallucinations.

---

## C. Three-Bullet Version

* **On-Device Multimodal Pipeline:** Architected an in-browser intelligence pipeline in TypeScript/React utilizing `pdfjs-dist`, `mammoth`, `tesseract.js` (OCR), and Transformers.js `whisper-tiny.en` to parse PDFs, Word docs, images, and audio with zero server-side data egress.
* **Hybrid Retrieval & Vector Engine:** Built an IndexedDB vector database storing 384-dimensional unit L2-normalized `all-MiniLM-L6-v2` embeddings combined with BM25 lexical ranking; enforced a strict 0.35 similarity threshold and prompt isolation to prevent hallucinations.
* **Client-Side Security & Inference:** Integrated quantized `SmolLM-135M-Instruct` ONNX models for streaming local generation, client-side AES-256-GCM encrypted backup/restore with PBKDF2 (100k iterations), and deterministic document-scoping intent classification.

---

## D. Technical Software Engineering Version (Detailed Project Experience)

### Software Engineer / System Architect — LOCALIQ (On-Device Multimodal RAG)
* **Client-Side Multimodal Ingestion Engine:** Developed browser-local parsers for PDF, DOCX, TXT, OCR images, and live microphone speech using `pdfjs-dist`, `mammoth`, `tesseract.js` (WASM), and WebAudio PCM resampling connected to Whisper ONNX, eliminating user document transmission to third-party APIs.
* **Hybrid Dense & Lexical Vector Search:** Designed an on-device vector search engine in IndexedDB storing 384-D `all-MiniLM-L6-v2` embeddings; fused exact inner-product cosine similarity with a BM25 inverted index, token coverage scoring, and synonym expansion to achieve robust keyword and semantic recall.
* **Zero-Hallucination Quality Gate & Grounding:** Implemented a strict 0.35 minimum similarity quality gate and `<GROUNDING_CONTEXT>` enclosure that deterministically halts LLM inference and refuses unanswerable queries when zero evidence is retrieved, ensuring answer integrity ($\text{ANSWER} \subseteq \text{EVIDENCE}$).
* **Query Understanding & Source Scoping:** Built an intelligent query intent classifier distinguishing explicit document references (source-scoped) from natural category queries (vault-wide), ensuring multi-program separation and preventing unrelated document leakage into generated context.
* **Local Neural Generation & Encryption:** Deployed 4-bit quantized `SmolLM-135M-Instruct` via WebGPU/WASM for streaming token generation; implemented client-side authenticated AES-256-GCM backup/restore with 100,000 PBKDF2 iterations and HMAC-SHA-256 tamper verification.
* **Verification & Testing:** Authored end-to-end audit suites verifying 44/44 acceptance criteria across retrieval recall, citation validity, user isolation, and multi-format extraction with zero regressions.

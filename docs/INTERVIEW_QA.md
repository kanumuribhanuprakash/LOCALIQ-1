# LOCALIQ — Technical Interview & Viva Guide (30+ Q&A)

This document contains technically rigorous, verified questions and concise answers covering the architecture, algorithms, security, and runtime engineering of **LOCALIQ — Private Multimodal Offline RAG System**.

---

### 1. What is RAG (Retrieval-Augmented Generation)?
**Answer:** RAG is an AI architecture that enhances Large Language Models by retrieving relevant, verifiable facts from an external knowledge base before generating an answer. Instead of relying solely on static pretrained parametric memory, RAG provides retrieved chunks as grounded context in the prompt, improving factual accuracy and enabling verifiable citations.

### 2. Why build a *local* on-device RAG system instead of using cloud APIs?
**Answer:** Cloud RAG systems require transmitting sensitive user documents, queries, and audio recordings to third-party servers. Local RAG processes all data directly on the user's device, ensuring zero user-data egress, preventing vendor data tracking, eliminating per-query cloud API costs, and allowing knowledge retrieval without persistent internet connectivity.

### 3. What are vector embeddings and how do they work in LOCALIQ?
**Answer:** Embeddings are dense mathematical representations that map words, sentences, or paragraphs into a high-dimensional continuous geometric space where semantically similar texts are placed close to each other. LOCALIQ uses `sentence-transformers/all-MiniLM-L6-v2` running via `@huggingface/transformers` to convert text chunks and queries into 384-dimensional dense vectors.

### 4. Why use 384 dimensions specifically?
**Answer:** 384 is the native output dimension of the `all-MiniLM-L6-v2` transformer model. It represents an optimal balance for browser-local execution: it captures nuanced semantic relationships while keeping memory footprint (~1.5 KB per float32 vector) and inner-product computation time low enough to execute in milliseconds inside JavaScript/WASM.

### 5. What is Cosine Similarity and how is it computed in LOCALIQ?
**Answer:** Cosine similarity measures the cosine of the angle between two multi-dimensional vectors:
$$\text{CosineSimilarity}(\vec{u}, \vec{v}) = \frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\| \|\vec{v}\|}$$
In LOCALIQ, all vectors are unit L2-normalized during embedding generation ($\|\vec{v}\| = 1$). Because vectors have a norm of 1.0, the cosine similarity simplifies to an exact dot product (inner product): $\sum_{i=0}^{383} u_i v_i$, which executes in $O(d)$ time without expensive square roots during search.

### 6. Why use Hybrid Retrieval instead of pure vector search?
**Answer:** Pure dense vector search can struggle with exact keyword lookups, structured alphanumeric codes (e.g., student IDs, registration numbers like `2021-CS-104`), acronyms, and rare technical terms. Hybrid retrieval combines dense semantic search (which captures conceptual meaning) with lexical inverted index scoring (which captures exact token matches), eliminating blind spots in each approach.

### 7. What is lexical retrieval in LOCALIQ?
**Answer:** Lexical retrieval in LOCALIQ is a browser-local inverted index search implemented in `clientLexicalSearchService.ts`. It tokenizes documents, strips common stop words, identifies structured regex patterns, expands domain-specific synonym groups (e.g., `reg no` $\rightarrow$ `registration number`), and computes a bounded lexical score in $[0.0, 1.0]$.

### 8. What is BM25 and how is it adapted for browser-local search?
**Answer:** BM25 (Best Matching 25) is a probabilistic ranking function that scores document relevance based on term frequency (TF) and inverse document frequency (IDF) with document length normalization. In LOCALIQ, lexical ranking adapts BM25 principles using direct token coverage, n-gram phrase matching, and structured identifier boosts, fused with dense vector similarity via transparent weighted combination (0.65 semantic + 0.35 lexical).

### 9. Why include Optical Character Recognition (OCR) in the pipeline?
**Answer:** Many real-world PDF documents are scanned images containing no embedded digital text streams. Without OCR, standard PDF text extractors return empty strings. LOCALIQ uses `tesseract.js` running WebAssembly with local trained models to detect scanned pages and extract text directly from canvas image data on the client device.

### 10. Why use Whisper for speech transcription?
**Answer:** Whisper is an acoustic model trained on diverse speech data capable of robust multilingual and accented speech-to-text. LOCALIQ runs `whisper-tiny.en` as an ONNX model in the browser via Transformers.js, converting 16kHz WebAudio PCM recordings into text transcripts locally without streaming microphone audio to cloud speech APIs.

### 11. Why use IndexedDB for local storage?
**Answer:** IndexedDB is a transactional, asynchronous, structured NoSQL database built natively into all modern web browsers. Unlike `localStorage` (which is synchronous, string-only, and capped at ~5MB), IndexedDB supports hundreds of megabytes of binary data, structured JSON objects, float32 typed arrays, and custom indexes, making it ideal for client-side vector storage (`localiq_vector_index_db`).

### 12. How does browser-local LLM inference work?
**Answer:** Modern browsers support WebAssembly (WASM) and WebGPU, allowing compiled C++ or WGSL shaders to execute neural network matrix multiplications directly on client hardware. LOCALIQ loads a 4-bit quantized ONNX model (`SmolLM-135M-Instruct`) into browser memory using the ONNX Runtime Web library, executing forward-pass token generation locally in an event-driven loop.

### 13. What is ONNX and ONNX Runtime Web?
**Answer:** Open Neural Network Exchange (ONNX) is an open format for representing machine learning models. ONNX Runtime Web is the execution engine that runs ONNX models inside web browsers by compiling operator kernels to WebAssembly (for multi-core CPU) or WebGPU (for client GPU acceleration).

### 14. What is the difference between WebGPU and WebAssembly (WASM) in this project?
**Answer:** WebGPU is a modern web API providing low-level, direct access to the client machine's GPU for general-purpose parallel computing (GPGPU), delivering fast tensor operations for model inference. WebAssembly (WASM) executes compiled near-native bytecode on the client CPU. LOCALIQ attempts WebGPU acceleration first for model inference, automatically falling back to multi-threaded WASM on devices without WebGPU support.

### 15. How does LOCALIQ prevent LLM hallucination?
**Answer:** LOCALIQ applies a multi-layered anti-hallucination defense:
1. **Zero-Evidence Quality Gate:** If retrieval returns 0 chunks exceeding the 0.35 threshold, the LLM is not called.
2. **Strict Context Enclosure:** Evidence chunks are enclosed within `<GROUNDING_CONTEXT>` delimiters with negative instructions forbidding external knowledge.
3. **Identifier Grounding Check:** For code queries, function and variable names in the generated response are verified to exist verbatim in the source evidence.
4. **Citation Validation:** Generated statements must be supported by numbered citation anchors (`[1]`, `[2]`).

### 16. What is the Zero-Evidence Quality Gate?
**Answer:** The zero-evidence quality gate is a safety policy in `clientRAGService.ts`. When a user asks an out-of-domain or unanswerable question (e.g., *"What is the capital of France?"* against a vault of computer science notes), all retrieved candidates score below the 0.35 threshold. Rather than sending empty or low-relevance context to the LLM, inference is halted immediately, and the system returns a safe refusal message.

### 17. How do interactive citations work in LOCALIQ?
**Answer:** When the local LLM generates an answer, it embeds citation markers like `[1]` corresponding to retrieved evidence chunks. The frontend parses these markers into interactive badges. Clicking a citation opens a drawer highlighting the exact source document, page number, section, similarity score, and verbatim excerpt.

### 18. How is multi-user isolation enforced locally?
**Answer:** LOCALIQ isolates user data within the browser storage layers:
1. LocalStorage keys use prefixes containing the authenticated user ID (`localiq_user_${userId}_files_v1`).
2. IndexedDB vector records use composite primary keys: `${userId}::${vectorId}`.
3. Vector search queries and document outline lookups strictly filter by the session's active `userId`, preventing cross-account data leakage on shared computers.

### 19. How does LOCALIQ handle user authentication without a backend database?
**Answer:** Authentication is performed locally using the Web Crypto API. User passwords are never stored in plaintext. They are hashed using PBKDF2 (Password-Based Key Derivation Function 2) with HMAC-SHA-256, a 16-byte random salt, and 100,000 iterations. Validating a login involves deriving the hash and comparing it to the stored credential.

### 20. How is client-side encrypted backup implemented?
**Answer:** Workspace backups are exported as encrypted `.localiq` files. The payload (metadata, chunks, vectors, chat history) is serialized to JSON and encrypted using authenticated **AES-256-GCM** with a fresh 12-byte random IV. The encryption key is derived from the user's password using PBKDF2 with 100,000 iterations and a 32-byte salt.

### 21. How does tamper detection work in backups?
**Answer:** AES-256-GCM is an Authenticated Encryption mode that generates a 128-bit authentication tag alongside ciphertext. If a backup file is modified by even a single bit or if an incorrect decryption password is provided, the Web Crypto API's `decrypt()` method rejects the operation with an authentication error, preventing corrupt or compromised data from being restored.

### 22. How are machine learning model weights cached in the browser?
**Answer:** Neural network weights are stored using the browser Cache Storage API (`caches.open('transformers-cache')`). On initial run, the browser downloads the ONNX files over HTTPS and stores the HTTP responses in Cache Storage. On subsequent executions, Transformers.js loads the model weights directly from the local cache without network requests.

### 23. What does "offline behavior" mean in LOCALIQ?
**Answer:** Core LOCALIQ processing is designed so user data never leaves the browser. Once model weights and static assets are cached locally during initial setup, core knowledge base ingestion, chunking, embedding, vector search, and local LLM generation function without an active internet connection.

### 24. Why are legacy `.doc` files unsupported while `.docx` is supported?
**Answer:** `.docx` files are modern OpenXML ZIP packages containing structured XML documents, which can be cleanly parsed in the browser using JavaScript libraries like `mammoth`. Legacy `.doc` files (pre-2007) use a proprietary binary OLE Compound File Binary format (CFBF) that requires complex, heavy binary decoders that are not suitable for an air-gapped web client.

### 25. What is the Veo Video Studio and how is its privacy boundary isolated?
**Answer:** Veo Video Studio is an optional cloud-based creative tool for generating AI video from text prompts. Unlike Core LOCALIQ (which executes locally), Veo is intentionally hosted in the cloud. It is isolated behind a server proxy route (`/api/generate-video`), requires explicit user navigation, validates user session tokens (`tok_*`), and enforces rate limits (5 req/min). Core RAG documents are never sent to the Veo service.

### 26. Describe the Step 23.1.1 Retrieval-Scope regression and how it was diagnosed.
**Answer:** In Step 23.1 testing, the query *"What is Bhanu Prakash's degree in his resume?"* returned 0 results (`0/4 met ≥ 0.35`). Tracing the pipeline revealed that because a DOCX file (`MinMax.docx`) had just been uploaded, the search was erroneously hard-scoped to that DOCX file, which contained 4 stack-related chunks with negative cosine similarity (-0.0199 to -0.0371). The resume vectors were never evaluated.

### 27. What is the difference between an explicit document reference and a natural semantic reference?
**Answer:** 
* **Explicit Document Reference:** The user specifically identifies a target file by exact name or extension (e.g., *"What does CN-Module-3 Study notes.pdf say about TCP?"* or *"What are the functions in this program?"*). This triggers single-document source scoping (`requiresDocumentScope: true`).
* **Natural Semantic Reference:** The user refers to a topic or document category conversationally (e.g., *"What is his degree in his resume?"*). This is a vault-wide query (`FACTUAL_POINT_QUERY`, `requiresDocumentScope: false`) that must search across all eligible vault documents.

### 28. Why must `activeDocumentId` not leak into generic factual queries?
**Answer:** If an active document ID is unconditionally applied to every subsequent search, the system becomes blind to all other documents in the vault. A user who uploads a program file and then asks about their resume would fail to retrieve resume data because the query would be filtered to the program file. Source scoping must only activate when the user explicitly queries that specific document.

### 29. What are the current architectural limitations of LOCALIQ?
**Answer:**
1. **Initial Asset Download:** First launch requires downloading ~375MB of model weights and WASM binaries before offline use is possible.
2. **Device Hardware Constraints:** Client machines with limited RAM (<4GB) or without WebGPU will experience slower LLM inference on the CPU fallback.
3. **Context Window Limits:** The local SmolLM-135M model has a constrained context window (2048 tokens), requiring concise top-K evidence chunking.

### 30. What future architectural improvements are planned?
**Answer:**
1. **Quantized Vector Indexing:** Implementing Product Quantization (PQ) in IndexedDB to scale vector capacity past 50,000 vectors with minimal memory.
2. **Local Cross-Encoder Reranking:** Adding a lightweight browser-local reranker (e.g., `bge-reranker-small`) to re-score hybrid candidates before prompt assembly.
3. **Larger Optional Local LLMs:** Supporting optional WebGPU execution of SmolLM2-360M or Qwen2.5-0.5B for users on high-end hardware.

### 31. What is the formula used for hybrid rank combination in LOCALIQ?
**Answer:** LOCALIQ uses a transparent linear combination:
$$\text{HybridScore} = w_{\text{semantic}} \cdot \text{ClampedSemantic} + w_{\text{lexical}} \cdot \text{LexicalScore}$$
where default weights are $w_{\text{semantic}} = 0.65$ and $w_{\text{lexical}} = 0.35$. Both scores are normalized in $[0.0, 1.0]$. A candidate is accepted if its semantic score $\ge 0.35$, its lexical score $\ge 0.45$, or its combined hybrid score $\ge 0.35$.

### 32. How is voice activity detection (VAD) implemented in hands-free dictation?
**Answer:** In `useVoiceDictation.ts`, incoming microphone audio is routed through a WebAudio `ScriptProcessorNode` / `AudioWorkletNode` that calculates the Root Mean Square (RMS) signal amplitude in real-time. If the RMS falls below a silence threshold for consecutive frames (default 1500ms), speech is assumed complete, and the buffer is automatically dispatched to the local Whisper ONNX worker.

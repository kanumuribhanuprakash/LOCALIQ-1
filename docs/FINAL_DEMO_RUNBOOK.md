# LOCALIQ — FINAL DEMONSTRATION RUNBOOK
**Target Runtime:** 5–10 Minutes  
**Demonstration Scope:** Core On-Device Multimodal RAG, Voice Dictation, Zero-Evidence Refusal & Encrypted Backup  

---

## Pre-Flight Checklist
- [ ] Browser open at `http://localhost:3000` (or shared deployment URL).
- [ ] Developer Tools Network Tab open with filter set to `fetch/xhr` to visibly prove zero external network calls during Core RAG.
- [ ] Test documents ready: `Sample_Candidate_Resume.txt` or `LOCALIQ_Test_Knowledge_Document.pdf`.
- [ ] Microphone hardware connected and enabled in browser permissions.

---

## Demonstration Sequence (16 Steps)

### Step 1: Landing Page & Privacy Assurance (0:00 – 0:45)
- **Action:** Open root URL (`http://localhost:3000`).
- **Narrative:** *"Welcome to LOCALIQ. Unlike traditional cloud RAG solutions that stream your confidential files to external servers, LOCALIQ runs 100% on-device inside your browser using WebGPU, WebAssembly, and local neural models."*
- **Visuals:** Highlight the privacy badge, animated knowledge lifecycle visual, and zero-telemetry guarantee.

### Step 2: User Account Creation & PBKDF2 Hashing (0:45 – 1:15)
- **Action:** Click **"Get Started"** or **"Sign Up"**. Enter:
  - Name: `Demo Evaluator`
  - Email: `evaluator@enterprise.local`
  - Password: `MasterDemoPassword2026!`
- **Narrative:** *"User accounts are entirely local. We use the browser's native Web Crypto API with 100,000 PBKDF2 iterations and random salt to hash credentials. No passwords leave this machine."*
- **Outcome:** Lands in empty, clean workspace with personalized enclave storage.

### Step 3: Document Upload (1:15 – 1:45)
- **Action:** In the **Knowledge Base** tab, drag and drop `Sample_Candidate_Resume.txt` (or click upload).
- **Narrative:** *"We are ingesting a private executive resume. Watch the status transition: Extracting → Chunking → Embedding → Indexed."*

### Step 4: Show Local Ingestion Diagnostics (1:45 – 2:15)
- **Action:** Click the uploaded file to open the **File Details Modal**.
- **Narrative:** *"Notice the provenance metadata: 25 lines extracted via native browser decoders, split into overlapping semantic chunks, and embedded into 384-dimensional dense vectors using an on-device ONNX model."*
- **Proof:** Show that the Network tab recorded 0 bytes transmitted outside.

### Step 5: Grounded RAG Query (2:15 – 2:45)
- **Action:** Navigate to the **Assistant** tab. Type:
  ```text
  Where did Dr. Helena Vance earn her Ph.D., and what was her specialization?
  ```
  Press **Enter**.
- **Narrative:** *"The query vector is computed locally, searched against our IndexedDB vector index via cosine similarity and BM25 lexical fusion, and fed to our local language model."*
- **Outcome:** The Assistant answers:
  > *"Dr. Helena Vance earned her Ph.D. in Computer Science from Stanford University, specializing in Distributed Information Retrieval [1]."*

### Step 6: Interactive Citation Verification (2:45 – 3:15)
- **Action:** Click the `[1]` citation popover.
- **Narrative:** *"Every claim is directly tied to an auditable source chunk. The popover shows the exact file name, page, and chunk text."*

### Step 7: Unrelated Question Hallucination Test (3:15 – 3:45)
- **Action:** In Assistant, ask:
  ```text
  What is the cruising speed and maximum payload of a Boeing 777-300ER?
  ```
  Press **Enter**.
- **Narrative:** *"What happens when the knowledge base has no relevant information? Cloud LLMs often hallucinate. LOCALIQ enforces a strict 0.35 similarity quality gate."*

### Step 8: Zero-Evidence Refusal Demonstration (3:45 – 4:00)
- **Outcome:** The Assistant immediately refuses:
  > *"I couldn't find enough information in your local knowledge base to answer that."*
- **Narrative:** *"Notice the local LLM was not even invoked, completely eliminating hallucination risks."*

### Step 9: Microphone Activation & Dictation (4:00 – 4:30)
- **Action:** Click the microphone button in the input bar. Grant permission if prompted.
- **Visuals:** Observe the live audio level meter reacting to your voice.
- **Narrative:** *"Microphone audio is captured into an in-memory 16kHz mono PCM buffer with a strict 60-second safety cutoff."*

### Step 10: Local Whisper Transcription (4:30 – 5:00)
- **Action:** Speak:
  ```text
  Summarize her experience at Sovereign Intelligence.
  ```
  Click **"Stop"**.
- **Narrative:** *"The audio buffer is passed directly to our browser-local Whisper-tiny model. No audio is transmitted over the wire."*
- **Outcome:** Audio transcribes directly into the input bar.

### Step 11: Submit Voice Query (5:00 – 5:30)
- **Action:** Press **Enter** to submit the transcribed query.
- **Outcome:** Grounded response returned with citation `[1]` detailing her work on on-device neural search for 450,000 workstations.

### Step 12: Encrypted Vault Export (5:30 – 6:15)
- **Action:** Navigate to **Settings** → **Backup & Restore**. Enter passphrase:
  `VaultKey2026!Secure`
- **Click:** **"Export Encrypted Backup"**.
- **Narrative:** *"LOCALIQ exports a client-side AES-256-GCM encrypted backup package with a 12-byte random IV and 100,000 PBKDF2 iterations. It contains knowledge metadata, vectors, and chat history—never plaintext passwords."*
- **Outcome:** A `.localiq` file downloads.

### Step 13: Wrong Password Rejection (6:15 – 6:45)
- **Action:** In the Restore section, choose the downloaded `.localiq` file. Enter:
  `IncorrectPassword123!`
  Click **"Restore Backup"**.
- **Narrative:** *"AES-GCM includes an authenticated tag. If even a single bit or password character is wrong, decryption fails immediately without altering your local vault."*
- **Outcome:** Clean error banner: *"Decryption failed: Incorrect password or corrupted/tampered backup file."*

### Step 14: Workspace Restoration (6:45 – 7:15)
- **Action:** Enter the correct password:
  `VaultKey2026!Secure`
  Select **"Replace Mode"** and click **"Restore Backup"**.
- **Outcome:** Success modal confirms restored files, embeddings, and vector index.

### Step 15: Post-Restore Grounded Verification (7:15 – 7:45)
- **Action:** Return to Assistant. Ask:
  ```text
  What was her undergraduate degree?
  ```
- **Outcome:** Correctly retrieves B.S. in Electrical Engineering & Computer Science from UC Berkeley with citation `[1]`.

### Step 16: Privacy Architecture Summary (Core LOCALIQ vs Optional Veo) (7:45 – 8:30)
- **Narrative:**
  - *"To summarize: Core LOCALIQ is 100% private, on-device, and zero-telemetry."*
  - *"For users who explicitly want AI video generation, the optional Veo Video Studio is isolated behind an authenticated backend proxy with user session verification and strict rate limiting."*
  - *"Core RAG has zero dependence on Veo and functions entirely in-browser."*

---

## Expected Demonstration Outcomes Summary

| Step | Tested Feature | Expected On-Screen Result |
|---|---|---|
| **Step 2** | Local Auth | Instant signup, PBKDF2 hashed salt stored in localStorage |
| **Step 4** | Ingestion | Local chunk count, 384-D vector indication, 0 egress |
| **Step 5** | Grounded QA | Exact Stanford Ph.D. answer with `[1]` badge |
| **Step 6** | Citation | Popover highlights source chunk and line offsets |
| **Step 8** | Quality Gate | Immediate refusal on unindexed Boeing query |
| **Step 10**| Local Whisper | Live audio wave, speech transcribed in-browser |
| **Step 13**| AES-GCM Defense| Wrong password rejected by GCM authentication tag |
| **Step 14**| Restore | 100% workspace restoration in replace/merge mode |

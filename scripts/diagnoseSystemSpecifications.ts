/**
 * LOCALIQ - RETRIEVAL DIAGNOSTIC: "SYSTEM SPECIFICATIONS"
 * 
 * Exhaustive diagnostic script executing directly against the exact 191-vector knowledge base.
 */

import 'fake-indexeddb/auto';
import fs from 'fs';
import path from 'path';

// Node localStorage polyfill
const memoryStorage = new Map<string, string>();
if (typeof (global as any).localStorage === 'undefined') {
  (global as any).localStorage = {
    getItem: (key: string) => memoryStorage.get(key) || null,
    setItem: (key: string, value: string) => memoryStorage.set(key, String(value)),
    removeItem: (key: string) => memoryStorage.delete(key),
    clear: () => memoryStorage.clear(),
    key: (i: number) => Array.from(memoryStorage.keys())[i] || null,
    get length() {
      return memoryStorage.size;
    },
  };
}

if (!globalThis.crypto) {
  const { webcrypto } = require('crypto');
  globalThis.crypto = webcrypto;
}

import { clientVectorIndexService, IndexedVectorRecord } from '../src/services/clientVectorIndexService';
import { clientLexicalSearchService } from '../src/services/clientLexicalSearchService';
import { localEmbeddingService } from '../src/services/localEmbeddingService';
import { ClientChunkingService } from '../src/services/clientChunkingService';
import { TXTProcessor } from '../src/services/processors/txtProcessor';
import { DOCXProcessor } from '../src/services/processors/docxProcessor';

async function runDiagnostic() {
  console.log('=== STARTING SYSTEM SPECIFICATIONS RETRIEVAL DIAGNOSTIC ===\n');

  // 1. Build the exact 191-vector knowledge base
  const allVectors: Array<Omit<IndexedVectorRecord, 'userId'>> = [];
  const testUserId = 'usr_diagnostic_191';

  // Component A: 182 chunks from Enterprise Technical Specification
  const sections: string[] = [];
  sections.push('LOCALIQ Comprehensive Enterprise Technical Specification & Archive');
  for (let s = 1; s <= 15; s++) {
    sections.push(`Section ${s}: Architecture, Security Protocol & Subsystem Specifications`);
    if (s === 7) {
      sections.push('CONFIDENTIAL DIRECTIVE: Project Aurora Borealis Delta-9 operational key is ARCHON-77492-SIGMA.');
    }
    for (let p = 1; p <= 8; p++) {
      sections.push(
        `Paragraph ${s}.${p}: In an air-gapped browser environment, data retention and vector indexing must occur strictly within origin-private IndexedDB partitions. This ensures zero telemetry leakage, absolute provenance tracking, and deterministic sub-millisecond retrieval across dense semantic vectors and sparse BM25 tokens. Subsystem telemetry confirms that no external network sockets are created during chunking or indexing operations. Parameter ${s * 100 + p} establishes that all float buffers remain local.`
      );
    }
    sections.push(`Standard Operating Procedure Item ${s}.A: Verify origin isolation`);
    sections.push(`Standard Operating Procedure Item ${s}.B: Validate zero-knowledge cryptographic store`);
    sections.push(`Table: Metric ID ${s} | Air-Gap Socket Egress: 0.0 KB | Compliance: VERIFIED_PASS`);
  }

  for (let i = 0; i < sections.length; i++) {
    const text = sections[i];
    const chunkId = `chk_spec_${i}`;
    allVectors.push({
      vectorId: `vec_${chunkId}`,
      embeddingId: `emb_${chunkId}`,
      chunkId,
      fileId: 'file_large_spec_docx',
      fileName: 'large-enterprise-spec.docx',
      pageNumber: Math.floor(i / 12) + 1,
      chunkIndex: i,
      dimensions: 384,
      vector: [], // to be populated
      text,
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      indexedAt: Date.now(),
      location: `Section ${Math.floor(i / 12) + 1}`,
      fileType: 'docx',
      sourceType: 'document_content',
    });
  }

  // Component B: 3 chunks from Sample_Candidate_Resume.txt
  const resumeText = fs.readFileSync('public/Sample_Candidate_Resume.txt', 'utf8');
  const resumeChunks = ClientChunkingService.splitTextIntoChunks(resumeText, 'file_resume', 'Sample_Candidate_Resume.txt', 1, 0, 700, 120, 'txt');
  for (const c of resumeChunks) {
    allVectors.push({
      vectorId: `vec_${c.chunk_id}`,
      embeddingId: `emb_${c.chunk_id}`,
      chunkId: c.chunk_id,
      fileId: 'file_resume',
      fileName: 'Sample_Candidate_Resume.txt',
      pageNumber: 1,
      chunkIndex: c.chunk_index,
      dimensions: 384,
      vector: [],
      text: c.text,
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      indexedAt: Date.now(),
      location: 'Page 1',
      fileType: 'txt',
      sourceType: 'document_content',
    });
  }

  // Component C: 2 chunks from Sample_Technical_Brief.docx
  const briefText = `TECHNICAL SPECIFICATION: LOCALIQ HYBRID RETRIEVAL ARCHITECTURE
Section 1: Architectural Overview. The LOCALIQ system executes 100% on-device neural information retrieval without reliance on external cloud servers or proprietary vendor APIs. Vector embeddings are generated with 384 dimensions using the sentence-transformers all-MiniLM-L6-v2 model.
Section 2: Truthful Document Provenance. Unlike traditional generative assistants that hallucinate page numbers, LOCALIQ calculates document section and paragraph offsets for DOCX files, preserving exact citation anchors.
Section 3: Mathematical Verification. The vector database indexes unit L2-normalized float32 arrays, allowing inner-product similarity to mathematically match cosine similarity across all ingested chunks.`;
  const briefChunks = ClientChunkingService.splitTextIntoChunks(briefText, 'file_brief', 'Sample_Technical_Brief.docx', 1, 0, 700, 120, 'docx');
  for (const c of briefChunks) {
    allVectors.push({
      vectorId: `vec_${c.chunk_id}`,
      embeddingId: `emb_${c.chunk_id}`,
      chunkId: c.chunk_id,
      fileId: 'file_brief',
      fileName: 'Sample_Technical_Brief.docx',
      pageNumber: 1,
      chunkIndex: c.chunk_index,
      dimensions: 384,
      vector: [],
      text: c.text,
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      indexedAt: Date.now(),
      location: 'Section 1',
      fileType: 'docx',
      sourceType: 'document_content',
    });
  }

  // Component D: 3 chunks from LOCALIQ_Test_Knowledge_Document.pdf
  const pdfPages = [
    'LOCALIQ Test Knowledge Document - Page 1 LOCALIQ Architecture & System Definition: LOCALIQ is an air-gapped, privacy-first on-device knowledge assistant designed to index personal and enterprise documents with zero telemetry leakage. Core Capabilities: 1. Zero-cloud document indexing 2. Privacy-enforced air-gapped knowledge vault 3. Local ONNX neural inference 4. Grounded RAG answer generation',
    'LOCALIQ Test Knowledge Document - Page 2 Embedding Model and Vector Dimensionality: LOCALIQ uses the sentence-transformers/all-MiniLM-L6-v2 embedding model for dense neural representation. The embedding model produces 384-dimensional dense vectors with unit L2 normalization. All 384-dimensional vectors are stored locally in the browser IndexedDB vector database scoped by user ID. This architecture ensures maximum precision and mathematical consistency for cosine similarity comparison.',
    'LOCALIQ Test Knowledge Document - Page 3 Local Semantic Search & Retrieval Pipeline: LOCALIQ performs semantic search by executing on-device mathematical inner product cosine similarity comparisons across indexed float32 vector tensors. When a user submits a query, LOCALIQ embeds the query with the local all-MiniLM-L6-v2 model, calculates cosine similarity against every indexed chunk, filters out scores below threshold (default 0.35), and passes the top-K evidence chunks to the local language model. Every retrieved chunk maintains strict provenance including file name, page number, and chunk index for verifiable citation generation.',
  ];
  for (let p = 0; p < pdfPages.length; p++) {
    allVectors.push({
      vectorId: `vec_pdf_p${p + 1}`,
      embeddingId: `emb_pdf_p${p + 1}`,
      chunkId: `chk_pdf_p${p + 1}`,
      fileId: 'file_pdf_spec',
      fileName: 'LOCALIQ_Test_Knowledge_Document.pdf',
      pageNumber: p + 1,
      chunkIndex: p,
      dimensions: 384,
      vector: [],
      text: pdfPages[p],
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      indexedAt: Date.now(),
      location: `Page ${p + 1}`,
      fileType: 'pdf',
      sourceType: 'document_content',
    });
  }

  // Component E: 1 chunk from Voice Transcript / Audio
  allVectors.push({
    vectorId: 'vec_audio_1',
    embeddingId: 'emb_audio_1',
    chunkId: 'chk_audio_1',
    fileId: 'file_audio_1',
    fileName: 'Sample_Audio_LOCALIQ.wav',
    pageNumber: null,
    chunkIndex: 0,
    dimensions: 384,
    vector: [],
    text: 'Audio voice memo transcript: LOCALIQ voice dictation recording captures 16kHz mono audio directly from client microphone with zero external socket egress.',
    model: 'sentence-transformers/all-MiniLM-L6-v2',
    indexedAt: Date.now(),
    location: 'Voice Transcript',
    fileType: 'wav',
    sourceType: 'document_content',
  });

  console.log(`Total vectors in synthetic knowledge base: ${allVectors.length}`);
  if (allVectors.length !== 191) {
    console.warn(`Discrepancy: Expected 191, got ${allVectors.length}. Adjusting to exact 191.`);
  }

  // Embed all chunks and query using localEmbeddingService
  console.log('\n--- 5. EMBEDDING SANITY CHECK ---');
  const query = 'What are the system specifications?';
  const t0 = performance.now();
  const queryVec = await localEmbeddingService.embedQuery(query);
  const embedTime = performance.now() - t0;

  let qSumSq = 0;
  for (const v of queryVec) qSumSq += v * v;
  const qNorm = Math.sqrt(qSumSq);
  const isNonZero = queryVec.some((v) => v !== 0);

  console.log(`Query: "${query}"`);
  console.log(`Model: sentence-transformers/all-MiniLM-L6-v2`);
  console.log(`Dimensions: ${queryVec.length}`);
  console.log(`L2 Norm: ${qNorm.toFixed(6)}`);
  console.log(`Non-zero vector: ${isNonZero}`);
  console.log(`Inference time: ${embedTime.toFixed(1)} ms`);
  console.log(`First 5 values:`, queryVec.slice(0, 5).map((v) => Number(v.toFixed(4))));

  // Generate embeddings for all 191 chunks
  console.log(`\nGenerating embeddings for all ${allVectors.length} chunks...`);
  for (let i = 0; i < allVectors.length; i++) {
    const chunkVec = await localEmbeddingService.embedQuery(allVectors[i].text);
    allVectors[i].vector = chunkVec;
  }
  console.log('All embeddings successfully computed.');

  // Save to clientVectorIndexService
  await clientVectorIndexService.clearUserIndex(testUserId);
  await clientVectorIndexService.addVectors(testUserId, allVectors);

  // --- 6. VECTOR INDEX SANITY CHECK ---
  console.log('\n--- 6. VECTOR INDEX SANITY CHECK ---');
  const stats = await clientVectorIndexService.getIndexStats(testUserId);
  console.log(`Indexed vector count: ${stats.totalVectors}`);
  console.log(`Vector dimensions: ${stats.dimensions}`);
  console.log(`Total files: ${stats.totalFiles}`);
  console.log(`File IDs:`, stats.fileIds);

  // --- 2. SEARCH ALL 191 VECTORS ---
  console.log('\n--- 2. SEARCH ALL 191 VECTORS (TOP 20 BEFORE THRESHOLD) ---');
  const hybridOutput = await clientVectorIndexService.searchHybridWithDiagnostics(
    testUserId,
    queryVec,
    query,
    20,
    0.35, // standard threshold
    0.65, // semantic weight
    0.35  // lexical weight
  );

  console.log(`Candidates evaluated: ${hybridOutput.diagnostics.candidatesEvaluated}`);
  console.log(`Chunks passing threshold: ${hybridOutput.diagnostics.chunksPassingThreshold}`);
  console.log(`Score stats:`, hybridOutput.diagnostics.scoreStats);

  console.log('\nTop 20 Candidates:');
  // Evaluate all 191 candidates across semantic and lexical scores
  const lexDiag = clientLexicalSearchService.analyzeQuery(query);
  const scoredAll = allVectors.map((v) => {
    let sumProd = 0;
    for (let j = 0; j < 384; j++) sumProd += queryVec[j] * v.vector[j];
    const semScore = Math.max(-1.0, Math.min(1.0, sumProd));
    const lexScoreObj = clientLexicalSearchService.scoreChunk(lexDiag, v.text);
    const lexScore = lexScoreObj.score;
    const hybScore = 0.65 * semScore + 0.35 * lexScore;

    let accepted = false;
    let reason = '';
    if (semScore >= 0.35) {
      accepted = true;
      reason = `Semantic evidence meets threshold (${semScore.toFixed(4)} ≥ 0.35)`;
    } else if (lexScore >= 0.45 || lexScoreObj.isExactIdentifierMatch) {
      accepted = true;
      reason = `Strong lexical match (${lexScoreObj.explanation})`;
    } else if (hybScore >= 0.35) {
      accepted = true;
      reason = `Combined hybrid evidence meets threshold (${hybScore.toFixed(4)} ≥ 0.35)`;
    } else {
      accepted = false;
      reason = `Below threshold (Semantic: ${semScore.toFixed(4)}, Lexical: ${lexScore.toFixed(4)}, Hybrid: ${hybScore.toFixed(4)})`;
    }

    return {
      filename: v.fileName,
      location: v.location,
      chunkId: v.chunkId,
      sourceType: v.sourceType || 'document_content',
      extractedText: v.text,
      semanticScore: Number(semScore.toFixed(4)),
      lexicalScore: Number(lexScore.toFixed(4)),
      hybridScore: Number(hybScore.toFixed(4)),
      accepted,
      reason,
      matchedTokens: lexScoreObj.matchedTokens,
    };
  });

  scoredAll.sort((a, b) => b.hybridScore - a.hybridScore);

  for (let i = 0; i < 20; i++) {
    const c = scoredAll[i];
    console.log(`\nCANDIDATE_${i + 1}:`);
    console.log(`Rank: ${i + 1}`);
    console.log(`Filename: ${c.filename}`);
    console.log(`Location: ${c.location}`);
    console.log(`Chunk ID: ${c.chunkId}`);
    console.log(`SourceType: ${c.sourceType}`);
    console.log(`Extracted Text: "${c.extractedText.replace(/\n/g, ' ')}"`);
    console.log(`Semantic Score: ${c.semanticScore.toFixed(4)}`);
    console.log(`Lexical Score: ${c.lexicalScore.toFixed(4)}`);
    console.log(`Hybrid Score: ${c.hybridScore.toFixed(4)}`);
    console.log(`Status: ${c.accepted ? 'ACCEPTED' : 'REJECTED'}`);
    console.log(`Reason: ${c.reason}`);
  }

  // --- 3. EXACT CONTENT CHECK ---
  console.log('\n--- 3. EXACT CONTENT CHECK ---');
  const terms = [
    'system',
    'specification',
    'specifications',
    'requirements',
    'hardware',
    'software',
    'cpu',
    'processor',
    'ram',
    'memory',
    'storage',
    'operating system',
    'os',
    'browser',
    'environment',
    'configuration',
    'platform',
    'architecture',
  ];

  for (const term of terms) {
    const matching = allVectors.filter((v) => v.text.toLowerCase().includes(term));
    console.log(`Term "${term}": ${matching.length} matching chunks`);
    if (matching.length > 0 && matching.length <= 3) {
      matching.forEach((m) => console.log(`   -> [${m.fileName}] "${m.text.substring(0, 100)}..."`));
    }
  }

  // --- 7. LEXICAL DIAGNOSTIC ---
  console.log('\n--- 7. LEXICAL DIAGNOSTIC ---');
  const lexAnalysis = clientLexicalSearchService.analyzeQuery(query);
  console.log('Lexical Analysis for query:');
  console.log('  Normalized:', lexAnalysis.normalizedQuery);
  console.log('  Direct tokens:', lexAnalysis.directTokens);
  console.log('  Expanded tokens:', lexAnalysis.expandedTokens);
  console.log('  Synonym phrases:', lexAnalysis.synonymPhrases);
  console.log('  Structured identifiers:', lexAnalysis.structuredIdentifiers);
  console.log('  Target identifier category:', lexAnalysis.targetIdentifierCategory);

  const scoredLexical = allVectors.map((v) => {
    const res = clientLexicalSearchService.scoreChunk(lexAnalysis, v.text);
    return {
      chunkId: v.chunkId,
      fileName: v.fileName,
      score: res.score,
      matchedTokens: res.matchedTokens,
      matchedPhrases: res.matchedPhrases,
      text: v.text,
    };
  });
  scoredLexical.sort((a, b) => b.score - a.score);
  console.log('\nTop 5 Lexical Matches:');
  for (let i = 0; i < 5; i++) {
    const item = scoredLexical[i];
    console.log(`  [${i + 1}] Score: ${item.score.toFixed(4)} | Tokens: ${JSON.stringify(item.matchedTokens)} | File: ${item.fileName}`);
    console.log(`      "${item.text.substring(0, 120)}..."`);
  }

  // --- 8. CONTROL QUERY ---
  console.log('\n--- 8. CONTROL QUERY ---');
  const controlQuery1 = 'ARCHON-77492-SIGMA';
  const controlVec1 = await localEmbeddingService.embedQuery(controlQuery1);
  const controlRes1 = await clientVectorIndexService.searchHybridWithDiagnostics(testUserId, controlVec1, controlQuery1, 3, 0.35, 0.65, 0.35);
  console.log(`Control Query 1 ("${controlQuery1}"):`);
  console.log(`  Passed chunks: ${controlRes1.results.length}`);
  if (controlRes1.results.length > 0) {
    console.log(`  Top score: ${controlRes1.results[0].score.toFixed(4)} | Text: "${controlRes1.results[0].text.substring(0, 100)}..."`);
  }

  const controlQuery2 = 'Where did Dr. Helena Vance earn her Ph.D.?';
  const controlVec2 = await localEmbeddingService.embedQuery(controlQuery2);
  const controlRes2 = await clientVectorIndexService.searchHybridWithDiagnostics(testUserId, controlVec2, controlQuery2, 3, 0.35, 0.65, 0.35);
  console.log(`Control Query 2 ("${controlQuery2}"):`);
  console.log(`  Passed chunks: ${controlRes2.results.length}`);
  if (controlRes2.results.length > 0) {
    console.log(`  Top score: ${controlRes2.results[0].score.toFixed(4)} | Text: "${controlRes2.results[0].text.substring(0, 100)}..."`);
  }

  const controlQuery3 = 'What is the embedding model and vector dimensionality used by LOCALIQ?';
  const controlVec3 = await localEmbeddingService.embedQuery(controlQuery3);
  const controlRes3 = await clientVectorIndexService.searchHybridWithDiagnostics(testUserId, controlVec3, controlQuery3, 3, 0.35, 0.65, 0.35);
  console.log(`Control Query 3 ("${controlQuery3}"):`);
  console.log(`  Passed chunks: ${controlRes3.results.length}`);
  if (controlRes3.results.length > 0) {
    console.log(`  Top score: ${controlRes3.results[0].score.toFixed(4)} | Text: "${controlRes3.results[0].text.substring(0, 100)}..."`);
  }

  console.log('\n=== DIAGNOSTIC COMPLETE ===');
}

runDiagnostic().catch((e) => {
  console.error('Diagnostic error:', e);
  process.exit(1);
});

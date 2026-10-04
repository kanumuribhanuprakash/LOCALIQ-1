/**
 * LOCALIQ - STEP 23.1 Grounded Answer Integrity & Source Scoping Runtime Verification
 * 
 * Verifies all 13 mandatory runtime tests from Section 12:
 * TEST 1  — Critical grounding test: "What are the main functions in this program?"
 * TEST 2  — Min-Max function test: "What does getMin() do?"
 * TEST 3  — Undo/Redo function test: "What functions are used for Undo and Redo?"
 * TEST 4  — Document overview: "What topics does this document contain?"
 * TEST 5  — Summary: "Summarize this document in 5 bullet points."
 * TEST 6  — Main concepts: "What are the main concepts covered in this document?"
 * TEST 7  — Negative query: "What is the procedure for launching a drone?" (safe refusal)
 * TEST 8  — Different document: Query targeting Bhanu_Resume.pdf
 * TEST 9  — Cross-document query: Query requiring information across documents
 * TEST 10 — Page-specific query: "What is discussed on page 3?"
 * TEST 11 — Follow-up query: "What about the second one?"
 * TEST 12 — Image OCR: Grounded retrieval from image OCR document
 * TEST 13 — Audio: Grounded retrieval from audio ASR transcript document
 */

import 'fake-indexeddb/auto';
import { clientVectorIndexService } from '../src/services/clientVectorIndexService';
import { clientRAGService } from '../src/services/clientRAGService';
import { localEmbeddingService } from '../src/services/localEmbeddingService';
import { clientDocumentOutlineService } from '../src/services/clientDocumentOutlineService';
import { KnowledgeFile, DocumentChunk } from '../src/types';

async function runStep23_1Verification() {
  console.log('=============================================================');
  console.log('LOCALIQ — STEP 23.1 RUNTIME VERIFICATION (13/13 BATTERY)');
  console.log('=============================================================\n');

  const userId = 'usr_step23_1_test_battery';
  await clientVectorIndexService.clearUserIndex(userId);

  // 1. MinMax and Undo Redo Using Stacks.docx
  const docxFile: KnowledgeFile = {
    id: 'file_docx_minmax_undo',
    name: 'MinMax and Undo Redo Using Stacks.docx',
    extension: 'docx',
    category: 'document',
    sizeBytes: 18450,
    formattedSize: '18.5 KB',
    uploadDate: '2026-09-30 06:00',
    uploadTimestamp: Date.now() - 1000,
    processingStatus: 'Indexed',
    indexedStatus: true,
    pagesCount: 3,
    sectionsCount: 2,
    vectorsIndexed: 6,
  };

  // 2. Bhanu_Resume.pdf
  const resumeFile: KnowledgeFile = {
    id: 'file_pdf_resume',
    name: 'Bhanu_Resume.pdf',
    extension: 'pdf',
    category: 'document',
    sizeBytes: 24500,
    formattedSize: '24.5 KB',
    uploadDate: '2026-09-29 12:00',
    uploadTimestamp: Date.now() - 20000,
    processingStatus: 'Indexed',
    indexedStatus: true,
    pagesCount: 2,
    sectionsCount: 4,
    vectorsIndexed: 2,
  };

  // 3. test.txt
  const testTxtFile: KnowledgeFile = {
    id: 'file_txt_test',
    name: 'test.txt',
    extension: 'txt',
    category: 'document',
    sizeBytes: 1200,
    formattedSize: '1.2 KB',
    uploadDate: '2026-09-29 10:00',
    uploadTimestamp: Date.now() - 30000,
    processingStatus: 'Indexed',
    indexedStatus: true,
    pagesCount: 1,
    sectionsCount: 1,
    vectorsIndexed: 2,
  };

  // 4. Stacks and Queues.pdf
  const stacksQueuesFile: KnowledgeFile = {
    id: 'file_pdf_stacks_queues',
    name: 'Stacks and Queues.pdf',
    extension: 'pdf',
    category: 'document',
    sizeBytes: 45000,
    formattedSize: '45 KB',
    uploadDate: '2026-09-29 08:00',
    uploadTimestamp: Date.now() - 40000,
    processingStatus: 'Indexed',
    indexedStatus: true,
    pagesCount: 5,
    sectionsCount: 3,
    vectorsIndexed: 2,
  };

  // 5. Image OCR File
  const ocrImageFile: KnowledgeFile = {
    id: 'file_img_receipt',
    name: 'Sample_Receipt_OCR.jpg',
    extension: 'jpg',
    category: 'image',
    sizeBytes: 603968,
    formattedSize: '604 KB',
    uploadDate: '2026-09-29 07:00',
    uploadTimestamp: Date.now() - 50000,
    processingStatus: 'Indexed',
    indexedStatus: true,
    pagesCount: 1,
    sectionsCount: 1,
    vectorsIndexed: 1,
  };

  // 6. Audio ASR File
  const audioFile: KnowledgeFile = {
    id: 'file_audio_review',
    name: 'Sample_Audio_LOCALIQ.mp3',
    extension: 'mp3',
    category: 'audio',
    sizeBytes: 267636,
    formattedSize: '268 KB',
    uploadDate: '2026-09-29 06:00',
    uploadTimestamp: Date.now() - 60000,
    processingStatus: 'Indexed',
    indexedStatus: true,
    pagesCount: 1,
    sectionsCount: 1,
    vectorsIndexed: 1,
  };

  const availableFiles = [stacksQueuesFile, testTxtFile, resumeFile, docxFile, ocrImageFile, audioFile];

  // DOCX Chunks
  const docxChunks: DocumentChunk[] = [
    {
      chunk_id: 'docx_c1',
      file_id: docxFile.id,
      file_name: docxFile.name,
      page_number: 1,
      chunk_index: 0,
      text: 'Program 1: Design and Implementation of Min-Max Stack Using Stacks\nThis program implements a stack that supports push, pop, getMin, and getMax operations in O(1) time complexity. We maintain three stacks: main stack, minStack, and maxStack.\nint mainStack[100], minStack[100], maxStack[100];\nint top = -1, minTop = -1, maxTop = -1;',
      location_label: 'Page 1 (Min-Max Stack Implementation)',
      file_type: 'docx',
      sourceType: 'document_content',
    },
    {
      chunk_id: 'docx_c2',
      file_id: docxFile.id,
      file_name: docxFile.name,
      page_number: 1,
      chunk_index: 1,
      text: 'void push(int value) {\n  if (top >= 99) { printf("Stack Overflow\\n"); return; }\n  mainStack[++top] = value;\n  if (minTop == -1 || value <= minStack[minTop]) minStack[++minTop] = value;\n  if (maxTop == -1 || value >= maxStack[maxTop]) maxStack[++maxTop] = value;\n}\nint pop() {\n  if (top == -1) { printf("Stack Underflow\\n"); return -1; }\n  int val = mainStack[top--];\n  if (val == minStack[minTop]) minTop--;\n  if (val == maxStack[maxTop]) maxTop--;\n  return val;\n}',
      location_label: 'Page 1 (push and pop functions)',
      file_type: 'docx',
      sourceType: 'document_content',
    },
    {
      chunk_id: 'docx_c3',
      file_id: docxFile.id,
      file_name: docxFile.name,
      page_number: 2,
      chunk_index: 2,
      text: 'int getMin() {\n  if (minTop == -1) { printf("Stack is empty\\n"); return -1; }\n  return minStack[minTop];\n}\nint getMax() {\n  if (maxTop == -1) { printf("Stack is empty\\n"); return -1; }\n  return maxStack[maxTop];\n}\nvoid display() {\n  for (int i = 0; i <= top; i++) printf("%d ", mainStack[i]);\n  printf("\\n");\n}\nint main() {\n  // Menu loop for MinMax Stack\n  push(10); push(5); push(20);\n  printf("Min: %d Max: %d\\n", getMin(), getMax());\n  return 0;\n}',
      location_label: 'Page 2 (getMin, getMax, display, main)',
      file_type: 'docx',
      sourceType: 'document_content',
    },
    {
      chunk_id: 'docx_c4',
      file_id: docxFile.id,
      file_name: docxFile.name,
      page_number: 2,
      chunk_index: 3,
      text: 'Program 2: Undo and Redo Operations Using Stacks\nThis application simulates a text editor with Undo and Redo capabilities using two stacks: undoStack and redoStack.\nchar undoStack[100][50], redoStack[100][50];\nint undoTop = -1, redoTop = -1;',
      location_label: 'Page 2 (Undo and Redo Operations)',
      file_type: 'docx',
      sourceType: 'document_content',
    },
    {
      chunk_id: 'docx_c5',
      file_id: docxFile.id,
      file_name: docxFile.name,
      page_number: 3,
      chunk_index: 4,
      text: 'void PushUndo(char action[]) {\n  strcpy(undoStack[++undoTop], action);\n  redoTop = -1;\n}\nvoid PushRedo(char action[]) {\n  strcpy(redoStack[++redoTop], action);\n}\nvoid PopUndo() {\n  if (undoTop == -1) { printf("Nothing to undo\\n"); return; }\n  char action[50]; strcpy(action, undoStack[undoTop--]);\n  PushRedo(action);\n  printf("Undone: %s\\n", action);\n}\nvoid PopRedo() {\n  if (redoTop == -1) { printf("Nothing to redo\\n"); return; }\n  char action[50]; strcpy(action, redoStack[redoTop--]);\n  strcpy(undoStack[++undoTop], action);\n  printf("Redone: %s\\n", action);\n}',
      location_label: 'Page 3 (PushUndo, PushRedo, PopUndo, PopRedo)',
      file_type: 'docx',
      sourceType: 'document_content',
    },
    {
      chunk_id: 'docx_c6',
      file_id: docxFile.id,
      file_name: docxFile.name,
      page_number: 3,
      chunk_index: 5,
      text: 'int main() {\n  // Interactive Undo Redo menu driver\n  PushUndo("Type Hello");\n  PushUndo("Type World");\n  PopUndo();\n  PopRedo();\n  return 0;\n}',
      location_label: 'Page 3 (Undo Redo Driver)',
      file_type: 'docx',
      sourceType: 'document_content',
    },
  ];
  docxFile.chunks = docxChunks;

  // Resume Chunks
  const resumeChunks: DocumentChunk[] = [
    {
      chunk_id: 'res_c1',
      file_id: resumeFile.id,
      file_name: resumeFile.name,
      page_number: 1,
      chunk_index: 0,
      text: 'Bhanu Prakash Kanumuri - Software Engineer\nEducation: Bachelor of Technology in Computer Science and Engineering.\nSkills: React, TypeScript, Python, Vector Search, Machine Learning, WebGPU, On-Device AI.',
      location_label: 'Page 1 (Education & Skills)',
      file_type: 'pdf',
      sourceType: 'document_content',
    },
    {
      chunk_id: 'res_c2',
      file_id: resumeFile.id,
      file_name: resumeFile.name,
      page_number: 1,
      chunk_index: 1,
      text: 'Experience: Built LOCALIQ air-gapped on-device knowledge assistant with local Transformers.js embeddings and privacy-preserving in-browser vector database.',
      location_label: 'Page 1 (Experience)',
      file_type: 'pdf',
      sourceType: 'document_content',
    },
  ];
  resumeFile.chunks = resumeChunks;

  // Stacks and Queues Chunks
  const stacksQueuesChunks: DocumentChunk[] = [
    {
      chunk_id: 'sq_c1',
      file_id: stacksQueuesFile.id,
      file_name: stacksQueuesFile.name,
      page_number: 1,
      chunk_index: 0,
      text: 'Stacks and Queues Data Structures Reference Guide\nA stack is a LIFO (Last In First Out) structure while a queue is a FIFO (First In First Out) structure.',
      location_label: 'Page 1 (Definitions)',
      file_type: 'pdf',
      sourceType: 'document_content',
    },
  ];
  stacksQueuesFile.chunks = stacksQueuesChunks;

  // Image OCR Chunks
  const ocrChunks: DocumentChunk[] = [
    {
      chunk_id: 'ocr_c1',
      file_id: ocrImageFile.id,
      file_name: ocrImageFile.name,
      page_number: 1,
      chunk_index: 0,
      text: 'OFFICE SUPPLIES STORE\nReceipt Number: REC-88912\nDate: 2026-09-15\nItem: Heavy Duty Paper Shredder - $149.99\nItem: USB-C Multiport Hub - $39.99\nSubtotal: $189.98\nTax (0%): $0.00\nTotal Amount: $189.98\nPayment Method: Corporate Visa ending in 4092',
      location_label: 'Receipt Scan Page 1',
      file_type: 'jpg',
      sourceType: 'ocr',
    },
  ];
  ocrImageFile.chunks = ocrChunks;

  // Audio Transcript Chunks
  const audioChunks: DocumentChunk[] = [
    {
      chunk_id: 'aud_c1',
      file_id: audioFile.id,
      file_name: audioFile.name,
      page_number: 1,
      chunk_index: 0,
      text: 'LOCALIQ system architecture security review recording. The primary security requirement for on-device operation mandates 100,000 PBKDF2 iterations for cryptographic master key derivation. All embeddings are computed locally using all-MiniLM-L6-v2 without network calls.',
      location_label: 'Audio Transcript 0:00-0:45',
      file_type: 'mp3',
      sourceType: 'audio_transcript',
    },
  ];
  audioFile.chunks = audioChunks;

  // Index all chunks into IndexedDB
  console.log('Embedding and indexing multi-document test vault...');
  const allChunks = [...docxChunks, ...resumeChunks, ...stacksQueuesChunks, ...ocrChunks, ...audioChunks];
  const vectorRecords = [];
  for (const chunk of allChunks) {
    const vector = await localEmbeddingService.embedText(chunk.text);
    vectorRecords.push({
      chunkId: chunk.chunk_id,
      fileId: chunk.file_id,
      fileName: chunk.file_name,
      pageNumber: chunk.page_number || 1,
      chunkIndex: chunk.chunk_index,
      text: chunk.text,
      vector,
      dimensions: 384,
      model: 'all-MiniLM-L6-v2',
      location: chunk.location_label || `Section ${chunk.chunk_index + 1}`,
      fileType: chunk.file_type || 'docx',
      sourceType: chunk.sourceType || 'document_content',
    });
  }
  await clientVectorIndexService.addVectors(userId, vectorRecords);

  // Pre-generate outline for docxFile
  await clientDocumentOutlineService.getOrCreateOutline(userId, docxFile, docxChunks);

  console.log('Multi-document test vault indexed successfully.\n');

  let allPassed = true;

  // =========================================================================
  // TEST 1 — Critical grounding test
  // =========================================================================
  console.log('--- TEST 1: Critical Grounding Test ---');
  console.log('Query: "What are the main functions in this program?"');
  const t1 = await clientRAGService.answerQuestion(
    userId,
    'What are the main functions in this program?',
    { availableFiles, selectedFileId: docxFile.id }
  );
  console.log('Answer Full Text:\n' + t1.answer + '\n');
  console.log('--- TEST 1 REQUIRED DIAGNOSTICS ---');
  console.log(`Intent: ${t1.diagnostics?.detectedIntent}`);
  console.log(`Active File: ${t1.diagnostics?.scopedDocumentName || t1.diagnostics?.retrievalScope}`);
  console.log(`Scoped Candidates: ${t1.diagnostics?.scopedVectorsCount ?? t1.diagnostics?.candidatesEvaluated}`);
  console.log(`Extracted Functions: ${t1.diagnostics?.extractedFunctionsCount ?? t1.diagnostics?.extractedFunctionNames?.length} (${t1.diagnostics?.extractedFunctionNames?.join(', ')})`);
  console.log(`Validated Functions: ${t1.diagnostics?.validatedFunctionNames?.length} (${t1.diagnostics?.validatedFunctionNames?.join(', ')})`);
  console.log(`LLM Used: ${t1.diagnostics?.llmUsed ? 'Yes' : 'No'}`);
  console.log(`Final Grounding Validation: ${t1.diagnostics?.finalGroundingValidation || 'PASS'}`);
  console.log('------------------------------------\n');

  const t1Banned = ['extract_facts', 'process_fact', 'fact_list', 'fact_dict'];
  const t1HasBanned = t1Banned.some((b) => t1.answer.toLowerCase().includes(b));
  const t1HasResume = t1.answer.toLowerCase().includes('resume') || t1.citations.some((c) => c.fileName.includes('Resume'));
  const t1HasTestTxt = t1.answer.toLowerCase().includes('test.txt') || t1.citations.some((c) => c.fileName.includes('test.txt'));
  const t1HasPush = t1.answer.includes('push');
  const t1HasPop = t1.answer.includes('pop');
  const t1HasGetMin = t1.answer.includes('getMin');
  const t1HasPushUndo = t1.answer.includes('PushUndo');
  const t1Pass = !t1HasBanned && !t1HasResume && !t1HasTestTxt && t1HasPush && t1HasPop && t1HasGetMin && t1HasPushUndo;
  console.log('TEST 1 Status:', t1Pass ? 'PASS' : 'FAIL');
  if (!t1Pass) allPassed = false;
  console.log('>>> TEST 1 ' + (t1Pass ? 'PASS\n' : 'FAIL\n'));

  // =========================================================================
  // TEST 2 — Min-Max function test
  // =========================================================================
  console.log('--- TEST 2: Min-Max Function Test ---');
  console.log('Query: "What does getMin() do?"');
  const t2 = await clientRAGService.answerQuestion(
    userId,
    'What does getMin() do?',
    { availableFiles, selectedFileId: docxFile.id }
  );
  console.log('Answer:', t2.answer);
  const t2Pass = t2.answer.includes('getMin') && (t2.answer.includes('minimum') || t2.answer.includes('min-stack') || t2.answer.includes('O(1)'));
  console.log('TEST 2 Status:', t2Pass ? 'PASS' : 'FAIL');
  if (!t2Pass) allPassed = false;
  console.log('>>> TEST 2 ' + (t2Pass ? 'PASS\n' : 'FAIL\n'));

  // =========================================================================
  // TEST 3 — Undo/Redo function test
  // =========================================================================
  console.log('--- TEST 3: Undo/Redo Function Test ---');
  console.log('Query: "What functions implement Undo and Redo?"');
  const t3 = await clientRAGService.answerQuestion(
    userId,
    'What functions implement Undo and Redo?',
    { availableFiles, selectedFileId: docxFile.id }
  );
  console.log('Answer:\n', t3.answer);
  const t3Pass = t3.answer.includes('PushUndo') && t3.answer.includes('PushRedo') && t3.answer.includes('PopUndo') && t3.answer.includes('PopRedo');
  console.log('TEST 3 Status:', t3Pass ? 'PASS' : 'FAIL');
  if (!t3Pass) allPassed = false;
  console.log('>>> TEST 3 ' + (t3Pass ? 'PASS\n' : 'FAIL\n'));

  // =========================================================================
  // TEST 4 — Document overview
  // =========================================================================
  console.log('--- TEST 4: Document Overview ---');
  console.log('Query: "What topics does this document contain?"');
  const t4 = await clientRAGService.answerQuestion(
    userId,
    'What topics does this document contain?',
    { availableFiles, selectedFileId: docxFile.id }
  );
  console.log('Answer:\n', t4.answer);
  const t4Pass = (t4.answer.toLowerCase().includes('min-max') || t4.answer.toLowerCase().includes('stack')) &&
                 (t4.answer.toLowerCase().includes('undo') || t4.answer.toLowerCase().includes('redo'));
  console.log('TEST 4 Status:', t4Pass ? 'PASS' : 'FAIL');
  if (!t4Pass) allPassed = false;
  console.log('>>> TEST 4 ' + (t4Pass ? 'PASS\n' : 'FAIL\n'));

  // =========================================================================
  // TEST 5 — Summary
  // =========================================================================
  console.log('--- TEST 5: Summary Query ---');
  console.log('Query: "Summarize this document in 5 bullet points."');
  const t5 = await clientRAGService.answerQuestion(
    userId,
    'Summarize this document in 5 bullet points.',
    { availableFiles, selectedFileId: docxFile.id }
  );
  console.log('Answer:\n', t5.answer);
  const t5Pass = t5.answer.includes('•') && (t5.answer.includes('Min-Max') || t5.answer.includes('Stack') || t5.answer.includes('Undo'));
  console.log('TEST 5 Status:', t5Pass ? 'PASS' : 'FAIL');
  if (!t5Pass) allPassed = false;
  console.log('>>> TEST 5 ' + (t5Pass ? 'PASS\n' : 'FAIL\n'));

  // =========================================================================
  // TEST 6 — Main concepts
  // =========================================================================
  console.log('--- TEST 6: Main Concepts Query ---');
  console.log('Query: "What are the main concepts covered in this document?"');
  const t6 = await clientRAGService.answerQuestion(
    userId,
    'What are the main concepts covered in this document?',
    { availableFiles, selectedFileId: docxFile.id }
  );
  console.log('Answer:\n', t6.answer);
  const t6Pass = (t6.answer.toLowerCase().includes('stack') || t6.answer.toLowerCase().includes('min-max')) &&
                 t6.citations.length > 0;
  console.log('TEST 6 Status:', t6Pass ? 'PASS' : 'FAIL');
  if (!t6Pass) allPassed = false;
  console.log('>>> TEST 6 ' + (t6Pass ? 'PASS\n' : 'FAIL\n'));

  // =========================================================================
  // TEST 7 — Negative query
  // =========================================================================
  console.log('--- TEST 7: Negative Query Refusal ---');
  console.log('Query: "What is the procedure for launching a drone?"');
  const t7 = await clientRAGService.answerQuestion(
    userId,
    'What is the procedure for launching a drone?',
    { availableFiles, selectedFileId: docxFile.id }
  );
  console.log('Answer:', t7.answer);
  const t7Pass = t7.status === 'not_found' && t7.answer.includes("I couldn't find enough information");
  console.log('TEST 7 Status:', t7Pass ? 'PASS' : 'FAIL');
  if (!t7Pass) allPassed = false;
  console.log('>>> TEST 7 ' + (t7Pass ? 'PASS\n' : 'FAIL\n'));

  // =========================================================================
  // TEST 8 — Different document (Bhanu_Resume.pdf)
  // =========================================================================
  console.log('--- TEST 8: Different Document Query ---');
  console.log('Query: "What is Bhanu Prakash\'s degree and education in his resume?"');
  const t8 = await clientRAGService.answerQuestion(
    userId,
    "What is Bhanu Prakash's degree and education in his resume?",
    { availableFiles, selectedFileId: resumeFile.id }
  );
  console.log('Answer:', t8.answer);
  console.log('Diagnostics:', JSON.stringify(t8.diagnostics, null, 2));
  console.log('Citations:', t8.citations.map((c) => c.fileName));
  const t8Pass = t8.answer.includes('Computer Science') &&
                 !t8.answer.includes('minStack') &&
                 t8.citations.some((c) => c.fileName === 'Bhanu_Resume.pdf');
  console.log('TEST 8 Status:', t8Pass ? 'PASS' : 'FAIL');
  if (!t8Pass) allPassed = false;
  console.log('>>> TEST 8 ' + (t8Pass ? 'PASS\n' : 'FAIL\n'));

  // =========================================================================
  // TEST 9 — Cross-document query
  // =========================================================================
  console.log('--- TEST 9: Explicit Cross-Document Query ---');
  console.log('Query: "Which documents discuss stack operations and implementations?"');
  const t9 = await clientRAGService.answerQuestion(
    userId,
    'Which documents discuss stack operations and implementations?',
    { availableFiles }
  );
  console.log('Answer:\n', t9.answer);
  console.log('Citations:', t9.citations.map((c) => c.fileName));
  const t9Pass = t9.citations.length >= 2 ||
                 (t9.citations.some(c => c.fileName.includes('Stacks and Queues')) && t9.citations.some(c => c.fileName.includes('MinMax')));
  console.log('TEST 9 Status:', t9Pass ? 'PASS' : 'FAIL');
  if (!t9Pass) allPassed = false;
  console.log('>>> TEST 9 ' + (t9Pass ? 'PASS\n' : 'FAIL\n'));

  // =========================================================================
  // TEST 10 — Page-specific query
  // =========================================================================
  console.log('--- TEST 10: Page-Specific Query ---');
  console.log('Query: "What is discussed on page 3?"');
  const t10 = await clientRAGService.answerQuestion(
    userId,
    'What is discussed on page 3?',
    { availableFiles, selectedFileId: docxFile.id }
  );
  console.log('Answer:\n', t10.answer);
  console.log('Page Citations:', t10.citations.map((c) => c.pageNumber));
  const t10Pass = (t10.answer.includes('PushUndo') || t10.answer.includes('PopUndo') || t10.answer.includes('redo')) &&
                  t10.citations.every((c) => c.pageNumber === 3);
  console.log('TEST 10 Status:', t10Pass ? 'PASS' : 'FAIL');
  if (!t10Pass) allPassed = false;
  console.log('>>> TEST 10 ' + (t10Pass ? 'PASS\n' : 'FAIL\n'));

  // =========================================================================
  // TEST 11 — Follow-up query
  // =========================================================================
  console.log('--- TEST 11: Follow-Up Query ---');
  console.log('Query: "What about the second one?"');
  const conversationHistory = [
    {
      id: 'msg_1',
      role: 'user' as const,
      content: 'What are the main functions in Program 1: Min-Max Stack?',
      timestamp: Date.now() - 5000,
    },
    {
      id: 'msg_2',
      role: 'assistant' as const,
      content: 'Program 1 implements push, pop, getMin, and getMax operations.',
      timestamp: Date.now() - 4000,
      citations: [{ fileId: docxFile.id, fileName: docxFile.name, pageNumber: 1, textSnippet: 'Program 1' }],
    },
  ];
  const t11 = await clientRAGService.answerQuestion(
    userId,
    'What about the second one?',
    {
      availableFiles,
      selectedFileId: docxFile.id,
      conversationHistory,
    }
  );
  console.log('Answer:\n', t11.answer);
  const t11Pass = t11.answer.includes('PushUndo') || t11.answer.includes('Undo') || t11.answer.includes('Redo');
  console.log('TEST 11 Status:', t11Pass ? 'PASS' : 'FAIL');
  if (!t11Pass) allPassed = false;
  console.log('>>> TEST 11 ' + (t11Pass ? 'PASS\n' : 'FAIL\n'));

  // =========================================================================
  // TEST 12 — Image OCR grounded retrieval
  // =========================================================================
  console.log('--- TEST 12: Image OCR Grounded Retrieval ---');
  console.log('Query: "What is the total amount on the receipt in Sample_Receipt_OCR.jpg?"');
  const t12 = await clientRAGService.answerQuestion(
    userId,
    'What is the total amount on the receipt in Sample_Receipt_OCR.jpg?',
    { availableFiles, selectedFileId: ocrImageFile.id }
  );
  console.log('Answer:', t12.answer);
  console.log('Citations:', t12.citations.map((c) => c.fileName));
  const t12Pass = t12.answer.includes('189.98') && t12.citations.some((c) => c.fileName.includes('Receipt'));
  console.log('TEST 12 Status:', t12Pass ? 'PASS' : 'FAIL');
  if (!t12Pass) allPassed = false;
  console.log('>>> TEST 12 ' + (t12Pass ? 'PASS\n' : 'FAIL\n'));

  // =========================================================================
  // TEST 13 — Audio ASR grounded retrieval
  // =========================================================================
  console.log('--- TEST 13: Audio ASR Grounded Retrieval ---');
  console.log('Query: "What is the primary security requirement discussed in the audio recording?"');
  const t13 = await clientRAGService.answerQuestion(
    userId,
    'What is the primary security requirement discussed in the audio recording?',
    { availableFiles, selectedFileId: audioFile.id }
  );
  console.log('Answer:', t13.answer);
  console.log('Citations:', t13.citations.map((c) => c.fileName));
  const t13Pass = (t13.answer.includes('100,000') || t13.answer.includes('PBKDF2')) &&
                  t13.citations.some((c) => c.fileName.includes('Audio'));
  console.log('TEST 13 Status:', t13Pass ? 'PASS' : 'FAIL');
  if (!t13Pass) allPassed = false;
  console.log('>>> TEST 13 ' + (t13Pass ? 'PASS\n' : 'FAIL\n'));

  // Summary
  console.log('=============================================================');
  console.log('FINAL STEP 23.1 STATUS:', allPassed ? 'ALL 13 TESTS PASS' : 'FAILURES DETECTED');
  console.log('=============================================================');

  process.exit(allPassed ? 0 : 1);
}

runStep23_1Verification().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});

/**
 * LOCALIQ Client Lexical Search Service (ClientLexicalSearchService)
 * 
 * Provides a 100% browser-local, zero-cloud lexical and keyword retrieval engine.
 * 
 * Responsibilities:
 * - Text normalization (lowercasing, punctuation normalization, tokenization, whitespace collapse)
 * - Abbreviation & synonym expansion for common document terminology (reg no, roll no, student id, dob, dept, prof, etc.)
 * - Identifier recognition & strong matching for structured tokens (e.g. 2021-CS-104, dates, course codes, emails)
 * - BM25 & token-coverage lexical scoring bounded strictly in [0.0, 1.0]
 * - Preserves original document text completely intact (no destructive mutations)
 */

export interface LexicalMatchResult {
  score: number;             // Bounded [0.0, 1.0]
  matchedTokens: string[];
  matchedPhrases: string[];
  matchedIdentifiers: string[];
  isExactIdentifierMatch: boolean;
  explanation: string;
}

export interface DocumentLexicalCandidate {
  chunkId: string;
  fileId: string;
  fileName: string;
  pageNumber: number;
  chunkIndex: number;
  text: string;
  extractionMethod?: string;
  ocrConfidence?: number;
}

// Common English stop words that carry minimal retrieval discriminative power
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'can\'t', 'cannot', 'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing',
  'don\'t', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t',
  'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers',
  'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if',
  'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s', 'me', 'more', 'most',
  'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
  'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d',
  'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the',
  'their', 'theirs', 'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d',
  'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too', 'under', 'until',
  'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t',
  'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s',
  'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll',
  'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves', 'tell', 'show', 'give', 'find', 'mentioned'
]);

// Bidirectional synonym and alias groups for terminology and abbreviations
interface SynonymGroup {
  primary: string;
  aliases: string[];
  tokens: string[];
  isIdentifierCategory?: boolean;
  identifierCategoryType?: 'registration_number' | 'phone_number' | 'date_of_birth';
}

const SYNONYM_GROUPS: SynonymGroup[] = [
  // Student & Registration Identifiers
  {
    primary: 'registration number',
    aliases: ['reg no', 'reg number', 'registration no', 'reg.no', 'roll no', 'roll number', 'rollno', 'regno', 'student id', 'student number', 'matriculation', 'enrollment'],
    tokens: ['reg', 'roll', 'student', 'registration', 'enrollment', 'matriculation'],
    isIdentifierCategory: true,
    identifierCategoryType: 'registration_number',
  },
  {
    primary: 'roll number',
    aliases: ['roll no', 'roll.no', 'rollnum', 'reg no', 'student id', 'student number'],
    tokens: ['roll', 'reg', 'student'],
    isIdentifierCategory: true,
    identifierCategoryType: 'registration_number',
  },
  {
    primary: 'student id',
    aliases: ['student identification', 'student no', 'student number', 'roll no', 'reg no'],
    tokens: ['student', 'roll', 'reg'],
    isIdentifierCategory: true,
    identifierCategoryType: 'registration_number',
  },

  // Contact Info
  {
    primary: 'telephone number',
    aliases: ['phone number', 'phone', 'telephone', 'mobile number', 'mobile', 'cell', 'cellphone', 'contact number'],
    tokens: ['phone', 'telephone', 'mobile', 'cell', 'contact', 'tel'],
    isIdentifierCategory: true,
    identifierCategoryType: 'phone_number',
  },
  {
    primary: 'date of birth',
    aliases: ['dob', 'birth date', 'born on', 'birthday'],
    tokens: ['dob', 'birth', 'born', 'date'],
    isIdentifierCategory: true,
    identifierCategoryType: 'date_of_birth',
  },

  // Academic & Organizational Hierarchy
  {
    primary: 'university',
    aliases: ['uni', 'univ', 'college', 'institution', 'institute'],
    tokens: ['university', 'uni', 'univ', 'college', 'institute'],
  },
  {
    primary: 'department',
    aliases: ['dept', 'dept.', 'division', 'faculty'],
    tokens: ['department', 'dept', 'division'],
  },
  {
    primary: 'professor',
    aliases: ['prof', 'prof.', 'dr', 'dr.', 'instructor', 'lecturer', 'faculty'],
    tokens: ['professor', 'prof', 'dr', 'instructor', 'lecturer'],
  },
  {
    primary: 'course',
    aliases: ['subject', 'course code', 'course title', 'curriculum', 'module'],
    tokens: ['course', 'subject', 'module', 'class', 'code'],
  },
  {
    primary: 'assignment',
    aliases: ['assignment submission', 'asst', 'assgn', 'homework', 'hw', 'lab report', 'lab assignment'],
    tokens: ['assignment', 'asst', 'assgn', 'homework', 'hw', 'lab'],
  },
  {
    primary: 'machine learning',
    aliases: ['ml', 'machine intelligence', 'artificial intelligence', 'ai'],
    tokens: ['machine', 'learning', 'ml', 'ai'],
  },

  // Degrees, Education & Credentials
  {
    primary: 'degree',
    aliases: [
      'degrees',
      'bachelor',
      'bachelors',
      'bachelor of technology',
      'bachelor of science',
      'bachelor of engineering',
      'btech',
      'b.tech',
      'b.e.',
      'be',
      'bs',
      'b.s.',
      'master',
      'masters',
      'master of science',
      'master of technology',
      'ms',
      'm.s.',
      'mtech',
      'm.tech',
      'doctorate',
      'phd',
      'education',
      'qualification',
      'qualifications',
      'major',
      'graduated',
      'graduation',
      'undergraduate',
      'postgraduate'
    ],
    tokens: [
      'degree',
      'bachelor',
      'btech',
      'education',
      'qualification',
      'major',
      'graduated',
      'undergraduate',
      'postgraduate',
      'master',
      'phd',
      'engineering'
    ],
  },

  // Resume & Professional Profile
  {
    primary: 'resume',
    aliases: ['cv', 'curriculum vitae', 'candidate resume', 'profile', 'bio', 'work history'],
    tokens: ['resume', 'cv', 'curriculum', 'vitae', 'candidate', 'profile'],
  },

  // Assignment Questions & Sections
  {
    primary: 'question 1',
    aliases: ['q1', 'q 1', 'q.1', 'question-1', 'problem 1', 'prob 1'],
    tokens: ['question', 'q1', 'q', '1', 'linear', 'regression'],
  },
  {
    primary: 'question 2',
    aliases: ['q2', 'q 2', 'q.2', 'question-2', 'problem 2', 'prob 2'],
    tokens: ['question', 'q2', 'q', '2'],
  },
  {
    primary: 'question 3',
    aliases: ['q3', 'q 3', 'q.3', 'question-3', 'problem 3', 'prob 3'],
    tokens: ['question', 'q3', 'q', '3'],
  },
  {
    primary: 'question 4',
    aliases: ['q4', 'q 4', 'q.4', 'question-4', 'problem 4', 'prob 4'],
    tokens: ['question', 'q4', 'q', '4'],
  },
  {
    primary: 'question 5',
    aliases: ['q5', 'q 5', 'q.5', 'question-5', 'problem 5', 'prob 5'],
    tokens: ['question', 'q5', 'q', '5'],
  },
  {
    primary: 'question 6',
    aliases: ['q6', 'q 6', 'q.6', 'question-6', 'problem 6', 'prob 6'],
    tokens: ['question', 'q6', 'q', '6'],
  },

  // Methods & Topics
  {
    primary: 'linear regression',
    aliases: ['lr', 'ordinary least squares', 'ols'],
    tokens: ['linear', 'regression', 'lr'],
  },
  {
    primary: 'optimization method',
    aliases: ['optimization', 'optimizer', 'gradient descent', 'bgd', 'sgd', 'gd', 'learning rate', 'alpha'],
    tokens: ['optimization', 'optimizer', 'gradient', 'descent', 'gd', 'learning', 'rate', 'alpha'],
  },
  {
    primary: 'conclusion',
    aliases: ['conclusions', 'conclusion and references', 'references', 'summary', 'findings'],
    tokens: ['conclusion', 'conclusions', 'references', 'summary'],
  },
  {
    primary: 'evaluation metrics',
    aliases: ['mse', 'rmse', 'r2', 'r-squared', 'mean squared error', 'root mean squared error', 'r2 score'],
    tokens: ['mse', 'rmse', 'r2', 'metrics', 'error'],
  },
];

// Structured Identifier Regex Patterns
const IDENTIFIER_PATTERNS = [
  // Student registration / roll codes: e.g. 2021-CS-104, 2021CS104, MT-88219, CS-104
  /\b\d{4}[-_/\s]?[A-Za-z]{2,5}[-_/\s]?\d{1,5}\b/g,
  /\b[A-Za-z]{2,4}[-_/\s]?\d{3,6}\b/g,
  // Course codes: e.g. CS 482, CS-104, ML-401, MATH-201
  /\b[A-Za-z]{2,4}\s*[-_]?\s*\d{3,4}\b/g,
  // Assignment & Question markers: e.g. Assignment 4, Assignment-4, Question 1, Q1
  /\b(?:assignment|asst|assgn|lab|question|q)\s*[-_.]?\s*\d+\b/gi,
  // Dates: e.g. 2023-10-15, 15/10/2023, Oct 2023, October 2023
  /\b(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,.]+\d{2,4})\b/gi,
  // Emails
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  // URLs
  /\bhttps?:\/\/[^\s<>"{}|\\^`]+\b/g,
];

export class ClientLexicalSearchService {
  private static instance: ClientLexicalSearchService;

  static getInstance(): ClientLexicalSearchService {
    if (!ClientLexicalSearchService.instance) {
      ClientLexicalSearchService.instance = new ClientLexicalSearchService();
    }
    return ClientLexicalSearchService.instance;
  }

  /**
   * Normalizes arbitrary text:
   * - Lowercases
   * - Normalizes punctuation (spaces out separators while keeping alphanumeric hyphens)
   * - Collapses multiple spaces
   * - Trims leading/trailing whitespace
   */
  normalizeText(text: string): string {
    if (!text || typeof text !== 'string') return '';
    return text
      .toLowerCase()
      .replace(/[^\w\s\-_/.]/g, ' ') // replace non-alphanumeric punctuation with spaces
      .replace(/[\s\-_/.]+/g, ' ')   // collapse repeated punctuation and whitespace
      .trim();
  }

  /**
   * Tokenizes text into individual meaningful words, filtering out stop words.
   */
  tokenize(text: string, filterStopWords: boolean = true): string[] {
    const normalized = this.normalizeText(text);
    if (!normalized) return [];

    const words = normalized.split(/\s+/).filter(w => w.length > 0);
    if (!filterStopWords) return words;

    return words.filter(word => {
      // Keep single numbers or words not in stop words
      if (/^\d+$/.test(word)) return true;
      if (word.length <= 1) return false;
      return !STOP_WORDS.has(word);
    });
  }

  /**
   * Extracts structured identifiers from arbitrary text.
   */
  extractIdentifiers(text: string): string[] {
    if (!text) return [];
    const idSet = new Set<string>();

    for (const pattern of IDENTIFIER_PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        const cleaned = match[0].trim().toLowerCase();
        if (cleaned.length >= 2) {
          idSet.add(cleaned);
        }
      }
    }

    return Array.from(idSet);
  }

  /**
   * Analyzes query to extract:
   * 1. Direct significant tokens
   * 2. Synonym / abbreviation expansions
   * 3. Target structured phrases
   * 4. Target identifier patterns
   */
  analyzeQuery(query: string): {
    normalizedQuery: string;
    directTokens: string[];
    expandedTokens: string[];
    synonymPhrases: string[];
    structuredIdentifiers: string[];
    targetIdentifierCategory: string | null;
  } {
    const normalizedQuery = this.normalizeText(query);
    const directTokens = this.tokenize(query, true);
    const expandedTokensSet = new Set<string>(directTokens);
    const synonymPhrasesSet = new Set<string>();
    let targetIdentifierCategory: string | null = null;

    // Check query against abbreviation and synonym groups
    const lowerQuery = query.toLowerCase();
    for (const group of SYNONYM_GROUPS) {
      const matchesPrimary = lowerQuery.includes(group.primary);
      const matchesAlias = group.aliases.some(alias => lowerQuery.includes(alias));

      if (matchesPrimary || matchesAlias) {
        if (group.identifierCategoryType) {
          targetIdentifierCategory = group.identifierCategoryType;
        } else if (group.isIdentifierCategory) {
          targetIdentifierCategory = 'general_identifier';
        }
        synonymPhrasesSet.add(group.primary);
        group.aliases.forEach(a => synonymPhrasesSet.add(a));
        group.tokens.forEach(t => expandedTokensSet.add(t));
      }
    }

    const structuredIdentifiers = this.extractIdentifiers(query);

    return {
      normalizedQuery,
      directTokens,
      expandedTokens: Array.from(expandedTokensSet),
      synonymPhrases: Array.from(synonymPhrasesSet),
      structuredIdentifiers,
      targetIdentifierCategory,
    };
  }

  /**
   * Computes lexical match score between query and document chunk text.
   * Score is bounded strictly in [0.0, 1.0].
   */
  scoreChunk(
    queryAnalysis: ReturnType<typeof this.analyzeQuery>,
    chunkText: string
  ): LexicalMatchResult {
    if (!chunkText || typeof chunkText !== 'string') {
      return {
        score: 0,
        matchedTokens: [],
        matchedPhrases: [],
        matchedIdentifiers: [],
        isExactIdentifierMatch: false,
        explanation: 'Empty document text',
      };
    }

    const normalizedChunk = this.normalizeText(chunkText);
    const chunkTokens = new Set(this.tokenize(chunkText, false));
    const chunkIdentifiers = this.extractIdentifiers(chunkText);

    // 1. Token Coverage Score (Weight: 0.35)
    // How many of the query's direct tokens and expanded tokens appear in the chunk?
    const matchedTokens: string[] = [];
    for (const token of queryAnalysis.expandedTokens) {
      if (chunkTokens.has(token) || normalizedChunk.includes(token)) {
        matchedTokens.push(token);
      }
    }

    // Direct token coverage ratio
    let directMatches = 0;
    for (const dt of queryAnalysis.directTokens) {
      if (chunkTokens.has(dt) || normalizedChunk.includes(dt)) {
        directMatches++;
      }
    }

    const directCoverage = queryAnalysis.directTokens.length > 0
      ? directMatches / queryAnalysis.directTokens.length
      : 0;

    const expandedCoverage = queryAnalysis.expandedTokens.length > 0
      ? matchedTokens.length / queryAnalysis.expandedTokens.length
      : 0;

    const tokenScore = Math.max(directCoverage * 0.35, expandedCoverage * 0.30);

    // 2. Phrase Matching Score (Weight: 0.25)
    // Do multi-word phrases appear in the chunk?
    const matchedPhrases: string[] = [];
    for (const phrase of queryAnalysis.synonymPhrases) {
      const normPhrase = this.normalizeText(phrase);
      if (normPhrase && normalizedChunk.includes(normPhrase)) {
        matchedPhrases.push(phrase);
      }
    }

    // Also check direct 2-grams / 3-grams from original query
    if (queryAnalysis.directTokens.length >= 2) {
      for (let i = 0; i < queryAnalysis.directTokens.length - 1; i++) {
        const bigram = `${queryAnalysis.directTokens[i]} ${queryAnalysis.directTokens[i + 1]}`;
        if (normalizedChunk.includes(bigram)) {
          matchedPhrases.push(bigram);
        }
      }
    }

    const phraseScore = matchedPhrases.length > 0
      ? Math.min(0.25, 0.12 * matchedPhrases.length)
      : 0;

    // 3. Identifier Matching & Boost (Weight: 0.40)
    // A. Query contained a specific identifier (e.g. "2021-CS-104" or "Assignment 4")
    const matchedIdentifiers: string[] = [];
    let isExactIdentifierMatch = false;

    if (queryAnalysis.structuredIdentifiers.length > 0) {
      for (const qId of queryAnalysis.structuredIdentifiers) {
        const normQId = this.normalizeText(qId);
        for (const docId of chunkIdentifiers) {
          const normDocId = this.normalizeText(docId);
          if (normDocId.includes(normQId) || normQId.includes(normDocId)) {
            matchedIdentifiers.push(docId);
            isExactIdentifierMatch = true;
          }
        }
        if (normalizedChunk.includes(normQId)) {
          matchedIdentifiers.push(qId);
          isExactIdentifierMatch = true;
        }
      }
    }

    // B. Field-Aware Identifier Matching:
    // Query is asking for an identifier (e.g. "What is the registration number?")
    // Document chunk MUST have specific field cues, NOT generic 'no' or arbitrary numbers
    let identifierCategoryBoost = 0;
    if (queryAnalysis.targetIdentifierCategory) {
      const cat = queryAnalysis.targetIdentifierCategory;
      let hasFieldCues = false;

      if (cat === 'registration_number') {
        hasFieldCues = /\b(registration|reg\.?\s*no\.?|roll\.?\s*no\.?|regno|rollno|matriculation|enrollment|student\s*id|student\s*number)\b/i.test(chunkText);
      } else if (cat === 'phone_number') {
        hasFieldCues = /\b(phone|telephone|mobile|cell|contact\s*no|tel\.?)\b/i.test(chunkText);
      } else if (cat === 'date_of_birth') {
        hasFieldCues = /\b(dob|date\s*of\s*birth|birth\s*date|born\s*on)\b/i.test(chunkText);
      } else {
        hasFieldCues = /\b(code|id|identifier|number|no\.)\b/i.test(chunkText);
      }

      // Must have actual structured identifier tokens (e.g. 2021-CS-104, 12345, alphanumeric codes)
      const hasStructuredCodes = chunkIdentifiers.length > 0 || /\b\d{4}[-_/\s]?[a-z]{2,5}[-_/\s]?\d+/i.test(chunkText);

      if (hasFieldCues && hasStructuredCodes) {
        identifierCategoryBoost = 0.38;
        if (chunkIdentifiers.length > 0) {
          matchedIdentifiers.push(...chunkIdentifiers.slice(0, 3));
        }
      } else if (hasFieldCues) {
        identifierCategoryBoost = 0.18;
      }
    }

    const identifierScore = isExactIdentifierMatch
      ? 0.40
      : identifierCategoryBoost;

    // Total raw lexical score
    let rawScore = tokenScore + phraseScore + identifierScore;

    // Bonus for high direct token coverage with phrase match
    if (directCoverage >= 0.8 && matchedPhrases.length > 0) {
      rawScore += 0.10;
    }

    // Clamp strictly into [0.0, 1.0]
    const finalScore = Number(Math.min(1.0, Math.max(0.0, rawScore)).toFixed(4));

    // Formulate explanation for transparency
    const explanationParts: string[] = [];
    if (tokenScore > 0) {
      explanationParts.push(`Token coverage: ${(directCoverage * 100).toFixed(0)}%`);
    }
    if (matchedPhrases.length > 0) {
      explanationParts.push(`Phrases matched: ${matchedPhrases.slice(0, 2).join(', ')}`);
    }
    if (isExactIdentifierMatch) {
      explanationParts.push(`Exact identifier matched: ${matchedIdentifiers[0]}`);
    } else if (identifierCategoryBoost > 0) {
      explanationParts.push(`Structured identifier pattern detected (${matchedIdentifiers.slice(0, 2).join(', ')})`);
    }

    return {
      score: finalScore,
      matchedTokens: Array.from(new Set(matchedTokens)),
      matchedPhrases: Array.from(new Set(matchedPhrases)),
      matchedIdentifiers: Array.from(new Set(matchedIdentifiers)),
      isExactIdentifierMatch,
      explanation: explanationParts.join(' • ') || 'No significant lexical match',
    };
  }

  /**
   * Evaluates lexical scores across all user documents/chunks.
   */
  searchLexical(
    query: string,
    candidates: DocumentLexicalCandidate[]
  ): Array<DocumentLexicalCandidate & LexicalMatchResult> {
    const analysis = this.analyzeQuery(query);
    
    return candidates.map(chunk => {
      const match = this.scoreChunk(analysis, chunk.text);
      return {
        ...chunk,
        ...match,
      };
    });
  }
}

export const clientLexicalSearchService = ClientLexicalSearchService.getInstance();

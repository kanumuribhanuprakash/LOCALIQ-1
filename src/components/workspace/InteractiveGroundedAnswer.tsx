import React from 'react';
import { SemanticEvidenceChunk, KnowledgeFile } from '../../types';
import { InlineCitationPopover } from './InlineCitationPopover';

interface InteractiveGroundedAnswerProps {
  answerText: string;
  evidenceChunks: SemanticEvidenceChunk[];
  allFiles: KnowledgeFile[];
  onOpenSource?: (fileId: string) => void;
  onHighlightSource?: (chunkId: string) => void;
}

export const InteractiveGroundedAnswer: React.FC<InteractiveGroundedAnswerProps> = ({
  answerText,
  evidenceChunks,
  allFiles,
  onOpenSource,
  onHighlightSource,
}) => {
  if (!answerText) return null;

  // Find evidence chunk for citation index (1-based)
  const getEvidenceForCitation = (num: number): SemanticEvidenceChunk | null => {
    // 1. Check rank matching
    const byRank = evidenceChunks.find((c) => c.rank === num);
    if (byRank) return byRank;

    // 2. Check 0-based array index
    if (num >= 1 && num <= evidenceChunks.length) {
      return evidenceChunks[num - 1];
    }

    return null;
  };

  // Parse text and split by [1], [2], etc.
  const renderFormattedContent = () => {
    // Regex matches [1], [2], [12], etc.
    const citationRegex = /\[(\d+)\]/g;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = citationRegex.exec(answerText)) !== null) {
      // Text before the citation
      if (match.index > lastIndex) {
        elements.push(
          <span key={`text-${lastIndex}`}>
            {answerText.substring(lastIndex, match.index)}
          </span>
        );
      }

      const citationNum = parseInt(match[1], 10);
      const evidence = getEvidenceForCitation(citationNum);

      // PART C: Only document_content may appear as evidence. Never metadata.
      const isValidDocumentEvidence =
        evidence &&
        evidence.sourceType !== 'application_metadata' &&
        evidence.text &&
        evidence.text.trim().length > 0;

      if (isValidDocumentEvidence) {
        elements.push(
          <InlineCitationPopover
            key={`citation-${citationNum}-${match.index}`}
            citationNumber={citationNum}
            evidence={evidence}
            allFiles={allFiles}
            onOpenSource={onOpenSource}
            onHighlightSource={onHighlightSource}
          />
        );
      } else {
        // Fallback to plain text if not a valid document evidence chunk
        elements.push(<span key={`plain-${match.index}`}>[{citationNum}]</span>);
      }

      lastIndex = match.index + match[0].length;
    }

    // Remaining text after last citation
    if (lastIndex < answerText.length) {
      elements.push(
        <span key={`text-end-${lastIndex}`}>
          {answerText.substring(lastIndex)}
        </span>
      );
    }

    return elements;
  };

  return (
    <div className="text-slate-100 text-sm sm:text-[15px] leading-relaxed font-sans font-normal whitespace-pre-wrap">
      {renderFormattedContent()}
    </div>
  );
};

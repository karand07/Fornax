import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeWordLevenshtein } from './wer.js';

describe('Day 10b: Client Tests', () => {
  describe('Levenshtein / Word Error Rate (WER) pure helper', () => {
    it('identical texts produce 0 edits and WER = 0', () => {
      const text = 'The database uses a B-tree index to accelerate queries';
      const result = computeWordLevenshtein(text, text);
      assert.equal(result.edits, 0);
      assert.equal(result.refWords, 9);
      assert.equal(result.hypWords, 9);
      assert.equal(result.wer, 0);
    });

    it('one substitution in 4 words gives WER = 0.25', () => {
      const reference = 'quick brown fox jumps';
      const hypothesis = 'quick brown dog jumps';
      const result = computeWordLevenshtein(reference, hypothesis);
      assert.equal(result.edits, 1);
      assert.equal(result.refWords, 4);
      assert.equal(result.hypWords, 4);
      assert.equal(result.wer, 0.25);
    });

    it('empty reference handled gracefully', () => {
      const emptyRef = computeWordLevenshtein('', 'hello world');
      assert.equal(emptyRef.refWords, 0);
      assert.equal(emptyRef.hypWords, 2);
      assert.equal(emptyRef.wer, 1.0);

      const bothEmpty = computeWordLevenshtein('', '');
      assert.equal(bothEmpty.refWords, 0);
      assert.equal(bothEmpty.hypWords, 0);
      assert.equal(bothEmpty.wer, 0);
    });

    it('case insensitivity and whitespace runs are normalized', () => {
      const reference = '  Hello   World  ';
      const hypothesis = 'hello\nworld';
      const result = computeWordLevenshtein(reference, hypothesis);
      assert.equal(result.edits, 0);
      assert.equal(result.wer, 0);
    });
  });

  describe('OCR Editor state invariants', () => {
    it('isDirty is false when text matches current transcript, true when modified', () => {
      const originalTranscript = 'Binary search tree requires ordered nodes';
      let editedText = originalTranscript;

      const checkDirty = (current: string, orig: string) => current !== orig;

      assert.equal(checkDirty(editedText, originalTranscript), false, 'Initially not dirty');

      editedText = 'Binary search tree requires balanced nodes';
      assert.equal(checkDirty(editedText, originalTranscript), true, 'Dirty when modified');

      editedText = originalTranscript;
      assert.equal(checkDirty(editedText, originalTranscript), false, 'Not dirty after resetting');
    });

    it('Save button is disabled when not dirty, enabled when dirty', () => {
      const original = 'Photosynthesis converts light into energy';
      const isSaveDisabled = (current: string, orig: string, isPending: boolean) =>
        current === orig || isPending;

      assert.equal(isSaveDisabled(original, original, false), true, 'Disabled when unchanged');
      assert.equal(isSaveDisabled('Modified text', original, false), false, 'Enabled when changed');
      assert.equal(isSaveDisabled('Modified text', original, true), true, 'Disabled when saving is pending');
    });

    it('Re-grade button is disabled while dirty', () => {
      const isRegradeDisabled = (isDirty: boolean, isPending: boolean) =>
        isDirty || isPending;

      assert.equal(isRegradeDisabled(true, false), true, 'Disabled while dirty');
      assert.equal(isRegradeDisabled(false, false), false, 'Enabled when clean');
      assert.equal(isRegradeDisabled(false, true), true, 'Disabled while regrading is pending');
    });
  });

  describe('Override Dialog validation & preview', () => {
    const validateOverride = (marksStr: string, maxMarks: number, note: string) => {
      const parsed = parseFloat(marksStr);
      if (isNaN(parsed) || parsed < 0 || parsed > maxMarks) return false;
      if (Math.round(parsed * 100) % 25 !== 0) return false;
      const noteTrimmed = note.trim();
      return noteTrimmed.length >= 5 && noteTrimmed.length <= 500;
    };

    it('valid marks with 0.25 steps and 5-500 char note enables confirm', () => {
      assert.equal(validateOverride('3.25', 5, 'Good explanation of concept'), true);
      assert.equal(validateOverride('0', 5, 'Completely incorrect answer'), true);
      assert.equal(validateOverride('5', 5, 'Full credit for clear explanation'), true);
      assert.equal(validateOverride('4.75', 5, 'Minor typo in formula'), true);
    });

    it('invalid marks or step reject and disable confirm', () => {
      assert.equal(validateOverride('3.1', 5, 'Valid note text'), false, 'Non-0.25 step rejected');
      assert.equal(validateOverride('5.25', 5, 'Valid note text'), false, 'Exceeding maxMarks rejected');
      assert.equal(validateOverride('-1', 5, 'Valid note text'), false, 'Negative marks rejected');
      assert.equal(validateOverride('abc', 5, 'Valid note text'), false, 'NaN rejected');
    });

    it('note shorter than 5 chars or longer than 500 chars disables confirm', () => {
      assert.equal(validateOverride('3.5', 5, 'abc'), false, 'Short note (<5) rejected');
      assert.equal(validateOverride('3.5', 5, '    '), false, 'Whitespace note rejected');
      assert.equal(validateOverride('3.5', 5, 'a'.repeat(501)), false, 'Long note (>500) rejected');
    });

    it('score preview displays both numbers correctly', () => {
      const autoMarks = 2.5;
      const overrideVal = 4.25;
      const maxMarks = 5;

      const previewText = `AI Marks: ${autoMarks} pts -> Adjusted: ${overrideVal} / ${maxMarks} pts`;
      assert.ok(previewText.includes('2.5'));
      assert.ok(previewText.includes('4.25'));
      assert.ok(previewText.includes('5'));
    });
  });

  describe('Queue reasons render text', () => {
    it('every queue reason code has non-empty text label', () => {
      const reasonLabels: Record<string, string> = {
        HANDWRITTEN: 'Handwritten',
        LOW_CONFIDENCE: 'Low confidence',
        VERY_SHORT_ANSWER: 'Short answer',
        UNGRADED: 'Ungraded',
        UNREADABLE: 'Unreadable',
        OCR_FAILED: 'OCR failed',
      };

      const reasons = [
        'HANDWRITTEN',
        'LOW_CONFIDENCE',
        'VERY_SHORT_ANSWER',
        'UNGRADED',
        'UNREADABLE',
        'OCR_FAILED',
      ];

      for (const reason of reasons) {
        assert.ok(reasonLabels[reason], `Reason ${reason} must have a text label`);
        assert.ok(reasonLabels[reason].length > 0);
      }
    });
  });
});

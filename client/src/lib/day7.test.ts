import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { masteryBand, formatPercent } from './mastery-ui.js';
import { QuestionResultCard } from '../components/QuestionResultCard.js';
import { AssessmentQuestionResultItem } from '../api/hooks.js';

describe('Day 7: Client Tests', () => {
  describe('masteryBand boundary tests (§3.1)', () => {
    it('boundary at 0.39 is weak', () => {
      const res = masteryBand(0.39);
      assert.equal(res.band, 'weak');
      assert.equal(res.label, 'Weak');
    });

    it('boundary at 0.40 is developing', () => {
      const res = masteryBand(0.40);
      assert.equal(res.band, 'developing');
      assert.equal(res.label, 'Developing');
    });

    it('boundary at 0.69 is developing', () => {
      const res = masteryBand(0.69);
      assert.equal(res.band, 'developing');
      assert.equal(res.label, 'Developing');
    });

    it('boundary at 0.70 is strong', () => {
      const res = masteryBand(0.70);
      assert.equal(res.band, 'strong');
      assert.equal(res.label, 'Strong');
    });

    it('formatPercent rounds to whole percent and handles edge cases', () => {
      assert.equal(formatPercent(0.39), '39%');
      assert.equal(formatPercent(0.40), '40%');
      assert.equal(formatPercent(0.69), '69%');
      assert.equal(formatPercent(0.70), '70%');
      assert.equal(formatPercent(1.0), '100%');
      assert.equal(formatPercent(0), '0%');
      assert.equal(formatPercent(75), '75%');
      assert.equal(formatPercent(null), 'N/A');
    });
  });

  describe('QuestionResultCard indicator tests (§3.2)', () => {
    it('renders correct/incorrect indicators with text, not color only', () => {
      // 1. Student answered wrong: studentAnswer is 0, correctIndex is 1
      const mcqWrongQuestion: AssessmentQuestionResultItem = {
        questionId: 'q-mcq-1',
        conceptId: 'c1',
        conceptName: 'Relational Algebra',
        prompt: 'Which operator performs selection?',
        type: 'MCQ',
        maxMarks: 5,
        options: ['Projection (π)', 'Selection (σ)', 'Join (⋈)'],
        studentAnswer: 0, // Wrong!
        correctIndex: 1, // Correct option
        marksObtained: 0,
        status: 'GRADED',
        explanation: 'Selection filters tuples by predicate.',
      };

      const htmlWrong = renderToStaticMarkup(
        React.createElement(QuestionResultCard, {
          index: 0,
          question: mcqWrongQuestion,
        })
      );

      // Verify text indicators (not color only)
      assert.match(htmlWrong, /Incorrect/);
      assert.match(htmlWrong, /\(Your answer, incorrect\)/);
      assert.match(htmlWrong, /Correct answer/);
      assert.match(htmlWrong, /\(Correct option\)/);
      assert.match(htmlWrong, /Why/);
      assert.match(htmlWrong, /Selection filters tuples by predicate/);

      // 2. Student answered correct: studentAnswer is 1, correctIndex is 1
      const mcqCorrectQuestion: AssessmentQuestionResultItem = {
        questionId: 'q-mcq-2',
        conceptId: 'c1',
        conceptName: 'Relational Algebra',
        prompt: 'Which operator performs selection?',
        type: 'MCQ',
        maxMarks: 5,
        options: ['Projection (π)', 'Selection (σ)', 'Join (⋈)'],
        studentAnswer: 1, // Correct!
        correctIndex: 1,
        marksObtained: 5,
        status: 'GRADED',
        explanation: 'Selection filters tuples by predicate.',
      };

      const htmlCorrect = renderToStaticMarkup(
        React.createElement(QuestionResultCard, {
          index: 1,
          question: mcqCorrectQuestion,
        })
      );

      assert.match(htmlCorrect, /Correct/);
      assert.match(htmlCorrect, /\(Your answer, correct\)/);

      // 3. Unanswered question shows "Not answered" text
      const mcqUnansweredQuestion: AssessmentQuestionResultItem = {
        questionId: 'q-mcq-3',
        conceptId: 'c1',
        conceptName: 'Relational Algebra',
        prompt: 'Which operator performs selection?',
        type: 'MCQ',
        maxMarks: 5,
        options: ['Projection (π)', 'Selection (σ)', 'Join (⋈)'],
        studentAnswer: null, // Not answered!
        correctIndex: 1,
        marksObtained: 0,
        status: 'GRADED',
      };

      const htmlUnanswered = renderToStaticMarkup(
        React.createElement(QuestionResultCard, {
          index: 2,
          question: mcqUnansweredQuestion,
        })
      );

      assert.match(htmlUnanswered, /Not answered/);

      // 4. SHORT question pending grading
      const shortQuestion: AssessmentQuestionResultItem = {
        questionId: 'q-short-1',
        conceptId: 'c2',
        conceptName: 'Normalization',
        prompt: 'Explain 2NF decomposition.',
        type: 'SHORT',
        maxMarks: 10,
        studentAnswer: 'Separate partial dependencies into new tables.',
        marksObtained: null,
        status: 'PENDING',
      };

      const htmlShort = renderToStaticMarkup(
        React.createElement(QuestionResultCard, {
          index: 3,
          question: shortQuestion,
          renderGrade: (q) =>
            React.createElement('div', { id: 'slot-grade' }, `Slot for ${q.questionId}`),
        })
      );

      assert.match(htmlShort, /Pending grading/);
      assert.match(htmlShort, /Separate partial dependencies into new tables/);
      assert.match(htmlShort, /Slot for q-short-1/);
    });
  });
});

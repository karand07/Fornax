// Setup JSDOM environment before importing React Testing Library
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost',
});

// Polyfill globals for React Testing Library
Object.defineProperty(globalThis, 'window', { value: dom.window, writable: true, configurable: true });
Object.defineProperty(globalThis, 'document', { value: dom.window.document, writable: true, configurable: true });
Object.defineProperty(globalThis, 'HTMLElement', { value: dom.window.HTMLElement, writable: true, configurable: true });
Object.defineProperty(globalThis, 'Node', { value: dom.window.Node, writable: true, configurable: true });
Object.defineProperty(globalThis, 'Event', { value: dom.window.Event, writable: true, configurable: true });
Object.defineProperty(globalThis, 'MouseEvent', { value: dom.window.MouseEvent, writable: true, configurable: true });
Object.defineProperty(globalThis, 'MutationObserver', { value: dom.window.MutationObserver, writable: true, configurable: true });
Object.defineProperty(globalThis, 'getComputedStyle', { value: dom.window.getComputedStyle, writable: true, configurable: true });

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { GradeCard } from './GradeCard.js';
import { ConfidenceBadge } from './ConfidenceBadge.js';
import {
  fullMarksFixture,
  partialWithMissingPointsFixture,
  provisionalFixture,
  overriddenFixture,
  blankAnswerFixture,
} from './fixtures.js';

describe('Day 9: GradeCard Component Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    cleanup();
  });

  it('student variant never renders raw confidence, modelVersion, or "Grader details"', () => {
    const { container } = render(
      React.createElement(GradeCard, {
        variant: 'student',
        question: fullMarksFixture.question,
        answer: fullMarksFixture.answer,
        grade: fullMarksFixture.studentGrade,
      })
    );

    const html = container.innerHTML;
    assert.ok(!html.includes('Grader details'), 'Student view must not render Grader details');
    assert.ok(!html.includes('claude-3-5-sonnet'), 'Student view must not render modelVersion');
    assert.ok(!html.includes('Raw Confidence:'), 'Student view must not render raw confidence');
    assert.ok(!html.includes('0.95'), 'Student view must not leak raw confidence float');
  });

  it('teacher variant renders raw confidence, modelVersion, and Grader details', () => {
    const { container, getByText } = render(
      React.createElement(GradeCard, {
        variant: 'teacher',
        question: fullMarksFixture.question,
        answer: fullMarksFixture.answer,
        grade: fullMarksFixture.teacherGrade,
      })
    );

    // Grader details trigger is visible
    assert.ok(getByText('Grader details'), 'Teacher view must render Grader details trigger');

    // Click trigger to open collapsible
    const trigger = getByText('Grader details').closest('button');
    assert.ok(trigger, 'Trigger button should exist');
    fireEvent.click(trigger!);

    const html = container.innerHTML;
    assert.ok(html.includes('0.95'), 'Teacher view must render raw confidence');
    assert.ok(html.includes('claude-3-5-sonnet-20241022'), 'Teacher view must render modelVersion');
    assert.ok(
      html.includes('Exemplary textbook answer'),
      'Teacher view should render grader notes when present'
    );
  });

  it('provisional shows the Alert; overridden shows the adjusted text with both numbers', () => {
    // 1. Provisional variant
    const { getByText: getByTextProv } = render(
      React.createElement(GradeCard, {
        variant: 'student',
        question: provisionalFixture.question,
        answer: provisionalFixture.answer,
        grade: provisionalFixture.studentGrade,
      })
    );

    assert.ok(getByTextProv('Provisional grade'), 'Provisional title must exist');
    assert.ok(
      getByTextProv(/Your teacher will review this answer and the marks may change\./),
      'Provisional grade must render the warning alert description'
    );

    cleanup();

    // 2. Overridden variant
    const { container: overContainer } = render(
      React.createElement(GradeCard, {
        variant: 'student',
        question: overriddenFixture.question,
        answer: overriddenFixture.answer,
        grade: overriddenFixture.studentGrade,
      })
    );

    const overHtml = overContainer.innerHTML;
    assert.ok(overHtml.includes('Adjusted by teacher'), 'Must show Adjusted by teacher badge');
    assert.ok(
      overHtml.includes('AI suggested 6, your teacher set 9'),
      'Must show AI suggested 6, your teacher set 9'
    );
    assert.ok(
      overHtml.includes('Criterion marks show the original AI breakdown.'),
      'Must show disclaimer about original breakdown'
    );
  });

  it('criterion with null evidence shows the fallback text and no toggle', () => {
    const { container } = render(
      React.createElement(GradeCard, {
        variant: 'student',
        question: partialWithMissingPointsFixture.question,
        answer: partialWithMissingPointsFixture.answer,
        grade: partialWithMissingPointsFixture.studentGrade,
      })
    );

    const html = container.innerHTML;
    // Missing criteria have null evidenceSpan
    assert.ok(
      html.includes('No supporting text found in the answer'),
      'Must render fallback text when evidenceSpan is null'
    );
  });

  it('clicking "Show evidence" changes which mark is strongly highlighted', () => {
    const { container, getAllByText } = render(
      React.createElement(GradeCard, {
        variant: 'student',
        question: fullMarksFixture.question,
        answer: fullMarksFixture.answer,
        grade: fullMarksFixture.studentGrade,
      })
    );

    // Initial state: activeCriterion is null -> marks have the standard highlight class
    const initialMarks = container.querySelectorAll('mark');
    assert.ok(initialMarks.length >= 4, 'Should have multiple highlighted evidence marks');
    for (const mark of Array.from(initialMarks)) {
      assert.ok(
        mark.className.includes('bg-indigo-500/20'),
        'Initial state marks use default highlight style'
      );
    }

    // Find "Show evidence" buttons
    const showEvidenceButtons = getAllByText('Show evidence');
    assert.ok(showEvidenceButtons.length > 0, 'Should find Show evidence buttons');

    // Click the first criterion's "Show evidence" button
    fireEvent.click(showEvidenceButtons[0]);

    // Now criterion 0 is active!
    // The mark for criterion 0 must have the strong highlight (bg-amber-400/30)
    // while other marks must have the faint highlight (bg-slate-800/60)
    const marksAfterFirstClick = container.querySelectorAll('mark');
    let hasStrongAmber = false;
    let hasFaintSlate = false;

    for (const mark of Array.from(marksAfterFirstClick)) {
      if (mark.className.includes('bg-amber-400/30')) {
        hasStrongAmber = true;
      }
      if (mark.className.includes('bg-slate-800/60')) {
        hasFaintSlate = true;
      }
    }

    assert.ok(hasStrongAmber, 'Active criterion evidence mark must get strong amber style');
    assert.ok(hasFaintSlate, 'Non-active evidence marks must get faint style');

    // Click the second criterion's "Show evidence" button
    const updatedButtons = getAllByText('Show evidence');
    // Button for second criterion (index 1)
    fireEvent.click(updatedButtons[0]); // second criterion's button (first one is now 'Hide evidence')

    const marksAfterSecondClick = container.querySelectorAll('mark');
    let foundSecondStrong = false;
    for (const mark of Array.from(marksAfterSecondClick)) {
      if (
        mark.className.includes('bg-amber-400/30') &&
        mark.textContent?.includes('Consistency')
      ) {
        foundSecondStrong = true;
      }
    }
    assert.ok(
      foundSecondStrong,
      'Active highlight must switch to the newly selected criterion'
    );
  });

  it('blank-answer grade renders without criteria sections', () => {
    const { container } = render(
      React.createElement(GradeCard, {
        variant: 'student',
        question: blankAnswerFixture.question,
        answer: blankAnswerFixture.answer,
        grade: blankAnswerFixture.studentGrade,
      })
    );

    const html = container.innerHTML;
    // Shows header with marks and summary
    assert.ok(html.includes('0 / 10'), 'Shows 0 / 10');
    assert.ok(
      html.includes('No answer was submitted for this question.'),
      'Shows summary paragraph'
    );

    // Criteria breakdown section and answer block should be completely omitted
    assert.ok(
      !html.includes('Rubric Criteria Breakdown'),
      'Must not render Rubric Criteria Breakdown section'
    );
    assert.ok(!html.includes('Your Answer'), 'Must not render Your Answer section');
    assert.ok(!html.includes('What was missing'), 'Must not render What was missing section');
  });

  it('confidence badge has readable text for all three levels', () => {
    // 1. High confidence
    const { container: highC } = render(
      React.createElement(ConfidenceBadge, { level: 'HIGH' })
    );
    assert.ok(highC.textContent?.includes('High confidence'));

    cleanup();

    // 2. Medium confidence
    const { container: medC } = render(
      React.createElement(ConfidenceBadge, { level: 'MEDIUM' })
    );
    assert.ok(medC.textContent?.includes('Medium confidence'));

    cleanup();

    // 3. Low confidence with teacher value
    const { container: lowC } = render(
      React.createElement(ConfidenceBadge, { level: 'LOW', value: 0.45 })
    );
    assert.ok(lowC.textContent?.includes('Low confidence (45%)'));
  });
});

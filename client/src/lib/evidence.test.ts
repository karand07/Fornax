import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  findSpan,
  buildSegments,
  confidenceLevel,
} from './evidence.js';
import { EvidenceText } from '../components/grading/EvidenceText.js';

describe('Day 9: evidence.ts pure helpers', () => {
  describe('findSpan', () => {
    it('exact match returns correct offsets', () => {
      const original = 'Transactions provide ACID guarantees.';
      const span = 'ACID guarantees';
      const result = findSpan(original, span);

      assert.ok(result, 'Span should be found');
      assert.equal(result.start, 21);
      assert.equal(result.end, 36);
      assert.equal(original.slice(result.start, result.end), 'ACID guarantees');
    });

    it('span differing in case and extra spaces/newlines still maps to the correct original range', () => {
      const original = 'Atomicity ensures that all   operations in a transaction\n\ncomplete successfully.';
      // Span has different casing, collapsed spaces, and newline differences
      const span = 'ALL operations   IN A   TRANSACTION complete';
      const result = findSpan(original, span);

      assert.ok(result, 'Tolerant match should be found');
      const extracted = original.slice(result.start, result.end);
      // Verify start and end points in the original text
      assert.equal(result.start, 23);
      assert.equal(result.end, 66);
      assert.equal(extracted, 'all   operations in a transaction\n\ncomplete');
    });

    it('span not present returns null; empty span returns null', () => {
      const original = 'Relational databases use SQL.';

      assert.equal(findSpan(original, 'NoSQL document store'), null);
      assert.equal(findSpan(original, ''), null);
      assert.equal(findSpan(original, '   \n  \t  '), null);
      assert.equal(findSpan('', 'SQL'), null);
    });
  });

  describe('buildSegments', () => {
    it('overlapping spans merge into one highlighted segment with both criterion indexes', () => {
      const original = 'Atomicity guarantees that all operations either succeed or fail together.';
      // Span 0: "all operations either succeed"
      // Span 1: "either succeed or fail together" (overlaps with span 0 at "either succeed")
      const spans = [
        'all operations either succeed',
        'either succeed or fail together',
      ];

      const segments = buildSegments(original, spans);

      // Verify that the overlapping region was merged into a single segment with criterionIndexes: [0, 1]
      const highlightedSegs = segments.filter((s) => s.highlight);
      assert.equal(highlightedSegs.length, 1, 'Overlapping spans should merge into a single segment');

      const merged = highlightedSegs[0];
      assert.deepEqual(merged.criterionIndexes, [0, 1]);
      assert.equal(
        merged.text,
        'all operations either succeed or fail together'
      );
    });

    it('segments joined back together equal the original text exactly (property check on several inputs)', () => {
      const testCases = [
        {
          text: 'Short simple sentence with no highlights.',
          spans: [],
        },
        {
          text: 'First words, middle words here, and final trailing words.',
          spans: ['First words', 'middle words', 'trailing words.'],
        },
        {
          text: '  Leading spaces, \n\nmultiple newlines and tabs\t\tand trailing spaces.   ',
          spans: ['Leading spaces', 'multiple newlines and tabs', 'trailing spaces'],
        },
        {
          text: 'AAA BBB CCC DDD EEE FFF',
          spans: ['BBB CCC', 'CCC DDD', 'FFF'],
        },
      ];

      for (const tc of testCases) {
        const segments = buildSegments(tc.text, tc.spans);
        const reconstructed = segments.map((s) => s.text).join('');
        assert.equal(reconstructed, tc.text, `Failed round-trip property check for: "${tc.text}"`);
      }
    });

    it('answer containing "<script>" or HTML renders as text, never as markup', () => {
      const maliciousAnswer =
        'An injection attempt <script>alert("xss")</script> and <b>bold text</b>.';
      const spans = ['<script>alert("xss")</script>'];

      const html = renderToStaticMarkup(
        React.createElement(EvidenceText, {
          answer: maliciousAnswer,
          spans,
        })
      );

      // Verify the script tag is escaped as text entities, never raw markup
      assert.ok(!html.includes('<script>alert'), 'Must not contain unescaped <script> tag');
      assert.ok(html.includes('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'));
      assert.ok(html.includes('&lt;b&gt;bold text&lt;/b&gt;'));
    });
  });

  describe('confidenceLevel boundaries', () => {
    it('confidenceLevel boundaries at 0.59, 0.6, 0.79, 0.8', () => {
      assert.equal(confidenceLevel(0.59), 'LOW');
      assert.equal(confidenceLevel(0.6), 'MEDIUM');
      assert.equal(confidenceLevel(0.79), 'MEDIUM');
      assert.equal(confidenceLevel(0.8), 'HIGH');

      // Additional sanity points
      assert.equal(confidenceLevel(0.0), 'LOW');
      assert.equal(confidenceLevel(0.7), 'MEDIUM');
      assert.equal(confidenceLevel(1.0), 'HIGH');
    });
  });
});

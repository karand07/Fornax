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
Object.defineProperty(globalThis, 'KeyboardEvent', { value: dom.window.KeyboardEvent, writable: true, configurable: true });
Object.defineProperty(globalThis, 'MutationObserver', { value: dom.window.MutationObserver, writable: true, configurable: true });
Object.defineProperty(globalThis, 'getComputedStyle', { value: dom.window.getComputedStyle, writable: true, configurable: true });

// Polyfill ResizeObserver for Recharts / ResponsiveContainer in JSDOM
if (typeof (globalThis as any).ResizeObserver === 'undefined') {
  (globalThis as any).ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { HeatmapCell } from '../components/analytics/HeatmapCell.js';
import { WeakestConcepts } from '../components/analytics/WeakestConcepts.js';
import { AtRiskList } from '../components/analytics/AtRiskList.js';
import { SessionsChart } from '../components/analytics/SessionsChart.js';
import { filterAndSortRows, RowSortable } from './analytics-sort.js';
import type { AnalyticsCell } from '../api/hooks.js';

describe('Day 12: Client Analytics Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    cleanup();
  });

  describe('1. HeatmapCell Component', () => {
    it('renders assessed cell with percentage text, marker letter (S), and sr-only description for strong band', () => {
      const cell: AnalyticsCell = {
        conceptId: 'c1',
        score: 0.85,
        attempts: 3,
        band: 'strong',
      };

      const { container } = render(
        React.createElement('table', null,
          React.createElement('tbody', null,
            React.createElement('tr', null,
              React.createElement(HeatmapCell, {
                conceptName: 'Normalization',
                cell,
              })
            )
          )
        )
      );

      const html = container.innerHTML;
      assert.ok(html.includes('85%'), 'Must display percentage rounded to whole percent');
      assert.ok(html.includes('(S)'), 'Must display strong marker (S)');
      assert.ok(html.includes('Normalization, 85 percent, strong'), 'Must render accessible sr-only text');
    });

    it('renders developing (D) and weak (W) markers with appropriate sr-only labels', () => {
      const weakCell: AnalyticsCell = {
        conceptId: 'c2',
        score: 0.35,
        attempts: 1,
        band: 'weak',
      };
      const devCell: AnalyticsCell = {
        conceptId: 'c3',
        score: 0.55,
        attempts: 2,
        band: 'developing',
      };

      const { container } = render(
        React.createElement('table', null,
          React.createElement('tbody', null,
            React.createElement('tr', null,
              React.createElement(HeatmapCell, {
                conceptName: 'Indexing',
                cell: weakCell,
              }),
              React.createElement(HeatmapCell, {
                conceptName: 'Transactions',
                cell: devCell,
              })
            )
          )
        )
      );

      const html = container.innerHTML;
      assert.ok(html.includes('35%'), 'Must display 35%');
      assert.ok(html.includes('(W)'), 'Must display weak marker (W)');
      assert.ok(html.includes('Indexing, 35 percent, weak'));

      assert.ok(html.includes('55%'), 'Must display 55%');
      assert.ok(html.includes('(D)'), 'Must display developing marker (D)');
      assert.ok(html.includes('Transactions, 55 percent, developing'));
    });

    it('renders unassessed cell with "–", "(U)", and sr-only description', () => {
      const cell: AnalyticsCell = {
        conceptId: 'c4',
        score: null,
        attempts: 0,
        band: 'unassessed',
      };

      const { container } = render(
        React.createElement('table', null,
          React.createElement('tbody', null,
            React.createElement('tr', null,
              React.createElement(HeatmapCell, {
                conceptName: 'Query Optimization',
                cell,
              })
            )
          )
        )
      );

      const html = container.innerHTML;
      assert.ok(html.includes('–'), 'Must display dash for unassessed cell');
      assert.ok(html.includes('(U)'), 'Must display unassessed marker (U)');
      assert.ok(html.includes('Query Optimization, unassessed'), 'Must include sr-only unassessed text');
    });

    it('triggers onClick on click and on Enter/Space keyboard interactions', () => {
      let clicks = 0;
      const cell: AnalyticsCell = {
        conceptId: 'c1',
        score: 0.85,
        attempts: 2,
        band: 'strong',
      };

      const { container } = render(
        React.createElement('table', null,
          React.createElement('tbody', null,
            React.createElement('tr', null,
              React.createElement(HeatmapCell, {
                conceptName: 'Test',
                cell,
                onClick: () => {
                  clicks++;
                },
              })
            )
          )
        )
      );

      const td = container.querySelector('td')!;
      fireEvent.click(td);
      assert.equal(clicks, 1, 'Mouse click triggers onClick');

      fireEvent.keyDown(td, { key: 'Enter' });
      assert.equal(clicks, 2, 'Enter key triggers onClick');

      fireEvent.keyDown(td, { key: ' ' });
      assert.equal(clicks, 3, 'Space key triggers onClick');
    });
  });

  describe('2. Pure Sorting & Filtering Helper (analytics-sort.ts)', () => {
    const sampleRows: RowSortable[] = [
      {
        studentId: 's1',
        name: 'Bob',
        avgMastery: 0.60,
        attendanceRate: 0.80,
        risk: { level: 'OK', score: 0.20 },
      },
      {
        studentId: 's2',
        name: 'Alice',
        avgMastery: 0.35,
        attendanceRate: 0.40,
        risk: { level: 'AT_RISK', score: 0.62 },
      },
      {
        studentId: 's3',
        name: 'Charlie',
        avgMastery: 0.85,
        attendanceRate: 0.90,
        risk: { level: 'OK', score: 0.12 },
      },
      {
        studentId: 's4',
        name: 'David',
        avgMastery: 0.45,
        attendanceRate: 0.60,
        risk: { level: 'WATCH', score: 0.46 },
      },
      {
        studentId: 's5',
        name: 'Eve',
        avgMastery: null,
        attendanceRate: null,
        risk: { level: 'INSUFFICIENT_DATA', score: null },
      },
      {
        studentId: 's6',
        name: 'Frank',
        avgMastery: 0.30,
        attendanceRate: 0.25,
        risk: { level: 'AT_RISK', score: 0.73 },
      },
    ];

    it('sorts by name alphabetically', () => {
      const sorted = filterAndSortRows(sampleRows, { sort: 'name' });
      assert.deepEqual(
        sorted.map((r) => r.name),
        ['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank']
      );
    });

    it('sorts by risk: AT_RISK first (score desc, name asc), then WATCH, then OK, then INSUFFICIENT_DATA', () => {
      const sorted = filterAndSortRows(sampleRows, { sort: 'risk' });
      assert.deepEqual(
        sorted.map((r) => r.name),
        [
          'Frank',   // AT_RISK, score 0.73
          'Alice',   // AT_RISK, score 0.62
          'David',   // WATCH, score 0.46
          'Bob',     // OK, score 0.20
          'Charlie', // OK, score 0.12
          'Eve',     // INSUFFICIENT_DATA
        ]
      );
    });

    it('sorts by average mastery descending, placing nulls last and breaking ties by name', () => {
      const sorted = filterAndSortRows(sampleRows, { sort: 'mastery' });
      assert.deepEqual(
        sorted.map((r) => r.name),
        [
          'Charlie', // 0.85
          'Bob',     // 0.60
          'David',   // 0.45
          'Alice',   // 0.35
          'Frank',   // 0.30
          'Eve',     // null (last)
        ]
      );
    });

    it('sorts by attendance rate descending, placing nulls last and breaking ties by name', () => {
      const sorted = filterAndSortRows(sampleRows, { sort: 'attendance' });
      assert.deepEqual(
        sorted.map((r) => r.name),
        [
          'Charlie', // 0.90
          'Bob',     // 0.80
          'David',   // 0.60
          'Alice',   // 0.40
          'Frank',   // 0.25
          'Eve',     // null (last)
        ]
      );
    });

    it('filter switch (onlyAtRisk: true) hides OK and INSUFFICIENT_DATA students', () => {
      const filtered = filterAndSortRows(sampleRows, { sort: 'name', onlyAtRisk: true });
      assert.deepEqual(
        filtered.map((r) => r.name),
        ['Alice', 'David', 'Frank']
      );

      // Verify no OK or INSUFFICIENT_DATA student is present
      assert.ok(!filtered.some((r) => r.risk.level === 'OK'));
      assert.ok(!filtered.some((r) => r.risk.level === 'INSUFFICIENT_DATA'));
    });
  });

  describe('3. WeakestConcepts Component', () => {
    it('renders empty state text "Not enough assessed students yet" when items array is empty', () => {
      const { container } = render(
        React.createElement(WeakestConcepts, {
          items: [],
        })
      );

      const html = container.innerHTML;
      assert.ok(
        html.includes('Not enough assessed students yet'),
        'Must display specific empty state message'
      );
      assert.ok(
        html.includes('at least 2 assessed students'),
        'Must explain MIN_ASSESSED threshold'
      );
    });

    it('renders concept items with averages, progress bars, and assessed counts when populated', () => {
      const items = [
        {
          conceptId: 'c1',
          name: 'Joins & Subqueries',
          average: 0.35,
          assessedCount: 4,
        },
        {
          conceptId: 'c2',
          name: 'Indexing & B-Trees',
          average: 0.52,
          assessedCount: 6,
        },
      ];

      const { container } = render(
        React.createElement(WeakestConcepts, {
          items,
        })
      );

      const html = container.innerHTML;
      assert.ok(html.includes('Joins &amp; Subqueries') || html.includes('Joins & Subqueries'));
      assert.ok(html.includes('35%'));
      assert.ok(html.includes('4 assessed'));

      assert.ok(html.includes('Indexing &amp; B-Trees') || html.includes('Indexing & B-Trees'));
      assert.ok(html.includes('52%'));
      assert.ok(html.includes('6 assessed'));
    });
  });

  describe('4. AtRiskList Component', () => {
    it('renders empty state text "No students need attention right now" when items array is empty', () => {
      const { container } = render(
        React.createElement(AtRiskList, {
          courseId: 'course-123',
          items: [],
        })
      );

      const html = container.innerHTML;
      assert.ok(
        html.includes('No students need attention right now'),
        'Must display empty state message when no students are at risk'
      );
    });

    it('renders at-risk students with badges, risk score, factors, and weakest concepts', () => {
      const items = [
        {
          studentId: 's1',
          name: 'John Doe',
          level: 'AT_RISK' as const,
          score: 0.65,
          factors: ['LOW_ATTENDANCE' as const, 'LOW_MASTERY' as const],
          weakestConcepts: ['SQL Basics', 'Normalization'],
        },
      ];

      const { container } = render(
        React.createElement(MemoryRouter, null,
          React.createElement(AtRiskList, {
            courseId: 'course-123',
            items,
          })
        )
      );

      const html = container.innerHTML;
      assert.ok(html.includes('John Doe'), 'Displays student name');
      assert.ok(html.includes('Risk: 65.0%'), 'Displays risk score as percentage');
      assert.ok(html.includes('Low Attendance'), 'Displays attendance factor');
      assert.ok(html.includes('Low Mastery'), 'Displays mastery factor');
      assert.ok(html.includes('SQL Basics'), 'Lists first weak concept');
      assert.ok(html.includes('Normalization'), 'Lists second weak concept');
      assert.ok(html.includes('/teacher/courses/course-123/students/s1'), 'Links to student profile');
    });
  });

  describe('5. SessionsChart Component', () => {
    it('includes an accessible hidden data table with full session history', () => {
      const sessions = [
        { id: 'sess-1', date: '2026-03-01T10:00:00Z', present: 10, flagged: 1, absent: 1 },
        { id: 'sess-2', date: '2026-03-03T10:00:00Z', present: 9, flagged: 2, absent: 1 },
      ];

      const { container } = render(
        React.createElement(SessionsChart, {
          sessions,
        })
      );

      const table = container.querySelector('table.sr-only');
      assert.ok(table !== null, 'Accessible hidden table must exist in DOM');

      const headers = Array.from(table!.querySelectorAll('th')).map((th) => th.textContent?.trim());
      assert.deepEqual(headers, ['Date', 'Present', 'Flagged', 'Absent']);

      const rows = table!.querySelectorAll('tbody tr');
      assert.equal(rows.length, 2, 'Table contains rows for both sessions');
    });

    it('renders single session card when only 1 session exists, and empty state when 0 sessions exist', () => {
      const singleSession = [
        { id: 'sess-1', date: '2026-03-01T10:00:00Z', present: 10, flagged: 1, absent: 1 },
      ];

      const { container: singleContainer } = render(
        React.createElement(SessionsChart, {
          sessions: singleSession,
        })
      );

      const singleHtml = singleContainer.innerHTML;
      assert.ok(singleHtml.includes('Single Ended Session'), 'Displays single ended session indicator');
      assert.ok(singleHtml.includes('Present: 10'));
      assert.ok(singleHtml.includes('Flagged: 1'));
      assert.ok(singleHtml.includes('Absent: 1'));

      const { container: emptyContainer } = render(
        React.createElement(SessionsChart, {
          sessions: [],
        })
      );

      const emptyHtml = emptyContainer.innerHTML;
      assert.ok(emptyHtml.includes('No ended sessions yet'), 'Displays no ended sessions empty state');
    });
  });
});

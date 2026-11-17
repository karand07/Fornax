import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseQrData } from './QrScannerDialog';

describe('QR Scanner Data Parser (parseQrData)', () => {
  test('parses full JSON payload emitted by LiveAttendancePage', () => {
    const raw = JSON.stringify({
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      qrCodeToken: '739201',
      token: 'static-session-token-abc',
    });

    const parsed = parseQrData(raw);
    assert.equal(parsed.sessionId, '550e8400-e29b-41d4-a716-446655440000');
    assert.equal(parsed.qrCodeToken, '739201');
    assert.equal(parsed.raw, raw);
  });

  test('parses JSON payload with alternate key aliases (token / code)', () => {
    const raw = JSON.stringify({
      session_id: '660e8400-e29b-41d4-a716-446655440001',
      code: '849102',
    });

    const parsed = parseQrData(raw);
    assert.equal(parsed.sessionId, '660e8400-e29b-41d4-a716-446655440001');
    assert.equal(parsed.qrCodeToken, '849102');
  });

  test('parses full URL deep link with query params', () => {
    const url = 'https://fornax.school.edu/student/mark-attendance?session=session-123&token=tok-999';
    const parsed = parseQrData(url);

    assert.equal(parsed.sessionId, 'session-123');
    assert.equal(parsed.qrCodeToken, 'tok-999');
  });

  test('parses relative path with query string', () => {
    const query = '/student/attendance/check-in?sessionId=sess-xyz&qrCodeToken=code-456';
    const parsed = parseQrData(query);

    assert.equal(parsed.sessionId, 'sess-xyz');
    assert.equal(parsed.qrCodeToken, 'code-456');
  });

  test('recognizes standalone UUID as sessionId', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000';
    const parsed = parseQrData(uuid);

    assert.equal(parsed.sessionId, uuid);
    assert.equal(parsed.qrCodeToken, undefined);
  });

  test('recognizes plain code/token string', () => {
    const token = 'A9X7Q2';
    const parsed = parseQrData(token);

    assert.equal(parsed.sessionId, undefined);
    assert.equal(parsed.qrCodeToken, 'A9X7Q2');
  });
});

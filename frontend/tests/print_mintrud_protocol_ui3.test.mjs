import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProtocolDraftPrintHtml } from '../src/lib/printMintrudProtocolDraft.js';

const sample = () => ({
  document_kind: 'DRAFT_PREVIEW_ONLY', status: 'draft',
  protocol_number: '114', protocol_date: '2026-06-11',
  training_provider_name: 'ООО «Учебный пример»',
  commission_order_number: '21', commission_order_date: '2026-06-10',
  commission_chair: 'Петров А. Т.', commission_members: ['Иванова Э. Д.', 'Сидоров Г. М.'],
  program_title: 'Оказание первой помощи пострадавшим', program_hours: 16,
  participants: [{
    learner_name: 'Тестова Анна Алексеевна', profession_or_position: 'Охранник',
    workplace: 'ООО «Тестовый работодатель»', knowledge_check_result: 'satisfactory',
    knowledge_check_date: '2026-06-11', registry_record_number: '987654321',
  }],
});

test('A4 landscape and exactly six participant columns', () => {
  const html = buildProtocolDraftPrintHtml(sample());
  assert.match(html, /@page \{ size: A4 landscape;/);
  const header = html.match(/<thead><tr>([\s\S]*?)<\/tr><\/thead>/)?.[1] || '';
  assert.equal((header.match(/<th /g) || []).length, 6);
  assert.match(header, /Причина проверки знаний/);
  assert.match(html, /thead \{ display: table-header-group; \}/);
});

test('formal header, organization, Russian dates and member signatures', () => {
  const html = buildProtocolDraftPrintHtml(sample());
  for (const text of ['ПРОТОКОЛ № 114', '11 июня 2026 г.', '10 июня 2026 г.',
    'ООО «Учебный пример»', 'Петров А. Т.', 'Иванова Э. Д.',
    'Сидоров Г. М.', 'Оказание первой помощи пострадавшим', '16 ч.']) {
    assert.ok(html.includes(text), text);
  }
});

test('does not infer certificate numbers or reason from registry number', () => {
  const html = buildProtocolDraftPrintHtml(sample());
  assert.match(html, /№ удостоверения: —/);
  assert.doesNotMatch(html, /987654321/);
  assert.match(html, /номер удостоверения отсутствуют в текущем API/);
});

test('draft watermark and API restriction remain fail-closed', () => {
  const html = buildProtocolDraftPrintHtml(sample());
  assert.doesNotMatch(html, /ПРОЕКТ — НЕ ПОДПИСАН/);
  for (const changed of [
    { ...sample(), document_kind: 'RECORDED' },
    { ...sample(), status: 'recorded' },
    { ...sample(), document_kind: undefined },
  ]) {
    assert.throws(() => buildProtocolDraftPrintHtml(changed));
  }
});

test('escapes untrusted participant and organization text', () => {
  const data = sample();
  data.training_provider_name = '<script>alert(1)</script>';
  data.participants[0].learner_name = '<img src=x onerror=alert(1)>';
  const html = buildProtocolDraftPrintHtml(data);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
});

test('missing values show a dash; no invented group or certification data', () => {
  const data = sample();
  data.participants[0].workplace = null;
  data.commission_order_number = null;
  const html = buildProtocolDraftPrintHtml(data);
  assert.doesNotMatch(html, /Требуют заполнения или проверки/);
  assert.match(html, /№ —/);
  assert.doesNotMatch(html, /группы № 21/);
});

test('all 100 participants are included without a truncated list', () => {
  const data = sample();
  data.participants = Array.from({length: 100}, (_, i) => ({
    ...data.participants[0], learner_name: `Участник № ${i + 1}`,
  }));
  const html = buildProtocolDraftPrintHtml(data);
  assert.match(html, /Участник № 100/);
  const tbody = html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] || '';
  assert.equal((tbody.match(/<tr>/g) || []).length, 100);
});

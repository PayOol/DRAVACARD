import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  DOMAIN, EXPECTED_RECORDS, ORIGIN_ADDRESSES, ZONE_ID,
  classifyProbe, createHttpsTransport, runFailover, validateRecords,
} from './dns-failover.mjs';

// Ephemeral credential-shaped fixture used only by the injected mock transport.
const TOKEN = randomBytes(24).toString('hex');
const RECORDS_PATH = `/client/v4/zones/${ZONE_ID}/dns_records`;
const clone = (value) => structuredClone(value);
const id = (value) => value.toString(16).padStart(32, '0');
const fixture = (proxied = true) => [
  ...EXPECTED_RECORDS.map((record, index) => ({
    ...record, id: id(index + 1), proxied, ttl: 1, comment: 'Preserve this comment',
    settings: {}, tags: ['service:web'], modified_on: '2026-09-05T00:00:00Z',
  })),
  { id: id(100), type: 'MX', name: DOMAIN, content: 'mx.example.net', priority: 10, ttl: 3600, proxied: false },
  { id: id(101), type: 'TXT', name: DOMAIN, content: 'unchanged-verification', ttl: 3600, proxied: false },
  { id: id(102), type: 'CNAME', name: `api.${DOMAIN}`, content: 'untouched.example.net', ttl: 1, proxied: true },
];

function goodProbe(label) {
  if (label === 'www') return { status: 301, headers: { location: `https://${DOMAIN}/` }, body: '' };
  if (label === 'logo') return { status: 200, headers: { 'content-type': 'image/svg+xml' }, body: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>\n' };
  return { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' }, body: '<!doctype html><html><head><title>DRAVA - Cartes virtuelles</title></head><body>DRAVA</body></html>' };
}
const failedProbe = () => ({ status: 523, headers: { 'content-type': 'text/html' }, body: 'Origin unreachable' });
const jsonResponse = (data, status = 200) => ({ status, headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });

function scenario(options = {}) {
  let records = clone(options.records ?? fixture());
  let readCount = 0;
  let publicCount = 0;
  let pageRecords;
  const calls = [];
  const waits = [];
  const transport = async (spec) => {
    calls.push(clone(spec));
    if (spec.hostname === 'api.cloudflare.com') {
      assert.equal(spec.headers.Authorization, `Bearer ${TOKEN}`);
      if (spec.method === 'GET') {
        const url = new URL(`https://${spec.hostname}${spec.path}`);
        assert.equal(url.pathname, RECORDS_PATH);
        const page = Number(url.searchParams.get('page'));
        if (page === 1) {
          readCount += 1;
          pageRecords = clone(options.readRecords?.(readCount, records) ?? records);
        }
        if (options.apiGet) return options.apiGet({ readCount, page, records: pageRecords, spec });
        const pageItems = pageRecords.slice((page - 1) * 100, page * 100);
        return jsonResponse({ success: true, result: pageItems, result_info: {
          page, per_page: 100, count: pageItems.length,
          total_count: pageRecords.length, total_pages: Math.max(1, Math.ceil(pageRecords.length / 100)),
        } });
      }
      assert.equal(spec.method, 'POST');
      assert.equal(spec.path, `${RECORDS_PATH}/batch`);
      const body = JSON.parse(spec.body);
      assert.deepEqual(Object.keys(body), ['patches']);
      assert.equal(body.patches.length, 9);
      for (const patch of body.patches) {
        assert.deepEqual(Object.keys(patch).sort(), ['id', 'proxied']);
        assert.equal(patch.proxied, false);
        assert.ok(records.slice(0, 9).some((record) => record.id === patch.id));
      }
      const commit = () => {
        records = records.map((record) => body.patches.some((patch) => patch.id === record.id)
          ? { ...record, proxied: false } : record);
      };
      if (options.batch) return options.batch({ commit, spec });
      commit();
      return jsonResponse({ success: true, result: { patches: records.slice(0, 9) } });
    }
    assert.ok([DOMAIN, `www.${DOMAIN}`].includes(spec.hostname));
    assert.equal(spec.method, 'GET');
    assert.equal(spec.headers.Host, spec.hostname);
    assert.equal(spec.headers.Authorization, undefined);
    assert.equal(spec.body, undefined);
    const label = spec.hostname.startsWith('www.') ? 'www' : spec.path === '/' ? 'home' : 'logo';
    assert.equal(spec.path, label === 'logo' ? '/images/drava-logo-transparent.svg' : '/');
    if (spec.address) {
      assert.ok(ORIGIN_ADDRESSES.includes(spec.address));
      return options.originProbe?.(spec.address, label) ?? goodProbe(label);
    }
    const round = Math.floor(publicCount / 3) + 1;
    publicCount += 1;
    return options.publicProbe?.(round, label) ?? goodProbe(label);
  };
  return {
    calls, waits, get records() { return records; },
    run: (mode = 'apply', extra = {}) => runFailover({
      mode, token: TOKEN, transport,
      sleep: async (ms) => { waits.push(ms); await options.sleep?.(ms); },
      ...extra,
    }),
  };
}
const writes = (subject) => subject.calls.filter((call) => call.method === 'POST');
const apiReads = (subject) => subject.calls.filter((call) => call.hostname === 'api.cloudflare.com' && call.method === 'GET');

test('healthy public site makes no origin requests, no waits and no DNS writes', async () => {
  const subject = scenario();
  const result = await subject.run();
  assert.equal(result.outcome, 'healthy');
  assert.equal(result.exitCode, 0);
  assert.equal(result.changed, false);
  assert.equal(subject.calls.length, 4);
  assert.deepEqual(subject.waits, []);
  assert.equal(writes(subject).length, 0);
});

test('already DNS-only is idempotent and never automatically enables the proxy', async () => {
  const subject = scenario({ records: fixture(false) });
  assert.equal((await subject.run()).outcome, 'already_dns_only');
  assert.equal(subject.calls.length, 1);
  assert.equal(writes(subject).length, 0);
});

test('transient failure recovers after twenty seconds with no write', async () => {
  const subject = scenario({ publicProbe: (round, label) => round === 1 ? failedProbe() : goodProbe(label) });
  const result = await subject.run();
  assert.equal(result.outcome, 'recovered');
  assert.equal(result.exitCode, 0);
  assert.deepEqual(subject.waits, [20_000]);
  assert.equal(writes(subject).length, 0);
});

test('confirmed outage writes exactly nine proxy-only patches once, verifies and alerts', async () => {
  const subject = scenario({ publicProbe: failedProbe });
  const original = clone(subject.records);
  const result = await subject.run();
  assert.equal(result.outcome, 'failover_applied');
  assert.equal(result.exitCode, 2);
  assert.equal(result.changed, true);
  assert.deepEqual(subject.waits, [20_000, 20_000]);
  assert.equal(result.publicRounds.length, 4);
  assert.equal(result.originProbes.length, 12);
  assert.ok(result.originProbes.every((probe) => probe.state === 'healthy'));
  assert.equal(writes(subject).length, 1);
  assert.equal(apiReads(subject).length, 3);
  assert.deepEqual(subject.records, original.map((record, index) => index < 9 ? { ...record, proxied: false } : record));
  assert.equal((await subject.run()).outcome, 'already_dns_only');
  assert.equal(writes(subject).length, 1);
});

test('default check mode does all safeguards but never writes', async () => {
  const checkSubject = scenario({ publicProbe: failedProbe });
  const checked = await checkSubject.run('check', { mode: undefined });
  assert.equal(checked.mode, 'check');
  assert.equal(checked.outcome, 'would_failover');
  assert.equal(checked.exitCode, 1);
  assert.equal(checked.changed, false);
  assert.equal(checked.originProbes.length, 12);
  assert.equal(apiReads(checkSubject).length, 2);
  assert.equal(writes(checkSubject).length, 0);
  const missing = await runFailover({ token: undefined });
  assert.equal(missing.mode, 'check');
  assert.equal(missing.outcome, 'missing_or_invalid_token');
});

for (const status of [403, 429, 401, 404, 302]) {
  test(`HTTP ${status} cannot trigger a protection bypass`, async () => {
    const subject = scenario({ publicProbe: () => ({ status, headers: {}, body: TOKEN }) });
    const result = await subject.run();
    assert.equal(result.outcome, 'unsafe_public_response');
    assert.equal(result.exitCode, 1);
    assert.equal(writes(subject).length, 0);
    assert.ok(!JSON.stringify(result).includes(TOKEN));
  });
}

test('unexpected content, a challenge response and a wrong www redirect are unsafe', async () => {
  for (const response of [
    { status: 200, headers: { 'content-type': 'text/html' }, body: '<html><title>Other website</title></html>' },
    { ...failedProbe(), headers: { 'cf-mitigated': 'challenge' } },
    { status: 308, headers: { location: 'https://evil.example/?token=secret' }, body: '' },
  ]) {
    const subject = scenario({ publicProbe: (_round, label) => label === 'www' ? response : failedProbe() });
    const result = await subject.run();
    assert.equal(result.outcome, 'unsafe_public_response');
    assert.equal(writes(subject).length, 0);
    assert.ok(!JSON.stringify(result).includes('evil.example'));
  }
  assert.equal(classifyProbe('home', { ...goodProbe('home'), body: '<html><title>Wrong site</title></html>' }).state, 'unsafe');
  assert.equal(classifyProbe('logo', { ...goodProbe('logo'), body: '<html>DRAVA</html>' }).state, 'unsafe');
  assert.equal(classifyProbe('www', { status: 308, headers: { location: `https://${DOMAIN}/` } }).state, 'healthy');
});

test('a partial public outage does not satisfy all-probes-failed requirement', async () => {
  const subject = scenario({ publicProbe: (_round, label) => label === 'logo' ? goodProbe(label) : failedProbe() });
  assert.equal((await subject.run()).outcome, 'unsafe_public_response');
  assert.equal(writes(subject).length, 0);
});

for (const error of ['transport', 'tls', 'timeout']) {
  test(`confirmed ${error} failures may fail over only with healthy origins`, async () => {
    const subject = scenario({ publicProbe: () => ({ error }) });
    assert.equal((await subject.run()).outcome, 'failover_applied');
    assert.equal(writes(subject).length, 1);
  });
}

test('unknown errors and oversized responses cannot trigger failover', async () => {
  for (const error of ['response_too_large', 'unexpected_transport_error', TOKEN]) {
    const subject = scenario({ publicProbe: () => ({ error }) });
    const result = await subject.run();
    assert.equal(result.outcome, 'unsafe_public_response');
    assert.equal(writes(subject).length, 0);
    assert.ok(!JSON.stringify(result).includes(TOKEN));
  }
});

test('timeout outage has enough bounded runtime for a real failover and verification', async () => {
  let clock = 0;
  const subject = scenario({
    publicProbe: (_round, label) => { if (label === 'home') clock += 10_000; return { error: 'timeout' }; },
    originProbe: (_address, label) => { if (label === 'home') clock += 500; return goodProbe(label); },
    sleep: (ms) => { clock += ms; },
  });
  const result = await subject.run('apply', { now: () => clock });
  assert.equal(result.outcome, 'failover_applied');
  assert.equal(clock, 82_000);
  assert.ok(subject.calls.every((call) => call.timeoutMs <= 10_000));
});

test('insufficient runtime refuses a write that could not be verified', async () => {
  let clock = 0;
  const subject = scenario({ publicProbe: failedProbe, sleep: () => { clock += 82_000; } });
  const result = await subject.run('apply', { now: () => clock });
  assert.equal(result.reason, 'insufficient_verification_time');
  assert.equal(writes(subject).length, 0);
});

test('proxy plus origin failure, or one unhealthy origin, never changes DNS', async () => {
  for (const failingLabel of ['home', 'logo', 'www']) {
    const subject = scenario({
      publicProbe: failedProbe,
      originProbe: (address, label) => address === ORIGIN_ADDRESSES[3] && label === failingLabel ? { error: 'tls' } : goodProbe(label),
    });
    assert.equal((await subject.run()).outcome, 'origin_unhealthy');
    assert.equal(writes(subject).length, 0);
  }
});

test('public recovery or protection response during the final recheck cancels failover', async () => {
  for (const recovery of [true, false]) {
    const subject = scenario({ publicProbe: (round, label) => round < 4 ? failedProbe()
      : recovery ? goodProbe(label) : { status: 403, headers: {}, body: '' } });
    assert.equal((await subject.run()).outcome, recovery ? 'recovered' : 'unsafe_public_response');
    assert.equal(writes(subject).length, 0);
  }
});

test('exact DNS allowlist rejects malformed, duplicated, missing, extra and mixed records', async () => {
  const mutations = [
    (records) => records.splice(0, 1),
    (records) => records.push({ ...records[0], id: id(999), content: '192.0.2.1' }),
    (records) => { records[0].content = '192.0.2.1'; },
    (records) => { records[0].proxied = false; },
    (records) => { records[0].proxied = 'true'; },
    (records) => { records[0].id = '../workers/secrets'; },
    (records) => { records[1].id = records[0].id; },
    (records) => { records[11].id = records[0].id; },
    (records) => { records[8].content = 'payool.github.io.evil.example'; },
    (records) => { records[8].name = 'www.DRAVA.CLICK'; },
    (records) => { records[0].name = 'drava.click.'; },
    (records) => { records[0].type = 'a'; },
    (records) => records.push({ ...records[0], id: id(999), name: 'DRAVA.CLICK.' }),
    (records) => { records[0] = { ...records[1], id: records[0].id }; },
  ];
  for (const mutate of mutations) {
    const records = fixture();
    mutate(records);
    assert.throws(() => validateRecords(records));
    const subject = scenario({ records });
    const result = await subject.run();
    assert.equal(result.outcome, 'error');
    assert.equal(writes(subject).length, 0);
    assert.equal(subject.calls.length, 1);
  }
});

test('web metadata or ID changes on final DNS read prevent concurrent overwrites', async () => {
  for (const change of [
    (records) => { records[0].ttl = 300; },
    (records) => { records[0].comment = 'operator edit'; },
    (records) => { records[0].id = id(400); },
  ]) {
    const subject = scenario({ publicProbe: failedProbe,
      readRecords: (count, current) => { const changed = clone(current); if (count === 2) change(changed); return changed; },
    });
    assert.equal((await subject.run()).outcome, 'concurrent_dns_change');
    assert.equal(writes(subject).length, 0);
  }
});

test('another operator completing DNS-only failover causes an idempotent no-op', async () => {
  const subject = scenario({ publicProbe: failedProbe,
    readRecords: (count, records) => count === 2 ? records.map((record, index) => index < 9 ? { ...record, proxied: false } : record) : records,
  });
  assert.equal((await subject.run()).outcome, 'already_dns_only');
  assert.equal(writes(subject).length, 0);
});

test('a concurrent mixed state or changed destination refuses any write', async () => {
  for (const key of ['proxied', 'content']) {
    const subject = scenario({ publicProbe: failedProbe,
      readRecords: (count, current) => {
        const changed = clone(current);
        if (count === 2) changed[0][key] = key === 'proxied' ? false : '192.0.2.1';
        return changed;
      },
    });
    assert.equal((await subject.run()).outcome, 'error');
    assert.equal(writes(subject).length, 0);
  }
});

test('ambiguous write responses are read back, never retried, and report committed state', async () => {
  for (const response of [
    () => { throw new Error(`socket failed with Authorization: Bearer ${TOKEN}`); },
    () => ({ error: 'timeout' }),
    () => jsonResponse({ success: false, errors: [{ message: TOKEN }] }, 500),
    () => ({ status: 200, body: TOKEN, headers: {} }),
  ]) {
    const subject = scenario({ publicProbe: failedProbe, batch: ({ commit }) => { commit(); return response(); } });
    const result = await subject.run();
    assert.equal(result.outcome, 'failover_applied_after_ambiguous_response');
    assert.equal(result.changed, true);
    assert.equal(result.exitCode, 2);
    assert.equal(writes(subject).length, 1);
    assert.equal(apiReads(subject).length, 3);
    assert.ok(!JSON.stringify(result).includes(TOKEN));
  }
});

test('uncommitted ambiguous write reports unknown change state and never retries', async () => {
  const subject = scenario({ publicProbe: failedProbe, batch: () => ({ error: 'timeout' }) });
  const result = await subject.run();
  assert.equal(result.outcome, 'failover_verification_failed');
  assert.equal(result.changed, null);
  assert.equal(result.writeAttempted, true);
  assert.equal(result.exitCode, 1);
  assert.equal(writes(subject).length, 1);
  assert.equal(apiReads(subject).length, 3);
});

test('post-write read errors do not retry the write or claim verified success', async () => {
  const subject = scenario({ publicProbe: failedProbe,
    readRecords: (count, records) => { if (count === 3) throw new Error(TOKEN); return records; },
  });
  const result = await subject.run();
  assert.equal(result.outcome, 'failover_verification_failed');
  assert.equal(result.changed, null);
  assert.equal(writes(subject).length, 1);
  assert.ok(!JSON.stringify(result).includes(TOKEN));
});

test('post-write mixed state or replaced IDs cannot be reported as successful failover', async () => {
  for (const key of ['id', 'proxied']) {
    const subject = scenario({ publicProbe: failedProbe,
      readRecords: (count, records) => {
        const changed = clone(records);
        if (count === 3) changed[0][key] = key === 'id' ? id(600) : true;
        return changed;
      },
    });
    const result = await subject.run();
    assert.equal(result.outcome, 'failover_verification_failed');
    assert.equal(result.changed, null);
    assert.equal(writes(subject).length, 1);
  }
});

test('exceptions thrown during public probes are sanitized and do not trigger failover', async () => {
  const subject = scenario({ publicProbe: () => { throw new Error(`request failed: ${TOKEN}`); } });
  const result = await subject.run();
  assert.equal(result.outcome, 'unsafe_public_response');
  assert.equal(writes(subject).length, 0);
  assert.ok(!JSON.stringify(result).includes(TOKEN));
});

test('API redirects, malformed JSON, rejected tokens and exceptions never leak secrets or probe', async () => {
  for (const apiGet of [
    () => ({ status: 302, headers: { location: `https://evil.example/${TOKEN}` }, body: TOKEN }),
    () => ({ status: 200, headers: {}, body: TOKEN }),
    () => jsonResponse({ success: false, errors: [{ message: TOKEN }] }, 403),
    () => { throw new Error(TOKEN); },
  ]) {
    const subject = scenario({ apiGet });
    const result = await subject.run();
    assert.equal(result.outcome, 'error');
    assert.equal(subject.calls.length, 1);
    assert.equal(writes(subject).length, 0);
    assert.ok(!JSON.stringify(result).includes(TOKEN));
    assert.ok(!JSON.stringify(result).includes('evil.example'));
  }
});

test('pagination reads every DNS record, including extra web records on later pages', async () => {
  const records = fixture();
  for (let index = 0; index < 100; index += 1) records.push({ id: id(1000 + index), type: 'TXT', name: `proof-${index}.${DOMAIN}`, content: 'preserved' });
  const subject = scenario({ records });
  assert.equal((await subject.run()).outcome, 'healthy');
  assert.equal(apiReads(subject).length, 2);
  records.push({ ...records[0], id: id(2000), content: '192.0.2.1' });
  const extra = scenario({ records });
  assert.equal((await extra.run()).reason, 'unexpected_web_record_count');
  assert.equal(writes(extra).length, 0);
});

test('incomplete, excessive or inconsistent pagination refuses to act', async () => {
  for (const info of [
    { total_pages: 11, total_count: 1001 }, { count: 0 }, { per_page: 50 },
    { page: 2 }, { total_pages: 2 }, { total_count: 13 },
  ]) {
    const subject = scenario({ apiGet: ({ records }) => jsonResponse({ success: true, result: records, result_info: {
      page: 1, per_page: 100, count: 12, total_count: 12, total_pages: 1, ...info,
    } }) });
    assert.equal((await subject.run()).outcome, 'error');
    assert.equal(writes(subject).length, 0);
  }
});

test('public-only mode requires no token and cannot contact the Cloudflare API', async () => {
  const subject = scenario();
  const result = await subject.run('probe-public', { token: undefined });
  assert.equal(result.outcome, 'public_healthy');
  assert.equal(result.exitCode, 0);
  assert.equal(subject.calls.length, 3);
  assert.equal(apiReads(subject).length, 0);
  assert.equal(writes(subject).length, 0);
  const failure = scenario({ publicProbe: failedProbe });
  assert.equal((await failure.run('probe-public', { token: undefined })).outcome, 'public_unhealthy');
  assert.equal(failure.calls.length, 3);
});

test('missing, newline-containing or invalid tokens fail before all networking', async () => {
  for (const token of [undefined, '', 'short', `validlookingtoken0123456789\n${TOKEN}`]) {
    const subject = scenario();
    const result = await subject.run('apply', { token });
    assert.equal(result.outcome, 'missing_or_invalid_token');
    assert.equal(subject.calls.length, 0);
    assert.ok(!JSON.stringify(result).includes(TOKEN));
  }
});

test('native HTTPS pins origins with original Host/SNI and explicit certificate verification', async () => {
  let captured;
  const transport = createHttpsTransport((options, callback) => {
    captured = options;
    const req = new EventEmitter();
    req.destroy = () => {};
    req.end = () => queueMicrotask(() => {
      const response = new EventEmitter();
      response.statusCode = 200;
      response.headers = { 'content-type': 'text/html', 'set-cookie': TOKEN };
      response.destroy = () => {};
      callback(response);
      response.emit('data', Buffer.from('body'));
      response.emit('end');
    });
    return req;
  });
  const result = await transport({ hostname: DOMAIN, path: '/', method: 'GET',
    address: ORIGIN_ADDRESSES[0], headers: { Host: DOMAIN }, maxBytes: 100, timeoutMs: 1000 });
  assert.equal(captured.hostname, DOMAIN);
  assert.equal(captured.servername, DOMAIN);
  assert.equal(captured.rejectUnauthorized, true);
  assert.equal(captured.protocol, 'https:');
  assert.equal(captured.port, 443);
  assert.equal(captured.headers.Host, DOMAIN);
  assert.equal(captured.headers.Authorization, undefined);
  assert.equal(captured.agent, false);
  assert.equal(captured.autoSelectFamily, false);
  captured.lookup(DOMAIN, {}, (error, address, family) => {
    assert.equal(error, null); assert.equal(address, ORIGIN_ADDRESSES[0]); assert.equal(family, 4);
  });
  captured.lookup(DOMAIN, { all: true }, (error, addresses) => {
    assert.equal(error, null); assert.deepEqual(addresses, [{ address: ORIGIN_ADDRESSES[0], family: 4 }]);
  });
  assert.ok(!JSON.stringify(result).includes(TOKEN));
});

test('native transport has absolute deadlines and response size bounds', async () => {
  for (const oversized of [false, true]) {
    let destroyed = false;
    const transport = createHttpsTransport((_options, callback) => {
      const req = new EventEmitter();
      req.destroy = () => { destroyed = true; };
      req.end = () => queueMicrotask(() => {
        if (!oversized) return; // Simulate a connection that never responds.
        const response = new EventEmitter();
        response.statusCode = 200;
        response.headers = {};
        response.destroy = () => {};
        callback(response);
        response.emit('data', Buffer.from('too-large-response'));
      });
      return req;
    });
    const result = await transport({ hostname: DOMAIN, path: '/', method: 'GET', headers: {}, maxBytes: 4, timeoutMs: 5 });
    assert.equal(result.error, oversized ? 'response_too_large' : 'timeout');
    assert.equal(destroyed, true);
  }
});

test('native transport sanitizes network and TLS errors without exception text', async () => {
  for (const [code, expected] of [['ECONNRESET', 'transport'], ['ERR_TLS_CERT_ALTNAME_INVALID', 'tls'],
    ['CERT_HAS_EXPIRED', 'tls'], ['ETIMEDOUT', 'timeout'], ['ERR_INVALID_ARG_TYPE', 'unexpected_transport_error']]) {
    const transport = createHttpsTransport(() => {
      const req = new EventEmitter();
      req.destroy = () => {};
      req.end = () => queueMicrotask(() => req.emit('error', Object.assign(new Error(TOKEN), { code })));
      return req;
    });
    const result = await transport({ hostname: DOMAIN, path: '/', method: 'GET', headers: {}, maxBytes: 100, timeoutMs: 1000 });
    assert.deepEqual(result, { error: expected });
    assert.ok(!JSON.stringify(result).includes(TOKEN));
  }
});

test('CLI rejects unknown or conflicting arguments and defaults to read-only with no token', () => {
  const script = fileURLToPath(new URL('./dns-failover.mjs', import.meta.url));
  const env = { ...process.env };
  delete env.CLOUDFLARE_DNS_FAILOVER_TOKEN;
  for (const args of [[], ['--apply', '--check'], ['--url', 'https://evil.example'], [`--token=${TOKEN}`]]) {
    const result = spawnSync(process.execPath, [script, ...args], { env, encoding: 'utf8', timeout: 5000 });
    assert.equal(result.status, 1);
    assert.equal(result.stderr, '');
    const summary = JSON.parse(result.stdout);
    assert.equal(summary.changed, false);
    assert.equal(summary.outcome, args.length ? 'invalid_arguments' : 'missing_or_invalid_token');
    assert.ok(!result.stdout.includes(TOKEN));
    assert.ok(!result.stdout.includes('evil.example'));
  }
});

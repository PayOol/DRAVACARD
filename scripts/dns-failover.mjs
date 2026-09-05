#!/usr/bin/env node
// Web DNS only. This module never calls payment services, Workers or return URLs.
import https from 'node:https';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

export const ZONE_ID = 'fa6d1dc49d8ef4df16be68d607624d5c';
export const DOMAIN = 'drava.click';
export const ORIGIN_ADDRESSES = Object.freeze([
  '185.199.108.153', '185.199.109.153', '185.199.110.153', '185.199.111.153',
]);
export const EXPECTED_RECORDS = Object.freeze([
  ...ORIGIN_ADDRESSES.map((content) => ({ name: DOMAIN, type: 'A', content })),
  ...[0, 1, 2, 3].map((n) => ({ name: DOMAIN, type: 'AAAA', content: `2606:50c0:800${n}::153` })),
  { name: `www.${DOMAIN}`, type: 'CNAME', content: 'payool.github.io' },
].map(Object.freeze));
const API_HOST = 'api.cloudflare.com';
const RECORDS_PATH = `/client/v4/zones/${ZONE_ID}/dns_records`;
const MAX_PAGES = 10;
const PER_PAGE = 100;
const REQUEST_MS = 10_000;
const RUN_MS = 180_000;
const ROUND_DELAY_MS = 20_000;
const API_MAX_BYTES = 1_048_576;
const PROBES = Object.freeze([
  Object.freeze({ label: 'home', hostname: DOMAIN, path: '/', maxBytes: 1_048_576 }),
  Object.freeze({ label: 'logo', hostname: DOMAIN, path: '/images/drava-logo-transparent.svg', maxBytes: 65_536 }),
  Object.freeze({ label: 'www', hostname: `www.${DOMAIN}`, path: '/', maxBytes: 65_536 }),
]);

class SafeError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

function transportError(error) {
  const code = typeof error?.code === 'string' ? error.code : '';
  if (['ETIMEDOUT', 'ERR_HTTP_REQUEST_TIMEOUT'].includes(code)) return 'timeout';
  if (/^(ERR_TLS_|CERT_|ERR_SSL_)/.test(code) || [
    'DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  ].includes(code)) return 'tls';
  if (['ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'EHOSTUNREACH',
    'ENETUNREACH', 'ENETDOWN', 'EPIPE', 'ECONNABORTED'].includes(code)) return 'transport';
  // Programming errors, response limits and unknown errors never justify bypass.
  return 'unexpected_transport_error';
}

/** Native HTTPS does not follow redirects. The injected request is for unit tests. */
export function createHttpsTransport(request = https.request) {
  return (spec) => new Promise((resolve) => {
    let req;
    let response;
    let timer;
    let finished = false;
    const finish = (result, abort = false) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve(result);
      if (abort) {
        response?.destroy();
        req?.destroy();
      }
    };
    const options = {
      protocol: 'https:', hostname: spec.hostname, port: 443,
      servername: spec.hostname, rejectUnauthorized: true,
      method: spec.method, path: spec.path, headers: spec.headers,
      agent: false, maxHeaderSize: 16_384,
    };
    if (spec.address) {
      // Keep both HTTP Host and TLS SNI as the real domain while pinning the IP.
      options.family = 4;
      options.autoSelectFamily = false;
      options.lookup = (_hostname, lookupOptions, callback) => {
        if (lookupOptions?.all) callback(null, [{ address: spec.address, family: 4 }]);
        else callback(null, spec.address, 4);
      };
    }
    try {
      req = request(options, (res) => {
        response = res;
        const chunks = [];
        let bytes = 0;
        res.on('data', (chunk) => {
          bytes += chunk.length;
          if (bytes > spec.maxBytes) return finish({ error: 'response_too_large' }, true);
          chunks.push(chunk);
        });
        res.on('end', () => finish({
          status: res.statusCode,
          // Only these response headers are needed; no cookies or raw headers.
          headers: {
            'content-type': res.headers['content-type'],
            location: res.headers.location,
            'cf-mitigated': res.headers['cf-mitigated'],
          },
          body: Buffer.concat(chunks).toString('utf8'),
        }));
        res.on('aborted', () => finish({ error: 'transport' }, true));
        res.on('error', (error) => finish({ error: transportError(error) }, true));
      });
      req.on('error', (error) => finish({ error: transportError(error) }, true));
      // Covers DNS lookup, connection, TLS and the entire response, not just idle time.
      timer = setTimeout(() => finish({ error: 'timeout' }, true), spec.timeoutMs);
      req.end(spec.body);
    } catch {
      finish({ error: 'unexpected_transport_error' }, true);
    }
  });
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function recordKey(record) {
  return `${record.type}|${record.name}|${record.content}`;
}

/** Fail closed, including equivalent spellings that could hide extra web records. */
export function validateRecords(records) {
  if (!Array.isArray(records)) throw new SafeError('invalid_dns_records');
  const ids = new Set();
  const web = [];
  for (const record of records) {
    if (!record || typeof record !== 'object' || Array.isArray(record)
      || !/^[a-f0-9]{32}$/.test(record.id) || ids.has(record.id)
      || typeof record.name !== 'string' || typeof record.type !== 'string') {
      throw new SafeError('invalid_or_duplicate_record_id');
    }
    ids.add(record.id);
    const name = record.name.toLowerCase().replace(/\.$/, '');
    if ([DOMAIN, `www.${DOMAIN}`].includes(name)
      && ['A', 'AAAA', 'CNAME'].includes(record.type.toUpperCase())) web.push(record);
  }
  if (web.length !== EXPECTED_RECORDS.length) throw new SafeError('unexpected_web_record_count');
  const expected = new Set(EXPECTED_RECORDS.map(recordKey));
  for (const record of web) {
    if (!expected.delete(recordKey(record)) || typeof record.proxied !== 'boolean') {
      throw new SafeError('unexpected_web_record');
    }
  }
  if (expected.size) throw new SafeError('missing_web_record');
  const proxied = web.filter((record) => record.proxied).length;
  if (proxied !== 0 && proxied !== web.length) throw new SafeError('mixed_proxy_state');
  const sorted = [...web].sort((left, right) => left.id.localeCompare(right.id));
  return {
    state: proxied === 0 ? 'dns_only' : 'proxied',
    records: sorted,
    // Compare all web fields, including TTL, settings and modification timestamps.
    fingerprint: stableJson(sorted),
    identity: stableJson(sorted.map(({ id, type, name, content }) => ({ id, type, name, content }))),
  };
}

export function classifyProbe(label, response) {
  if (!response || typeof response !== 'object') return { state: 'unsafe', reason: 'invalid_response' };
  if (response.error) {
    const knownFailure = ['transport', 'tls', 'timeout'].includes(response.error);
    return { state: knownFailure ? 'failed' : 'unsafe', reason: knownFailure ? response.error : 'probe_error' };
  }
  const status = response.status;
  if (!Number.isInteger(status) || status < 100 || status > 599) {
    return { state: 'unsafe', reason: 'invalid_status' };
  }
  const result = (state, reason) => ({ state, reason, status });
  if (response.headers?.['cf-mitigated']) return result('unsafe', 'protection_response');
  if (status === 403 || status === 429) return result('unsafe', 'protection_or_rate_limit');
  if (status >= 500) return result('failed', 'http_5xx');
  if (label === 'www') {
    return [301, 308].includes(status) && response.headers?.location === `https://${DOMAIN}/`
      ? result('healthy', 'expected_redirect') : result('unsafe', 'unexpected_redirect');
  }
  if (status !== 200) return result('unsafe', 'unexpected_status');
  const contentType = response.headers?.['content-type'];
  const body = response.body;
  if (typeof contentType !== 'string' || typeof body !== 'string') return result('unsafe', 'unexpected_content');
  const valid = label === 'home'
    ? /^text\/html(?:\s*;|$)/i.test(contentType) && /<html(?:\s|>)/i.test(body)
      && /<title\b[^>]*>[^<]*\bDRAVA\b[^<]*<\/title>/i.test(body)
    : label === 'logo' && /^image\/svg\+xml(?:\s*;|$)/i.test(contentType)
      && /<svg(?:\s|>)/i.test(body) && /<\/svg>\s*$/i.test(body);
  return valid ? result('healthy', 'expected_content') : result('unsafe', 'unexpected_content');
}

function summarizeProbes(probes) {
  if (probes.every((probe) => probe.state === 'healthy')) return 'healthy';
  if (probes.every((probe) => probe.state === 'failed')) return 'failed';
  return 'unsafe';
}

/** Dependency injection keeps all tests local: no real DNS writes or credentials. */
export async function runFailover({
  mode = 'check', token, transport = createHttpsTransport(), sleep = delay,
  now = Date.now,
} = {}) {
  const diagnostics = { publicRounds: [] };
  let writeAttempted = false;
  const summary = (outcome, exitCode, changed = false, extra = {}) => ({
    mode: ['check', 'apply', 'probe-public'].includes(mode) ? mode : 'invalid',
    outcome, changed, exitCode, ...diagnostics, ...extra,
  });
  const deadline = now() + RUN_MS;
  const remaining = () => deadline - now();
  const request = async (spec) => {
    if (remaining() <= 0) throw new SafeError('run_deadline_exceeded');
    try {
      return await transport({ ...spec, timeoutMs: Math.min(REQUEST_MS, remaining()) });
    } catch {
      // Never surface native exception text, which may include request headers.
      return { error: 'unexpected_transport_error' };
    }
  };
  const api = async (method, path, body) => {
    if (!((method === 'GET' && /^\?page=\d+&per_page=100$/.test(path))
      || (method === 'POST' && path === '/batch'))) throw new SafeError('invalid_api_operation');
    const response = await request({
      hostname: API_HOST, path: RECORDS_PATH + path, method,
      headers: {
        Host: API_HOST, Authorization: `Bearer ${token}`,
        Accept: 'application/json', 'Accept-Encoding': 'identity',
        'User-Agent': 'DRAVA-DNS-Failover/1.0',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}), maxBytes: API_MAX_BYTES,
    });
    if (response?.error) throw new SafeError('cloudflare_api_transport_error');
    if (!Number.isInteger(response?.status) || response.status < 200 || response.status >= 300) {
      // Includes redirects: never forward the token to a Location header.
      throw new SafeError('cloudflare_api_http_error');
    }
    let parsed;
    try { parsed = JSON.parse(response.body); } catch { throw new SafeError('cloudflare_api_invalid_json'); }
    if (parsed?.success !== true) throw new SafeError('cloudflare_api_rejected');
    return parsed;
  };
  const readRecords = async () => {
    const records = [];
    let totalCount;
    let totalPages;
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const result = await api('GET', `?page=${page}&per_page=${PER_PAGE}`);
      const info = result.result_info;
      if (!Array.isArray(result.result) || !info || info.page !== page
        || info.per_page !== PER_PAGE || info.count !== result.result.length
        || !Number.isInteger(info.total_count) || info.total_count < 0 || info.total_count > MAX_PAGES * PER_PAGE
        || !Number.isInteger(info.total_pages) || info.total_pages < 1 || info.total_pages > MAX_PAGES
        || info.total_pages !== Math.max(1, Math.ceil(info.total_count / PER_PAGE))
        || result.result.length > PER_PAGE) throw new SafeError('invalid_dns_pagination');
      if (page === 1) { totalCount = info.total_count; totalPages = info.total_pages; }
      if (info.total_count !== totalCount || info.total_pages !== totalPages
        || (page < totalPages && result.result.length !== PER_PAGE)) throw new SafeError('changing_dns_pagination');
      records.push(...result.result);
      if (page === totalPages) {
        if (records.length !== totalCount) throw new SafeError('incomplete_dns_records');
        return { ...validateRecords(records), pageCount: totalPages };
      }
    }
    throw new SafeError('dns_page_limit_exceeded');
  };
  const probeSet = async (address) => Promise.all(PROBES.map(async (probe) => {
    const response = await request({
      hostname: probe.hostname, path: probe.path, method: 'GET',
      headers: { Host: probe.hostname, Accept: '*/*', 'Accept-Encoding': 'identity', 'User-Agent': 'DRAVA-DNS-Failover/1.0' },
      ...(address ? { address } : {}), maxBytes: probe.maxBytes,
    });
    return { target: address ? `origin/${address}/${probe.label}` : `public/${probe.label}`,
      ...classifyProbe(probe.label, response) };
  }));
  const publicRound = async () => {
    const probes = await probeSet();
    const state = summarizeProbes(probes);
    diagnostics.publicRounds.push({ round: diagnostics.publicRounds.length + 1, state, probes });
    return state;
  };

  try {
    if (!['check', 'apply', 'probe-public'].includes(mode)) return summary('invalid_arguments', 1);
    if (mode === 'probe-public') {
      const state = await publicRound();
      return summary(state === 'healthy' ? 'public_healthy' : 'public_unhealthy', state === 'healthy' ? 0 : 1);
    }
    if (typeof token !== 'string' || !/^[A-Za-z0-9_.-]{20,512}$/.test(token)) {
      return summary('missing_or_invalid_token', 1);
    }
    const initial = await readRecords();
    diagnostics.dnsState = initial.state;
    if (initial.state === 'dns_only') return summary('already_dns_only', 0);
    for (let round = 0; round < 3; round += 1) {
      if (round > 0) {
        if (remaining() <= ROUND_DELAY_MS) throw new SafeError('run_deadline_exceeded');
        await sleep(ROUND_DELAY_MS);
      }
      const state = await publicRound();
      if (state === 'healthy') return summary(round === 0 ? 'healthy' : 'recovered', 0);
      if (state !== 'failed') return summary('unsafe_public_response', 1);
    }

    diagnostics.originProbes = (await Promise.all(ORIGIN_ADDRESSES.map(probeSet))).flat();
    if (summarizeProbes(diagnostics.originProbes) !== 'healthy') return summary('origin_unhealthy', 1);

    // A recovery or protection response immediately before writing cancels failover.
    const lastPublic = await publicRound();
    if (lastPublic === 'healthy') return summary('recovered', 0);
    if (lastPublic !== 'failed') return summary('unsafe_public_response', 1);
    const current = await readRecords();
    if (current.state === 'dns_only' && current.identity === initial.identity) {
      diagnostics.dnsState = 'dns_only';
      return summary('already_dns_only', 0);
    }
    if (current.fingerprint !== initial.fingerprint) return summary('concurrent_dns_change', 1);
    if (mode === 'check') return summary('would_failover', 1);
    // Leave enough time for a full verification read even if the write times out.
    const verificationPages = current.pageCount;
    if (remaining() <= REQUEST_MS * (verificationPages + 1)) throw new SafeError('insufficient_verification_time');

    let acknowledged = false;
    writeAttempted = true;
    try {
      // THE ONLY WRITE. No creates, deletes, TTL changes, destinations or proxy enablement.
      await api('POST', '/batch', { patches: current.records.map(({ id }) => ({ id, proxied: false })) });
      acknowledged = true;
    } catch {
      // Even a timeout may have committed. Never retry this POST.
    }
    let verified;
    try { verified = await readRecords(); } catch {
      return summary('failover_verification_failed', 1, null, { writeAttempted: true });
    }
    if (verified.state === 'dns_only' && verified.identity === initial.identity) {
      diagnostics.dnsState = 'dns_only';
      return summary(acknowledged ? 'failover_applied' : 'failover_applied_after_ambiguous_response', 2, true);
    }
    return summary('failover_verification_failed', 1, null, { writeAttempted: true });
  } catch (error) {
    return summary('error', 1, writeAttempted ? null : false, {
      reason: error instanceof SafeError ? error.code : 'unexpected_error',
      ...(writeAttempted ? { writeAttempted: true } : {}),
    });
  }
}

export async function main(args = process.argv.slice(2), env = process.env, dependencies = {}) {
  let result;
  if (args.length > 1 || (args.length === 1 && !['--check', '--apply', '--probe-public'].includes(args[0]))) {
    result = { mode: 'invalid', outcome: 'invalid_arguments', changed: false, exitCode: 1 };
  } else {
    const mode = (args[0] ?? '--check').slice(2);
    result = await runFailover({ ...dependencies, mode,
      token: mode === 'probe-public' ? undefined : env.CLOUDFLARE_DNS_FAILOVER_TOKEN });
  }
  // Exactly one safe JSON summary. No remote bodies, API messages, IDs or secrets.
  process.stdout.write(`${JSON.stringify(result)}\n`);
  return result.exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}

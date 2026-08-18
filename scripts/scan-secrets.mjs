#!/usr/bin/env node
/**
 * 시크릿 / 개인정보 스캐너.
 *
 * 목적: 소스·문서·테스트·스크린샷 경로 등 저장소에 들어가는 텍스트에
 *       실제 키·토큰·개인정보가 섞이지 않도록 상시 검사한다.
 *
 * `npm run verify` 와 CI 의 **가장 앞단**에서 실행한다.
 * 다른 검사를 모두 통과해도 시크릿이 새면 그 빌드는 실패여야 하기 때문이다.
 *
 * 종료 코드: 발견 0건 → 0, 1건 이상 → 1
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname, sep } from 'node:path';

const ROOT = process.cwd();
const SELF = 'scripts/scan-secrets.mjs';

const SKIP_DIRS = new Set([
	'node_modules',
	'.git',
	'.svelte-kit',
	'.wrangler',
	'build',
	'dist',
	'coverage',
	'test-results',
	'playwright-report',
	'.playwright'
]);

const SKIP_FILES = new Set(['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock']);

const TEXT_EXT = new Set([
	'.ts',
	'.tsx',
	'.js',
	'.mjs',
	'.cjs',
	'.svelte',
	'.json',
	'.jsonc',
	'.css',
	'.html',
	'.md',
	'.sql',
	'.yml',
	'.yaml',
	'.txt',
	'.sh',
	'.toml',
	'.vars'
]);

/** 명백한 자리표시자 값 — 실제 시크릿이 아니다. */
const PLACEHOLDER =
	/^(x{3,}|\.{3}|<.*>|\{\{.*\}\}|\$\{.*\}|your[-_ ]?|placeholder|change[-_ ]?me|dummy|example|sample|fake|test|todo|replace|none|null|undefined|1234|abc|secret|token|password)/i;

/** 테스트용 가짜 비밀번호 — 문서/픽스처에 등장해도 정상. */
const KNOWN_FAKE = /^(TestPassword123!|demo|test_[a-z_]+)$/;

const ALLOWED_EMAIL_DOMAINS = /@(example\.(com|org|net)|test\.local|localhost|invalid)$/i;

const RULES = [
	{
		id: 'private-key',
		desc: '개인키 블록',
		re: /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/g
	},
	{
		id: 'aws-access-key',
		desc: 'AWS Access Key ID',
		re: /\bAKIA[0-9A-Z]{16}\b/g
	},
	{
		id: 'openai-key',
		desc: 'OpenAI 형식 API 키',
		re: /\bsk-[A-Za-z0-9_-]{20,}\b/g
	},
	{
		id: 'github-token',
		desc: 'GitHub 토큰',
		re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g
	},
	{
		id: 'slack-token',
		desc: 'Slack 토큰',
		re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g
	},
	{
		id: 'cloudflare-account-id',
		desc: 'Cloudflare account id 로 보이는 32자리 hex',
		re: /account[_-]?id["'\s]*[:=]["'\s]*([0-9a-f]{32})\b/gi,
		capture: 1
	},
	{
		id: 'secret-assignment',
		desc: '하드코딩된 시크릿 대입',
		re: /\b(?:password|passwd|pwd|secret|api[_-]?key|apikey|auth[_-]?token|access[_-]?token|credential|private[_-]?key)\b\s*[:=]\s*["'`]([^"'`\n]{4,})["'`]/gi,
		capture: 1,
		allow: (v) => PLACEHOLDER.test(v) || KNOWN_FAKE.test(v)
	},
	{
		id: 'email',
		desc: '실제 이메일로 보이는 문자열',
		re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
		allow: (v) => ALLOWED_EMAIL_DOMAINS.test(v)
	},
	{
		id: 'kr-phone',
		desc: '휴대전화번호 형식',
		re: /\b01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}\b/g
	},
	{
		id: 'kr-rrn',
		desc: '주민등록번호 형식',
		re: /\b\d{6}[-\s]?[1-4]\d{6}\b/g
	}
];

/** @returns {string[]} */
function walk(dir, acc = []) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		let st;
		try {
			st = statSync(full);
		} catch {
			continue;
		}
		if (st.isDirectory()) {
			if (SKIP_DIRS.has(entry)) continue;
			walk(full, acc);
		} else if (st.isFile()) {
			if (SKIP_FILES.has(entry)) continue;
			const ext = extname(entry);
			const isEnvLike = /^\.(env|dev\.vars)/.test(entry) || entry === '.dev.vars';
			if (!TEXT_EXT.has(ext) && !isEnvLike && ext !== '') continue;
			if (ext === '' && !isEnvLike && !/^(Dockerfile|Makefile|LICENSE|README)$/i.test(entry))
				continue;
			if (st.size > 2_000_000) continue;
			acc.push(full);
		}
	}
	return acc;
}

function redact(value) {
	if (value.length <= 8) return '*'.repeat(value.length);
	return `${value.slice(0, 3)}${'*'.repeat(Math.min(12, value.length - 6))}${value.slice(-3)}`;
}

const findings = [];

// --- 1. 파일 내용 스캔 ---------------------------------------------------------
for (const file of walk(ROOT)) {
	const rel = relative(ROOT, file).split(sep).join('/');
	if (rel === SELF) continue; // 스캐너 자신의 패턴 정의는 검사하지 않는다

	let text;
	try {
		text = readFileSync(file, 'utf8');
	} catch {
		continue;
	}
	if (text.indexOf(String.fromCharCode(0)) !== -1) continue; // 바이너리로 판단

	const lines = text.split(/\r?\n/);

	for (const rule of RULES) {
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (line.includes('scan-secrets-ignore')) continue;
			rule.re.lastIndex = 0;
			let m;
			while ((m = rule.re.exec(line)) !== null) {
				const value = rule.capture ? m[rule.capture] : m[0];
				if (!value) continue;
				if (rule.allow?.(value)) continue;
				findings.push({ rel, line: i + 1, rule, value });
			}
		}
	}
}

// --- 2. 시크릿 파일이 저장소에 노출되어 있는지 --------------------------------
const gitignore = existsSync(join(ROOT, '.gitignore'))
	? readFileSync(join(ROOT, '.gitignore'), 'utf8')
	: '';

for (const secretFile of ['.env', '.dev.vars', '.env.local', '.env.production']) {
	if (!existsSync(join(ROOT, secretFile))) continue;
	const ignored = gitignore.split(/\r?\n/).some((l) => {
		const p = l.trim();
		if (!p || p.startsWith('#')) return false;
		return (
			p === secretFile ||
			p === `/${secretFile}` ||
			(p === '.env.*' && secretFile.startsWith('.env.')) ||
			p === '.env*'
		);
	});
	if (!ignored) {
		findings.push({
			rel: secretFile,
			line: 0,
			rule: { id: 'unignored-secret-file', desc: '시크릿 파일이 .gitignore 에 없음' },
			value: secretFile
		});
	}
}

// --- 결과 --------------------------------------------------------------------
if (findings.length === 0) {
	console.log('[scan-secrets] PASS — 시크릿/개인정보 패턴 발견 없음');
	process.exit(0);
}

console.error(`\n[scan-secrets] FAIL — ${findings.length}건 발견\n`);
for (const f of findings) {
	const where = f.line ? `${f.rel}:${f.line}` : f.rel;
	console.error(`  ✗ [${f.rule.id}] ${where}`);
	console.error(`      ${f.rule.desc}: ${redact(String(f.value))}`);
}
console.error(
	'\n오탐이라면 해당 줄에 `scan-secrets-ignore` 주석을 추가하거나 자리표시자 값으로 바꾸세요.\n'
);
process.exit(1);

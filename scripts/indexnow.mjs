#!/usr/bin/env node
/**
 * IndexNow — **로그인 없이 검색엔진에 "여기 있다" 고 알린다.**
 *
 *   npm run indexnow -- --dry     # 보내지 않고 무엇을 보낼지만 본다
 *   npm run indexnow              # 실제로 보낸다
 *
 * ── 왜 이것인가 ──────────────────────────────────────────────────────
 * 사전은 떴는데 본문 1,843장이 어느 검색엔진에도 없었다. 사이트맵은 robots.txt 가
 * 가리키고 있지만, 네이버는 그것만으로는 부족하고 웹마스터도구에 제출해야 한다 —
 * 그런데 그건 로그인이 필요하다.
 *
 * IndexNow 는 그 벽을 우회한다. 계정도 로그인도 없이, **사이트 루트에 놓인 키 파일
 * 하나**로 소유를 증명하고 주소 목록을 통보한다. 네이버가 공식 참여사다.
 * (구글은 참여하지 않는다 — 구글에는 사이트맵과 서치콘솔뿐이다.)
 *
 * ── 무엇을 약속하지 않는가 ───────────────────────────────────────────
 * 네이버는 제 문서에 두 번 못 박았다: "웹페이지의 색인을 보장하지는 않습니다."
 * 200 은 **받았다**는 뜻이지 실렸다는 뜻이 아니다. 그래도 알리지 않는 것보다는 낫다.
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';

const HOST = 'hanjasajeon.pages.dev';
const ORIGIN = `https://${HOST}`;

/** src/lib/sites.ts 의 값을 그대로 읽는다 — 두 곳에 적어 두면 반드시 어긋난다 */
const KEY = readFileSync('src/lib/sites.ts', 'utf8').match(
	/INDEXNOW_KEY\s*=\s*'([a-fA-F0-9-]+)'/
)?.[1];

if (!KEY) {
	console.error('[indexnow] src/lib/sites.ts 에서 INDEXNOW_KEY 를 찾지 못했습니다.');
	process.exit(1);
}

const KEY_URL = `${ORIGIN}/${KEY}.txt`;
const dry = process.argv.includes('--dry');

/*
 * 어디로 보내는가.
 *
 * 전역 엔드포인트 하나면 참여사끼리 서로 전달한다는 것이 프로토콜의 약속이지만,
 * **네이버에는 직접 보낸다.** 한국어 한자 질의에서 실제로 중요한 것이 네이버이고,
 * 전달이 언제 이뤄지는지는 우리가 볼 수 없기 때문이다.
 */
const ENDPOINTS = [
	{ name: '네이버', url: 'https://searchadvisor.naver.com/indexnow' },
	{ name: '전역(Bing·Yandex 등)', url: 'https://api.indexnow.org/indexnow' }
];

/** 사이트맵이 이미 정답을 갖고 있다 — 목록을 두 번 만들 이유가 없다 */
function urlsFromSitemap() {
	const xml = readFileSync('.svelte-kit/cloudflare/sitemap.xml', 'utf8');
	return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

/** 한 번에 보낼 수 있는 상한은 10,000 이지만, 나눠 보내야 어디서 막혔는지 보인다 */
const BATCH = 500;

async function submit(endpoint, urls) {
	const res = await fetch(endpoint.url, {
		method: 'POST',
		headers: { 'content-type': 'application/json; charset=utf-8' },
		body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_URL, urlList: urls })
	});
	return { status: res.status, text: (await res.text()).slice(0, 200) };
}

/** 응답 코드가 무슨 뜻인지 — 숫자만 보고는 알 수 없다 */
function explain(status) {
	if (status === 200) return '받았다 (색인 보장은 아니다)';
	if (status === 202) return '받았다 · 키 확인 중';
	if (status === 400) return '요청 형식이 틀렸다';
	if (status === 403) return '키가 무효하다 — 키 파일이 안 읽힌다';
	if (status === 422) return 'URL 이 host/key 범위와 맞지 않는다';
	if (status === 429) return '너무 많이 보냈다';
	return '알 수 없는 응답';
}

const urls = urlsFromSitemap();
console.log(`[indexnow] 호스트 ${HOST}`);
console.log(`[indexnow] 키 파일 ${KEY_URL}`);
console.log(`[indexnow] 보낼 주소 ${urls.length}개 (사이트맵에서 읽음)\n`);

/*
 * 키 파일이 실제로 읽히는지 **먼저** 본다.
 *
 * 이걸 건너뛰면 403 을 잔뜩 받고 나서야 원인을 찾게 된다. 여기서 한 번 확인하면
 * 리다이렉트에 걸려 있는지, 내용이 다른지가 즉시 드러난다.
 */
const probe = await fetch(KEY_URL, { redirect: 'manual' });
const body = probe.ok ? (await probe.text()).trim() : '';
if (probe.status !== 200 || body !== KEY) {
	console.error(`[indexnow] 키 파일을 검색엔진이 읽을 수 없습니다.`);
	console.error(`           ${KEY_URL} → ${probe.status}`);
	if (probe.status >= 300 && probe.status < 400) {
		console.error(`           리다이렉트: ${probe.headers.get('location')}`);
		console.error(`           _routes.json 의 exclude 에 이 경로가 있는지 확인하세요.`);
	} else if (probe.status === 200) {
		console.error(`           내용이 키와 다릅니다 (받은 것: ${body.slice(0, 40)})`);
	}
	process.exit(1);
}
console.log(`[indexnow] 키 파일 확인 200 · 내용 일치\n`);

if (dry) {
	console.log(`[indexnow] --dry 이므로 보내지 않습니다.`);
	console.log(`           보낼 곳: ${ENDPOINTS.map((e) => e.name).join(', ')}`);
	console.log(`           배치: ${Math.ceil(urls.length / BATCH)}회 × 최대 ${BATCH}개`);
	console.log(`           예시: ${urls.slice(0, 3).join('\n                 ')}`);
	process.exit(0);
}

let failed = 0;
for (const endpoint of ENDPOINTS) {
	console.log(`[indexnow] → ${endpoint.name}`);
	for (let i = 0; i < urls.length; i += BATCH) {
		const batch = urls.slice(i, i + BATCH);
		const { status, text } = await submit(endpoint, batch);
		const nth = `${Math.floor(i / BATCH) + 1}/${Math.ceil(urls.length / BATCH)}`;
		const ok = status === 200 || status === 202;
		if (!ok) failed++;
		console.log(
			`           ${nth} ${batch.length}개 → ${status} ${explain(status)}${text ? ` ${text}` : ''}`
		);
		if (status === 429) {
			console.log(`           과다요청이므로 이 엔드포인트는 중단합니다.`);
			break;
		}
	}
	console.log('');
}

if (failed) {
	console.error(`[indexnow] ${failed}개 배치가 실패했습니다.`);
	process.exit(1);
}
console.log('[indexnow] 통보 완료. 색인은 검색엔진이 정합니다.');

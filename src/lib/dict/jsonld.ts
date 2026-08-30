/**
 * 구조화 데이터를 `<script type="application/ld+json">` 안에 **안전하게** 넣는다.
 *
 * Svelte 는 `<svelte:head>` 안에 `<script>` 를 직접 쓰지 못하게 막아 두어
 * `{@html}` 을 거쳐야 하는데, 그러면 린터가 XSS 를 경고한다. 경고를 그냥 끄지 않고
 * **실제 위험을 없앤 뒤** 끄는 것이 맞다.
 *
 * 값은 전부 우리 시드에서 오지만 그것만 믿을 이유가 없다 — 문자열 안에 `</script`
 * 나 `<!--` 가 들어가면 태그가 **거기서 닫혀** 뒤따르는 내용이 마크업으로 해석된다.
 * `<` 를 유니코드 이스케이프로 바꾸면 그 길이 막힌다. JSON 의미는 그대로다
 * (`"<"` 와 `"<"` 는 같은 문자열이다).
 */
export function jsonLd(data: unknown): string {
	const json = JSON.stringify(data).replace(/</g, '\\u003c');
	return `<script type="application/ld+json">${json}</script>`;
}

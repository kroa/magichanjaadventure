<script lang="ts">
	interface Props {
		onclick: () => void;
		class?: string;
	}

	let { onclick, class: className = '' }: Props = $props();
</script>

<!--
	도움 버튼 — 대결·복습·공방이 **같은 모양, 같은 자리**를 쓴다.

	원래 대결과 복습에 똑같은 마크업과 CSS 가 두 벌 복붙돼 있었다.
	공방에도 힌트가 생기면서 세 벌이 될 참이라 여기로 모았다.
	화면마다 도움 버튼이 조금씩 다르면 아이는 게임이 아니라 화면 사용법을 배우게 된다.

	소리는 **여기서 내지 않는다.** 부르는 쪽의 `askHint` 가 이미 클릭음을 내므로
	여기서도 내면 두 번 난다.
	오른쪽 밀기(`ml-auto`)도 부르는 쪽이 정한다 — 공방은 배지 옆에 붙기 때문이다.
-->
<button type="button" class="help {className}" {onclick} aria-label="도와줘">?</button>

<style>
	.help {
		display: grid;
		place-items: center;
		/* 아이 손가락 기준 하한선 */
		width: var(--tap-min);
		height: var(--tap-min);
		flex-shrink: 0;
		border: 3px solid var(--color-gold-400);
		border-radius: 9999px;
		background: #fff;
		color: var(--color-gold-700);
		font-size: 1.1rem;
		font-weight: 700;
		cursor: pointer;
	}
</style>

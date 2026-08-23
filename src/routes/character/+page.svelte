<script lang="ts">
	import { enhance } from '$app/forms';
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import Sparkle from '$lib/components/effects/Sparkle.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import { spriteFor, type SpriteComponent } from '$lib/game/characters';
	import { CHARACTERS, STARTER_CLASSES, type CharacterClass } from '$lib/types/user';

	let { data, form } = $props();

	/*
	 * 카드 자체가 **폼 제출 버튼**이다. 한 번 누르면 바로 선택된다.
	 *
	 * 왜 "고르기 → 확인" 2단계를 버렸나:
	 *  이전 구조는 카드 클릭이 JS 핸들러(onclick)로만 동작해서, 하이드레이션이 끝나기 전에
	 *  누르면 **아무 일도 일어나지 않았다.** 테스트에서 간헐적으로 재현됐고,
	 *  느린 기기를 쓰는 아이에게는 "눌렀는데 반응이 없는" 화면이 된다.
	 *
	 *  `<button type="submit" name="class" value="...">` 는 JS 가 없어도 동작한다.
	 *  JS 가 붙으면 use:enhance 가 가로채 부드럽게 처리할 뿐이다.
	 *
	 * 선택지를 스크립트에서 정의하는 이유: 템플릿에 `as const as [a, b]` 처럼 쓰면
	 * Svelte each 문법과 충돌해 프로덕션 빌드에서만 깨진 적이 있다.
	 */
	/*
	 * **스프라이트 매핑을 여기서 또 만들지 않는다.**
	 *
	 * `characters.ts` 에 `SPRITES` 와 `spriteFor()` 가 이미 있는데 이 파일이 두 종만 담은
	 * 사본을 따로 들고 `!` 로 단언하고 있었다. 캐릭터를 늘릴 때 한쪽만 고치면
	 * 조용히 `undefined` 가 되는 구조다 — 레벨업 오버레이가 정확히 그 사고를 냈다
	 * (기사·마법사가 아니면 전부 기사로 그려졌다).
	 */
	interface Choice {
		cls: CharacterClass;
		Sprite: SpriteComponent;
	}

	// 시작 캐릭터는 2종. 나머지는 상점에서 보석으로 얻는다.
	const CHOICES: Choice[] = STARTER_CLASSES.map((cls) => ({ cls, Sprite: spriteFor(cls) }));

	let picking = $state<CharacterClass | null>(null);
</script>

<svelte:head>
	<title>캐릭터 선택 · 마법한자탐험대</title>
</svelte:head>

<AppShell nav={false}>
	<div class="flex flex-col items-center gap-6 py-2">
		<div class="text-center">
			<h1 class="on-sky text-display-lg">누구와 떠날까?</h1>
			<p class="mt-1 text-white/85">둘 다 끝까지 갈 수 있어요. 마음에 드는 친구를 눌러 보세요.</p>
		</div>

		<form
			method="POST"
			class="flex w-full flex-col items-center gap-6"
			use:enhance={({ submitter }) => {
				picking = (submitter as HTMLButtonElement | null)?.value as CharacterClass;
				return async ({ update }) => {
					await update();
					picking = null;
				};
			}}
		>
			<div class="grid w-full gap-4 sm:grid-cols-2">
				{#each CHOICES as choice (choice.cls)}
					{@const stats = CHARACTERS[choice.cls]}
					{@const active = picking === choice.cls}
					{@const current = data.current === choice.cls}
					<button
						type="submit"
						name="class"
						value={choice.cls}
						class="pick relative isolate flex flex-col items-center gap-2 rounded-panel p-6 shadow-card"
						class:active
						class:current
						disabled={picking !== null}
						aria-label="{stats.label} 선택하기"
					>
						{#if active || current}<Sparkle count={6} />{/if}
						<choice.Sprite size={160} mood={active || current ? 'cheer' : 'happy'} />
						<h2 class="text-display-sm text-ink-900">{stats.label}</h2>
						<p class="text-sm text-ink-500">{stats.tagline}</p>
						<div class="mt-1 flex gap-2">
							<span class="stat bg-mint-100 text-mint-700">에너지 {stats.hp}</span>
							<span class="stat bg-ember-100 text-ember-600">공격 {stats.attack}</span>
						</div>
						<span class="cta mt-2 font-display">
							{#if active}
								<Spinner size="sm" label="떠나는 중" />
							{:else}
								이 친구와 떠나기
							{/if}
						</span>
					</button>
				{/each}
			</div>

			{#if form?.error}
				<p class="rounded-button bg-ember-100 px-4 py-3 text-sm text-ember-600" role="alert">
					{form.error}
				</p>
			{/if}
		</form>
	</div>
</AppShell>

<style>
	.pick {
		border: 3px solid transparent;
		background: rgb(255 255 255 / 0.75);
		cursor: pointer;
		transition:
			transform 0.2s var(--ease-pop),
			border-color 0.2s ease,
			box-shadow 0.2s ease;
	}
	.pick:hover:not(:disabled) {
		transform: translateY(-4px);
		border-color: var(--color-magic-300);
	}
	.pick.active,
	.pick.current {
		border-color: var(--color-magic-500);
		box-shadow: var(--shadow-glow-magic);
	}
	.pick:disabled:not(.active) {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.stat {
		border-radius: 9999px;
		padding: 0.25rem 0.7rem;
		font-size: 0.8rem;
		font-family: var(--font-display);
	}

	/* 카드가 버튼이라는 것을 분명히 보여 준다 */
	.cta {
		display: grid;
		place-items: center;
		min-height: var(--tap-min);
		width: 100%;
		border-radius: var(--radius-button);
		background: var(--gradient-magic);
		color: #fff;
		box-shadow: 0 4px 0 var(--color-magic-700);
		padding: 0 1rem;
	}
</style>

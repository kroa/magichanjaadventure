<script lang="ts">
	/*
	 * PHASE 1 부팅 확인용 임시 화면.
	 * PHASE 3 에서 "모험 지도" 메인 화면으로 완전히 교체된다.
	 */
	const phases = [
		{ n: 2, label: '디자인 시스템' },
		{ n: 3, label: '메인 화면 (모험 지도)' },
		{ n: 5, label: 'D1 데이터베이스' },
		{ n: 6, label: '회원가입 / 로그인' }
	];
</script>

<svelte:head>
	<title>마법한자탐험대</title>
	<meta name="description" content="한자를 배우며 떠나는 판타지 모험" />
</svelte:head>

<main class="mx-auto flex min-h-dvh max-w-[1120px] flex-col items-center justify-center px-6 py-16">
	<p class="text-3xl" aria-hidden="true">✨</p>

	<h1 class="mt-2 text-center text-4xl font-bold text-magic-700 sm:text-5xl">마법한자탐험대</h1>

	<p class="mt-3 text-center text-ink-500">한자를 배우며 떠나는 판타지 모험</p>

	<section
		class="mt-10 w-full rounded-3xl bg-white/70 p-6 shadow-lg backdrop-blur-sm sm:p-8"
		data-testid="phase-status"
	>
		<h2 class="text-lg font-bold text-ink-900">개발 환경 준비 완료</h2>
		<p class="mt-1 text-sm text-ink-500">
			PHASE 1 — SvelteKit + Cloudflare Workers + D1/R2 바인딩 + Playwright 구성
		</p>

		<ul class="mt-5 grid gap-3 sm:grid-cols-2">
			{#each phases as phase (phase.n)}
				<li class="flex items-center gap-3 rounded-2xl bg-magic-50 px-4 py-3">
					<span
						class="grid size-8 shrink-0 place-items-center rounded-full bg-magic-500 text-sm font-bold text-white"
					>
						{phase.n}
					</span>
					<span class="text-sm font-medium text-ink-900">{phase.label}</span>
				</li>
			{/each}
		</ul>
	</section>
</main>

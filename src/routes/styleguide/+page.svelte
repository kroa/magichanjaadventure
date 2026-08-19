<script lang="ts">
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import TopHud from '$lib/components/layout/TopHud.svelte';
	import Button from '$lib/components/common/Button.svelte';
	import IconButton from '$lib/components/common/IconButton.svelte';
	import Card from '$lib/components/common/Card.svelte';
	import Panel from '$lib/components/common/Panel.svelte';
	import ProgressBar from '$lib/components/common/ProgressBar.svelte';
	import Badge from '$lib/components/common/Badge.svelte';
	import Chip from '$lib/components/common/Chip.svelte';
	import Modal from '$lib/components/common/Modal.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import EmptyState from '$lib/components/common/EmptyState.svelte';
	import SpeechBubble from '$lib/components/common/SpeechBubble.svelte';
	import Divider from '$lib/components/common/Divider.svelte';
	import Sparkle from '$lib/components/effects/Sparkle.svelte';
	import ParticleBurst from '$lib/components/effects/ParticleBurst.svelte';
	import KnightSprite from '$lib/components/art/KnightSprite.svelte';
	import WizardSprite from '$lib/components/art/WizardSprite.svelte';
	import { toasts } from '$lib/stores/toast.svelte';
	import { TONES, type Mood, type Tone } from '$lib/types/ui';

	/* PHASE 2 디자인 시스템 확인용 화면. 실제 서비스 라우트가 아니다. */

	let modalOpen = $state(false);
	let burst = $state(0);
	let mood = $state<Mood>('happy');
	let selectedArea = $state(1);
	let demoExp = $state(140);

	const MOODS: { value: Mood; label: string }[] = [
		{ value: 'happy', label: '기본' },
		{ value: 'cheer', label: '신남' },
		{ value: 'surprised', label: '놀람' },
		{ value: 'sad', label: '시무룩' }
	];

	const AREAS = ['새싹 마을', '반짝 시냇가', '바람 언덕', '무지개 다리'];

	const SWATCHES: { tone: Tone; label: string; use: string }[] = [
		{ tone: 'magic', label: 'magic', use: '기본 행동 · 브랜드' },
		{ tone: 'sky', label: 'sky', use: '정보 · 물' },
		{ tone: 'mint', label: 'mint', use: '정답 · 성장' },
		{ tone: 'gold', label: 'gold', use: '보상 · EXP' },
		{ tone: 'candy', label: 'candy', use: '강조 · 애정' },
		{ tone: 'ember', label: 'ember', use: '오답 · 위험' }
	];

	const SHADES = [
		['magic', ['#F3F0FF', '#CFC2FF', '#9575FF', '#7C5CFF', '#5231BC', '#2B1A66']],
		['sky', ['#EEF9FF', '#B5E6FF', '#83D6FF', '#4FC3F7', '#22ABEE', '#0B6F9F']],
		['mint', ['#D7FBF3', '#99F6E4', '#5EEAD4', '#2DD4BF', '#14B8A6', '#0F9488']],
		['gold', ['#FFF5D6', '#FFE08A', '#FFD25E', '#FFC93C', '#F5A623', '#D4860E']],
		['candy', ['#FFE4EE', '#FFC2DA', '#FF9EC4', '#FF7AAE', '#F25892', '#C1547A']],
		['ember', ['#FFE5E5', '#FFB8B8', '#FF8B8B', '#FF6B6B', '#E85252', '#C33F3F']],
		['ink', ['#F5F3FB', '#9A93BC', '#6F659B', '#4A3F7A', '#2A2050', '#1B1042']]
	] as const;
</script>

<svelte:head>
	<title>디자인 시스템 · 마법한자탐험대</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<AppShell>
	{#snippet hud()}
		<TopHud nickname="test_knight" level={7} exp={demoExp} expToNext={340} gems={128} />
	{/snippet}

	<div class="flex flex-col gap-8">
		<div>
			<h1 class="text-display-lg text-magic-700">디자인 시스템</h1>
			<p class="mt-1 text-ink-500">PHASE 2 — 토큰 · 컴포넌트 · 캐릭터 확인용 화면</p>
		</div>

		<!-- ── 캐릭터 ────────────────────────────────────────────────── -->
		<Panel title="캐릭터" icon="🛡️">
			<div class="flex flex-wrap items-end justify-center gap-8">
				<div class="relative isolate text-center">
					<Sparkle count={5} />
					<KnightSprite {mood} size={150} />
					<p class="mt-2 font-display text-ink-900">한자 기사</p>
					<p class="text-sm text-ink-500">에너지가 많아 틀려도 버틴다</p>
				</div>
				<div class="relative isolate text-center">
					<Sparkle count={5} color="var(--color-mint-400)" />
					<WizardSprite {mood} size={150} />
					<p class="mt-2 font-display text-ink-900">한자 마법사</p>
					<p class="text-sm text-ink-500">공격력이 높아 빨리 이긴다</p>
				</div>
			</div>

			<Divider label="표정" />

			<div class="flex flex-wrap justify-center gap-2">
				{#each MOODS as m (m.value)}
					<Chip selected={mood === m.value} onclick={() => (mood = m.value)}>{m.label}</Chip>
				{/each}
			</div>
		</Panel>

		<!-- ── 색상 ──────────────────────────────────────────────────── -->
		<Panel title="색상" icon="🎨">
			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each SWATCHES as s (s.tone)}
					<Card tone={s.tone} padding="sm">
						<p class="font-display text-ink-900">{s.label}</p>
						<p class="text-sm text-ink-500">{s.use}</p>
					</Card>
				{/each}
			</div>

			<Divider label="계열" />

			<div class="flex flex-col gap-2">
				{#each SHADES as [name, colors] (name)}
					<div class="flex items-center gap-3">
						<span class="w-14 shrink-0 font-display text-sm text-ink-500">{name}</span>
						<div class="flex flex-1 overflow-hidden rounded-full">
							{#each colors as color (color)}
								<span class="h-7 flex-1" style="background:{color}"></span>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</Panel>

		<!-- ── 타이포그래피 ───────────────────────────────────────────── -->
		<Panel title="글자" icon="🔤">
			<div class="flex flex-col gap-4">
				<div>
					<p class="text-sm text-ink-400">display · Jua — 제목과 버튼</p>
					<p class="text-display-lg text-ink-900">오늘은 어떤 모험을 하지?</p>
				</div>
				<div>
					<p class="text-sm text-ink-400">body · Noto Sans KR — 본문 (최소 16px)</p>
					<p>새로운 한자를 발견하면 도감이 한 칸씩 채워집니다.</p>
				</div>
				<div>
					<p class="text-sm text-ink-400">
						hanja · Noto Serif KR — 획의 시작과 끝이 보여야 학습이 된다
					</p>
					<p class="hanja text-hanja-card text-magic-700">水 火 木 金 土</p>
				</div>
			</div>
		</Panel>

		<!-- ── 버튼 ──────────────────────────────────────────────────── -->
		<Panel title="버튼" icon="🎮">
			<div class="flex flex-wrap gap-3">
				{#each TONES as tone (tone)}
					<Button variant={tone}>{tone}</Button>
				{/each}
				<Button variant="ghost">ghost</Button>
			</div>

			<Divider label="크기 · 상태" />

			<div class="flex flex-wrap items-center gap-3">
				<Button size="sm">작게</Button>
				<Button size="md">보통</Button>
				<Button size="lg">크게</Button>
				<Button disabled>비활성</Button>
				<Button loading>불러오는 중</Button>
				<Button variant="gold" href="/">링크형</Button>
			</div>

			<Divider label="아이콘 버튼" />

			<div class="flex flex-wrap gap-3">
				<IconButton label="소리 켜기" tone="magic">🔊</IconButton>
				<IconButton label="설정" tone="ghost">⚙️</IconButton>
				<IconButton label="도움말" tone="sky" size="lg">❓</IconButton>
				<IconButton label="보상 받기" tone="gold" size="lg">🎁</IconButton>
			</div>
		</Panel>

		<!-- ── 진행바 / 배지 ─────────────────────────────────────────── -->
		<Panel title="진행바와 배지" icon="📊">
			<div class="flex flex-col gap-4">
				<div>
					<p class="mb-1.5 text-sm text-ink-500">경험치</p>
					<ProgressBar value={demoExp} max={340} tone="gold" size="lg" showValue label="경험치" />
				</div>
				<div>
					<p class="mb-1.5 text-sm text-ink-500">내 에너지</p>
					<ProgressBar value={84} max={120} tone="mint" label="플레이어 에너지" />
				</div>
				<div>
					<p class="mb-1.5 text-sm text-ink-500">몬스터 에너지</p>
					<ProgressBar value={38} max={100} tone="ember" label="몬스터 에너지" />
				</div>

				<div class="flex flex-wrap gap-3">
					<Button size="sm" variant="mint" onclick={() => (demoExp = Math.min(340, demoExp + 40))}>
						+40 EXP
					</Button>
					<Button size="sm" variant="ghost" onclick={() => (demoExp = 0)}>초기화</Button>
				</div>
			</div>

			<Divider label="배지" />

			<div class="flex flex-wrap items-center gap-2">
				<Badge tone="gold" fill="solid">🔥 10 콤보</Badge>
				<Badge tone="mint">정답!</Badge>
				<Badge tone="ember">아쉬워요</Badge>
				<Badge tone="magic" fill="solid">8급</Badge>
				<Badge tone="sky">새 한자</Badge>
				<Badge tone="candy" size="sm">업적</Badge>
			</div>

			<Divider label="지역 선택" />

			<div class="flex flex-wrap gap-2">
				{#each AREAS as area, i (area)}
					<Chip
						selected={selectedArea === i + 1}
						locked={i > 2}
						disabled={i > 2}
						onclick={() => (selectedArea = i + 1)}
					>
						{area}
					</Chip>
				{/each}
			</div>
		</Panel>

		<!-- ── 말풍선 / 피드백 ───────────────────────────────────────── -->
		<Panel title="말풍선과 피드백" icon="💬">
			<div class="flex flex-wrap items-end gap-6">
				<div class="max-w-xs flex-1">
					<SpeechBubble tone="white">
						<p class="font-display">첫 마법 한자를 찾아보자!</p>
					</SpeechBubble>
					<div class="mt-4 pl-2">
						<WizardSprite size={110} />
					</div>
				</div>

				<div class="flex flex-wrap gap-3">
					<Button variant="mint" onclick={() => toasts.success('정답이에요! +10 EXP')}>
						정답 토스트
					</Button>
					<Button variant="ember" onclick={() => toasts.warn('아쉬워요, 다시 해볼까요?')}>
						오답 토스트
					</Button>
					<Button variant="gold" onclick={() => toasts.reward('새로운 한자를 획득했어요! 水')}>
						보상 토스트
					</Button>
					<Button variant="magic" onclick={() => (modalOpen = true)}>모달 열기</Button>
				</div>
			</div>
		</Panel>

		<!-- ── 효과 ──────────────────────────────────────────────────── -->
		<Panel title="효과" icon="✨">
			<div class="flex flex-wrap items-center justify-around gap-6">
				<div class="relative grid h-40 w-40 place-items-center">
					<ParticleBurst trigger={burst} />
					<Button variant="gold" onclick={() => burst++}>터뜨리기</Button>
				</div>

				<div
					class="relative grid h-40 w-40 place-items-center overflow-hidden rounded-card bg-magic-900"
				>
					<Sparkle count={8} />
					<span class="hanja text-4xl text-white">魔</span>
				</div>

				<div class="grid h-40 w-40 place-items-center">
					<Spinner size="lg" />
				</div>
			</div>
		</Panel>

		<!-- ── 빈 상태 ───────────────────────────────────────────────── -->
		<Panel title="빈 상태" icon="🕳️">
			<EmptyState
				icon="📖"
				title="아직 모은 한자가 없어요"
				description="한자를 배우면 이곳에 카드가 하나씩 채워집니다."
			>
				{#snippet action()}
					<Button variant="magic" href="/">한자 배우러 가기</Button>
				{/snippet}
			</EmptyState>
		</Panel>
	</div>
</AppShell>

<Modal bind:open={modalOpen} title="모험을 그만할까요?">
	<p>지금까지 모은 경험치는 그대로 저장돼요.</p>
	{#snippet footer()}
		<Button variant="ghost" onclick={() => (modalOpen = false)}>계속하기</Button>
		<Button variant="ember" onclick={() => (modalOpen = false)}>그만하기</Button>
	{/snippet}
</Modal>

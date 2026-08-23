/**
 * 한자 합체 — 순수 엔진.
 *
 * **이 게임의 핵심 설계.**
 * 한자를 문제로 내고 맞히게 하는 대신, 한자가 만들어지는 원리를 **조작 규칙**으로 삼는다.
 * 아이는 "日과 月을 합치면 뭐가 될까?" 를 손으로 시험해 보고, 明(밝을 명)을 얻는다.
 * 문제를 푸는 것이 아니라 **만드는 것**이다.
 *
 * 왜 이게 한자에 맞는가:
 *  - 한자는 실제로 조립식이다. 억지로 붙인 게임화가 아니라 글자가 생긴 원리 그대로다.
 *  - 부품(日·月·木·人)은 대부분 8급 기초자다. 합체를 할수록 기초가 저절로 복습된다.
 *  - 틀린 조합에 벌을 주지 않는다. 아무 일도 일어나지 않을 뿐이라 마음 놓고 시도한다.
 *
 * 채점 개념이 없다. 맞고 틀림이 아니라 **되고 안 되고**만 있다.
 */

/** 합쳐지는 방식. 아이에게 규칙을 설명할 때 쓴다. */
export type FusionKind = '회의' | '형성' | '지사' | '모양';

/**
 * 부품이 결과 글자 안에서 **어떻게 배치되는가.**
 *
 * 이걸 데이터로 갖는 이유: 지금까지 화면은 `[ ] + [ ]` 였다.
 * 그건 수식의 기하학이지 한자의 기하학이 아니다.
 * 明은 日과 月이 좌우로 붙은 것이고, 間은 門이 日을 감싼 것이다.
 * 칸을 실제 모양대로 놓으면 **설명 문장 없이도** 아이가 구조를 본다.
 *
 *  - lr      : 왼쪽 + 오른쪽 (明, 林, 好…)
 *  - tb      : 위 + 아래 (星, 天, 泉, 看…)
 *  - enclose : 앞의 것이 뒤의 것을 감싼다 (問, 聞, 間)
 *  - mark    : 글자에 획을 하나 그어 표시한다 (本)
 */
export type FusionLayout = 'lr' | 'tb' | 'enclose' | 'mark';

export interface FusionRecipe {
	/** 재료. 순서는 뜻을 설명하기 좋은 차례로 적되, 맞출 때는 순서를 따지지 않는다. */
	parts: string[];
	/** 합쳐서 나오는 한자 */
	result: string;
	/**
	 * 왜 그런 뜻이 되는지 한 줄로. **이게 학습의 알맹이다.**
	 * "사람이 나무에 기대어 쉬어요" 를 읽은 아이는 休 를 외우지 않아도 기억한다.
	 */
	story: string;
	kind: FusionKind;
	/**
	 * 처음 하는 아이에게 내도 되는 조합인가.
	 *
	 * 기준은 딱 하나 — **그림 두 개만 보고 결과가 짐작되는가.**
	 * 나무+나무=수풀은 여섯 살도 알아본다. 반면 문+해=사이(間)는 그림을 다 알아도
	 * 뜻이 안 따라온다. 그런 것은 조금 익숙해진 뒤에 만나야 한다.
	 */
	beginner?: boolean;
	/**
	 * 부품이 놓이는 자리. **`parts` 의 순서가 곧 배치 순서다.**
	 * lr 이면 parts[0] 이 왼쪽, tb 면 parts[0] 이 위, enclose 면 parts[0] 이 감싸는 쪽이다.
	 * (맞추기는 `fuse()` 가 정렬해서 하므로 순서가 판정에 영향을 주지는 않는다.)
	 */
	layout: FusionLayout;
	/**
	 * 소리를 담당하는 부품.
	 *
	 * **한국 한자음이 실제로 같을 때만 적는다.** 예전에 生→星, 寺→時, 子→李, 靑→情 처럼
	 * 음이 다른데도 "소리를 맡아요" 라고 가르치고 있었다. 중국어에서는 형성이지만
	 * 우리 음으로는 어긋난 것들이라, 아이에게는 반례를 규칙이라고 알려 주는 셈이었다.
	 * 이제 `reading(soundPart) === reading(result)` 를 테스트가 강제한다.
	 */
	soundPart?: string;

	/**
	 * 결과 글자 안에서 **모양이 바뀌어 들어가는** 부품.
	 *
	 * 人은 休 안에서 亻, 水는 淸 안에서 氵, 心은 情 안에서 忄이 된다.
	 * 이걸 표시해 두지 않으면 "부품이 글자 안에 그대로 들어 있다" 는 이 게임의 약속이
	 * 24개 중 8개에서 말없이 깨진다. 아이는 淸 안에서 水를 찾다가 못 찾고 혼란스러워한다.
	 *
	 *  - 공방: 합체 연출에서 "몸을 바꿔서 들어가요" 라고 알려 준다
	 *  - 대결: 봉인 후보에서 뺀다. 대결은 어려운 걸 가르치는 자리가 아니다
	 */
	variantParts?: string[];
}

/**
 * 조합표.
 *
 * 넣는 기준
 *  - 부품과 결과가 **모두 우리 1000자 안에 있을 것** (테스트가 강제한다)
 *  - 분해가 통설일 것. 모양만 비슷한 억지 분해는 넣지 않는다
 *  - 같은 부품 묶음이 두 번 나오지 않을 것 (木+一 로 本 과 末 을 둘 다 만들 수 없다.
 *    위치까지 따지면 가능하지만, 아이 손가락에게 정확한 위치를 요구하면 재미가 아니라 시험이 된다)
 */
export const FUSION_RECIPES: FusionRecipe[] = [
	// ── 해와 달 무리 ─────────────────────────────────────────────
	{
		parts: ['日', '月'],
		result: '明',
		story: '해와 달이 함께 뜨면 세상이 환해져요.',
		kind: '회의',
		beginner: true,
		layout: 'lr'
	},
	{
		parts: ['日', '生'],
		result: '星',
		story: '해처럼 빛나는 것이 밤하늘에 돋아나면 별이에요.',
		kind: '형성',
		layout: 'tb'
	},
	{
		parts: ['日', '寺'],
		result: '時',
		story: '절에서 해를 보고 때를 알렸어요.',
		kind: '형성',
		layout: 'lr'
	},

	// ── 나무 무리 ────────────────────────────────────────────────
	{
		parts: ['木', '木'],
		result: '林',
		story: '나무가 둘이면 수풀이 돼요.',
		kind: '회의',
		beginner: true,
		layout: 'lr'
	},
	{
		parts: ['人', '木'],
		result: '休',
		story: '사람이 나무에 기대어 쉬고 있어요.',
		kind: '회의',
		layout: 'lr',
		variantParts: ['人']
	},
	{
		parts: ['木', '目'],
		result: '相',
		story: '나무를 눈으로 찬찬히 살펴봐요. 서로 마주 본다는 뜻이 됐어요.',
		kind: '회의',
		layout: 'lr'
	},
	{
		parts: ['木', '交'],
		result: '校',
		story: '나무로 지은 집에서 아이들이 만나 배웠어요.',
		kind: '형성',
		layout: 'lr',
		soundPart: '交'
	},
	{
		parts: ['木', '子'],
		result: '李',
		story: '나무에 열매가 아이처럼 달렸어요. 오얏나무예요.',
		kind: '형성',
		layout: 'tb'
	},
	{
		parts: ['木', '一'],
		result: '本',
		story: '나무 밑동에 줄을 그어 "여기가 뿌리"라고 표시했어요.',
		kind: '지사',
		layout: 'mark'
	},

	// ── 사람 무리 ────────────────────────────────────────────────
	{
		parts: ['女', '子'],
		result: '好',
		story: '어머니가 아이를 안고 있어요. 참 좋은 모습이지요.',
		kind: '회의',
		beginner: true,
		layout: 'lr'
	},
	{
		parts: ['人', '言'],
		result: '信',
		story: '사람이 한 말은 지켜야 해요. 그래서 믿음이에요.',
		kind: '회의',
		layout: 'lr',
		variantParts: ['人']
	},
	{
		parts: ['人', '立'],
		result: '位',
		story: '사람이 서 있는 그곳이 자리예요.',
		kind: '회의',
		layout: 'lr',
		variantParts: ['人']
	},
	{
		parts: ['人', '二'],
		result: '仁',
		story: '사람과 사람 사이에 오가는 따뜻한 마음이에요.',
		kind: '회의',
		layout: 'lr',
		variantParts: ['人']
	},
	{
		parts: ['一', '大'],
		result: '天',
		story: '두 팔 벌린 사람 위에 한 줄. 그 위가 바로 하늘이에요.',
		kind: '지사',
		layout: 'tb'
	},

	// ── 문 무리 ──────────────────────────────────────────────────
	{
		parts: ['門', '口'],
		result: '問',
		story: '문 앞에서 입으로 "계세요?" 하고 물어요.',
		kind: '형성',
		layout: 'enclose',
		soundPart: '門'
	},
	{
		parts: ['門', '耳'],
		result: '聞',
		story: '문에 귀를 대고 안에서 나는 소리를 들어요.',
		kind: '형성',
		layout: 'enclose',
		soundPart: '門'
	},
	{
		parts: ['門', '日'],
		result: '間',
		story: '닫힌 문틈으로 햇빛이 새어 들어와요. 그 틈이 사이예요.',
		kind: '회의',
		layout: 'enclose'
	},

	// ── 靑 무리: 소리를 담당하는 부품 ────────────────────────────
	{
		parts: ['水', '靑'],
		result: '淸',
		story: '푸른빛이 도는 물은 아주 맑아요.',
		kind: '형성',
		layout: 'lr',
		soundPart: '靑',
		variantParts: ['水']
	},
	{
		parts: ['心', '靑'],
		result: '情',
		story: '마음이 푸르게 물들면 정이 들어요.',
		kind: '형성',
		layout: 'lr',
		variantParts: ['心']
	},
	{
		parts: ['言', '靑'],
		result: '請',
		story: '말로 공손히 부탁하는 것이 청하는 거예요.',
		kind: '형성',
		layout: 'lr',
		soundPart: '靑'
	},

	// ── 그 밖의 이야기가 좋은 것들 ───────────────────────────────
	{
		parts: ['白', '水'],
		result: '泉',
		story: '바위 틈에서 하얀 물이 솟아나요. 샘이에요.',
		kind: '모양',
		layout: 'tb',
		variantParts: ['水']
	},
	{
		parts: ['口', '鳥'],
		result: '鳴',
		story: '새가 입을 벌려 노래해요.',
		kind: '회의',
		beginner: true,
		layout: 'lr'
	},
	{
		parts: ['魚', '羊'],
		result: '鮮',
		story: '갓 잡은 물고기와 양고기. 신선하고 곱다는 뜻이에요.',
		kind: '회의',
		beginner: true,
		layout: 'lr'
	},
	{
		parts: ['手', '目'],
		result: '看',
		story: '눈 위에 손을 얹고 멀리 바라봐요.',
		kind: '회의',
		layout: 'tb',
		variantParts: ['手']
	},

	/*
	 * ── 여기서부터 확장 ──
	 *
	 * 조합표가 1000자 중 50자만 건드려서, 아이가 배운 글자가 놀이에 거의 안 나왔다.
	 * **새 부품은 山 하나뿐이고 그림은 이미 있다** — 새로 그린 그림 0장이다.
	 * 배열 끝에 붙이는 이유: 앞에 넣으면 findWorkshopHint 가 짚는 첫 조합이 바뀐다.
	 */

	{
		parts: ['女', '生'],
		result: '姓',
		story: '어머니가 낳은 아이마다 이어 붙는 이름이 성이에요.',
		kind: '회의',
		layout: 'lr'
	},
	{
		parts: ['一', '白'],
		result: '百',
		story: '하얀 것 위에 줄을 하나 그어 백을 나타냈어요.',
		kind: '형성',
		layout: 'tb',
		soundPart: '白'
	},
	{
		parts: ['水', '魚'],
		result: '漁',
		story: '물속을 헤엄치는 물고기를 잡는 일이에요.',
		kind: '형성',
		layout: 'lr',
		soundPart: '魚',
		variantParts: ['水']
	},
	{
		parts: ['目', '人'],
		result: '見',
		story: '사람 위에 커다란 눈을 얹어 본다는 뜻이 됐어요.',
		kind: '회의',
		layout: 'tb',
		variantParts: ['人']
	},
	{
		parts: ['人', '山'],
		result: '仙',
		story: '산속에 들어가 사는 사람을 신선이라고 불렀어요.',
		kind: '회의',
		layout: 'lr',
		variantParts: ['人']
	},
	{
		parts: ['鳥', '山'],
		result: '島',
		story: '바다 위에 솟은 산에 새가 내려앉아 쉬어요.',
		kind: '형성',
		layout: 'tb',
		variantParts: ['鳥']
	},
	{
		parts: ['羊', '大'],
		result: '美',
		story: '살이 오른 커다란 양은 보기에 참 아름다웠어요.',
		kind: '회의',
		layout: 'tb',
		variantParts: ['羊']
	}
];

/** 부품 묶음을 순서와 상관없이 비교할 수 있는 열쇠로 바꾼다. */
export function partsKey(parts: readonly string[]): string {
	return [...parts].sort().join('');
}

const BY_KEY = new Map<string, FusionRecipe>(FUSION_RECIPES.map((r) => [partsKey(r.parts), r]));

/**
 * 부품을 합친다. 되는 조합이면 결과를, 아니면 null 을 준다.
 *
 * **순서를 따지지 않는다.** 木을 먼저 놓든 人을 먼저 놓든 休가 나와야 한다.
 * 아이에게 "순서가 틀렸어요" 라고 말하는 순간 이건 다시 시험이 된다.
 */
export function fuse(parts: readonly string[]): FusionRecipe | null {
	if (parts.length < 2) return null;
	return BY_KEY.get(partsKey(parts)) ?? null;
}

/** 이 부품들로 아직 만들 수 있는 것이 남아 있는지 (힌트를 줄지 판단할 때 쓴다). */
export function hasAnyRecipeWith(parts: readonly string[]): boolean {
	if (parts.length === 0) return false;
	const owned = new Set(parts);
	return FUSION_RECIPES.some((r) => r.parts.every((p) => owned.has(p)));
}

/** 조합표에 재료로 쓰이는 모든 한자 */
export function allPartChars(): string[] {
	return [...new Set(FUSION_RECIPES.flatMap((r) => r.parts))].sort();
}

/** 합체로 만들어 낼 수 있는 모든 한자 */
export function allResultChars(): string[] {
	return FUSION_RECIPES.map((r) => r.result);
}

/** 결과 한자로 조합법을 찾는다 (도감에서 "어떻게 만들었지?" 를 보여줄 때). */
export function recipeFor(result: string): FusionRecipe | null {
	return FUSION_RECIPES.find((r) => r.result === result) ?? null;
}

/** 모양이 바뀌는 부품이 있는 조합인가 */
export function hasVariant(recipe: FusionRecipe): boolean {
	return (recipe.variantParts?.length ?? 0) > 0;
}

/**
 * 대결의 봉인으로 쓸 수 있는 조합.
 *
 * 모양이 바뀌는 부품이 든 것은 뺀다. 淸 을 보여 주고 "부품 두 개를 찾아봐" 라고 하면
 * 아이는 淸 안에서 水 를 찾다가 못 찾는다. 그건 어려운 게 아니라 **말이 안 되는** 것이다.
 * 변형은 공방에서 이야기와 함께 배우고, 대결에서는 약속이 그대로 지켜지는 것만 낸다.
 */
export const SEAL_RECIPES: FusionRecipe[] = FUSION_RECIPES.filter((r) => !hasVariant(r));

/**
 * 이 조각들 중에서 **붙는 한 쌍**을 찾는다.
 *
 * 목표를 화면에 안 보여 주는 대신 도움 버튼이 이 쌍을 빛낸다.
 * 정답을 알려 주는 것이 아니라 "이 둘은 친구야" 를 알려 주는 것이라,
 * 아이는 여전히 자기 손으로 붙여야 한다. 마지막 손가락은 항상 아이 것이다.
 */
export function findJoinablePair<T extends { character: string }>(
	pieces: readonly T[]
): [T, T] | null {
	for (let i = 0; i < pieces.length; i++) {
		for (let j = i + 1; j < pieces.length; j++) {
			if (fuse([pieces[i].character, pieces[j].character])) return [pieces[i], pieces[j]];
		}
	}
	return null;
}

/**
 * **공방용** 짝 찾기. 판(대결·복습)의 `findJoinablePair` 와 규칙이 다르다.
 *
 * 판에서는 조각이 실물이라 하나 쓰면 사라지지만, 공방의 부품 서랍은 **줄지 않는 재고**다.
 * 그 차이 때문에 위 함수를 그대로 쓰면 세 가지가 어긋난다.
 *
 *  1. `i < j` 라 **같은 부품을 자기 자신과 못 짝짓는다** — 서랍에 木 타일이 하나뿐이라
 *     `木+木=林` 을 영영 못 짚는다. 하필 그게 초심자용 조합이다.
 *  2. 이미 발견한 조합을 걸러 주지 않아, 明 을 만든 아이가 `?` 를 눌러도 계속 日+月 만 빛난다.
 *  3. 아이가 칸에 부품을 하나 놓아 뒀다면 알고 싶은 것은 아무 쌍이 아니라 **그 부품의 짝**이다.
 *
 * 공방은 변형 부수 조합(人+木=休 등)도 만들 수 있으므로 `FUSION_RECIPES` 전체로 잰다.
 */
export function findWorkshopHint(
	parts: readonly { character: string }[],
	discovered: readonly string[],
	placed?: string
): string[] | null {
	const owned = new Set(parts.map((p) => p.character));
	const done = new Set(discovered);

	const usable = FUSION_RECIPES.filter(
		(r) => !done.has(r.result) && r.parts.every((p) => owned.has(p))
	);
	if (usable.length === 0) return null;

	// 이미 놓아 둔 부품이 있으면 그 부품이 든 조합을 먼저 짚는다
	if (placed) {
		const withPlaced = usable.find((r) => r.parts.includes(placed));
		if (withPlaced) return [...withPlaced.parts];
	}
	return [...usable[0].parts];
}

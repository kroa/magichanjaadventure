/**
 * 그림 한자 — 글자가 되기 전의 모습.
 *
 * **DragonBox 의 핵심 발명은 "늦은 기호화(delayed symbolization)" 다.**
 * Algebra 는 1챕터를 몬스터 그림으로 시작해서, 아이가 규칙을 손에 익힌 **뒤에야**
 * 카드가 조용히 숫자와 문자로 바뀐다. 아이는 대수를 배운 줄도 모르고 대수를 한다.
 *
 * 한자에는 이것의 완벽한 대응물이 있다. **한자는 원래 그림이었다.**
 * 日은 해 그림, 木은 나무 그림, 山은 산 그림이었다.
 * 그러니 아이에게 처음부터 `日(날 일)` 이라고 알려 줄 이유가 없다.
 * 해 그림과 달 그림을 붙였더니 明이 되더라 — 그 순서가 원래 순서다.
 *
 * 사용법: 아이가 그 부품을 얼마나 겪었는지(mastery)에 따라
 *   그림만 → 그림+글자 → 글자만
 * 으로 **말없이** 넘어간다. 아이에게 "이제 글자로 바꿉니다" 라고 알리지 않는다.
 *
 * ── 그림 규칙 ─────────────────────────────────────────────
 *  - viewBox 는 `0 0 100 100` 으로 고정. 안쪽 여백 10 을 남긴다
 *  - 6세가 **글자 없이** 알아볼 수 있어야 한다. 그게 유일한 합격 기준이다
 *  - 선은 굵게(8~12), `stroke-linecap="round"`, 각진 모서리 금지
 *  - 색은 2~3개까지. 앱 팔레트 안에서 고른다
 *  - 글자의 획을 흉내 내려 하지 말 것. **그림이 먼저고 글자가 나중이다**
 */

export interface Pictograph {
	/** 그림 본문 (viewBox 0 0 100 100 안의 마크업) */
	svg: string;
	/** 그림이 무엇인지 — 화면에는 안 쓰고 스크린리더에만 준다 */
	label: string;
}

export const PICTOGRAPHS: Record<string, Pictograph> = {
	日: {
		label: '해',
		svg: `
			<g stroke="#F2A93B" stroke-width="9" stroke-linecap="round">
				<line x1="50" y1="6" x2="50" y2="18" />
				<line x1="50" y1="82" x2="50" y2="94" />
				<line x1="6" y1="50" x2="18" y2="50" />
				<line x1="82" y1="50" x2="94" y2="50" />
				<line x1="19" y1="19" x2="27" y2="27" />
				<line x1="73" y1="73" x2="81" y2="81" />
				<line x1="81" y1="19" x2="73" y2="27" />
				<line x1="27" y1="73" x2="19" y2="81" />
			</g>
			<circle cx="50" cy="50" r="27" fill="#FFD166" stroke="#F2A93B" stroke-width="6" />
			<circle cx="50" cy="50" r="7" fill="#F2A93B" />`
	},

	月: {
		label: '달',
		svg: `
			<path
				d="M66 12a40 40 0 1 0 22 63 32 32 0 0 1-22-63Z"
				fill="#FFE79A" stroke="#E8B54A" stroke-width="6" stroke-linejoin="round" />
			<circle cx="60" cy="70" r="5" fill="#E8B54A" opacity=".55" />
			<circle cx="72" cy="52" r="3.5" fill="#E8B54A" opacity=".45" />`
	},

	木: {
		label: '나무',
		svg: `
			<path d="M50 52v40" stroke="#8A5A28" stroke-width="12" stroke-linecap="round" />
			<path d="M50 66 30 82M50 66l20 16" stroke="#8A5A28" stroke-width="9" stroke-linecap="round" />
			<circle cx="50" cy="38" r="28" fill="#7BC96F" stroke="#4E9B49" stroke-width="6" />
			<circle cx="38" cy="32" r="7" fill="#A6E29C" opacity=".7" />`
	},

	水: {
		label: '물',
		svg: `
			<g stroke="#4FC3F7" stroke-width="10" stroke-linecap="round" fill="none">
				<path d="M18 34c8-9 16-9 24 0s16 9 24 0 16-9 16 0" />
				<path d="M18 58c8-9 16-9 24 0s16 9 24 0 16-9 16 0" />
				<path d="M18 82c8-9 16-9 24 0s16 9 24 0 16-9 16 0" />
			</g>`
	},

	山: {
		label: '산',
		svg: `
			<path
				d="M8 82 34 34l16 26 14-30 28 52Z"
				fill="#9BB7D4" stroke="#5E7EA6" stroke-width="6" stroke-linejoin="round" />
			<path d="M34 34l10 18H24Z" fill="#FFFFFF" opacity=".85" />
			<path d="M64 30l10 20H54Z" fill="#FFFFFF" opacity=".85" />`
	},

	火: {
		label: '불',
		svg: `
			<path
				d="M50 8c14 18 26 26 26 44a26 26 0 0 1-52 0c0-12 8-18 12-26 4 10 10 12 14 6 4-8-2-16 0-24Z"
				fill="#FF8B6B" stroke="#E05A38" stroke-width="6" stroke-linejoin="round" />
			<path
				d="M50 46c6 8 11 12 11 20a11 11 0 0 1-22 0c0-7 6-12 11-20Z"
				fill="#FFD166" />`
	},

	人: {
		label: '사람',
		svg: `
			<circle cx="50" cy="24" r="14" fill="#FFDCC2" stroke="#D9A97E" stroke-width="5" />
			<path d="M50 40v22" stroke="#7C5CFF" stroke-width="11" stroke-linecap="round" />
			<path d="M50 60 32 92M50 60l18 32" stroke="#7C5CFF" stroke-width="11" stroke-linecap="round" />`
	},

	目: {
		label: '눈',
		svg: `
			<path d="M14 50C24 21 76 21 86 50 76 79 24 79 14 50Z"
			fill="#FFFFFF" stroke="#3E2590" stroke-width="6" stroke-linejoin="round" />
			<circle cx="50" cy="50" r="16" fill="#4FC3F7" stroke="#22ABEE" stroke-width="4" />
			<circle cx="50" cy="50" r="8" fill="#3E2590" />
			<circle cx="44" cy="42" r="4.5" fill="#FFFFFF" />
			<circle cx="57" cy="57" r="2.4" fill="#FFFFFF" opacity=".85" />
			<g stroke="#3E2590" stroke-width="6" stroke-linecap="round">
			<path d="M28 32 21 20" />
			<path d="M50 27V13" />
			<path d="M72 32 79 20" />
			</g>`
	},

	耳: {
		label: '귀',
		svg: `
			<path d="M52 14C32 14 18 30 18 52 18 66 24 78 33 84 40 89 48 85 46 77 44 70 42 67 48 62 54 54 60 38 58 26 56 17 56 14 52 14Z"
			fill="#FFDCC2" stroke="#D9A97E" stroke-width="6" stroke-linejoin="round" />
			<path d="M54 27C38 27 28 38 28 52 28 62 33 70 39 72"
			fill="none" stroke="#D9A97E" stroke-width="6" stroke-linecap="round" />
			<ellipse cx="44" cy="52" rx="7" ry="10" fill="#D9A97E" />
			<g fill="none" stroke="#4FC3F7" stroke-width="6" stroke-linecap="round">
			<path d="M68 40q7 12 0 24" />
			<path d="M80 30q9 22 0 44" />
			</g>`
	},

	手: {
		label: '손',
		svg: `
			<g stroke-linecap="round" fill="none">
			<g stroke="#D9A97E" stroke-width="18">
			<path d="M39 64 21 30" />
			<path d="M46 60 42 17" />
			<path d="M54 60 65 21" />
			<path d="M61 64 80 41" />
			<path d="M38 72 18 64" />
			</g>
			<rect x="23" y="53" width="54" height="37" rx="18" fill="#D9A97E" />
			<g stroke="#FFDCC2" stroke-width="12">
			<path d="M39 64 21 30" />
			<path d="M46 60 42 17" />
			<path d="M54 60 65 21" />
			<path d="M61 64 80 41" />
			<path d="M38 72 18 64" />
			</g>
			<rect x="26" y="56" width="48" height="31" rx="15" fill="#FFDCC2" />
			</g>`
	},

	口: {
		label: '입',
		svg: `
			<path d="M16 38C32 44 68 44 84 38 84 68 70 82 50 82 30 82 16 68 16 38Z"
			fill="#3E2590" stroke="#E05A38" stroke-width="16" stroke-linejoin="round" />
			<path d="M16 38C32 44 68 44 84 38 84 68 70 82 50 82 30 82 16 68 16 38Z"
			fill="#3E2590" stroke="#FF8B6B" stroke-width="10" stroke-linejoin="round" />
			<path d="M24 44C36 50 64 50 76 44L76 53C64 59 36 59 24 53Z"
			fill="#FFFFFF" stroke="#FFFFFF" stroke-width="4" stroke-linejoin="round" />
			<path d="M35 64C35 59 65 59 65 64 65 72 59 76 50 76 41 76 35 72 35 64Z" fill="#FF8B6B" />`
	},

	心: {
		label: '마음',
		svg: `
			<path d="M50 84C25 67 14 50 14 37 14 24 25 15 35 15 42 15 47 19 50 24 53 19 58 15 65 15 75 15 86 24 86 37 86 50 75 67 50 84Z"
			fill="#FF8B6B" stroke="#E05A38" stroke-width="6" stroke-linejoin="round" />
			<circle cx="33" cy="34" r="7" fill="#FFFFFF" opacity=".5" />`
	},

	女: {
		label: '여자',
		svg: `
			<path d="M28 34a22 22 0 0 1 44 0v18a5 5 0 0 1-10 0V32a12 12 0 0 0-24 0v20a5 5 0 0 1-10 0z" fill="#8A5A28" />
			<circle cx="50" cy="31" r="14" fill="#FFDCC2" stroke="#D9A97E" stroke-width="5" />
			<path d="M42 44h16l14 32H28z" fill="#7C5CFF" stroke="#3E2590" stroke-width="6" stroke-linejoin="round" />
			<path d="M42 76v11M58 76v11" stroke="#FFDCC2" stroke-width="8" stroke-linecap="round" />`
	},

	子: {
		label: '아기',
		svg: `
			<ellipse cx="50" cy="72" rx="25" ry="17" fill="#4FC3F7" stroke="#22ABEE" stroke-width="6" />
			<path d="M34 65 50 78 66 65" fill="none" stroke="#B5E6FF" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
			<circle cx="50" cy="37" r="21" fill="#FFDCC2" stroke="#D9A97E" stroke-width="5" />
			<path d="M46 17c0-6 9-6 9-1" fill="none" stroke="#8A5A28" stroke-width="5" stroke-linecap="round" />
			<circle cx="42" cy="36" r="4" fill="#8A5A28" />
			<circle cx="58" cy="36" r="4" fill="#8A5A28" />
			<circle cx="43.5" cy="34.5" r="1.4" fill="#FFFFFF" />
			<circle cx="59.5" cy="34.5" r="1.4" fill="#FFFFFF" />
			<path d="M45 47q5 5 10 0" fill="none" stroke="#D9A97E" stroke-width="3.5" stroke-linecap="round" />`
	},

	大: {
		label: '크다',
		svg: `
			<circle cx="50" cy="23" r="12" fill="#FFDCC2" stroke="#D9A97E" stroke-width="5" />
			<path d="M50 35v23" stroke="#7C5CFF" stroke-width="11" stroke-linecap="round" />
			<path d="M50 44 21 31M50 44l29-13" stroke="#7C5CFF" stroke-width="11" stroke-linecap="round" />
			<path d="M50 57 24 86M50 57l26 29" stroke="#7C5CFF" stroke-width="11" stroke-linecap="round" />
			<circle cx="19" cy="30" r="6" fill="#FFDCC2" stroke="#D9A97E" stroke-width="4" />
			<circle cx="81" cy="30" r="6" fill="#FFDCC2" stroke="#D9A97E" stroke-width="4" />`
	},

	立: {
		label: '서다',
		svg: `
			<path d="M14 87h72" stroke="#8A5A28" stroke-width="10" stroke-linecap="round" />
			<path d="M18 84h64" stroke="#C98B4B" stroke-width="4" stroke-linecap="round" />
			<circle cx="50" cy="22" r="11" fill="#FFDCC2" stroke="#D9A97E" stroke-width="5" />
			<path d="M50 34v25" stroke="#7C5CFF" stroke-width="10" stroke-linecap="round" />
			<path d="M45 40 32 60M55 40l13 20" stroke="#7C5CFF" stroke-width="7" stroke-linecap="round" />
			<path d="M47 58 45 75M53 58l2 17" stroke="#7C5CFF" stroke-width="10" stroke-linecap="round" />
			<path d="M45 78 38 78M55 78l7 0" stroke="#7C5CFF" stroke-width="8" stroke-linecap="round" />`
	},

	交: {
		label: '사귀다',
		svg: `
			<circle cx="26" cy="24" r="12" fill="#FFDCC2" stroke="#D9A97E" stroke-width="5" />
			<circle cx="74" cy="24" r="12" fill="#FFDCC2" stroke="#D9A97E" stroke-width="5" />
			<path d="M26 36v24M26 58 17 84M26 58l8 26" stroke="#7C5CFF" stroke-width="10" stroke-linecap="round" />
			<path d="M74 36v24M74 58 66 84M74 58l9 26" stroke="#4FC3F7" stroke-width="10" stroke-linecap="round" />
			<path d="M26 42 50 56" stroke="#7C5CFF" stroke-width="8" stroke-linecap="round" />
			<path d="M74 42 50 56" stroke="#4FC3F7" stroke-width="8" stroke-linecap="round" />
			<circle cx="50" cy="57" r="6" fill="#FFDCC2" stroke="#D9A97E" stroke-width="3.5" />`
	},

	鳥: {
		label: '새',
		svg: `
			<path d="M36 54 32 74 12 44Z" fill="#FFD166" stroke="#F2A93B" stroke-width="6" stroke-linejoin="round" />
			<circle cx="62" cy="31" r="17" fill="#FF8B6B" stroke="#E05A38" stroke-width="6" />
			<path d="M76 25 88 33 76 41Z" fill="#FFD166" stroke="#F2A93B" stroke-width="5" stroke-linejoin="round" />
			<path d="M43 74v12M58 74v12" stroke="#F2A93B" stroke-width="6" stroke-linecap="round" />
			<path d="M40 86h9M55 86h9" stroke="#F2A93B" stroke-width="6" stroke-linecap="round" />
			<ellipse cx="48" cy="60" rx="29" ry="23" fill="#FF8B6B" stroke="#E05A38" stroke-width="6" />
			<ellipse cx="46" cy="64" rx="18" ry="11" fill="#FFD166" stroke="#F2A93B" stroke-width="5" transform="rotate(-14 46 64)" />
			<circle cx="66" cy="27" r="5.5" fill="#3E2590" />
			<circle cx="68" cy="25" r="2" fill="#FFFFFF" />`
	},

	魚: {
		label: '물고기',
		svg: `
			<path d="M30 52 12 29 19 52 12 75Z" fill="#B5E6FF" stroke="#22ABEE" stroke-width="6" stroke-linejoin="round" />
			<path d="M40 34 52 14 63 34Z" fill="#B5E6FF" stroke="#22ABEE" stroke-width="6" stroke-linejoin="round" />
			<path d="M44 68 52 86 62 68Z" fill="#B5E6FF" stroke="#22ABEE" stroke-width="6" stroke-linejoin="round" />
			<ellipse cx="54" cy="52" rx="32" ry="23" fill="#4FC3F7" stroke="#22ABEE" stroke-width="6" />
			<path d="M46 34q-8 18 0 36" fill="none" stroke="#B5E6FF" stroke-width="5" stroke-linecap="round" />
			<circle cx="70" cy="44" r="8.5" fill="#FFFFFF" stroke="#22ABEE" stroke-width="4" />
			<circle cx="71" cy="44" r="4.2" fill="#3E2590" />
			<circle cx="73" cy="42" r="1.7" fill="#FFFFFF" />
			<path d="M84 58q-7 6-13 1" fill="none" stroke="#22ABEE" stroke-width="5" stroke-linecap="round" />`
	},

	羊: {
		label: '양',
		svg: `
			<ellipse cx="23" cy="62" rx="11" ry="6.5" fill="#FFDCC2" stroke="#D9A97E" stroke-width="5" transform="rotate(-15 23 62)" />
			<ellipse cx="77" cy="62" rx="11" ry="6.5" fill="#FFDCC2" stroke="#D9A97E" stroke-width="5" transform="rotate(15 77 62)" />
			<path d="M24 50C14 46 12 32 24 30 22 16 36 12 42 22 46 10 54 10 58 22 64 12 78 16 76 30 88 32 86 46 76 50Z"
			fill="#FFFFFF" stroke="#9BB7D4" stroke-width="6" stroke-linejoin="round" />
			<g fill="none" stroke="#9BB7D4" stroke-width="4" stroke-linecap="round">
			<path d="M27 40q7 7 14 0" />
			<path d="M59 40q7 7 14 0" />
			<path d="M43 30q7 7 14 0" />
			</g>
			<ellipse cx="50" cy="60" rx="23" ry="21" fill="#FFDCC2" stroke="#D9A97E" stroke-width="6" />
			<path d="M36 30C24 24 12 30 12 42 12 52 24 56 27 48 29 42 22 40 22 45" fill="none" stroke="#8A5A28" stroke-width="7" stroke-linecap="round" />
			<path d="M64 30C76 24 88 30 88 42 88 52 76 56 73 48 71 42 78 40 78 45" fill="none" stroke="#8A5A28" stroke-width="7" stroke-linecap="round" />
			<circle cx="41" cy="58" r="5.5" fill="#5E7EA6" />
			<circle cx="59" cy="58" r="5.5" fill="#5E7EA6" />
			<circle cx="43" cy="56" r="2" fill="#FFFFFF" />
			<circle cx="61" cy="56" r="2" fill="#FFFFFF" />
			<path d="M45 69h10l-5 6z" fill="#8A5A28" />
			<path d="M44 79q6 4 12 0" fill="none" stroke="#D9A97E" stroke-width="4" stroke-linecap="round" />`
	},

	生: {
		label: '새싹',
		svg: `
			<path d="M50 75V46" stroke="#4E9B49" stroke-width="9" stroke-linecap="round" />
			<path d="M14 83q36-15 72 0" fill="none" stroke="#8A5A28" stroke-width="10" stroke-linecap="round" />
			<path d="M50 54C40 64 20 58 15 40C32 30 48 38 50 54Z" fill="#7BC96F" stroke="#4E9B49" stroke-width="5" stroke-linejoin="round" />
			<path d="M50 54C60 64 80 58 85 40C68 30 52 38 50 54Z" fill="#7BC96F" stroke="#4E9B49" stroke-width="5" stroke-linejoin="round" />
			<path d="M46 51 24 45M54 51 76 45" fill="none" stroke="#4E9B49" stroke-width="3" stroke-linecap="round" />`
	},

	靑: {
		label: '푸른 보석',
		svg: `
			<path d="M36 24H64L82 44 50 84 18 44Z" fill="#4FC3F7" stroke="#22ABEE" stroke-width="6" stroke-linejoin="round" />
			<path d="M36 24H64L69 44H31Z" fill="#B5E6FF" stroke="#22ABEE" stroke-width="5" stroke-linejoin="round" />
			<path d="M18 44H82M31 44 50 84M69 44 50 84" fill="none" stroke="#22ABEE" stroke-width="5" stroke-linecap="round" />
			<path d="M44 29 40 39" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" />
			<path d="M21 11q1.5 9 10.5 10.5-9 1.5-10.5 10.5-1.5-9-10.5-10.5 9-1.5 10.5-10.5z" fill="#22ABEE" />
			<path d="M80 13q1 6 7 7-6 1-7 7-1-6-7-7 6-1 7-7z" fill="#22ABEE" />`
	},

	門: {
		label: '문',
		svg: `
			<rect x="18" y="14" width="64" height="72" rx="7" fill="#C98B4B" stroke="#8A5A28" stroke-width="8" stroke-linejoin="round" />
			<path d="M50 18v64" stroke="#8A5A28" stroke-width="7" stroke-linecap="round" />
			<rect x="27" y="26" width="15" height="19" rx="5" fill="none" stroke="#8A5A28" stroke-width="6" stroke-linejoin="round" opacity=".5" />
			<rect x="58" y="26" width="15" height="19" rx="5" fill="none" stroke="#8A5A28" stroke-width="6" stroke-linejoin="round" opacity=".5" />
			<circle cx="42" cy="60" r="4.5" fill="#FFD166" stroke="#F2A93B" stroke-width="5" />
			<circle cx="58" cy="60" r="4.5" fill="#FFD166" stroke="#F2A93B" stroke-width="5" />`
	},

	寺: {
		label: '절',
		svg: `
			<rect x="28" y="55" width="44" height="25" fill="#FFDCC2" stroke="#D9A97E" stroke-width="6" stroke-linejoin="round" />
			<path d="M43 80V72a7 7 0 0 1 14 0v8Z" fill="#E05A38" />
			<rect x="20" y="80" width="60" height="8" rx="4" fill="#FFDCC2" stroke="#D9A97E" stroke-width="6" stroke-linejoin="round" />
			<rect x="37" y="31" width="26" height="17" fill="#FFDCC2" stroke="#D9A97E" stroke-width="6" stroke-linejoin="round" />
			<path d="M50 39 88 57Q50 65 12 57Z" fill="#FF8B6B" stroke="#E05A38" stroke-width="6" stroke-linejoin="round" />
			<path d="M50 11 76 30Q50 38 24 30Z" fill="#FF8B6B" stroke="#E05A38" stroke-width="6" stroke-linejoin="round" />`
	},

	言: {
		label: '말',
		svg: `
			<path d="M32 18h36a18 18 0 0 1 18 18v14a18 18 0 0 1-18 18H52L34 86l4-18h-6a18 18 0 0 1-18-18V36a18 18 0 0 1 18-18Z" fill="#FFFFFF" stroke="#7C5CFF" stroke-width="7" stroke-linejoin="round" />
			<g stroke="#9575FF" stroke-width="7" stroke-linecap="round">
			<path d="M30 31h40" />
			<path d="M30 43h34" />
			<path d="M30 55h26" />
			</g>`
	},

	白: {
		label: '하양',
		svg: `
			<circle cx="52" cy="58" r="29" fill="#9BB7D4" opacity=".45" />
			<circle cx="46" cy="51" r="29" fill="#FFFFFF" stroke="#9BB7D4" stroke-width="7" />
			<circle cx="35" cy="41" r="9" fill="#B5E6FF" opacity=".45" />
			<g fill="#4FC3F7">
			<path d="M83 12 Q83 20 91 20 Q83 20 83 28 Q83 20 75 20 Q83 20 83 12 Z" />
			<path d="M15 20 Q15 26 21 26 Q15 26 15 32 Q15 26 9 26 Q15 26 15 20 Z" />
			<path d="M85 74 Q85 80 91 80 Q85 80 85 86 Q85 80 79 80 Q85 80 85 74 Z" />
			</g>`
	},

	一: {
		label: '막대기 하나',
		svg: `
			<path d="M15 50 C15 43.5 19 40.5 27 40.1 C42 39.2 58 39.2 73 40.2 C81 40.7 85 43.6 85 50 C85 56.4 81 59.3 73 59.8 C58 60.8 42 60.8 27 59.9 C19 59.5 15 56.5 15 50 Z" fill="#FFD166" stroke="#F2A93B" stroke-width="6" stroke-linejoin="round" stroke-linecap="round" />
			<path d="M28 46 C42 44.8 58 44.8 71 45.8" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" fill="none" opacity=".45" />`
	},

	二: {
		label: '막대기 둘',
		svg: `
			<path d="M18 30 C18 24.5 21 22 29 21.6 C43 20.8 58 20.8 71 21.7 C79 22.2 82 24.6 82 30 C82 35.4 79 37.8 71 38.3 C58 39.2 43 39.2 29 38.4 C21 38 18 35.5 18 30 Z" fill="#FFD166" stroke="#F2A93B" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" />
			<path d="M30 26.5 C43 25.7 57 25.7 69 26.5" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" fill="none" opacity=".4" />
			<path d="M15 71 C15 65 18 62.4 26 62 C43 61.1 59 61.1 74 62.1 C82 62.6 85 65.3 85 71 C85 76.7 82 79.4 74 79.9 C59 80.9 43 80.9 26 80 C18 79.6 15 76.9 15 71 Z" fill="#FFD166" stroke="#F2A93B" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" />
			<path d="M27 67 C43 66.1 59 66.1 72 66.9" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" fill="none" opacity=".4" />`
	}
};

/** 그림이 있는 부품인가 */
export function hasPicture(character: string): boolean {
	return character in PICTOGRAPHS;
}

/**
 * 아이가 이 부품을 얼마나 겪었는지로 표시 단계를 정한다.
 *
 * **말없이 넘어가는 것이 핵심이다.** "이제 글자로 보여 드립니다" 라고 알리지 않는다.
 * 어느 순간 보니 그림 없이 글자를 읽고 있는 것이 목표다.
 *
 *  - 아직 안 배웠으면 그림만. 처음 만나는 것에 글자를 들이밀지 않는다
 *  - 한 번이라도 써 봤으면 그림 옆에 글자를 살짝 붙인다 (여기서 연결이 생긴다)
 *  - 익숙해지면 글자만. 그림은 조용히 사라진다
 */
export function fadeStage(mastery: number | null | undefined): 0 | 1 | 2 {
	if (mastery == null || mastery <= 0) return 0;
	if (mastery < 50) return 1;
	return 2;
}

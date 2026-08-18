/** 디자인 시스템 공통 타입. */

/**
 * 색 톤. 의미가 색에 묶여 있으므로 컴포넌트마다 새로 정의하지 않는다.
 *
 *  magic  기본 행동 / 브랜드
 *  gold   보상 · EXP · 별      (금색이 보이면 좋은 일이 일어난 것)
 *  mint   정답 · 성공 · 성장
 *  candy  강조 · 애정
 *  ember  오답 · 위험 (부드럽게 — 오답은 처벌이 아니다)
 *  sky    정보 · 물
 */
export type Tone = 'magic' | 'gold' | 'mint' | 'candy' | 'ember' | 'sky';

export type ButtonVariant = Tone | 'ghost';

export type Size = 'sm' | 'md' | 'lg';

export const TONES: Tone[] = ['magic', 'gold', 'mint', 'candy', 'ember', 'sky'];

/**
 * 캐릭터 표정.
 *
 * 몬스터도 같은 타입을 쓴다. 단, 몬스터의 피격 표정은 '화남'이 아니라 'surprised'(당황)다.
 * 아이가 무서워하지 않아야 하기 때문이다.
 */
export type Mood = 'happy' | 'cheer' | 'surprised' | 'sad';

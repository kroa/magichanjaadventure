import type { Component } from 'svelte';
import KnightSprite from '$lib/components/art/KnightSprite.svelte';
import WizardSprite from '$lib/components/art/WizardSprite.svelte';
import ArcherSprite from '$lib/components/art/ArcherSprite.svelte';
import SageSprite from '$lib/components/art/SageSprite.svelte';
import FoxSprite from '$lib/components/art/FoxSprite.svelte';
import GeniusSprite from '$lib/components/art/GeniusSprite.svelte';
import type { CharacterClass } from '$lib/types/user';
import type { Mood } from '$lib/types/ui';

export type SpriteComponent = Component<{
	size?: number;
	mood?: Mood;
	idle?: boolean;
	class?: string;
}>;

/**
 * 캐릭터 → 스프라이트 매핑.
 *
 * 타입 정의(`$lib/types/user`)와 분리해 둔다.
 * 서버 코드는 스탯·가격만 필요하고, Svelte 컴포넌트를 import 하면 안 되기 때문이다.
 */
export const SPRITES: Record<CharacterClass, SpriteComponent> = {
	knight: KnightSprite,
	wizard: WizardSprite,
	archer: ArcherSprite,
	sage: SageSprite,
	fox: FoxSprite,
	genius: GeniusSprite
};

/** 캐릭터가 없으면(가입 직후 등) 기사를 보여 준다. */
export function spriteFor(cls: CharacterClass | null | undefined): SpriteComponent {
	return SPRITES[cls ?? 'knight'] ?? KnightSprite;
}

/**
 * 스프라이트마다 발밑과 중심이 다르다 — 계급 장식을 걸 앵커.
 *
 * 실측: Knight/Archer/Sage/Fox 는 viewBox 120×152 에 지면 y=146,
 * Wizard 는 같은 상자인데 중심축이 x=58, Genius 만 100×130 에 지면 y=122 다.
 * **고정 배열 하나로 여섯을 덮을 수 없어서** 표로 둔다.
 * 마법사 몸을 2단위 옮겨 맞추지 않는다 — 그건 그림이 바뀌는 것이다.
 */
export const SPRITE_ANCHORS: Record<
	CharacterClass,
	{ vw: number; vh: number; groundX: number; groundY: number; ringRx: number }
> = {
	knight: { vw: 120, vh: 152, groundX: 60, groundY: 146, ringRx: 29 },
	wizard: { vw: 120, vh: 152, groundX: 58, groundY: 146, ringRx: 27 },
	archer: { vw: 120, vh: 152, groundX: 60, groundY: 146, ringRx: 28 },
	sage: { vw: 120, vh: 152, groundX: 60, groundY: 146, ringRx: 29 },
	fox: { vw: 120, vh: 152, groundX: 60, groundY: 146, ringRx: 28 },
	genius: { vw: 100, vh: 130, groundX: 50, groundY: 122, ringRx: 22 }
};

export function anchorFor(cls: CharacterClass | null | undefined) {
	return SPRITE_ANCHORS[cls ?? 'knight'] ?? SPRITE_ANCHORS.knight;
}

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

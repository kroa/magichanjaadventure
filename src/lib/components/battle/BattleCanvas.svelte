<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		/** 값이 바뀌면 마법 공격을 발사한다 (플레이어 → 적) */
		attackTrigger: number;
		/** 값이 바뀌면 적의 반격 연출 */
		hitTrigger: number;
		/** 마지막 공격의 데미지 숫자 */
		damage: number;
		/** 승리 폭죽 */
		victoryTrigger: number;
	}

	let { attackTrigger, hitTrigger, damage, victoryTrigger }: Props = $props();

	let host = $state<HTMLDivElement | null>(null);
	let ready = $state(false);

	/*
	 * PixiJS 사용 범위 — **이펙트 레이어만**.
	 *
	 * 캐릭터/몬스터는 DOM 위의 인라인 SVG 로 그대로 두고,
	 * 그 위에 투명한 Pixi 캔버스를 얹어 마법탄·파티클·데미지 숫자·폭죽을 그린다.
	 *
	 * 왜 이렇게 나눴나:
	 *  - SVG 아트를 캔버스로 옮기면 파트별 애니메이션(눈 깜빡임, 망토)을 다 잃는다
	 *  - 반대로 파티클을 DOM 으로 그리면 수십 개가 뜰 때 레이아웃이 흔들린다
	 *  → 각자 잘하는 것을 시킨다.
	 *
	 * pixi.js 는 이 컴포넌트에서만 동적 import 한다. /battle 밖에서는 번들에 들어가지 않는다.
	 */
	onMount(() => {
		let disposed = false;
		let cleanup: (() => void) | undefined;

		(async () => {
			const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			const { Application, Container, Graphics, Text } = await import('pixi.js');
			if (disposed || !host) return;

			const app = new Application();
			await app.init({
				backgroundAlpha: 0,
				antialias: true,
				resizeTo: host,
				autoDensity: true,
				resolution: Math.min(2, window.devicePixelRatio || 1)
			});
			if (disposed) {
				app.destroy(true);
				return;
			}

			// Pixi 는 실제 DOM 노드에 캔버스를 붙여야 한다. Svelte 가 관리하지 않는 자식이므로 안전하다.
			// eslint-disable-next-line svelte/no-dom-manipulating
			host.appendChild(app.canvas);
			app.canvas.style.pointerEvents = 'none';

			/*
			 * PixiJS 의 접근성 시스템을 끈다.
			 *
			 * 이 캔버스는 **순수 장식**이다(aria-hidden). 게임 조작은 전부 DOM 버튼으로 하므로
			 * Pixi 가 화면 밖(-1000px)에 1×1 크기의 숨은 <button> 을 만들 이유가 없다.
			 * 그 요소는 스크린리더에는 잡히면서 레이아웃 검사에는 오탐으로 뜬다.
			 */
			const a11y = (app.renderer as unknown as { accessibility?: { destroy?: () => void } })
				.accessibility;
			a11y?.destroy?.();

			ready = true;

			const fx = new Container();
			app.stage.addChild(fx);

			const active: { update: (dt: number) => boolean }[] = [];

			app.ticker.add((ticker) => {
				const dt = ticker.deltaTime;
				for (let i = active.length - 1; i >= 0; i--) {
					if (!active[i].update(dt)) active.splice(i, 1);
				}
			});

			/** 플레이어 → 적으로 날아가는 마법탄 */
			function castBolt(onImpact: () => void) {
				const w = app.screen.width;
				const h = app.screen.height;
				const from = { x: w * 0.24, y: h * 0.52 };
				const to = { x: w * 0.76, y: h * 0.5 };

				const bolt = new Graphics();
				bolt.circle(0, 0, 13).fill({ color: 0xffd25e });
				bolt.circle(0, 0, 20).fill({ color: 0xffe08a, alpha: 0.4 });
				bolt.position.set(from.x, from.y);
				fx.addChild(bolt);

				const duration = reduceMotion ? 1 : 26;
				let t = 0;
				active.push({
					update(dt) {
						t += dt;
						const p = Math.min(1, t / duration);
						bolt.x = from.x + (to.x - from.x) * p;
						// 살짝 포물선을 그리게 — 직선보다 "마법"처럼 보인다
						bolt.y = from.y + (to.y - from.y) * p - Math.sin(p * Math.PI) * h * 0.16;
						bolt.scale.set(1 + p * 0.35);
						if (p >= 1) {
							fx.removeChild(bolt);
							bolt.destroy();
							onImpact();
							return false;
						}
						return true;
					}
				});
			}

			/** 착탄 파티클 */
			function burst(x: number, y: number, color: number, count = 16) {
				for (let i = 0; i < count; i++) {
					const angle = (Math.PI * 2 * i) / count;
					const speed = 2.4 + (i % 3) * 0.9;
					const particle = new Graphics();
					particle.circle(0, 0, 4 + (i % 3)).fill({ color });
					particle.position.set(x, y);
					fx.addChild(particle);

					let life = 0;
					const maxLife = reduceMotion ? 1 : 30;
					active.push({
						update(dt) {
							life += dt;
							particle.x += Math.cos(angle) * speed * dt;
							particle.y += Math.sin(angle) * speed * dt + life * 0.05 * dt;
							particle.alpha = Math.max(0, 1 - life / maxLife);
							if (life >= maxLife) {
								fx.removeChild(particle);
								particle.destroy();
								return false;
							}
							return true;
						}
					});
				}
			}

			/** 위로 떠오르며 사라지는 데미지 숫자 */
			function showDamage(x: number, y: number, value: number) {
				const label = new Text({
					text: `-${value}`,
					style: {
						fontFamily: 'Jua, sans-serif',
						fontSize: 34,
						fill: 0xff6b6b,
						stroke: { color: 0xffffff, width: 5 }
					}
				});
				label.anchor.set(0.5);
				label.position.set(x, y);
				fx.addChild(label);

				let life = 0;
				const maxLife = reduceMotion ? 1 : 46;
				active.push({
					update(dt) {
						life += dt;
						label.y -= 1.1 * dt;
						label.alpha = Math.max(0, 1 - life / maxLife);
						label.scale.set(1 + Math.min(0.3, life / 60));
						if (life >= maxLife) {
							fx.removeChild(label);
							label.destroy();
							return false;
						}
						return true;
					}
				});
			}

			function fireworks() {
				const w = app.screen.width;
				const h = app.screen.height;
				const colors = [0xffd25e, 0x5eead4, 0xff9ec4, 0x9575ff];
				colors.forEach((color, i) => {
					setTimeout(
						() => {
							if (disposed) return;
							burst(w * (0.2 + i * 0.2), h * (0.25 + (i % 2) * 0.2), color, 20);
						},
						reduceMotion ? 0 : i * 180
					);
				});
			}

			// 부모가 트리거 값을 바꾸면 연출을 재생한다
			cleanup = $effect.root(() => {
				let lastAttack = attackTrigger;
				let lastHit = hitTrigger;
				let lastVictory = victoryTrigger;

				$effect(() => {
					if (attackTrigger === lastAttack) return;
					lastAttack = attackTrigger;
					const dmg = damage;
					castBolt(() => {
						const x = app.screen.width * 0.76;
						const y = app.screen.height * 0.5;
						burst(x, y, 0xffd25e);
						showDamage(x, y - 30, dmg);
					});
				});

				$effect(() => {
					if (hitTrigger === lastHit) return;
					lastHit = hitTrigger;
					burst(app.screen.width * 0.24, app.screen.height * 0.52, 0xff8b8b, 12);
				});

				$effect(() => {
					if (victoryTrigger === lastVictory) return;
					lastVictory = victoryTrigger;
					fireworks();
				});
			});

			return () => app.destroy(true, { children: true });
		})().catch(() => {
			// Pixi 로드 실패가 대결 자체를 막으면 안 된다. 연출만 빠진다.
			ready = false;
		});

		return () => {
			disposed = true;
			cleanup?.();
		};
	});
</script>

<!--
	data-allow-small / data-allow-offscreen:
	PixiJS 는 접근성 지원을 위해 화면 밖(-1000px)에 1×1 크기의 숨은 <button> 을 만든다.
	우리가 만든 UI 가 아니므로 레이아웃 검사에서 제외한다.
	(이 표식이 없으면 "터치 타깃이 1×1px" 이라는 오탐이 뜬다)
-->
<div
	bind:this={host}
	class="pointer-events-none absolute inset-0"
	data-testid="battle-canvas"
	data-ready={ready ? 'true' : 'false'}
	data-allow-small
	data-allow-offscreen
	aria-hidden="true"
></div>

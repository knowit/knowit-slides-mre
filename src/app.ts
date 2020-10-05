import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import { ColliderLike } from '@microsoft/mixed-reality-extension-sdk';
import RedisDatabase from './database';

export default class KnowitSlides {
	private assets: MRE.AssetContainer
	private page: number = 1
	private slides: string = null

	constructor(private context: MRE.Context, private database: RedisDatabase, private baseUrl: string) {
		this.context.onStarted(() => this.started());
	}

	private async started() {
		this.assets = new MRE.AssetContainer(this.context);

		const screenTexture = this.assets.createTexture('start_screen_texture', {
			uri: `${this.baseUrl}/knowit_hello.png`
		})
		
		const screenMaterial = this.assets.createMaterial('start_screen_material', {
			mainTextureId: screenTexture.id
		})

		const screen = MRE.Actor.CreatePrimitive(this.assets, {
			definition: {
				shape: MRE.PrimitiveShape.Plane,
				dimensions: { x: 16, y: 0, z: 9 }
			},
			actor: {
				name: 'presentation_screen',
				transform: {
					app: { 
						position: { x: 0, y: 0, z: 0 },
						rotation: MRE.Quaternion.RotationAxis(
							MRE.Vector3.Right(), -90 * MRE.DegreesToRadians)
					},
				},
				appearance: { materialId: screenMaterial.id }
			}
		})

		const menuPanelMaterial = this.assets.createMaterial('menu_panel_material', {
			color: MRE.Color3.LightGray()
		})

		MRE.Actor.CreatePrimitive(this.assets, {
			definition: {
				shape: MRE.PrimitiveShape.Plane,
				dimensions: { x: 4, y: 0, z: 1 },
			},
			actor: {
				name: 'nav_menu_panel',
				transform: {
					app: { 
						position: { x: 10, y: -4, z: 0 },
						rotation: MRE.Quaternion.RotationAxis(
							MRE.Vector3.Right(), -90 * MRE.DegreesToRadians)
					}
				},
				appearance: { materialId: menuPanelMaterial.id },
			}
		})

		this.createButton(
			'nav_next', '->', 
			{ 
				local: { 
					position: { x: 11, y: -3.5, z: -0.1 },
				} 
			},
			{
				geometry: {
					shape: MRE.ColliderType.Box,
					center: { x: 0, y: -0.4, z: 0 },
					size: { x: 2, y: 1, z: 0.1 }
				}
			},
			() => {
				if (!this.slides) return
				this.page = this.page+1
				const material = this.slideMaterial()
				screen.appearance.materialId = material.id
			})
		this.createButton(
			'nav_back', '<-', 
			{ 
				local: { 
					position: { x: 8.5, y: -3.5, z: -0.1 }
				} 
			},
			{
				geometry: {
					shape: MRE.ColliderType.Box,
					center: { x: 0, y: -0.4, z: 0 },
					size: { x: 2, y: 1, z: 0.1 }
				}
			},
			() => {
				if (this.page == 1 || !this.slides) return
				this.page = this.page-1
				const material = this.slideMaterial()
				screen.appearance.materialId = material.id
			})

		const presentations = await this.listPresentations()
		
		MRE.Actor.CreatePrimitive(this.assets, {
			definition: {
				shape: MRE.PrimitiveShape.Plane,
				dimensions: { x: 4, y: 0, z: 0.5*presentations.length+1 },
			},
			actor: {
				name: 'slides_menu_panel',
				transform: {
					app: { 
						position: { x: -9, y: 0, z: -5 },
						rotation: MRE.Quaternion.FromEulerAngles(-90 * MRE.DegreesToRadians, -90 * MRE.DegreesToRadians, 0)
					}
				},
				appearance: { materialId: menuPanelMaterial.id },
			}
		})

		presentations.forEach(({ name }, i) => {
			this.createButton(
				name, name.slice(0, 15), 
				{ 
					local: { 
						position: { x: -8.9, y: (0.5*presentations.length)*0.5 + (-0.5*i), z: -6.9 },
						rotation: MRE.Quaternion.FromEulerAngles(0, -90 * MRE.DegreesToRadians, 0)
					} 
				},
				{
					geometry: {
						shape: MRE.ColliderType.Box,
						center: { x: 2, y: -0.4, z: 0 },
						size: { x: 4, y: 0.5, z: 0.1 }
					}
				},
				() => {
					this.page = 1
					this.slides = name
					const material = this.slideMaterial()
					screen.appearance.materialId = material.id
				})
		})
	}

	private createButton(name: string, text: string, transform?: Partial<MRE.ActorTransformLike>, collider?: Partial<ColliderLike>, onclick?: () => void) {
		const actor = MRE.Actor.Create(this.context, {
			actor: {
				name: `${name}_button`,
				text: { 
					contents: text,
					anchor: MRE.TextAnchorLocation.TopLeft,
					height: 0.5,

				},
				transform,
				collider
			}
		})

		const actorBehaviour = actor.setBehavior(MRE.ButtonBehavior)

		actorBehaviour.onClick(onclick)

		actorBehaviour.onHover('enter', () => actor.text.color = MRE.Color3.DarkGray())
		actorBehaviour.onHover('exit', () => actor.text.color = MRE.Color3.White())
	}

	private slideMaterial() {
		const assetName = `${this.slides}_${this.page}_material`
		const slideMaterial = this.assets.assets.find(x => x.name === assetName)
		if (slideMaterial) {
			return slideMaterial
		}

		const pageTexture = this.assets.createTexture(`${this.slides}_${this.page}_texture`, {
			uri: `${this.baseUrl}/presentations/${this.slides}/${this.page}`
		})
		
		return this.assets.createMaterial(assetName, {
			mainTextureId: pageTexture.id
		})
	}

	private async listPresentations() : Promise<{name?:string}[]>{
		return this.database.hgetall('slide_sets')
            .then(slide_sets => Object.values(slide_sets).map(x => JSON.parse(x)))
            .catch((error: Error) => {
				console.error(error)
				return []
			});
	}
}

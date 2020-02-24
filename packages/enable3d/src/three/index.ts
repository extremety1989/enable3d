/**
 * @author       Yannick Deubel (https://github.com/yandeu)
 * @copyright    Copyright (c) 2020 Yannick Deubel; Project Url: https://github.com/yandeu/enable3d
 * @license      {@link https://github.com/yandeu/enable3d/blob/master/LICENSE|GNU GPLv3}
 */

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js'

import {
  PerspectiveCamera as THREE_PerspectiveCamera,
  OrthographicCamera as THREE_OrthographicCamera,
  Scene,
  WebGLRenderer,
  Mesh,
  MathUtils as THREE_Math,
  Box3,
  Box3Helper,
  BoxHelper,
  AnimationMixer,
  Vector2,
  Vector3,
  Object3D,
  Line,
  Points,
  Color,
  Euler,
  Quaternion,
  PCFSoftShadowMap,
  MeshStandardMaterial,
  MeshStandardMaterialParameters,
  Shape,
  Group,
  ShapePath,
  Path,
  Texture,
  MeshLambertMaterial,
  Raycaster,
  DirectionalLight,
  HemisphereLight,
  AmbientLight,
  PointLight,
  GammaEncoding,
  Material
} from 'three/src/Three'

import {
  BoxConfig,
  GroundConfig,
  SphereConfig,
  BoxObject,
  SphereObject,
  GroundObject,
  CylinderObject,
  Phaser3DConfig,
  MaterialConfig,
  CylinderConfig,
  ExtrudeConfig,
  ExtrudeObject,
  HeightMapObject,
  HeightMapConfig,
  AddMaterial,
  TorusConfig
} from '../common/types'
import ExtendedObject3D from './extendedObject3D'
import applyMixins from '../common/applyMixins'
import Loaders from './loaders'
import Cameras from './cameras'
import Textures from './textures'
import Lights from './lights'
import Factories from './factories'
import CSG from './csg'
import JoyStick from '../utils/joystick'
import { ThirdPersonControls, ThirdPersonControlsConfig } from '../utils/thirdPersonControls'
import { FirstPersonControls, FirstPersonControlsConfig } from '../utils/firstPersonControls'
import { Scene3D } from '..'
import WebXR from './webxr'
import HeightMap from './heightmap'

import chroma from 'chroma-js'
import Transform from './transform'
import { addWater } from '../utils/water'
import DefaultMaterial from '../common/defaultMaterial'

interface ThreeGraphics extends Loaders, Cameras, Textures, Lights, CSG, WebXR, HeightMap, Transform {}

class ThreeGraphics {
  public scene: Scene
  private view: any
  public renderer: WebGLRenderer
  private composer: null
  private _mixers: AnimationMixer[] = []
  public camera: THREE_PerspectiveCamera | THREE_OrthographicCamera
  public readonly isXrEnabled: boolean
  private defaultMaterial: DefaultMaterial
  protected factory: Factories

  constructor(public root: Scene3D, config: Phaser3DConfig = {}) {
    const { anisotropy = 1, enableXR = false, camera = Cameras.PerspectiveCamera(root, { z: 25, y: 5 }) } = config
    this.camera = camera
    this.isXrEnabled = enableXR
    this.view = root.add.extern()
    this.scene = new Scene()
    this.textureAnisotropy = anisotropy
    this.factory = new Factories(this.scene)

    this.defaultMaterial = new DefaultMaterial()

    this.renderer = new WebGLRenderer({
      canvas: root.sys.game.canvas as HTMLCanvasElement,
      context: root.sys.game.context as WebGLRenderingContext
    })

    // this.renderer.physicallyCorrectLights = true
    this.renderer.outputEncoding = GammaEncoding
    this.renderer.gammaFactor = 1

    // this.renderer.setPixelRatio(1)
    // this.renderer.setSize(window.innerWidth, window.innerHeight)

    // shadow
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = PCFSoftShadowMap

    // no implemented yet
    this.composer = null

    //  We don't want three.js to wipe our gl context!
    this.renderer.autoClear = false

    // add vr camera
    if (enableXR) {
      // the xr renderer is always window.innerWidth and window.innerHeight
      this.renderer.xr.enabled = true
      this.addXRCamera()
    }

    // phaser renderer
    this.view.render = (_renderer: WebGLRenderer) => {
      if (!this.renderer.xr.isPresenting) {
        this.root.updateLoopXR(this.root.sys.game.loop.time, this.root.sys.game.loop.delta)
        this.renderer.state.reset()
        this.renderer.render(this.scene, this.camera)
      }
    }

    // vr renderer
    if (enableXR) {
      let lastTime = 0
      this.renderer.setAnimationLoop((time: number) => {
        if (this.renderer.xr.isPresenting) {
          const delta = time - lastTime
          lastTime = time
          this.root.updateLoopXR(time, delta)
          this.renderer.state.reset()
          this.renderer.render(this.scene, this.camera)
        }
      })
      // add vr button
      const vrButton = VRButton.createButton(this.renderer)
      vrButton.style.cssText += 'background: rgba(0, 0, 0, 0.8); '
      document.body.appendChild(vrButton)
    }

    if (!enableXR) {
      root.events.on('update', (_time: number, delta: number) => {
        this.mixers.update(delta)
      })
    }
  }

  get mixers() {
    return {
      add: (animationMixer: AnimationMixer) => this._mixers.push(animationMixer),
      get: () => this._mixers,
      update: (delta: number) => this._mixers?.forEach(mixer => mixer.update(delta / 1000))
    }
  }

  get controls() {
    return {
      add: this.addControls
    }
  }

  private get addControls() {
    return {
      firstPerson: (target: Object3D, config: FirstPersonControlsConfig) =>
        new FirstPersonControls(this.root, target, config),
      thirdPerson: (target: Object3D, config: ThirdPersonControlsConfig) =>
        new ThirdPersonControls(this.root, target, config),
      joystick: () => new JoyStick()
    }
  }

  get new() {
    return {
      lerp: (x: number, y: number, t: number) => THREE_Math.lerp(x, y, t),
      /** A simple THREE.js Object3D. */
      object3D: () => new Object3D(),
      /** An extended THREE.js Object3D with useful properties and methods. */
      extendedObject3D: () => new ExtendedObject3D(),
      /** Create a Path Shape */
      shape: () => new Shape(),
      shapePath: () => new ShapePath(),
      path: () => new Path(),
      svgLoader: () => new SVGLoader(),
      raycaster: () => new Raycaster(),
      group: () => new Group(),
      color: (color?: string | number | Color | undefined) => new Color(color),
      box3: () => new Box3(),
      box3Helper: (box3: Box3) => new Box3Helper(box3),
      boxHelper: (mesh: Mesh) => new BoxHelper(mesh),
      animationMixer: (root: Object3D) => this.animationMixer(root),
      vector2: (x?: number, y?: number) => new Vector2(x, y),
      vector3: (x?: number, y?: number, z?: number) => new Vector3(x, y, z),
      euler: (x: number, y: number, z: number) => new Euler(x, y, z, 'XYZ'),
      quaternion: (x?: number, y?: number, z?: number, w?: number) => new Quaternion(x, y, z, w),
      defaultMaterial: () => this.getDefaultMaterial()
    }
  }

  protected getDefaultMaterial(): Material {
    return this.defaultMaterial.get()
  }

  /**
   * Create an Animation Mixer and ads it to the mixers array
   */
  private animationMixer(root: Object3D) {
    const mixer = new AnimationMixer(root)
    this.mixers.add(mixer)
    return mixer
  }

  public get load() {
    return {
      texture: (url: string) => this.loadTexture(url),
      gltf: (key: string, cb: Function) => this.loadGLTF(key, cb),
      fbx: (path: string, cb: (object: any) => void) => this.loadFBX(path, cb)
    }
  }

  public get texture() {
    return {
      /** Load a texture using the three.js texture loader. */
      load: (url: string) => this.loadTexture(url),
      /** Get the texture by its Key. */
      get: (key: string) => this._getTexture(key),
      /** Add the textures in the order Left, Right, Top, Bottom, Front, Back. */
      cube: (textures: string[]) => this.textureCube(textures)
    }
  }

  //  Some basic factory helpers
  public get add(): {
    directionalLight: (config?: any) => DirectionalLight
    hemisphereLight: (config?: any) => HemisphereLight
    ambientLight: (config?: any) => AmbientLight
    pointLight: (config?: any) => PointLight
    mesh: any
    existing: any
    heightMap: HeightMapObject
    box: BoxObject
    ground: GroundObject
    sphere: SphereObject
    cylinder: CylinderObject
    torus: (torusConfig?: TorusConfig, materialConfig?: MaterialConfig) => ExtendedObject3D
    extrude: ExtrudeObject
    material: AddMaterial
    water: any
  } {
    return {
      //  Lights
      // ambientLight: config => this.addAmbientLight(config),
      directionalLight: (config: any = {}) => this.addDirectionalLight(config),
      hemisphereLight: (config: any = {}) => this.addHemisphereLight(config),
      ambientLight: (config: any = {}) => this.addAmbientLight(config),
      pointLight: (config: any = {}) => this.addPointLight(config),
      // spotLight: config => this.addSpotLight(config),

      // effectComposer: () => this.addEffectComposer(),
      mesh: (mesh: any) => this.factory.addMesh(mesh),
      // group: (...children) => this.addGroup(children),
      existing: (object: ExtendedObject3D | Mesh | Line | Points) => this.addExisting(object),
      heightMap: (texture: Texture, config: HeightMapConfig = {}) => this.addHeightMap(texture, config),
      //  Geometry
      box: (boxConfig: BoxConfig = {}, materialConfig: MaterialConfig = {}) =>
        this.factory.addBox(boxConfig, materialConfig),
      ground: (groundConfig: GroundConfig, materialConfig: MaterialConfig = {}) =>
        this.factory.addGround(groundConfig, materialConfig),
      //...
      sphere: (sphereConfig: SphereConfig = {}, materialConfig: MaterialConfig = {}) =>
        this.factory.addSphere(sphereConfig, materialConfig),
      cylinder: (cylinderConfig: CylinderConfig = {}, materialConfig: MaterialConfig = {}) =>
        this.factory.addCylinder(cylinderConfig, materialConfig),
      torus: (torusConfig: TorusConfig = {}, materialConfig: MaterialConfig = {}) =>
        this.factory.addTorus(torusConfig, materialConfig),
      extrude: (extrudeConfig: ExtrudeConfig, materialConfig: MaterialConfig = {}) =>
        this.factory.addExtrude(extrudeConfig, materialConfig),
      //...
      material: (materialConfig: MaterialConfig = {}) => this.factory.addMaterial(materialConfig),
      water: (config: any) => addWater(config, this.scene)
    }
  }

  /**
   * Powered by Chroma.js (https://github.com/gka/chroma.js/)
   */
  public get chroma() {
    return chroma
  }

  private addExisting(object: ExtendedObject3D | Mesh | Line | Points) {
    this.scene.add(object)
  }

  public radToDeg(number: number) {
    return THREE_Math.radToDeg(number)
  }

  public get make(): {
    box: BoxObject
    sphere: SphereObject
    cylinder: CylinderObject
    torus: (torusConfig?: TorusConfig, materialConfig?: MaterialConfig) => ExtendedObject3D
    extrude: ExtrudeObject
    heightMap: HeightMapObject
  } {
    return {
      box: (boxConfig: BoxConfig = {}, materialConfig: MaterialConfig = {}) =>
        this.factory.makeBox(boxConfig, materialConfig),
      sphere: (sphereConfig: SphereConfig = {}, materialConfig: MaterialConfig = {}) =>
        this.factory.makeSphere(sphereConfig, materialConfig),
      cylinder: (cylinderConfig: CylinderConfig = {}, materialConfig: MaterialConfig = {}) =>
        this.factory.makeCylinder(cylinderConfig, materialConfig),
      torus: (torusConfig: TorusConfig = {}, materialConfig: MaterialConfig = {}) =>
        this.factory.makeTorus(torusConfig, materialConfig),
      extrude: (extrudeConfig: ExtrudeConfig, materialConfig: MaterialConfig = {}) =>
        this.factory.makeExtrude(extrudeConfig, materialConfig),
      heightMap: (texture: Texture, config: HeightMapConfig = {}) => this.makeHeightMap(texture, config)
    }
  }

  static OrbitControls(camera: any, parent: any) {
    return new OrbitControls(camera, parent)
  }
}

applyMixins(ThreeGraphics, [Loaders, Cameras, Textures, Lights, CSG, WebXR, HeightMap, Transform])

export default ThreeGraphics

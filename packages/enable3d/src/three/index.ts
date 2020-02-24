/**
 * @author       Yannick Deubel (https://github.com/yandeu)
 * @copyright    Copyright (c) 2020 Yannick Deubel; Project Url: https://github.com/yandeu/enable3d
 * @license      {@link https://github.com/yandeu/enable3d/blob/master/LICENSE|GNU GPLv3}
 */

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js'
import { Sky } from 'three/examples/jsm/objects/Sky'

type WarpedStartFeatures =
  | 'light'
  | 'camera'
  | 'lookAtCenter'
  | 'ground'
  | 'grid'
  | 'orbitControls'
  | 'fog'
  | 'sky'
  | '-light'
  | '-camera'
  | '-lookAtCenter'
  | '-ground'
  | '-grid'
  | '-orbitControls'
  | '-fog'
  | '-sky'

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
  Material,
  SphereBufferGeometry,
  MeshBasicMaterial,
  RepeatWrapping
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
} from '@enable3d/common/src/types'
import ExtendedObject3D from '@enable3d/common/src/extendedObject3D'
import applyMixins from '@enable3d/common/src/applyMixins'
import Loaders from './loaders'
import Cameras from './cameras'
import Textures from './textures'
import Lights from './lights'
import Factories from '@enable3d/common/src/factories'
import CSG from './csg'
import JoyStick from '../misc/joystick'
import { ThirdPersonControls, ThirdPersonControlsConfig } from '../misc/thirdPersonControls'
import { FirstPersonControls, FirstPersonControlsConfig } from '../misc/firstPersonControls'
import { Scene3D } from '..'
import WebXR from './webxr'
import HeightMap from './heightmap'

import chroma from 'chroma-js'
import Transform from './transform'
import { addWater } from '../misc/water'
import DefaultMaterial from '@enable3d/common/src/defaultMaterial'
import { AmmoPhysics } from '@enable3d/ammo/src'
import logger from '@enable3d/common/src/logger'

interface ThreeGraphics extends Loaders, Cameras, Textures, Lights, CSG, WebXR, HeightMap, Transform {}

class ThreeGraphics {
  public directionalLight: DirectionalLight
  public ground: ExtendedObject3D
  public physics: AmmoPhysics

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
    const {
      anisotropy = 1,
      enableXR = false,
      camera = Cameras.PerspectiveCamera({ z: 25, y: 5 }),
      renderer = new WebGLRenderer()
    } = config

    this.textureAnisotropy = anisotropy
    this.isXrEnabled = enableXR
    this.camera = camera
    this.renderer = renderer

    // this.view = root.add.extern()
    this.scene = new Scene()
    this.factory = new Factories(this.scene)
    this.defaultMaterial = new DefaultMaterial()

    // this.renderer.physicallyCorrectLights = true
    this.renderer.outputEncoding = GammaEncoding
    this.renderer.gammaFactor = 1

    // this.renderer.setPixelRatio(1)
    // this.renderer.setSize(window.innerWidth, window.innerHeight)

    // physics
    if (window.__loadPhysics) this.physics = new AmmoPhysics(this.scene, config)

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
    // this.view.render = (_renderer: WebGLRenderer) => {
    //   if (!this.renderer.xr.isPresenting) {
    //     this.root.updateLoopXR(this.root.sys.game.loop.time, this.root.sys.game.loop.delta)
    //     this.renderer.state.reset()
    //     this.renderer.render(this.scene, this.camera)
    //   }
    // }

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

  /**
   * Add OrbitControls to your scene
   * @param camera Pass the current camera (this.three.camera)
   * @param parent Pass the parent object of the Canvas (this.scale.parent)
   */
  static OrbitControls(camera: any, parent: any) {
    return new OrbitControls(camera, parent)
  }

  // Todo: Add something awesome here
  public haveSomeFun(numberOfElements: number = 20) {
    if (!window.__loadPhysics) {
      logger('There is not much fun without physics enabled!')
      return
    }

    // adding some boxes (with physics)
    for (let i = 0; i < numberOfElements; i++) {
      let materials = ['standard', 'basic', 'normal', 'phong', 'line', 'points']
      if (Math.random() > 0.5) {
        this.physics.add
          .box(
            {
              x: Phaser.Math.Between(-10, 10),
              y: Phaser.Math.Between(10, 20),
              z: Phaser.Math.Between(-10, 10),
              width: Phaser.Math.Between(1, 2) / 10,
              height: Phaser.Math.Between(1, 2) / 10,
              depth: Phaser.Math.Between(1, 2) / 10,
              mass: 1
            },
            { [Phaser.Math.RND.pick(materials)]: { color: Math.floor(Math.random() * 0xffffff) } }
          )
          .body.setRestitution(Math.floor(Math.random() * 10) / 20)
      } else {
        this.physics.add
          .sphere(
            {
              x: Phaser.Math.Between(-10, 10),
              y: Phaser.Math.Between(10, 20),
              z: Phaser.Math.Between(-10, 10),
              radius: Phaser.Math.Between(1, 2) / 10,
              mass: 1
            },
            { [Phaser.Math.RND.pick(materials)]: { color: Math.floor(Math.random() * 0xffffff) } }
          )
          .body.setRestitution(Math.floor(Math.random() * 10) / 20)
      }
    }
  }

  /**
   * It takes took long to setup the third dimension your self? Get started with warp speed by using this function.
   * @param features Pass the features you want to setup.
   */
  warpSpeed(...features: WarpedStartFeatures[]) {
    // test for negative features
    const negativeFeatures = features.filter(feature => /^-\w+/.test(feature))
    const hasNegativeFeatures = negativeFeatures.length > 0 ? true : false

    // add all features
    if (features.length === 0 || hasNegativeFeatures)
      features = ['light', 'camera', 'lookAtCenter', 'ground', 'grid', 'orbitControls', 'fog', 'sky']

    // remove the negative features
    if (hasNegativeFeatures) {
      const featuresToRemove = negativeFeatures.map(feature => feature.substr(1))
      featuresToRemove.forEach(feature => {
        // @ts-ignore
        const index = features.indexOf(feature)
        features.splice(index, 1)
      })
    }

    // TODO: add fog
    if (features.includes('fog')) {
    }

    if (features.includes('sky')) {
      const sky = new Sky()
      sky.scale.setScalar(450000)
      this.scene.add(sky)

      const sunSphere = new Mesh(new SphereBufferGeometry(20000, 16, 8), new MeshBasicMaterial({ color: 0xffffff }))
      sunSphere.position.y = -700000
      sunSphere.visible = false
      this.scene.add(sunSphere)

      const effectController = {
        turbidity: 10,
        rayleigh: 2,
        mieCoefficient: 0.005,
        mieDirectionalG: 0.8,
        luminance: 1,
        inclination: 0.25, // elevation / inclination
        azimuth: 0.25, // Facing front,
        sun: !true
      }

      const distance = 400000

      const uniforms = sky.material.uniforms
      uniforms['turbidity'].value = effectController.turbidity
      uniforms['rayleigh'].value = effectController.rayleigh
      uniforms['mieCoefficient'].value = effectController.mieCoefficient
      uniforms['mieDirectionalG'].value = effectController.mieDirectionalG
      uniforms['luminance'].value = effectController.luminance

      const theta = Math.PI * (effectController.inclination - 0.5)
      const phi = 2 * Math.PI * (effectController.azimuth - 0.5)

      sunSphere.position.x = distance * Math.cos(phi)
      sunSphere.position.y = distance * Math.sin(phi) * Math.sin(theta)
      sunSphere.position.z = distance * Math.sin(phi) * Math.cos(theta)

      sunSphere.visible = effectController.sun

      uniforms['sunPosition'].value.copy(sunSphere.position)
    }

    if (features.includes('camera')) {
      this.camera.position.set(5, 5, 10)
    }

    if (features.includes('light')) {
      this.add.ambientLight({ color: 0xcccccc })
      const light = this.add.directionalLight({ color: 0xffffff, intensity: 0.5, x: -10, y: 18, z: 5 })
      const d = 20
      light.shadow.camera.top = d
      light.shadow.camera.bottom = -d
      light.shadow.camera.left = -d
      light.shadow.camera.right = d

      light.shadow.mapSize.set(1024, 1024)
      this.directionalLight = light
    }

    if (features.includes('lookAtCenter')) {
      this.camera.lookAt(this.scene.position)
    }

    if (features.includes('ground')) {
      // grid (texture)
      const addGrid = features.includes('grid')
      const gridData =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOnAAADusBZ+q87AAAAJtJREFUeJzt0EENwDAAxLDbNP6UOxh+NEYQ5dl2drFv286598GrA7QG6ACtATpAa4AO0BqgA7QG6ACtATpAa4AO0BqgA7QG6ACtATpAa4AO0BqgA7QG6ACtATpAa4AO0BqgA7QG6ACtATpAa4AO0BqgA7QG6ACtATpAa4AO0BqgA7QG6ACtATpAa4AO0BqgA7QG6ACtATpAu37AD8eaBH5JQdVbAAAAAElFTkSuQmCC'
      const texture = this.load.texture(gridData)
      texture.wrapS = texture.wrapT = RepeatWrapping
      texture.repeat.set(21, 21)

      // ground
      this.ground = this.physics.add.ground(
        {
          name: 'ground',
          width: 21,
          height: 21,
          depth: 1,
          y: -0.5
        },
        { phong: { map: addGrid ? texture : null, transparent: true, opacity: 0.8, color: 0xffffff } }
      )
      this.ground.receiveShadow = true
      this.ground.body.setRestitution(1)
    }

    if (features.includes('orbitControls')) {
      ThreeGraphics.OrbitControls(this.camera, this.root.scale.parent)
    }
  }

  public get on() {
    return {
      /**
       * This returns all collisions of all object. Maybe you are looking for 'this.third.physics.add.collider(body1, body2, callback)' instead?
       */
      collision: (
        eventCallback: (data: { bodies: ExtendedObject3D[]; event: 'start' | 'collision' | 'end' }) => void
      ) => {
        this.physics.on('collision', (data: { bodies: ExtendedObject3D[]; event: 'start' | 'collision' | 'end' }) => {
          eventCallback(data)
        })
      }
    }
  }
}

applyMixins(ThreeGraphics, [Loaders, Cameras, Textures, Lights, CSG, WebXR, HeightMap, Transform])

export default ThreeGraphics

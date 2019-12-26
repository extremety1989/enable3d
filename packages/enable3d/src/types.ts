/**
 * @author       Yannick Deubel (https://github.com/yandeu)
 * @copyright    Copyright (c) 2019 Yannick Deubel; Project Url: https://github.com/yandeu/enable3d
 * @license      {@link https://github.com/yandeu/enable3d/blob/master/LICENSE|GNU GPLv3}
 */

import {
  MeshStandardMaterialParameters,
  MeshBasicMaterialParameters,
  MeshPhongMaterialParameters,
  LineBasicMaterialParameters,
  PointsMaterialParameters,
  MeshNormalMaterialParameters,
  PerspectiveCamera as THREE_PerspectiveCamera,
  OrthographicCamera as THREE_OrthographicCamera
} from 'three'
import ExtendedObject3D from './extendedObject3D'

export { ExtendedObject3D }
export { AnimationAction } from 'three/src/animation/AnimationAction'
export { AnimationMixer, AnimationClip, Object3D, Mesh, Line, Points } from 'three'

export interface Phaser3DConfig {
  anisotropy?: number
  /** Add your own THREE.js camera */
  camera?: THREE_PerspectiveCamera | THREE_OrthographicCamera
}

export interface XYZ {
  x?: number
  y?: number
  z?: number
}

interface WH {
  width?: number
  height?: number
}

export type Color = number | string

interface Mass {
  mass?: number
}

interface Makeup {
  texture?: any
  color?: Color
  material?: any
}

interface CollisionFlag {
  collisionFlag?: number
}

export interface PerspectiveCamera extends XYZ {
  fov?: number
  aspect?: number
  near?: number
  far?: number
}

export interface OrthographicCamera extends XYZ {
  left?: number
  right?: number
  top?: number
  bottom?: number
  near?: number
  far?: number
}

export interface MaterialConfig {
  standard?: MeshStandardMaterialParameters
  basic?: MeshBasicMaterialParameters
  normal?: MeshNormalMaterialParameters
  phong?: MeshPhongMaterialParameters
  line?: LineBasicMaterialParameters
  points?: PointsMaterialParameters
  [key: string]: any
}

export interface SphereObject {
  (sphereConfig: SphereConfig, materialConfig?: MaterialConfig): ExtendedObject3D
}
export interface BoxObject {
  (boxConfig: BoxConfig, materialConfig?: MaterialConfig): ExtendedObject3D
}
export interface GroundObject {
  (groundConfig: GroundConfig, materialConfig?: MaterialConfig): ExtendedObject3D
}

export interface SphereConfig extends XYZ, Mass, CollisionFlag {
  name?: string
  radius?: number
  widthSegments?: number
  heightSegments?: number
}

export interface BoxConfig extends XYZ, WH, Mass, CollisionFlag {
  name?: string
  depth?: number
}

export interface GroundConfig extends BoxConfig {
  width: number
  height: number
}
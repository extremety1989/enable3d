/**
 * @author       Yannick Deubel (https://github.com/yandeu)
 * @copyright    Copyright (c) 2020 Yannick Deubel; Project Url: https://github.com/yandeu/enable3d
 * @license      {@link https://github.com/yandeu/enable3d/blob/master/LICENSE|GNU GPLv3}
 */

import { AnimationClip, AnimationMixer, Mesh, Vector3, Geometry, BufferGeometry, Material } from 'three'
import PhysicsBody from '../ammo/physicsBody'
import { AnimationAction } from 'three/src/animation/AnimationAction'
import logger from '../common/logger'

interface ExtendedMesh extends Mesh {}

class ExtendedMesh extends Mesh {
  private vector3 = new Vector3()
  public shape: string
  public name: string
  public body: PhysicsBody
  public hasBody: boolean = false
  public animations?: AnimationClip[]
  public mixer?: AnimationMixer
  public anims: { [key: string]: AnimationClip } = {}
  public action: AnimationAction
  public currentAnimation: string = ''
  public breakable: boolean
  public fragmentDepth: number
  public collided: boolean

  constructor(geometry?: Geometry | BufferGeometry | undefined, material?: Material | Material[] | undefined) {
    super(geometry, material)
    this.name = `object-${this.id}`
  }

  /** Returns all values relative to the world. */
  get world() {
    return {
      theta: this.worldTheta,
      phi: this.worldPhi
    }
  }

  /** Get the theta relative to the world. */
  private get worldTheta() {
    this.getWorldDirection(this.vector3)
    return Math.atan2(this.vector3.x, this.vector3.z)
  }

  /** Get the phi relative to the world. */
  private get worldPhi() {
    this.getWorldDirection(this.vector3)
    return Math.acos(this.vector3.y)
  }

  public setAction(name: string) {
    if (this.mixer && this.anims.hasOwnProperty(name)) {
      const action = this.mixer?.clipAction(this.anims[name])
      action.time = 0
      this.mixer.stopAllAction()
      action.fadeIn(0.5)
      action.play()
      this.currentAnimation = name
    } else {
      logger(`[Phaser3D] Can't set animation ${name}`)
    }
  }
}

export default ExtendedMesh

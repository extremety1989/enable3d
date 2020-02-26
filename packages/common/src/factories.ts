/**
 * @author       Yannick Deubel (https://github.com/yandeu)
 * @copyright    Copyright (c) 2020 Yannick Deubel; Project Url: https://github.com/yandeu/enable3d
 * @license      {@link https://github.com/yandeu/enable3d/blob/master/LICENSE|GNU GPLv3}
 */

import {
  MaterialConfig,
  SphereConfig,
  BoxConfig,
  GroundConfig,
  XYZ,
  CylinderConfig,
  ExtrudeConfig,
  TorusConfig
} from './types'
import {
  SphereGeometry,
  BoxGeometry,
  Scene,
  MathUtils as THREE_Math,
  Object3D,
  Material,
  Line,
  Points,
  Mesh,
  MeshStandardMaterial,
  MeshNormalMaterial,
  MeshPhongMaterial,
  LineBasicMaterial,
  PointsMaterial,
  MeshBasicMaterial,
  CylinderGeometry,
  ExtrudeGeometry,
  MeshLambertMaterial,
  BoxBufferGeometry,
  SphereBufferGeometry,
  ExtrudeBufferGeometry,
  CylinderBufferGeometry,
  MeshPhysicalMaterial,
  MeshToonMaterial,
  TorusGeometry,
  TorusBufferGeometry
} from '@enable3d/three-wrapper/src/index'
import ExtendedObject3D from './extendedObject3D'
import ExtendedMesh from './extendedMesh'
import logger from './logger'
import DefaultMaterial from './defaultMaterial'

export default class Factories {
  protected defaultMaterial: DefaultMaterial

  constructor(public scene: Scene) {
    this.defaultMaterial = new DefaultMaterial()
  }

  public addMesh(mesh: Object3D) {
    if (Array.isArray(mesh)) {
      for (let i = 0; i < mesh.length; i++) {
        this.scene.add(mesh[i])
      }
    } else {
      this.scene.add(mesh)
    }
    return this
  }

  public createMesh(geometry: any, material: Material | Material[], position: XYZ): Line | Points | Mesh {
    const { x = 0, y = 0, z = 0 } = position

    let obj
    switch (!Array.isArray(material) && material.type) {
      case 'LineBasicMaterial':
        obj = new Line(geometry, material)
        break
      case 'PointsMaterial':
        obj = new Points(geometry, material)
        break
      default:
        obj = new ExtendedMesh(geometry, material)
        break
    }
    obj.position.set(x, y, z)
    obj.castShadow = obj.receiveShadow = true

    return obj
  }

  public makeExtrude(extrudeConfig: ExtrudeConfig, materialConfig: MaterialConfig) {
    const { x, y, z, name, shape, autoCenter = true, breakable = false, bufferGeometry = true, ...rest } = extrudeConfig
    const { depth = 1, bevelEnabled = false } = rest
    const geometry =
      bufferGeometry || breakable
        ? new ExtrudeBufferGeometry(shape, { depth, bevelEnabled, ...rest })
        : new ExtrudeGeometry(shape, { depth, bevelEnabled, ...rest })
    const material = this.addMaterial(materialConfig)
    const mesh = this.createMesh(geometry, material, { x, y, z }) as ExtendedObject3D
    // auto adjust the center for custom shapes
    if (autoCenter) mesh.geometry.center()
    mesh.name = name || `body_id_${mesh.id}`
    mesh.shape = 'extrude'
    return mesh
  }

  public addExtrude(extrudeConfig: ExtrudeConfig, materialConfig: MaterialConfig = {}): ExtendedObject3D {
    const obj = this.makeExtrude(extrudeConfig, materialConfig)
    this.scene.add(obj)
    return obj
  }

  public makeSphere(sphereConfig: SphereConfig, materialConfig: MaterialConfig): ExtendedObject3D {
    const { x, y, z, name, breakable = false, bufferGeometry = true, ...rest } = sphereConfig
    const geometry =
      bufferGeometry || breakable
        ? new SphereBufferGeometry(
            rest.radius || 1,
            rest.widthSegments || 16,
            rest.heightSegments || 12,
            rest.phiStart || undefined,
            rest.phiLength || undefined,
            rest.thetaStart || undefined,
            rest.thetaLength || undefined
          )
        : new SphereGeometry(
            rest.radius || 1,
            rest.widthSegments || 16,
            rest.heightSegments || 12,
            rest.phiStart || undefined,
            rest.phiLength || undefined,
            rest.thetaStart || undefined,
            rest.thetaLength || undefined
          )
    const material = this.addMaterial(materialConfig)
    const mesh = this.createMesh(geometry, material, { x, y, z }) as ExtendedObject3D
    mesh.name = name || `body_id_${mesh.id}`
    mesh.shape = 'sphere'
    return mesh
  }

  public addSphere(sphereConfig: SphereConfig = {}, materialConfig: MaterialConfig = {}): ExtendedObject3D {
    const obj = this.makeSphere(sphereConfig, materialConfig)
    this.scene.add(obj)
    return obj
  }

  public makeBox(boxConfig: BoxConfig, materialConfig: MaterialConfig): ExtendedObject3D {
    const { x, y, z, name, breakable = false, bufferGeometry = true, ...rest } = boxConfig
    const geometry =
      bufferGeometry || breakable
        ? new BoxBufferGeometry(
            rest.width || 1,
            rest.height || 1,
            rest.depth || 1,
            rest.widthSegments || undefined,
            rest.heightSegments || undefined,
            rest.depthSegments || undefined
          )
        : new BoxGeometry(
            rest.width || 1,
            rest.height || 1,
            rest.depth || 1,
            rest.widthSegments || undefined,
            rest.heightSegments || undefined,
            rest.depthSegments || undefined
          )
    const material = this.addMaterial(materialConfig)
    const mesh = this.createMesh(geometry, material, { x, y, z }) as ExtendedObject3D
    mesh.name = name || `body_id_${mesh.id}`
    mesh.shape = 'box'
    return mesh
  }

  public addBox(boxConfig: BoxConfig = {}, materialConfig: MaterialConfig = {}): ExtendedObject3D {
    const obj = this.makeBox(boxConfig, materialConfig)
    this.scene.add(obj)
    return obj
  }

  public addGround(groundConfig: GroundConfig, materialConfig: MaterialConfig = {}): ExtendedObject3D {
    const obj = this.makeBox(groundConfig, materialConfig)
    obj.rotateX(THREE_Math.degToRad(90))
    this.scene.add(obj)
    return obj
  }

  public makeCylinder(cylinderConfig: CylinderConfig = {}, materialConfig: MaterialConfig = {}): ExtendedObject3D {
    const { x, y, z, name, breakable = false, bufferGeometry = true, ...rest } = cylinderConfig
    const geometry =
      bufferGeometry || breakable
        ? new CylinderBufferGeometry(
            rest.radiusTop || 0.5,
            rest.radiusBottom || 0.5,
            rest.height || 1,
            rest.radiusSegments || undefined,
            rest.heightSegments || undefined,
            rest.openEnded || undefined,
            rest.thetaStart || undefined,
            rest.thetaLength || undefined
          )
        : new CylinderGeometry(
            rest.radiusTop || 0.5,
            rest.radiusBottom || 0.5,
            rest.height || 1,
            rest.radiusSegments || undefined,
            rest.heightSegments || undefined,
            rest.openEnded || undefined,
            rest.thetaStart || undefined,
            rest.thetaLength || undefined
          )
    const material = this.addMaterial(materialConfig)
    const mesh = this.createMesh(geometry, material, { x, y, z }) as ExtendedObject3D
    mesh.name = name || `body_id_${mesh.id}`
    mesh.shape = 'cylinder'
    return mesh
  }

  public addCylinder(cylinderConfig: CylinderConfig = {}, materialConfig: MaterialConfig = {}): ExtendedObject3D {
    const obj = this.makeCylinder(cylinderConfig, materialConfig)
    this.scene.add(obj)
    return obj
  }

  // https://threejs.org/docs/index.html#api/en/geometries/TorusBufferGeometry
  public makeTorus(torusConfig: TorusConfig = {}, materialConfig: MaterialConfig = {}): ExtendedObject3D {
    const { x, y, z, name, breakable = false, bufferGeometry = true, ...rest } = torusConfig
    const geometry =
      bufferGeometry || breakable
        ? new TorusBufferGeometry(
            rest.radius || undefined,
            rest.tube || undefined,
            rest.radialSegments || undefined,
            rest.tubularSegments || undefined,
            rest.arc || undefined
          )
        : new TorusGeometry(
            rest.radius || undefined,
            rest.tube || undefined,
            rest.radialSegments || undefined,
            rest.tubularSegments || undefined,
            rest.arc || undefined
          )
    const material = this.addMaterial(materialConfig)
    const mesh = this.createMesh(geometry, material, { x, y, z }) as ExtendedObject3D
    mesh.name = name || `body_id_${mesh.id}`
    mesh.shape = 'torus'
    return mesh
  }

  public addTorus(torusConfig: TorusConfig = {}, materialConfig: MaterialConfig = {}): ExtendedObject3D {
    const obj = this.makeTorus(torusConfig, materialConfig)
    this.scene.add(obj)
    return obj
  }

  public addMaterial(materialConfig: MaterialConfig = {}) {
    const type = Object.keys(materialConfig)[0]
    let material: Material | Material[]

    // if (type) {
    //   const { map } = materialConfig[type]
    //   if (typeof map === 'string') materialConfig[type].map = this.loadTexture(map)
    // }

    switch (type) {
      case 'basic':
        material = new MeshBasicMaterial(materialConfig.basic)
        break
      case 'normal':
        material = new MeshNormalMaterial(materialConfig.normal)
        break
      case 'standard':
        material = new MeshStandardMaterial(materialConfig.standard)
        break
      case 'lambert':
        material = new MeshLambertMaterial(materialConfig.lambert)
        break
      case 'phong':
        material = new MeshPhongMaterial(materialConfig.phong)
        break
      case 'physical':
        if (typeof materialConfig.physical !== 'undefined') {
          material = new MeshPhysicalMaterial(materialConfig.physical)
        } else {
          logger('You need to pass parameters to the physical material. (Fallback to default material)')
          material = this.defaultMaterial.get()
        }
        break
      case 'toon':
        material = new MeshToonMaterial(materialConfig.toon)
        break
      case 'line':
        material = new LineBasicMaterial(materialConfig.line)
        break
      case 'points':
        material = new PointsMaterial(materialConfig.points)
        break
      case 'custom':
        material = materialConfig.custom || this.defaultMaterial.get()
        break
      default:
        material = this.defaultMaterial.get()
        break
    }

    return material
  }
}

import { BufferAttribute, BufferGeometry, Mesh, Object3D, PlaneGeometry, ShaderMaterial, Vector2 } from "three";
import { Canvas, CanvasConstructor } from "../webgl/canvas";
// import { ImgEffectShader2 } from "../glsl/imgEffectShader2";
import { Util } from "../libs/util";
import { Func } from "../core/func";
import { Capture } from "../webgl/capture";
import { BlockList } from "./blockList";
// import { MousePointer } from "../core/mousePointer";
import { ImgEffectShader } from "../glsl/imgEffectShader";
import { Conf } from "../core/conf";

export class ImgEffect extends Canvas {
  private _con: Object3D
  // private _mesh: Array<Points> = []
  private _mesh2: Array<Mesh> = []

  // ベース映像作成用
  private _blockCon: Object3D
  private _block: Array<BlockList> = [];

  private _texNum:number = Func.val(50, 100)
  private _cap: Array<Capture> = []
  private _renderCnt: number = 0

  constructor(opt: CanvasConstructor) {
    super(opt)

    this._con = new Object3D()
    this.mainScene.add(this._con)

    this._blockCon = new Object3D()

    this._block.push(new BlockList({num:3}));
    this._block.push(new BlockList({num:50}));
    this._block.push(new BlockList({num:12}));
    this._block.forEach((val) => {
      this._blockCon.add(val);
    })

    for(let i = 0; i < this._texNum; i++) {
      this._cap.push(new Capture())
    }

    this._renderCnt = 0
    this._makeMesh()
    this._resize()
  }


  private _makeMesh(): void {
    for(let i = 0; i < this._texNum; i++) {
      // const m = new Points(
      //   this.getGeo(i),
      //   new RawShaderMaterial({
      //     vertexShader:ImgEffectShader2.vertexShader,
      //     fragmentShader:ImgEffectShader2.fragmentShader,
      //     transparent:true,
      //     uniforms:{
      //       alpha:{value:0},
      //       size:{value:2},
      //       time:{value:0},
      //       ang:{value:0},
      //       tex:{value:this._cap[(i + this._renderCnt) % this._texNum].texture()},
      //     }
      //   })
      // )

      const m = new Mesh(
        new PlaneGeometry(1, 1),
        new ShaderMaterial({
          vertexShader:ImgEffectShader.vertexShader,
          fragmentShader:ImgEffectShader.fragmentShader,
          transparent:true,
          uniforms:{
            range:{value:new Vector2(i * (1 / this._texNum), (i + 1) * (1 / this._texNum))},
            size:{value:2},
            time:{value:0},
            ang:{value:0},
            tex:{value:this._cap[(i + this._renderCnt) % this._texNum].texture()},
          }
        })
      )
      this._con.add(m)
      this._mesh2.push(m)
    }
  }


  protected _update(): void {
    super._update()

    // this._blockCon.rotation.y = Util.radian(MousePointer.instance.easeNormal.x * 80)
    this._blockCon.rotation.x = Util.radian(Func.val(0, -60))
    // this._blockCon.rotation.x = Util.radian(MousePointer.instance.easeNormal.y * 80)

    // this._mesh.forEach((m:Points, i:number) => {
    this._mesh2.forEach((m:any, i:number) => {
      const s = Math.max(this.renderSize.width, this.renderSize.height) * Func.val(1, 1)
      m.scale.set(s, s, 1)

      this._setUni(m, 'size', 9)
      this._setUni(m, 'time', this._c * 0.5)

      this._setUni(m, 'ang', Util.radian(0))
      this._setUni(m, 'tex', this._cap[(((this._texNum - 1) - i) + this._renderCnt) % this._texNum].texture())
    })

    this._con.add(this._blockCon)

    // ベース映像のレンダリング
    if(this._c % 1 == 0) {
      const cap = this._cap[this._renderCnt % this._texNum]
      cap.add(this._blockCon)

      this.renderer.setClearColor(0x000000, 1)
      cap.render(this.renderer, this.cameraPers)
      if(this._c % 1 == 0) this._renderCnt++
    }

    this.renderer.setClearColor(0x000000, 1)
    this.renderer.render(this.mainScene, this.cameraPers)
  }


  protected _resize(): void {
    super._resize()

    if(Conf.IS_SP) {
      if(Func.sw() === this.renderSize.width) {
        return
      }
    }

    const w = Func.sw()
    const h = Func.sh()

    this.renderSize.width = w
    this.renderSize.height = h

    let pixelRatio: number = window.devicePixelRatio || 1
    this._cap.forEach((c:Capture) => {
      c.setSize(w * 1, h * 1, pixelRatio)
    })

    this.cameraPers.fov = Func.val(30, 60)

    this._updateOrthCamera(this.cameraOrth, w, h)
    this._updatePersCamera(this.cameraPers, w, h)

    this.renderer.setPixelRatio(pixelRatio)
    this.renderer.setSize(w, h)
    // this.renderer.clear()
  }


  // ---------------------------------
  //
  // ---------------------------------
  public getGeo(id: number):BufferGeometry {
    const geometry = new BufferGeometry()

    const line = 200
    const num = line * line
    const translate = new Float32Array(num * 3)
    const info = new Float32Array(num * 3)

    const min = id * (line / this._texNum)
    const max = min + (line / this._texNum)
    let pKey = 0
    let i = 0
    while(i < num) {
        const ix = i % line
        const iy = Math.floor(i / line)
        // const iz = ix * iy

        const x = Util.map(ix, -0.5, 0.5, 0, line)
        const y = Util.map(iy, -0.5, 0.5, 0, line)

        const active = iy >= min && iy < max

        translate[pKey*3+0] = x
        translate[pKey*3+1] = y
        translate[pKey*3+2] = 0

        info[pKey*3+0] = Math.sqrt(x * x + y * y)
        info[pKey*3+1] = active ? 1 : 0
        info[pKey*3+2] = Util.map(id, 0, 1, 0, this._texNum - 1)

        pKey++
        i++
    }

    geometry.setAttribute('position', new BufferAttribute(translate, 3))
    geometry.setAttribute('info', new BufferAttribute(info, 3))
    geometry.computeBoundingSphere()

    return geometry
  }
}

import { MyObject3D } from "../webgl/myObject3D";
import { ConeGeometry } from 'three/src/geometries/ConeGeometry';
import { ShaderMaterial } from 'three/src/materials/ShaderMaterial';
import { Color } from 'three/src/math/Color';
import { DoubleSide } from 'three/src/constants';
import { Block } from "./block";
import { Func } from '../core/func';
import { Tween } from '../core/tween';
import { Scroller } from '../core/scroller';
import { Util } from '../libs/util';
import { BlockShader } from "../glsl/blockShader";

export class BlockList extends MyObject3D {

  private _item: Array<Block> = [];
  private _mat: Array<ShaderMaterial> = [];
  private _heightEl:HTMLElement;
  private _scroll: number = 0;

  constructor(opt: {num:number}) {
    super();

    this._heightEl = document.createElement('div');
    document.body.append(this._heightEl);
    this._heightEl.classList.add('js-height')

    // 必要なマテリアル作っておく
    for(let i = 0; i < 4; i++) {
      this._mat.push(new ShaderMaterial({
        vertexShader:BlockShader.vertexShader,
        fragmentShader:BlockShader.fragmentShader,
        transparent:true,
        depthTest:false,
        side: DoubleSide,
        uniforms:{
          color:{value:new Color(0,0,0).offsetHSL(Util.random(0,1), 1, 0.5)},
          alpha:{value:1},
          time:{value:Util.randomInt(0, 1000)},
        }
      }));
    }

    const geoFillA = new ConeGeometry(0.5, 2, 28, 8);
    const geoFillB = new ConeGeometry(0.5, 2, 16, 16);

    // アイテム
    for(let i = 0; i < opt.num; i++) {
      const item = new Block({
        id: 0,
        matFill: this._mat,
        geoFill: [geoFillA, geoFillB][opt.num == 10 ? 0 : 1],
      });
      this.add(item);
      this._item.push(item);
    }
  }


  protected _update():void {
    super._update();

    const sw = Func.sw();
    const sh = Func.sh();

    let scroll = Scroller.instance.val.y;
    this._scroll += (scroll - this._scroll) * 0.1;
    const scrollHeight = sh * 8;
    const num = this._item.length;

    this._item.forEach((val,i) => {
      const rad = Util.radian((360 / this._item.length) * i);
      let radius = Func.val(sh * 0.15, sw * 0.15);

      if(num <= 10) {
        radius *= Util.map(this._scroll, 1, 0.75, 0, scrollHeight - sh);
      } else {
        radius *= Util.map(this._scroll, 0.75, 2.5, 0, scrollHeight - sh);
      }

      const x = Math.sin(rad) * radius;
      const y = Math.cos(rad) * radius;

      const rad2 = Util.radian((360 / this._item.length) * (i + 1));
      const x2 = Math.sin(rad2) * radius;
      const y2 = Math.cos(rad2) * radius;

      const dx = x - x2;
      const dy = y - y2;
      const d = Math.sqrt(dx * dx + dy * dy);

      let scroll2 = Math.max(0, this._scroll - i * 0);
      let ang = scroll2 * 0.25;
      ang = Math.max(0, ang);

      val.update({
        size: d,
        ang: ang * (num <= 10 ? -1 : -0.5),
      });

      val.position.x = x;
      val.position.y = y;

      const move = 0.2;
      if(num > 10) val.position.z = Util.map(this._scroll, sh * move, sh * -move, 0, scrollHeight - sh);
      if(num <= 10) val.position.z = Util.map(this._scroll, sh * -move, sh * move, 0, scrollHeight - sh);

      val.rotation.z = Math.atan2(dy, dx);
      if(num > 10) val.rotation.z += Util.radian(Util.map(this._scroll, 0, 720, 0, scrollHeight - sh));
    })

    Tween.instance.set(this._heightEl, {
      top: scrollHeight,
    })

    this._mat.forEach((val) => {
      const uni = val.uniforms;
      uni.time.value += 1;
      // uni.alpha.value = Util.map(this._scroll, 1, 0, 0, scrollHeight - sh);
    })
  }
}
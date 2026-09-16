// «Миний булан»: талбайн урд талын хоосон газар — маркетаас авсан гэрийн чимэглэл тогтмол байрлалдаа гарна.
import * as P from '../world/props.js';
import { SHOP } from '../core/content.js';

/** kind → [x, z] (талбайн CENTER 56,−38-ийн урд; browser дээр collider-гүй гэж шалгасан) */
export const HOME_SPOTS = {
  flowers: [56.5, -29.5],
  mailbox: [54, -31.5],
  bench: [59, -29.5],
  lamp: [54, -27],
  bunting: [56.5, -24.5],
  scarecrow: [59, -32.5],
};

export class HomeDecor {
  constructor(scene) { this.scene = scene; this.built = {}; }

  setup() {
    P.sign(this.scene.scene, 'МИНИЙ БУЛАН', 56.5, 2.4, -33.3, { width: 3.6, bg: '#fff7d7', fg: '#306e46', border: '#ffa72e', post: true });
    this.refresh();
  }

  /** Owned бүх зүйлийг нэг удаа барина (дахин дуудахад давхардахгүй) */
  refresh() {
    const { state, scene, town } = this.scene;
    for (const item of SHOP) {
      if (item.cat !== 'home' || this.built[item.data] || !state.owns(item.id)) continue;
      const [x, z] = HOME_SPOTS[item.data];
      this.built[item.data] = P.homeDecor(scene, item.data, x, z);
      if (item.data === 'lamp' || item.data === 'mailbox' || item.data === 'scarecrow') town.colliders.push({ x, z, r: 0.45 });
      if (item.data === 'bench') town.colliders.push({ x, z, r: 0.9 });
    }
  }

  update(dt, t) {
    const b = this.built.bunting;
    if (b) b.traverse((o) => { if (o.userData.wave !== undefined) o.rotation.y = Math.sin(t * 2.2 + o.userData.wave) * 0.35; });
  }
}

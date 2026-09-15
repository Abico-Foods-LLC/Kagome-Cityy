// Post-processing: bloom + vignette/color grade. Чанарын түвшингээс хамаарч унтраана.
import * as T from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uVignette: { value: 0.35 },
    uSaturation: { value: 1.08 },
    uFlash: { value: new T.Color(0, 0, 0) },
    uFlashAmt: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uVignette, uSaturation, uFlashAmt; uniform vec3 uFlash; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb = mix(vec3(l), c.rgb, uSaturation);
      vec2 d = vUv - 0.5;
      float v = 1.0 - smoothstep(0.35, 0.95, dot(d, d) * 2.2) * uVignette;
      c.rgb *= v;
      c.rgb = mix(c.rgb, uFlash, uFlashAmt);
      gl_FragColor = c;
    }`,
};

export function createPost(renderer, scene, camera, { bloom = true } = {}) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  let bloomPass = null;
  if (bloom) {
    bloomPass = new UnrealBloomPass(new T.Vector2(innerWidth, innerHeight), 0.28, 0.5, 0.86);
    composer.addPass(bloomPass);
  }
  // Depth of field: дүрээс хол зүйлс зөөлөн бүдгэрнэ (diorama мэдрэмж). Өндөр чанарт л асна.
  const bokeh = new BokehPass(scene, camera, { focus: 10, aperture: 0.00018, maxblur: 0.006 });
  bokeh.enabled = false;
  composer.addPass(bokeh);
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  composer.addPass(new OutputPass());

  return {
    composer, grade, bloomPass, bokeh,
    setFocus(d) { bokeh.uniforms.focus.value += (d - bokeh.uniforms.focus.value) * 0.1; },
    setSize(w, h) { composer.setSize(w, h); bloomPass?.setSize(w, h); },
    render() { composer.render(); },
    flash(color, amt) { grade.uniforms.uFlash.value.set(color); grade.uniforms.uFlashAmt.value = amt; },
    setCamera(cam) { composer.passes[0].camera = cam; bokeh.camera = cam; },
    setScene(sc) { composer.passes[0].scene = sc; bokeh.scene = sc; },
  };
}

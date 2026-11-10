import * as THREE from "three";
import type { TreeSettings } from "@/lib/tree-settings";

// WebGL adaptation of just-a-simple-tree's wind.js (MIT): height-weighted
// downwind sway, independent branch beats, hanging lift, and leaf flutter.
// The same field runs on the CPU for leaf hit targets and in the wood shader.
export function createTreeWind(initial: TreeSettings) {
  let settings = initial;
  const uniforms = {
    uTreeTime: { value: 0 },
    uTreeWind: { value: 0 },
    uTreeSpeed: { value: initial.windSpeed },
    uTreeDirection: { value: THREE.MathUtils.degToRad(initial.windDirection) },
    uTreeHeight: { value: initial.size },
  };
  function configure(next: TreeSettings, height = uniforms.uTreeHeight.value) {
    settings = next;
    uniforms.uTreeSpeed.value = next.windSpeed;
    uniforms.uTreeDirection.value = THREE.MathUtils.degToRad(
      next.windDirection,
    );
    uniforms.uTreeHeight.value = Math.max(1, height);
  }
  function update(now: number, reduced: boolean, gust = 0) {
    uniforms.uTreeTime.value = now / 1000;
    uniforms.uTreeWind.value = reduced
      ? 0
      : settings.wind * settings.size * 0.17 * (1 + gust);
  }
  const source = `
    uniform float uTreeTime, uTreeWind, uTreeSpeed, uTreeDirection, uTreeHeight;
    vec3 treeSway(vec3 p, float lift, vec2 swing) {
      vec3 along = vec3(cos(uTreeDirection), 0., sin(uTreeDirection));
      vec3 across = vec3(-along.z, 0., along.x);
      float t = uTreeTime * uTreeSpeed;
      float spatial = dot(p, along) * .55 + p.y * .31;
      float gust = .65 + .3 * sin(t * 1.37 - spatial) + .18 * sin(t * .63 + spatial * 1.7);
      float bend = pow(max(0., (p.y + lift) / uTreeHeight), 1.7);
      vec3 field = along * gust + across * sin(t * .87 + spatial * .8) * .18;
      vec3 own = along * (.4 + .6 * sin(t * 2.6389 + swing.y))
        + across * .45 * sin(t * 1.9478 + swing.y + 2.1)
        + vec3(0., .2 * sin(t * 3.5814 + swing.y + 4.2), 0.);
      return (field * bend + own * swing.x * gust * .6) * uTreeWind;
    }
  `;
  function apply(material: THREE.Material) {
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>\n${source}\nattribute float swayLift;\nattribute vec2 swayDetail;`,
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\ntransformed += treeSway(transformed, swayLift, swayDetail);",
        );
    };
    material.customProgramCacheKey = () => "gmc-branch-wind-v1";
  }
  const offset = new THREE.Vector3();
  function sample(p: THREE.Vector3, lift = 0, flex = 0, phase = 0) {
    const time = uniforms.uTreeTime.value * uniforms.uTreeSpeed.value,
      direction = uniforms.uTreeDirection.value,
      x = Math.cos(direction),
      z = Math.sin(direction),
      spatial = (p.x * x + p.z * z) * 0.55 + p.y * 0.31,
      gust =
        0.65 +
        0.3 * Math.sin(time * 1.37 - spatial) +
        0.18 * Math.sin(time * 0.63 + spatial * 1.7),
      bend = Math.max(0, (p.y + lift) / uniforms.uTreeHeight.value) ** 1.7,
      cross = Math.sin(time * 0.87 + spatial * 0.8) * 0.18,
      alongBeat = 0.4 + 0.6 * Math.sin(time * 2.6389 + phase),
      acrossBeat = 0.45 * Math.sin(time * 1.9478 + phase + 2.1),
      own = flex * gust * 0.6;
    return offset
      .set(
        (x * gust - z * cross) * bend + (x * alongBeat - z * acrossBeat) * own,
        0.2 * Math.sin(time * 3.5814 + phase + 4.2) * own,
        (z * gust + x * cross) * bend + (z * alongBeat + x * acrossBeat) * own,
      )
      .multiplyScalar(uniforms.uTreeWind.value);
  }
  return { uniforms, configure, update, apply, sample };
}

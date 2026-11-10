import * as THREE from "three";
import { generateTree, type Clump } from "@/vendor/just-a-simple-tree";
import { treePalettes, type TreeSettings } from "@/lib/tree-settings";
import { themes, type Leaf } from "@/lib/catalog";

export type ProjectedLeaf = {
  id: string;
  x: number;
  y: number;
  visible: boolean;
};
export type SceneController = {
  update(leaves: Leaf[], activeId?: string, arrivalId?: string): void;
  dispose(): void;
};
function random(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function hash(value: string) {
  return Array.from(value).reduce(
    (sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0,
    7,
  );
}

function leafTexture(cluster: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const draw = (x: number, y: number, angle: number, size: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(size, size);
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.bezierCurveTo(-24, 6, -27, -22, 0, -40);
    ctx.bezierCurveTo(26, -22, 24, 5, 0, 22);
    ctx.fill();
    ctx.strokeStyle = "rgba(90,120,50,.24)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 17);
    ctx.lineTo(0, -31);
    ctx.stroke();
    ctx.restore();
  };
  if (cluster) {
    draw(42, 44, -0.85, 0.84);
    draw(83, 42, 0.72, 0.84);
    draw(35, 88, -1.25, 0.76);
    draw(86, 86, 1.12, 0.8);
    draw(64, 69, 0, 0.9);
  } else draw(64, 72, 0, 1.5);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// GPU sway keeps the root still and bends upper branches and foliage together.
function windMaterial(
  material: THREE.MeshToonMaterial,
  time: { value: number },
  strength: number,
  height: number,
) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.vertexShader =
      `uniform float uTime;\n${shader.vertexShader}`.replace(
        "#include <begin_vertex>",
        `
      #include <begin_vertex>
      vec3 worldLeaf = transformed;
      #ifdef USE_INSTANCING
        worldLeaf = (instanceMatrix * vec4(transformed, 1.0)).xyz;
      #endif
      float bend = pow(max(worldLeaf.y / ${Math.max(height, 1).toFixed(3)}, 0.0), 2.0);
      float gust = sin(uTime * .65 + worldLeaf.y * .8) * .6 + sin(uTime * .37 + worldLeaf.x * 1.3) * .4;
      transformed.x += gust * bend * ${strength.toFixed(3)};
      transformed.z += sin(uTime * .52 + worldLeaf.y) * bend * ${(strength * 0.4).toFixed(3)};
    `,
      );
  };
}

export function createTreeScene(
  host: HTMLElement,
  settings: TreeSettings,
  onProject: (items: ProjectedLeaf[]) => void,
  onFailure: () => void,
): SceneController {
  let low =
    settings.quality === "low" ||
    (settings.quality === "auto" &&
      (window.innerWidth < 700 || (navigator.hardwareConcurrency || 4) <= 4));
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: !low,
    powerPreference: "low-power",
  });
  const gl = renderer.getContext();
  const debug = gl.getExtension("WEBGL_debug_renderer_info");
  const software = debug
    ? /swiftshader|llvmpipe|software/i.test(
        String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)),
      )
    : false;
  if (software && settings.quality === "auto") low = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.className = "procedural-canvas";
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const tree = new THREE.Group();
  tree.rotation.y = THREE.MathUtils.degToRad(settings.rotation);
  scene.add(tree);
  const gradient = new THREE.DataTexture(
    new Uint8Array([
      65, 65, 65, 255, 140, 140, 140, 255, 205, 205, 205, 255, 255, 255, 255,
      255,
    ]),
    4,
    1,
    THREE.RGBAFormat,
  );
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  const palette = treePalettes[settings.palette],
    texture = leafTexture(true),
    single = leafTexture(false);
  const time = { value: 0 },
    disposableTextures = [gradient, texture, single];
  let geometry: THREE.BufferGeometry | undefined;
  try {
    const generated = generateTree(settings);
    geometry = generated.geometry;
    const clumps = generated.clumps;
    if (!clumps.length || !geometry.getAttribute("position")?.count)
      throw new Error("Tree geometry is empty");
    const box = new THREE.Box3().setFromBufferAttribute(
      geometry.getAttribute("position") as THREE.BufferAttribute,
    );
    for (const clump of clumps) {
      const extent = new THREE.Vector3(
        clump.radius,
        clump.radius * (clump.flatten || 1),
        clump.radius,
      );
      box.expandByPoint(clump.position.clone().add(extent));
      box.expandByPoint(clump.position.clone().sub(extent));
    }
    const height = box.max.y,
      span = box.getSize(new THREE.Vector3());
    const woodMaterial = new THREE.MeshToonMaterial({
      color: palette.wood,
      gradientMap: gradient,
    });
    windMaterial(
      woodMaterial,
      time,
      motion.matches ? 0 : settings.wind * 0.1,
      height,
    );
    tree.add(new THREE.Mesh(geometry, woodMaterial));
    const foliageMaterial = new THREE.MeshToonMaterial({
      color: "white",
      gradientMap: gradient,
      map: texture,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
    });
    windMaterial(
      foliageMaterial,
      time,
      motion.matches ? 0 : settings.wind * 0.16,
      height,
    );
    const cards = Math.min(
      low ? 1600 : 4200,
      Math.floor(clumps.length * (low ? 30 : 50) * settings.density),
    );
    const foliage = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1),
      foliageMaterial,
      cards,
    );
    const dummy = new THREE.Object3D(),
      color = new THREE.Color(),
      normal = new THREE.Vector3();
    for (let i = 0; i < cards; i++) {
      const seed = settings.seed + i * 7,
        clump = clumps[i % clumps.length];
      const angle = random(seed) * Math.PI * 2,
        vertical = random(seed + 1) * 2 - 1,
        side = Math.sqrt(1 - vertical * vertical);
      normal.set(Math.cos(angle) * side, vertical, Math.sin(angle) * side);
      const radius = clump.radius * (0.4 + random(seed + 2) * 0.65);
      dummy.position
        .copy(clump.position)
        .add(
          new THREE.Vector3(
            normal.x * radius,
            normal.y * radius * (clump.flatten || 1),
            normal.z * radius,
          ),
        );
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      dummy.rotateZ(random(seed + 3) * Math.PI * 2);
      const size = Math.max(
        0.08,
        clump.radius *
          (low ? 1.3 : 1.05) *
          (0.8 + random(seed + 4) * 0.45) *
          Math.max(clump.grown ?? 1, 0.2),
      );
      dummy.scale.set(size, size, size);
      dummy.updateMatrix();
      foliage.setMatrixAt(i, dummy.matrix);
      const illumination = Math.max(
        0,
        normal.dot(new THREE.Vector3(-0.4, 0.8, 0.5)),
      );
      color.set(
        palette.leaves[illumination > 0.65 ? 2 : illumination > 0.05 ? 1 : 0],
      );
      color.multiplyScalar(0.8 + random(seed + 5) * 0.25);
      foliage.setColorAt(i, color);
    }
    foliage.instanceMatrix.needsUpdate = true;
    if (foliage.instanceColor) foliage.instanceColor.needsUpdate = true;
    tree.add(foliage);
    scene.add(new THREE.HemisphereLight(0xf3edce, 0x193f31, 1.25));
    const sunlight = new THREE.DirectionalLight(0xffefcc, 1.8);
    sunlight.position.set(-3, 8, 6);
    scene.add(sunlight);
    const rim = new THREE.DirectionalLight(0xacc89e, 0.8);
    rim.position.set(4, 4, -4);
    scene.add(rim);
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(Math.max(span.x, span.z) * 0.42, 64),
      new THREE.MeshBasicMaterial({
        color: palette.grass,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.025;
    scene.add(ground);
    const grass = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.025, 0.2),
      new THREE.MeshToonMaterial({
        color: palette.grass,
        side: THREE.DoubleSide,
        gradientMap: gradient,
      }),
      low ? 180 : 450,
    );
    for (let i = 0; i < grass.count; i++) {
      const angle = random(i + 19) * Math.PI * 2,
        radius = Math.sqrt(random(i + 4)) * Math.max(span.x, span.z) * 0.35;
      dummy.position.set(
        Math.cos(angle) * radius,
        0.08,
        Math.sin(angle) * radius,
      );
      dummy.rotation.set(0, angle, (random(i + 2) - 0.5) * 0.6);
      dummy.scale.setScalar(0.5 + random(i + 3));
      dummy.updateMatrix();
      grass.setMatrixAt(i, dummy.matrix);
    }
    tree.add(grass);
    const markerGroup = new THREE.Group();
    tree.add(markerGroup);
    const markers = new Map<
      string,
      { sprite: THREE.Sprite; position: THREE.Vector3; leaf: Leaf }
    >();
    const flight = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: single,
        color: "#e7d78d",
        transparent: true,
        depthTest: false,
      }),
    );
    flight.visible = false;
    flight.scale.setScalar(0.24);
    scene.add(flight);
    let activeId: string | undefined,
      lastArrival: string | undefined,
      flightStarted = 0,
      flightTarget = new THREE.Vector3();
    const projected = new THREE.Vector3();
    let width = 0,
      canvasHeight = 0,
      disposed = false,
      lastFrame = 0,
      dirty = true;
    const centre = box
      .getCenter(new THREE.Vector3())
      .applyMatrix4(tree.matrixWorld);
    const cameraDirection = new THREE.Vector3(0, 0.1, 1).normalize();
    const cameraSide = new THREE.Vector3(1, 0, 0),
      cameraUp = new THREE.Vector3()
        .crossVectors(cameraDirection, cameraSide)
        .normalize();
    const framing: THREE.Vector3[] = [];
    const vertices = geometry.getAttribute("position");
    tree.updateMatrixWorld(true);
    // Fit actual geometry and foliage extents, rather than empty box corners.
    for (let i = 0; i < vertices.count; i += 12)
      framing.push(
        new THREE.Vector3()
          .fromBufferAttribute(vertices, i)
          .applyMatrix4(tree.matrixWorld),
      );
    for (const clump of clumps)
      for (const direction of [
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, -1),
      ]) {
        direction.multiplyScalar(clump.radius * 1.22);
        direction.y *= clump.flatten || 1;
        framing.push(
          direction.add(clump.position).applyMatrix4(tree.matrixWorld),
        );
      }
    centre.copy(
      new THREE.Box3().setFromPoints(framing).getCenter(new THREE.Vector3()),
    );
    function resize() {
      dirty = true;
      width = Math.max(1, host.clientWidth);
      canvasHeight = Math.max(1, host.clientHeight);
      // Bound GPU work independently of the TV's physical pixel density.
      const pixelBudget = software ? 1200000 : low ? 1800000 : 4000000;
      renderer.setPixelRatio(
        Math.min(
          window.devicePixelRatio || 1,
          low ? 1 : 1.5,
          Math.sqrt(pixelBudget / (width * canvasHeight)),
        ),
      );
      renderer.setSize(width, canvasHeight, false);
      camera.aspect = width / canvasHeight;
      const verticalFov = THREE.MathUtils.degToRad(camera.fov),
        horizontalFov =
          2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
      let distance = 1;
      for (const point of framing) {
        const relative = point.clone().sub(centre),
          z = relative.dot(cameraDirection);
        distance = Math.max(
          distance,
          z + Math.abs(relative.dot(cameraSide)) / Math.tan(horizontalFov / 2),
          z + Math.abs(relative.dot(cameraUp)) / Math.tan(verticalFov / 2),
        );
      }
      distance *= 1.08;
      camera.position.copy(centre).addScaledVector(cameraDirection, distance);
      camera.lookAt(centre);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
    }
    function markerPosition(leaf: Leaf) {
      const category = themes.findIndex((theme) => theme.id === leaf.category),
        seed = hash(leaf.id);
      // Each theme occupies a stable slice of the actual generated crown.
      const sorted = [...clumps].sort((a, b) => a.position.x - b.position.x);
      const choices = sorted.filter((_, i) => i % 6 === category);
      const clump: Clump = (choices.length ? choices : sorted)[
        seed % (choices.length || sorted.length)
      ];
      return clump.position
        .clone()
        .add(
          new THREE.Vector3(
            (random(seed) - 0.5) * clump.radius,
            (random(seed + 1) - 0.3) * clump.radius * 0.6,
            clump.radius * 1.02 + 0.06,
          ),
        );
    }
    const update = (
      leaves: Leaf[],
      nextActive?: string,
      arrivalId?: string,
    ) => {
      dirty = true;
      activeId = nextActive;
      const wanted = new Set(leaves.map((leaf) => leaf.id));
      for (const [id, marker] of markers)
        if (!wanted.has(id)) {
          markerGroup.remove(marker.sprite);
          (marker.sprite.material as THREE.SpriteMaterial).dispose();
          markers.delete(id);
        }
      for (const leaf of leaves)
        if (!markers.has(leaf.id)) {
          const material = new THREE.SpriteMaterial({
            map: single,
            color: themes.find((theme) => theme.id === leaf.category)!.color,
            transparent: true,
            depthTest: false,
            depthWrite: false,
          });
          const sprite = new THREE.Sprite(material),
            position = markerPosition(leaf);
          sprite.position.copy(position);
          sprite.scale.set(0.15, 0.19, 1);
          markerGroup.add(sprite);
          markers.set(leaf.id, { sprite, position, leaf });
        }
      if (
        arrivalId &&
        arrivalId !== lastArrival &&
        markers.has(arrivalId) &&
        !motion.matches
      ) {
        lastArrival = arrivalId;
        flightStarted = performance.now();
        flightTarget = markers
          .get(arrivalId)!
          .position.clone()
          .applyMatrix4(tree.matrixWorld);
        flight.visible = true;
        (flight.material as THREE.SpriteMaterial).color.set(
          themes.find(
            (theme) => theme.id === markers.get(arrivalId)!.leaf.category,
          )!.color,
        );
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    tree.updateMatrixWorld(true);
    resize();
    const lose = (event: Event) => {
      event.preventDefault();
      if (!disposed) onFailure();
    };
    renderer.domElement.addEventListener("webglcontextlost", lose);
    renderer.setAnimationLoop((now) => {
      if (
        disposed ||
        document.hidden ||
        ((motion.matches || settings.wind === 0) &&
          !dirty &&
          !flight.visible) ||
        now - lastFrame < (software ? 1000 / 12 : low ? 1000 / 24 : 1000 / 30)
      )
        return;
      lastFrame = now;
      dirty = false;
      time.value = motion.matches ? 0 : now / 1000;
      if (flight.visible) {
        const t = Math.min(1, (now - flightStarted) / 1200),
          eased = 1 - (1 - t) ** 3;
        flight.position.set(0, height * 0.12, 0).lerp(flightTarget, eased);
        flight.position.x += Math.sin(t * Math.PI) * 0.8;
        flight.scale.setScalar(0.18 + Math.sin(t * Math.PI) * 0.1);
        if (t === 1) flight.visible = false;
      }
      const items: ProjectedLeaf[] = [];
      for (const [id, marker] of markers) {
        marker.sprite.scale.setScalar(id === activeId ? 0.25 : 0.16);
        projected
          .copy(marker.position)
          .applyMatrix4(tree.matrixWorld)
          .project(camera);
        items.push({
          id,
          x: (projected.x * 0.5 + 0.5) * width,
          y: (-projected.y * 0.5 + 0.5) * canvasHeight,
          visible: projected.z > -1 && projected.z < 1,
        });
      }
      onProject(items);
      renderer.render(scene, camera);
    });
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      observer.disconnect();
      renderer.setAnimationLoop(null);
      renderer.domElement.removeEventListener("webglcontextlost", lose);
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.InstancedMesh) object.dispose();
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          const material = Array.isArray(object.material)
            ? object.material
            : [object.material];
          material.forEach((item) => materials.add(item));
        }
        if (object instanceof THREE.Sprite) materials.add(object.material);
      });
      geometries.forEach((item) => item.dispose());
      materials.forEach((item) => item.dispose());
      disposableTextures.forEach((item) => item.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
    return { update, dispose };
  } catch (error) {
    geometry?.dispose();
    disposableTextures.forEach((item) => item.dispose());
    renderer.dispose();
    renderer.domElement.remove();
    throw error;
  }
}

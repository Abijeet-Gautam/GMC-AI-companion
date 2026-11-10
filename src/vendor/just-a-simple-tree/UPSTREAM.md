# Upstream attribution

Source: https://github.com/MikeFernandez-Pro/just-a-simple-tree

Revision: 8fd94b8edc7ef1b87c086694382a0808c059971c

Copyright (c) 2026 Mike Fernandez. MIT licence retained in LICENSE.

Adaptations: imports use Three.js WebGL modules; the CPU liftBelow helper is extracted from wind.js. All six procedural species and the age/growth attributes are retained. `leaf-textures.js` extracts the upstream leaf path and cluster painters from foliage.js, using one transparent texture cell instead of a four-cell luminance atlas. Live contribution mode uses individual leaf textures; the manual canopy uses upstream cluster painters. GMC supplies the interactive WebGL renderer, continuous contribution-driven deformation, OrbitControls integration, camera fit, studio, exports, staff settings, wind and illustration fallback. No external music or artwork is copied.

The scene palette values now follow `themes.js`. `tree-wind.ts` adapts the height-weighted sway, per-branch swing, hanging lift and flutter from `wind.js` to WebGL GLSL, with a matching CPU field for the interactive leaves. Its gust field uses trigonometric harmonics instead of the original WebGPU MaterialX noise. `tree-environment.ts` adapts `grass.js`'s segmented curved blades, tapered ragged patch, root-to-tip palette and travelling wind; grass density and shadow map resolution adapt to the device. The floor, hemisphere light, warm sun and cast-shadow setup follow `main.js` and `shading.js`. This remains a WebGL adaptation for reception-browser compatibility, rather than the upstream WebGPU renderer.

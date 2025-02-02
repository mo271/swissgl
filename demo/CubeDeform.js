/** @license 
  * Copyright 2023 Google LLC.
  * SPDX-License-Identifier: Apache-2.0 
  */

class CubeDeform {
    frame(glsl, params) {
        glsl({...params, Grid:[6,1], Mesh:[20, 20],
        Aspect:'fit', DepthTest:1}, `
        varying vec3 color, normal, eyeDir;
        //VERT
        vec3 surface_f(vec2 xy) {
            vec3 pos = cubeVert(xy, ID.x);
            pos += sin(pos*PI+time).zxy*0.2;
            pos = mix(pos, normalize(pos)*1.5, sin(time)*0.8+0.2);
            pos.xy *= rot2(PI/4.+time*0.2);
            pos.yz *= rot2(PI/3.0);
            return pos*0.4;
        }
        vec4 vertex() {
            color = cubeVert(vec2(0), ID.x)*0.5+0.5;
            vec4 v = vec4(SURF(surface_f, XY, normal, 1e-3), 1.0);
            eyeDir = normalize(cameraPos()-v.xyz);
            return wld2proj(v);
        }
        //FRAG
        void fragment() {
            vec3 n = normalize(normal);
            vec3 lightDir = normalize(vec3(0,1,1));
            float diffuse = dot(n, lightDir)*0.5+0.5;
            vec3 halfVec = normalize(lightDir+eyeDir);
            float spec = pow(max(dot(halfVec, n), 0.0), 1000.0);
            out0.rgb = color*diffuse + 0.3*spec;
            vec2 m = UV*4.0;
            out0.rgb = mix(out0.rgb, vec3(1.0), (isoline(m.x)+isoline(m.y))*0.25);
            out0.a = 1.0;
        }`);
    }
}

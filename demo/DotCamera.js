/** @license
  * Copyright 2023 Google LLC.
  * SPDX-License-Identifier: Apache-2.0
  */

class DotCamera {
    constructor(glsl, gui) {
        this.tmp = glsl({},{size:[1,1], tag:'tmp'}); // placeholder
        this.field = {r: this.tmp, g: this.tmp, b: this.tmp};

        this.video = document.createElement('video');
        navigator.mediaDevices.getUserMedia({ video: true })
          .then((stream) => {
            this.video.srcObject = stream;
            this.video.play();
          }).catch((error) => {
            console.log('Error accessing camera:', error);
          });
    }
    calcForceField(glsl, channel) {
        if (this.video.videoWidth == 0) {
            return this.tmp;
        }
        const tex = glsl({}, {size:[this.video.videoWidth, this.video.videoHeight], data:this.video, tag:'video'});
        let color = glsl({tex, FP:`tex(1.0-UV).${channel}`}, {size:tex.size, wrap:'edge', tag:channel});
        const levels = {[`${channel}0`]:color};
        for (let i=1; i<=6; ++i) {
            levels[`${channel}${i}`] = color = glsl({T:color, FP: `
                vec2 d = T_step()*0.8;
                FOut.r = 0.25 * (T(UV+d).r + T(UV-d).r + T(UV+vec2(d.x,-d.y)).r + T(UV+vec2(-d.x,d.y)).r);
                `}, {size:color.size, scale:1/2, wrap:'edge', tag:`${channel}${i}`});
        }
        const merged = glsl({...levels, FP:`
            sqrt((${channel}0(UV).r+${channel}1(UV).r+${channel}2(UV).r+${channel}3(UV).r+${channel}4(UV).r+${channel}5(UV).r+${channel}6(UV).r)/7.0)`},
            {size:tex.size, format:'r16f', wrap:'edge', tag:`${channel}_merged`});
        const grad = glsl({T:merged, FP:`
            vec2 s=T_step();
            float a=T(UV-s).r, b=T(UV+vec2(s.x,-s.y)).r, c=T(UV+vec2(-s.x,s.y)).r, d=T(UV+s).r;
            FOut = vec4(b+d-a-c, c+d-a-b, 0, 0);`},
            {size:tex.size, format:'rgba16f', tag:`${channel}_grad`});
        return grad;
    }
    frame(glsl, {canvasSize}) {
        const arg = {canvasSize};
        const colors = ['r', 'g', 'b'];

        colors.forEach((color, idx) => {
            const imgForce = this.calcForceField(glsl, color);

            let points;
            for (let i=0; i<10; ++i) {
                points = glsl({...arg, field:this.field[color], imgForce, seed: Math.random()*124237, FP: `
                    vec4 p=Src(I), f=field(p.xy);
                    if (p.w == 0.0) {
                        FOut = vec4(hash(ivec3(I, seed)).xy, 0.0, 1.0);
                        return;
                    }
                    if (f.z>1.9) {p.xy += 0.2*(hash(ivec3(I,seed)).xy-0.5)/canvasSize;}
                    vec2 force = f.xy*10.0 + imgForce(p.xy).xy*20.0;
                    p.xy = clamp(p.xy + force/canvasSize, vec2(0), vec2(1));
                    FOut = p;
                `}, {scale:1/8, story:2, format:'rgba32f', tag:`points_${color}`});

                this.field[color] = glsl({...arg, points:points[0], Grid: points[0].size, Blend:'s+d', Clear:0, VP:`
                VPos.xy = (points(ID.xy).xy + XY*15.0/canvasSize)*2.0-1.0;
                `, FP:`vec3(XY,1.)*exp(-dot(XY,XY)*vec3(4,4,8)),0`}, {scale:1/4, format:'rgba16f', tag:`field_${color}`})
            }

            const rgb = ['0.0', '0.0', '0.0'];
            rgb[idx] = '1.0';
            glsl({...arg, points:points[0], Grid: points[0].size, Blend:'s+d', VP:`
                VPos.xy = (points(ID.xy).xy + XY*4.0/canvasSize)*2.0-1.0;
            `, FP:`vec4(${rgb.join(', ')}, 1.0) * exp(-dot(XY,XY)*3.0)`})
        });
    }
}

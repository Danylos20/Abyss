/* ==========================================================
   field-shaders.js — glsl for the violet field
   ========================================================== */
(function () {
  'use strict';
  const H = '#version 300 es\nprecision highp float;\nprecision highp int;\n';

  const NOISE = `
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x*p.y); }
float hash3(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x + p.y + p.z)); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a*noise(p); p = p*2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
float noise1(float x){ float i = floor(x), f = fract(x); f = f*f*(3.0 - 2.0*f); return mix(hash(vec2(i, 0.37)), hash(vec2(i + 1.0, 0.37)), f); }
float fbm1(float x){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a*noise1(x); x *= 2.1; a *= 0.5; } return s; }
`;

  // the world: zones along the walk, the footpath, the sea, the wind
  const WORLD = `
#define NZ 6
uniform float uZs[7];
uniform vec3 uCam;
uniform vec2 uPatch;
uniform float uTime;
uniform float uWind;
float zoneW(int i, float s){
  return smoothstep(uZs[i] - 14.0, uZs[i] + 14.0, s) - smoothstep(uZs[i + 1] - 14.0, uZs[i + 1] + 14.0, s);
}
float pathX(float s){ return 4.0*sin(s*0.013) + 2.0*sin(s*0.037 + 1.0); }
float seaZone(float s){ return smoothstep(238.0, 262.0, s)*(1.0 - smoothstep(338.0, 362.0, s)); }
float seaMask(float x, float s){ return seaZone(s)*(1.0 - smoothstep(-15.0, -11.0, x)); }
vec2 wrapXZ(vec2 p){
  float hx = uPatch.x*0.5;
  float wx = uCam.x + hx - mod(uCam.x + hx - p.x, uPatch.x);
  float wz = uCam.z + 6.0 - mod(uCam.z + 6.0 - p.y, uPatch.y);
  return vec2(wx, wz);
}
float windAt(vec2 p){
  return sin(uTime*1.25 + p.x*0.31 + p.y*0.17)*0.6 + sin(uTime*2.3 + p.x*0.8 - p.y*0.5)*0.25 + sin(uTime*0.4 + p.y*0.05)*0.4;
}
`;

  const FOG = `
uniform vec3 uFog;
uniform float uFogD;
vec3 fogit(vec3 c, float d){
  float f = 1.0 - exp(-pow(max(d, 0.0)*uFogD, 1.5));
  return mix(c, uFog, clamp(f, 0.0, 1.0));
}
`;

  // ---------------- sky ----------------
  const FULL_VS = H + `
layout(location=0) in vec2 aP;
out vec2 vUV;
void main(){ vUV = aP; gl_Position = vec4(aP, 0.0, 1.0); }`;

  const SKY_FS = H + NOISE + `
in vec2 vUV;
uniform vec3 uCF, uCR, uCU;
uniform vec2 uTan;
uniform vec3 uTop, uMid, uHor, uGlowC, uFog;
uniform float uStars, uClouds, uMount, uMoon, uTime;
out vec4 o;
void main(){
  vec3 rd = normalize(uCF + vUV.x*uTan.x*uCR + vUV.y*uTan.y*uCU);
  float y = rd.y;
  vec3 c = mix(uHor, uMid, smoothstep(0.0, 0.22, y));
  c = mix(c, uTop, smoothstep(0.18, 0.8, y));
  float g = max(dot(rd, normalize(vec3(0.12, 0.03, -1.0))), 0.0);
  c += uGlowC*(pow(g, 7.0)*0.34 + exp(-abs(y)*13.0)*0.2);
  float cl = 0.0;
  if (y > 0.0){
    vec2 cp = rd.xz/(y + 0.09)*0.6 + vec2(uTime*0.011, uTime*0.004);
    float n = fbm(cp);
    cl = smoothstep(0.43, 0.86, n)*uClouds*smoothstep(0.0, 0.14, y);
    vec3 cc = mix(uMid*1.12 + uGlowC*0.08, uHor*1.05 + uGlowC*0.25, smoothstep(0.55, 0.95, n));
    c = mix(c, cc, cl);
    vec3 sp = rd*420.0;
    float h = hash3(floor(sp));
    float st = step(0.9963, h)*smoothstep(0.06, 0.4, y)*(1.0 - cl)*uStars;
    float tw = 0.55 + 0.45*sin(uTime*(1.5 + h*3.0) + h*90.0);
    float d = length(fract(sp) - 0.5);
    c += vec3(0.96, 0.9, 1.0)*st*tw*smoothstep(0.5, 0.05, d)*1.5;
    vec3 md = normalize(vec3(-0.42, 0.36, -1.0));
    float mdot = dot(rd, md);
    float disc = smoothstep(0.99968, 0.99985, mdot);
    float craters = 0.88 + 0.12*noise(rd.xy*900.0);
    c = mix(c, vec3(0.97, 0.93, 1.0)*craters, disc*uMoon*(1.0 - cl*0.7));
    c += vec3(0.7, 0.55, 1.0)*(pow(max(mdot, 0.0), 500.0)*0.55 + pow(max(mdot, 0.0), 26.0)*0.12)*uMoon;
  }
  float az = atan(rd.x, -rd.z);
  float r1 = 0.018 + 0.06*fbm1(az*2.1 + 3.0);
  float r2 = 0.006 + 0.034*fbm1(az*3.7 + 11.0);
  vec3 m1 = mix(uFog, uTop*0.6, 0.45);
  vec3 m2 = mix(uFog, uTop*0.35, 0.72);
  c = mix(c, m1, smoothstep(r1 + 0.0015, r1 - 0.0015, y)*uMount*0.85);
  c = mix(c, m2, smoothstep(r2 + 0.0015, r2 - 0.0015, y)*uMount);
  c = mix(c, uFog, exp(-max(y, 0.0)*24.0)*0.85);
  if (y < 0.0) c = uFog;
  o = vec4(c, 1.0);
}`;

  // ---------------- ground ----------------
  const GROUND_VS = H + WORLD + `
layout(location=0) in vec2 aP;
uniform mat4 uVP;
out vec2 vW;
out float vDist;
void main(){
  vec3 p = vec3(uCam.x + aP.x*260.0, 0.0, uCam.z - 130.0 + aP.y*150.0);
  vW = p.xz;
  vDist = length(p.xz - uCam.xz);
  gl_Position = uVP*vec4(p, 1.0);
}`;

  const GROUND_FS = H + NOISE + WORLD + FOG + `
in vec2 vW;
in float vDist;
uniform vec3 uGBase[6];
uniform vec3 uSand;
out vec4 o;
void main(){
  float s = -vW.y;
  if (seaMask(vW.x, s) > 0.5) discard;
  vec3 base = vec3(0.0);
  for (int i = 0; i < NZ; i++) base += uGBase[i]*zoneW(i, s);
  float n = fbm(vW*0.11);
  vec3 c = base*(0.55 + 0.6*n);
  float dp = abs(vW.x - pathX(s));
  c = mix(c*1.3 + vec3(0.012, 0.006, 0.02), c, smoothstep(0.15, 0.75, dp));
  float shore = seaZone(s)*(1.0 - smoothstep(-14.0, -9.0, vW.x));
  c = mix(c, uSand*(0.85 + 0.3*n), shore);
  o = vec4(fogit(c, length(vW - uCam.xz)), 1.0);
}`;

  // ---------------- sea ----------------
  const SEA_VS = H + WORLD + `
layout(location=0) in vec2 aP;
uniform mat4 uVP;
out vec2 vW;
out float vDist;
void main(){
  vec3 p = vec3(mix(-520.0, -13.6, aP.x*0.5 + 0.5), -0.22, mix(-226.0, -374.0, aP.y*0.5 + 0.5));
  vW = p.xz;
  vDist = length(p.xz - uCam.xz);
  gl_Position = uVP*vec4(p, 1.0);
}`;

  const SEA_FS = H + NOISE + WORLD + FOG + `
in vec2 vW;
in float vDist;
uniform vec3 uSea;
out vec4 o;
void main(){
  float x = vW.x;
  float n = noise(vW*vec2(0.05, 0.12) + uTime*0.05);
  float w = sin(x*0.42 + uTime*0.95 + n*5.0);
  float foam = smoothstep(0.9, 1.0, w)*(0.25 + 0.75*smoothstep(-80.0, -14.0, x));
  float edge = smoothstep(-17.5, -13.8, x)*(0.6 + 0.4*sin(uTime*0.8 + vW.y*0.2));
  float far = smoothstep(10.0, 120.0, length(vW - uCam.xz));
  vec3 c = mix(uSea, uFog*0.9, 0.12 + 0.2*n + far*0.35);
  c += vec3(0.86, 0.82, 1.0)*(foam*0.5 + edge*0.6);
  o = vec4(fogit(c, length(vW - uCam.xz)*0.85), 1.0);
}`;

  // ---------------- grass blades ----------------
  const GRASS_VS = H + WORLD + `
layout(location=0) in vec2 aV;
layout(location=1) in vec4 aI;
uniform mat4 uVP;
uniform vec3 uGBase[6];
uniform vec3 uGTip[6];
uniform vec2 uGP[6];
out vec3 vCol;
out float vDist;
out float vH;
void main(){
  vec2 w = wrapXZ(aI.xy);
  float s = -w.y;
  vec3 base = vec3(0.0), tip = vec3(0.0);
  float hm = 0.0, dens = 0.0;
  for (int i = 0; i < NZ; i++){
    float k = zoneW(i, s);
    base += uGBase[i]*k; tip += uGTip[i]*k; hm += uGP[i].x*k; dens += uGP[i].y*k;
  }
  float dPath = abs(w.x - pathX(s));
  float keep = smoothstep(0.12, 0.75, dPath)*(1.0 - seaMask(w.x + 2.0, s))*step(aI.w, dens);
  float dist = length(w - uCam.xz);
  keep *= 1.0 - smoothstep(uPatch.y*0.68, uPatch.y*0.9, dist);
  float hgt = (0.3 + aI.z*0.7)*hm*keep;
  float wid = (0.022 + fract(aI.z*13.7)*0.038)*(1.0 + dist*0.03);
  float yaw = fract(aI.w*7.31)*6.2831853;
  vec2 dir = vec2(cos(yaw), sin(yaw));
  float h = aV.y;
  vec3 p = vec3(w.x, 0.0, w.y);
  p.xz += dir*aV.x*wid*(1.0 - h);
  p.y = h*hgt;
  float wd = windAt(w)*uWind;
  p.xz += normalize(vec2(1.0, 0.4))*wd*h*h*hgt*0.42;
  p.y -= abs(wd)*h*h*hgt*0.07;
  gl_Position = uVP*vec4(p, 1.0);
  vCol = mix(base, tip, h)*(0.7 + 0.6*fract(aI.z*91.7));
  vDist = dist;
  vH = h;
}`;

  const GRASS_FS = H + FOG + `
in vec3 vCol;
in float vDist;
in float vH;
uniform vec3 uRim;
out vec4 o;
void main(){
  vec3 c = vCol + uRim*pow(vH, 3.0)*0.3;
  o = vec4(fogit(c, vDist), 1.0);
}`;

  // ---------------- flowers (billboards) ----------------
  const FLOWER_VS = H + WORLD + `
layout(location=0) in vec2 aC;
layout(location=1) in vec4 aI;
layout(location=2) in float aR;
uniform mat4 uVP;
uniform vec3 uCamR;
uniform vec4 uFW[12];
uniform vec3 uFT[18];
uniform vec3 uFol[6];
uniform float uGlow[6];
uniform float uSize[8];
out vec2 vUV;
out vec3 vTint;
out vec3 vFol;
out float vDist;
out float vGlow;
void main(){
  vec2 w = wrapXZ(aI.xy);
  float s = -w.y;
  float acc = 0.0;
  int zi = -1;
  for (int i = 0; i < NZ; i++){ acc += zoneW(i, s); if (zi < 0 && aI.w < acc) zi = i; }
  if (zi < 0) zi = NZ - 1;
  vec4 wa = uFW[zi*2], wb = uFW[zi*2 + 1];
  float ws[8] = float[8](wa.x, wa.y, wa.z, wa.w, wb.x, wb.y, wb.z, wb.w);
  int ty = -1;
  float c2 = 0.0;
  for (int i = 0; i < 8; i++){ c2 += ws[i]; if (ty < 0 && aI.z < c2) ty = i; }
  float keep = ty < 0 ? 0.0 : 1.0;
  ty = max(ty, 0);
  float dPath = abs(w.x - pathX(s));
  keep *= smoothstep(0.25, 0.95, dPath)*(1.0 - seaMask(w.x + 2.5, s));
  float dist = length(w - uCam.xz);
  keep *= 1.0 - smoothstep(uPatch.y*0.62, uPatch.y*0.86, dist);
  float sz = uSize[ty]*(0.7 + 0.6*aR)*keep;
  vec3 p = vec3(w.x, 0.0, w.y) + uCamR*(aC.x - 0.5)*sz*0.5 + vec3(0.0, aC.y*sz, 0.0);
  float wd = windAt(w)*uWind;
  p.xz += normalize(vec2(1.0, 0.4))*wd*aC.y*aC.y*sz*0.12;
  gl_Position = uVP*vec4(p, 1.0);
  float u = fract(aR*17.0) > 0.5 ? 1.0 - aC.x : aC.x;
  vUV = (vec2(float(ty % 4), float(ty / 4)) + vec2(u, 1.0 - aC.y))*vec2(0.25, 0.5);
  vTint = uFT[zi*3 + int(fract(aR*5.3)*2.999)];
  vFol = uFol[zi];
  vGlow = uGlow[zi];
  vDist = dist;
}`;

  const FLOWER_FS = H + FOG + `
in vec2 vUV;
in vec3 vTint;
in vec3 vFol;
in float vDist;
in float vGlow;
uniform sampler2D uTex;
uniform float uLight;
out vec4 o;
void main(){
  vec4 t = texture(uTex, vUV);
  if (t.a < 0.06) discard;
  vec3 c = vTint*t.r*uLight + vFol*t.g + vec3(1.0, 0.92, 1.0)*t.b*0.55*uLight;
  c += vTint*t.r*vGlow;
  c = fogit(c, vDist*(1.0 - vGlow*0.4));
  o = vec4(c, smoothstep(0.06, 0.55, t.a));
}`;

  // ---------------- sprites: trees, the cat ----------------
  const SPRITE_VS = H + WORLD + `
layout(location=0) in vec2 aC;
layout(location=1) in vec4 aI;
layout(location=2) in vec2 aJ;
uniform mat4 uVP;
uniform vec3 uCamR;
uniform float uFadeFar;
out vec2 vUV;
out float vDist;
out float vFade;
void main(){
  vec3 p = aI.xyz + uCamR*(aC.x - 0.5)*aI.w*aJ.x + vec3(0.0, aC.y*aI.w, 0.0);
  p += vec3(1.0, 0.0, 0.3)*sin(uTime*0.6 + aJ.y)*0.012*aC.y*aC.y*aI.w*uWind;
  vUV = vec2(fract(aJ.y*3.7) > 0.5 ? 1.0 - aC.x : aC.x, 1.0 - aC.y);
  vDist = length(aI.xz - uCam.xz);
  // trees rise out of the mist instead of appearing at once
  vFade = (1.0 - smoothstep(uFadeFar*0.55, uFadeFar, vDist))*smoothstep(0.8, 3.4, vDist);
  gl_Position = uVP*vec4(p, 1.0);
}`;

  const SPRITE_FS = H + FOG + `
in vec2 vUV;
in float vDist;
in float vFade;
uniform sampler2D uTex;
uniform int uMode;
uniform vec3 uDark, uLite;
uniform float uFogMul;
out vec4 o;
void main(){
  vec4 t = texture(uTex, vUV);
  if (t.a < 0.04) discard;
  vec3 c;
  float a = smoothstep(0.04, 0.5, t.a);
  if (uMode == 0){
    c = mix(uDark, uLite, clamp(t.r*1.6, 0.0, 1.0));
    c = fogit(c, vDist*uFogMul);
    c = mix(c, uFog, (1.0 - vFade)*0.65);
    a *= vFade;
    if (a < 0.01) discard;
  } else {
    // a painted sprite: keep its colours, let the eyes shine through the haze
    c = t.rgb;
    float glow = smoothstep(0.18, 0.45, c.g - c.b);
    c = mix(fogit(c, vDist*0.7), c*2.1, glow);
  }
  o = vec4(c, a);
}`;

  // ---------------- fireflies / motes ----------------
  const FLY_VS = H + WORLD + `
layout(location=0) in vec4 aP;
uniform mat4 uVP;
uniform float uAmt;
uniform float uPx;
out float vA;
void main(){
  vec3 p = aP.xyz;
  p.x += sin(uTime*0.3 + aP.w*10.0)*1.6;
  p.y += sin(uTime*0.5 + aP.w*20.0)*0.5;
  p.z += cos(uTime*0.23 + aP.w*7.0)*1.6;
  float bx = 46.0, bz = 70.0;
  float wx = uCam.x + bx*0.5 - mod(uCam.x + bx*0.5 - p.x, bx);
  float wz = uCam.z + 4.0 - mod(uCam.z + 4.0 - p.z, bz);
  vec4 cp = uVP*vec4(wx, 0.25 + p.y, wz, 1.0);
  gl_Position = cp;
  float tw = 0.5 + 0.5*sin(uTime*(1.3 + aP.w*2.0) + aP.w*40.0);
  float vis = step(fract(aP.w*13.0), uAmt);
  gl_PointSize = vis*(1.5 + 22.0/max(cp.w, 0.6))*uPx*(0.45 + tw*0.8);
  vA = tw*vis*(1.0 - smoothstep(28.0, 60.0, cp.w));
}`;

  const FLY_FS = H + `
in float vA;
uniform vec3 uFlyC;
out vec4 o;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  a = a*a;
  o = vec4(uFlyC*a*vA, 1.0);
}`;

  // ---------------- post ----------------
  const POST_VS = H + `
layout(location=0) in vec2 aP;
out vec2 vUV;
void main(){ vUV = aP*0.5 + 0.5; gl_Position = vec4(aP, 0.0, 1.0); }`;

  const BRIGHT_FS = H + `
in vec2 vUV;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uTh;
out vec4 o;
void main(){
  vec3 c = texture(uTex, vUV + uTexel*vec2(-1.0, -1.0)).rgb + texture(uTex, vUV + uTexel*vec2(1.0, -1.0)).rgb
         + texture(uTex, vUV + uTexel*vec2(-1.0, 1.0)).rgb + texture(uTex, vUV + uTexel*vec2(1.0, 1.0)).rgb;
  c *= 0.25;
  float l = dot(c, vec3(0.3, 0.5, 0.2));
  o = vec4(c*smoothstep(uTh, uTh + 0.45, l), 1.0);
}`;

  const BLUR_FS = H + `
in vec2 vUV;
uniform sampler2D uTex;
uniform vec2 uDir;
out vec4 o;
void main(){
  vec3 c = texture(uTex, vUV).rgb*0.2270270;
  c += texture(uTex, vUV + uDir*1.3846154).rgb*0.3162162;
  c += texture(uTex, vUV - uDir*1.3846154).rgb*0.3162162;
  c += texture(uTex, vUV + uDir*3.2307692).rgb*0.0702703;
  c += texture(uTex, vUV - uDir*3.2307692).rgb*0.0702703;
  o = vec4(c, 1.0);
}`;

  const COMPOSITE_FS = H + `
in vec2 vUV;
uniform sampler2D uScene, uB1, uB2;
uniform vec2 uRes;
uniform float uTime, uFade, uGrain, uBloom;
uniform vec3 uFadeC;
out vec4 o;
float h(vec2 p){ p = fract(p*vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y)*p.x); }
void main(){
  vec2 uv = vUV;
  vec2 cc = uv - 0.5;
  float r = length(cc*vec2(uRes.x/uRes.y, 1.0));
  float edge = smoothstep(0.22, 0.95, r);
  vec2 off = cc*0.007*edge;
  vec3 s;
  s.r = texture(uScene, uv + off).r;
  s.g = texture(uScene, uv).g;
  s.b = texture(uScene, uv - off).b;
  vec3 b1 = texture(uB1, uv).rgb;
  vec3 b2 = texture(uB2, uv).rgb;
  vec3 c = s + (b1*0.45 + b2*0.6)*uBloom;
  c = mix(c, b2*1.4 + b1*0.45, edge*0.28);
  c = c*0.93 + vec3(0.035, 0.012, 0.065);
  c = c/(1.0 + c*0.16);
  c *= 1.0 - smoothstep(0.42, 1.05, r)*0.5;
  c += (h(uv*uRes + fract(uTime*7.13)*91.0) - 0.5)*uGrain;
  c = mix(c, uFadeC, uFade);
  o = vec4(c, 1.0);
}`;

  window.FieldShaders = {
    sky: [FULL_VS, SKY_FS],
    ground: [GROUND_VS, GROUND_FS],
    sea: [SEA_VS, SEA_FS],
    grass: [GRASS_VS, GRASS_FS],
    flower: [FLOWER_VS, FLOWER_FS],
    sprite: [SPRITE_VS, SPRITE_FS],
    fly: [FLY_VS, FLY_FS],
    bright: [POST_VS, BRIGHT_FS],
    blur: [POST_VS, BLUR_FS],
    composite: [POST_VS, COMPOSITE_FS]
  };
})();

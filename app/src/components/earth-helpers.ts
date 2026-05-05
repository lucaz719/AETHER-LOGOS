import * as THREE from "three";

/* ─── constants ─── */
export const EARTH_DAY    = "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg";
export const EARTH_TOPO   = "https://unpkg.com/three-globe/example/img/earth-topology.png";
export const EARTH_WATER  = "https://unpkg.com/three-globe/example/img/earth-water.png";
export const EARTH_NIGHT  = "https://unpkg.com/three-globe/example/img/earth-night.jpg";
export const EARTH_CLOUD  = "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png";
export const TRAIL_LENGTH = 60;
export const FLIGHT_ALT   = 1.025;

export const clamp  = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
export const deg2rad = (d: number) => (d * Math.PI) / 180;
export const lerp    = (a: number, b: number, t: number) => a + (b - a) * t;

export function latLonToVec3(lat: number, lon: number, r = 1.001): THREE.Vector3 {
  const phi = deg2rad(90 - lat), theta = deg2rad(lon + 180);
  return new THREE.Vector3(-r*Math.sin(phi)*Math.cos(theta), r*Math.cos(phi), r*Math.sin(phi)*Math.sin(theta));
}

export function greatCircleLerp(lat1: number, lon1: number, lat2: number, lon2: number, t: number, alt: number): THREE.Vector3 {
  const p1=deg2rad(lat1),l1=deg2rad(lon1),p2=deg2rad(lat2),l2=deg2rad(lon2);
  const d=Math.acos(clamp(Math.sin(p1)*Math.sin(p2)+Math.cos(p1)*Math.cos(p2)*Math.cos(l2-l1),-1,1));
  if(d<0.001) return latLonToVec3(lat1,lon1,alt);
  const a=Math.sin((1-t)*d)/Math.sin(d), b=Math.sin(t*d)/Math.sin(d);
  const x=a*Math.cos(p1)*Math.cos(l1)+b*Math.cos(p2)*Math.cos(l2);
  const y=a*Math.sin(p1)+b*Math.sin(p2);
  const z=a*Math.cos(p1)*Math.sin(l1)+b*Math.cos(p2)*Math.sin(l2);
  const len=Math.sqrt(x*x+y*y+z*z);
  return new THREE.Vector3(x/len*alt, y/len*alt, z/len*alt);
}

/* ─── trade routes ─── */
export interface TradeRoute {
  from: string; to: string;
  lat1: number; lon1: number; lat2: number; lon2: number;
  speed: number; offset: number;
  cargo: string; escrow: string; eta: string; contract: string;
}

export const ROUTES: TradeRoute[] = [
  { from:"Shanghai",to:"Rotterdam",lat1:31.2,lon1:121.5,lat2:51.9,lon2:4.5,speed:0.0006,offset:0,cargo:"Industrial Equipment",escrow:"$3.2M",eta:"16D 4H",contract:"0x7f...3a2" },
  { from:"Dubai",to:"Mumbai",lat1:25.3,lon1:55.3,lat2:19.1,lon2:72.9,speed:0.0018,offset:0.15,cargo:"Refined Petroleum",escrow:"$8.1M",eta:"3D 12H",contract:"0xa3...f81" },
  { from:"Singapore",to:"Sydney",lat1:1.35,lon1:103.8,lat2:-33.9,lon2:151.2,speed:0.001,offset:0.3,cargo:"Electronic Components",escrow:"$1.7M",eta:"8D 6H",contract:"0x2d...c14" },
  { from:"Los Angeles",to:"Tokyo",lat1:33.9,lon1:-118.4,lat2:35.7,lon2:139.7,speed:0.0007,offset:0.45,cargo:"Aerospace Parts",escrow:"$5.4M",eta:"14D 2H",contract:"0xb9...e27" },
  { from:"Mumbai",to:"Mombasa",lat1:19.1,lon1:72.9,lat2:-4.05,lon2:39.7,speed:0.0014,offset:0.55,cargo:"Pharmaceuticals",escrow:"$2.3M",eta:"5D 18H",contract:"0x5e...a93" },
  { from:"São Paulo",to:"Lagos",lat1:-23.5,lon1:-46.6,lat2:6.5,lon2:3.4,speed:0.0009,offset:0.7,cargo:"Agricultural Machinery",escrow:"$4.6M",eta:"11D 8H",contract:"0xd1...b56" },
  { from:"Hong Kong",to:"London",lat1:22.3,lon1:114.2,lat2:51.5,lon2:-0.1,speed:0.0006,offset:0.85,cargo:"Consumer Electronics",escrow:"$6.8M",eta:"18D 1H",contract:"0x8c...d49" },
  { from:"Dubai",to:"Singapore",lat1:25.3,lon1:55.3,lat2:1.35,lon2:103.8,speed:0.0012,offset:0.4,cargo:"Precious Metals",escrow:"$12.0M",eta:"7D 14H",contract:"0xf4...712" },
];

/* ─── GLSL shaders ─── */
export const earthVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const earthFragmentShader = `
uniform sampler2D dayTexture;
uniform sampler2D nightTexture;
uniform sampler2D waterTexture;
uniform sampler2D topoTexture;
uniform vec3 sunDirection;
uniform vec3 cameraPos;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
  vec3 day = texture2D(dayTexture, vUv).rgb;
  vec3 night = texture2D(nightTexture, vUv).rgb;
  
  // Basic lighting
  float cosAngle = dot(vNormal, normalize(sunDirection));
  
  // Bump mapping for shadows near terminator
  float bump = texture2D(topoTexture, vUv).r;
  // Darken day color based on bump height and low sun angle
  if (cosAngle > 0.0 && cosAngle < 0.2) {
      day *= mix(1.0, 0.5, bump * (0.2 - cosAngle) * 5.0);
  }

  float blend = smoothstep(-0.1, 0.3, cosAngle);
  vec3 color = mix(night * 1.8, day, blend);
  float terminator = smoothstep(0.0, 0.3, cosAngle) * (1.0 - smoothstep(0.3, 0.6, cosAngle));
  color += vec3(0.1, 0.2, 0.4) * terminator * 0.5;
  float oceanMask = texture2D(waterTexture, vUv).r;
  vec3 viewDir = normalize(cameraPos - vPosition);
  vec3 halfDir = normalize(normalize(sunDirection) + viewDir);
  float spec = pow(max(dot(vNormal, halfDir), 0.0), 64.0);
  color += vec3(1.0, 0.95, 0.8) * spec * oceanMask * 0.4 * blend;
  gl_FragColor = vec4(color, 1.0);
}`;

export const atmosVertexShader = `
varying vec3 vNormal;
varying vec3 vViewPosition;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPos.xyz;
  gl_Position = projectionMatrix * mvPos;
}`;

export const atmosFragmentShader = (colorR: number, colorG: number, colorB: number, opMul: number) => `
uniform vec3 sunDirection;
varying vec3 vNormal;
varying vec3 vViewPosition;
void main() {
  float fresnel = 1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition)));
  fresnel = pow(fresnel, 3.0);
  float sunInf = max(0.0, dot(vNormal, normalize(sunDirection)));
  vec3 dayC = mix(vec3(${colorR*0.5}, ${colorG*0.5}, ${colorB}), vec3(${colorR}, ${colorG}, ${colorB}), sunInf);
  vec3 nightC = vec3(0.0, 0.0, 0.05);
  vec3 color = mix(nightC, dayC, sunInf);
  gl_FragColor = vec4(color, fresnel * ${opMul.toFixed(2)});
}`;

/* ─── mesh factories ─── */
export function createSatellite(bc: number, pc: number) {
  const s = new THREE.Group();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(0.02,0.02,0.04), new THREE.MeshPhongMaterial({color:bc})));
  const pg=new THREE.BoxGeometry(0.06,0.004,0.02), pm=new THREE.MeshPhongMaterial({color:pc});
  const lp=new THREE.Mesh(pg,pm); lp.position.x=-0.045;
  const rp=new THREE.Mesh(pg,pm); rp.position.x=0.045;
  s.add(lp,rp); return s;
}

export function createStars() {
  const g = new THREE.Group();
  const golden = (1 + Math.sqrt(5)) / 2;
  const make = (n: number, sz: number, op: number, col: number) => {
    const p = new Float32Array(n*3);
    for (let i=0;i<n;i++) {
      const theta=Math.acos(1-2*(i+0.5)/n);
      const phi=2*Math.PI*i/golden;
      p[i*3]=Math.sin(theta)*Math.cos(phi)*80;
      p[i*3+1]=Math.sin(theta)*Math.sin(phi)*80;
      p[i*3+2]=Math.cos(theta)*80;
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute("position",new THREE.BufferAttribute(p,3));
    return new THREE.Points(geo, new THREE.PointsMaterial({color:col,size:sz,transparent:true,opacity:op,sizeAttenuation:true}));
  };
  g.add(make(6000,0.03,0.8,0xffffff));
  g.add(make(800,0.07,0.6,0xffeedd));
  g.add(make(200,0.05,0.5,0xaaccff));
  return g;
}

export function createAircraft() {
  const g = new THREE.Group();
  const m = new THREE.MeshPhongMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:0.8});
  const f=new THREE.Mesh(new THREE.CylinderGeometry(0.003,0.003,0.025,6),m); f.rotation.z=Math.PI/2; g.add(f);
  const wg=new THREE.BoxGeometry(0.022,0.001,0.006);
  const lw=new THREE.Mesh(wg,m); lw.position.set(0,0.001,-0.011); g.add(lw);
  const rw=new THREE.Mesh(wg,m); rw.position.set(0,0.001,0.011); g.add(rw);
  const t=new THREE.Mesh(new THREE.BoxGeometry(0.001,0.008,0.006),m); t.position.set(-0.012,0.004,0); g.add(t);
  g.scale.setScalar(0.6); return g;
}

export function createContrailGeometry() {
  const vc=TRAIL_LENGTH*2;
  const pos=new Float32Array(vc*3), col=new Float32Array(vc*4);
  const idx: number[]=[];
  for(let i=0;i<TRAIL_LENGTH-1;i++){const a=i*2,b=a+1,c=a+2,d=a+3;idx.push(a,c,b,b,c,d);}
  const geo=new THREE.BufferGeometry();
  geo.setAttribute("position",new THREE.BufferAttribute(pos,3));
  geo.setAttribute("color",new THREE.BufferAttribute(col,4));
  geo.setIndex(idx);
  const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,side:THREE.DoubleSide,depthWrite:false}));
  return {geo,mesh};
}

export function loadTextures(
  renderer: THREE.WebGLRenderer,
  onProgress: (p: number) => void
): Promise<{ day: THREE.Texture; night: THREE.Texture; topo: THREE.Texture; water: THREE.Texture; cloud: THREE.Texture }> {
  const loader = new THREE.TextureLoader();
  let loaded = 0;
  const total = 5;
  const load = (url: string) => new Promise<THREE.Texture>((res, rej) => {
    loader.load(url, (tex) => {
      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      tex.anisotropy = maxAniso;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      loaded++;
      onProgress(loaded / total);
      res(tex);
    }, undefined, rej);
  });
  return Promise.all([load(EARTH_DAY), load(EARTH_NIGHT), load(EARTH_TOPO), load(EARTH_WATER), load(EARTH_CLOUD)])
    .then(([day, night, topo, water, cloud]) => ({ day, night, topo, water, cloud }));
}

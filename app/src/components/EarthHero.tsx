"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import {
  clamp, lerp, greatCircleLerp, ROUTES, TradeRoute, TRAIL_LENGTH, FLIGHT_ALT,
  earthVertexShader, earthFragmentShader, atmosVertexShader, atmosFragmentShader,
  createSatellite, createStars, createAircraft, createContrailGeometry, loadTextures,
} from "./earth-helpers";

const SUN_DIR = new THREE.Vector3(-2, 1, 2).normalize();

interface PlaneState {
  t: number; route: TradeRoute; mesh: THREE.Group;
  trail: THREE.Vector3[]; contrail: { geo: THREE.BufferGeometry; mesh: THREE.Mesh };
}

export default function EarthHero() {
  const canvasRef = useRef<HTMLCanvasElement|null>(null);
  const containerRef = useRef<HTMLDivElement|null>(null);
  const scrollRef = useRef(0);
  const shipOffsets = useRef<number[]>(ROUTES.map(()=>0));
  const [tooltip, setTooltip] = useState<{x:number;y:number;route:TradeRoute}|null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const closeTooltip = useCallback(()=>setTooltip(null),[]);

  useEffect(()=>{
    const onScroll=()=>{scrollRef.current=clamp(window.scrollY/Math.max(document.body.scrollHeight-window.innerHeight,1),0,1);};
    onScroll(); window.addEventListener("scroll",onScroll,{passive:true});
    return ()=>window.removeEventListener("scroll",onScroll);
  },[]);

  useEffect(()=>{
    const canvas=canvasRef.current, container=containerRef.current;
    if(!canvas||!container) return;

    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:"high-performance"});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.setClearColor(0x000000,1);
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.2;
    renderer.outputColorSpace=THREE.SRGBColorSpace;

    const scene=new THREE.Scene();
    scene.background=new THREE.Color(0x000000);

    const camera=new THREE.PerspectiveCamera(45,1,0.1,200);
    camera.position.set(0,0,3.5);
    camera.lookAt(0.8,0,0);

    // Lighting
    scene.add(new THREE.AmbientLight(0x111122,0.15));
    const sun=new THREE.DirectionalLight(0xffd4a0,2.2); sun.position.set(-2,1,2); scene.add(sun);
    const night=new THREE.DirectionalLight(0x0a1128,0.2); night.position.set(3,-1,-2); scene.add(night);
    const bloom=new THREE.PointLight(0xffd4a0,0.8,20); bloom.position.set(-3,2,3); scene.add(bloom);
    scene.add(new THREE.HemisphereLight(0x0022aa,0x000000,0.15));

    const earthGroup=new THREE.Group();
    earthGroup.position.x=1.0;
    earthGroup.rotation.x=0.2;

    let cloudMesh: THREE.Mesh;
    const planes: PlaneState[]=[];
    const tmpRight=new THREE.Vector3();
    const tmpFwd=new THREE.Vector3();
    
    // Satellites
    const sat1 = createSatellite(0xcccccc,0x4466aa);
    const sat2 = createSatellite(0xcccccc,0x4466aa);
    scene.add(sat1, sat2);
    scene.add(createStars());

    loadTextures(renderer,(p)=>setLoadProgress(p)).then((tex)=>{
      // Earth with custom day/night shader
      const earthMat=new THREE.ShaderMaterial({
        uniforms:{
          dayTexture:{value:tex.day}, nightTexture:{value:tex.night},
          waterTexture:{value:tex.water}, topoTexture:{value:tex.topo},
          sunDirection:{value:SUN_DIR}, cameraPos:{value:camera.position},
        },
        vertexShader:earthVertexShader, fragmentShader:earthFragmentShader,
      });
      const earthMesh=new THREE.Mesh(new THREE.SphereGeometry(1,64,64),earthMat);
      earthGroup.add(earthMesh);

      // Inner atmosphere — fresnel
      const atmosMat1=new THREE.ShaderMaterial({
        uniforms:{sunDirection:{value:SUN_DIR}},
        vertexShader:atmosVertexShader,
        fragmentShader:atmosFragmentShader(0.4,0.7,1.0,0.6),
        side:THREE.BackSide, transparent:true, depthWrite:false,
      });
      earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.01,64,64),atmosMat1));

      // Outer haze
      const atmosMat2=new THREE.ShaderMaterial({
        uniforms:{sunDirection:{value:SUN_DIR}},
        vertexShader:atmosVertexShader,
        fragmentShader:atmosFragmentShader(0.05,0.1,0.4,0.3),
        side:THREE.BackSide, transparent:true, depthWrite:false,
      });
      earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.04,64,64),atmosMat2));

      // Clouds - Additive blending makes them look incredibly realistic and glowing in space
      cloudMesh=new THREE.Mesh(
        new THREE.SphereGeometry(1.008,64,64),
        new THREE.MeshPhongMaterial({
          map:tex.cloud, 
          transparent:true, 
          opacity:0.6, 
          blending: THREE.AdditiveBlending,
          depthWrite:false
        })
      );
      earthGroup.add(cloudMesh);

      // Aircraft + contrails
      ROUTES.forEach((route)=>{
        const mesh=createAircraft();
        earthGroup.add(mesh);
        const contrail=createContrailGeometry();
        earthGroup.add(contrail.mesh);
        const eL=new THREE.PointLight(0xaaddff,0.3,0.1);
        const eR=new THREE.PointLight(0xaaddff,0.3,0.1);
        mesh.add(eL); mesh.add(eR);
        eL.position.set(-0.008,0,-0.004); eR.position.set(-0.008,0,0.004);
        planes.push({t:route.offset,route,mesh,trail:[],contrail});
      });

      scene.add(earthGroup);
      setReady(true);
    });

    // Raycaster
    const raycaster=new THREE.Raycaster();
    const mouse=new THREE.Vector2(9999,9999);
    const onClick=(e: MouseEvent)=>{
      if(!container) return;
      const r=container.getBoundingClientRect();
      mouse.x=((e.clientX-r.left)/r.width)*2-1;
      mouse.y=-((e.clientY-r.top)/r.height)*2+1;
      raycaster.setFromCamera(mouse,camera);
      for(const p of planes){
        if(raycaster.intersectObject(p.mesh,true).length>0){
          setTooltip({x:e.clientX-r.left,y:e.clientY-r.top,route:p.route}); return;
        }
      }
    };
    container.addEventListener("click",onClick);

    // Sizing
    const resize=()=>{
      const w=container.clientWidth||1,h=container.clientHeight||1;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
      renderer.setSize(w,h,false);
      camera.aspect=w/h; camera.updateProjectionMatrix();
    };
    resize();
    const ro=new ResizeObserver(resize); ro.observe(container);
    window.addEventListener("resize",resize);

    const satRad={s1:THREE.MathUtils.degToRad(30),s2:THREE.MathUtils.degToRad(-20)};
    let frame=0, lastTime=0;
    let tick=0;

    const animate=(time: number)=>{
      const delta=(time-lastTime)/1000; lastTime=time;
      const now=Date.now();
      const d60=Math.min(delta*60,3); // cap to prevent jumps
      tick+=d60;

      // Earth rotation
      const tgtY=scrollRef.current*Math.PI*4;
      earthGroup.rotation.y+=(tgtY-earthGroup.rotation.y)*0.05;
      earthGroup.rotation.y+=0.0018*d60;
      earthGroup.rotation.x=0.2+Math.sin(now*0.0001)*0.01;
      if(cloudMesh) cloudMesh.rotation.y+=0.0022*d60;

      // Satellites
      const a1=tick*0.003;
      sat1.position.set(1.0+1.8*Math.cos(a1), 1.8*Math.sin(a1)*Math.sin(satRad.s1), 1.8*Math.sin(a1)*Math.cos(satRad.s1));
      const a2=tick*0.002;
      sat2.position.set(1.0+2.1*Math.cos(a2), 2.1*Math.sin(a2)*Math.sin(satRad.s2), 2.1*Math.sin(a2)*Math.cos(satRad.s2));

      // Planes
      for(const p of planes){
        p.t+=p.route.speed*d60;
        if(p.t>=1){p.t=0;p.trail.length=0;}
        const r=p.route;
        const pos=greatCircleLerp(r.lat1,r.lon1,r.lat2,r.lon2,p.t,FLIGHT_ALT);
        p.mesh.position.copy(pos);
        const tN=Math.min(p.t+0.005,1);
        const pN=greatCircleLerp(r.lat1,r.lon1,r.lat2,r.lon2,tN,FLIGHT_ALT);
        tmpFwd.subVectors(pN,pos).normalize();
        const norm=pos.clone().normalize();
        tmpRight.crossVectors(tmpFwd,norm).normalize();
        const cUp=new THREE.Vector3().crossVectors(tmpRight,tmpFwd).normalize();
        const m4=new THREE.Matrix4().makeBasis(tmpFwd,cUp,tmpRight);
        p.mesh.quaternion.setFromRotationMatrix(m4);

        p.trail.push(pos.clone());
        if(p.trail.length>TRAIL_LENGTH) p.trail.shift();

        const geo=p.contrail.geo;
        const pa=geo.getAttribute("position") as THREE.BufferAttribute;
        const ca=geo.getAttribute("color") as THREE.BufferAttribute;
        const len=p.trail.length;
        for(let i=0;i<TRAIL_LENGTH;i++){
          const vi=i*2;
          if(i>=len){for(let s=0;s<2;s++){pa.setXYZ(vi+s,0,0,0);ca.setXYZW(vi+s,1,1,1,0);}continue;}
          const pt=p.trail[i].clone();
          const frac=i/Math.max(len-1,1);
          const alpha=frac*0.7, width=lerp(0.0005,0.004,frac);
          if(frac<0.7) pt.y+=Math.sin(i*0.5+now*0.0005)*0.0002*(1-frac);
          let right: THREE.Vector3;
          if(i<len-1){const dir=new THREE.Vector3().subVectors(p.trail[i+1],pt).normalize();right=new THREE.Vector3().crossVectors(dir,pt.clone().normalize()).normalize();}
          else right=tmpRight.clone();
          const pA=pt.clone().addScaledVector(right,width),pB=pt.clone().addScaledVector(right,-width);
          pa.setXYZ(vi,pA.x,pA.y,pA.z); pa.setXYZ(vi+1,pB.x,pB.y,pB.z);
          const rc=frac<0.5?lerp(0.87,1,frac*2):1, gc=frac<0.5?lerp(0.93,1,frac*2):1;
          ca.setXYZW(vi,rc,gc,1,alpha); ca.setXYZW(vi+1,rc,gc,1,alpha);
        }
        pa.needsUpdate=true; ca.needsUpdate=true; geo.computeBoundingSphere();
      }

      // Camera breathing
      camera.position.y=0.2+Math.sin(now*0.00008)*0.03;
      camera.lookAt(0.8,0,0);

      renderer.render(scene,camera);
      frame=requestAnimationFrame(animate);
    };
    frame=requestAnimationFrame(animate);

    return ()=>{
      cancelAnimationFrame(frame);
      window.removeEventListener("resize",resize);
      container.removeEventListener("click",onClick);
      ro.disconnect();
      scene.traverse((obj)=>{const m=obj as THREE.Mesh;if(m.geometry)m.geometry.dispose();const mt=m.material as THREE.Material|THREE.Material[]|undefined;if(Array.isArray(mt))mt.forEach(x=>x.dispose());else mt?.dispose();});
      renderer.dispose();
    };
  },[]);

  return (
    <div ref={containerRef} className="fixed inset-0 h-screen w-full" style={{zIndex:0}}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Loading screen */}
      {!ready && (
        <div style={{position:"absolute",inset:0,background:"#000",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:5,transition:"opacity 0.8s",opacity:ready?0:1}}>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"rgba(255,255,255,0.4)",letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:20}}>
            Initializing Global Network...
          </div>
          <div style={{width:200,height:2,background:"rgba(255,255,255,0.1)",overflow:"hidden"}}>
            <div style={{width:`${loadProgress*100}%`,height:"100%",background:"rgba(255,255,255,0.5)",transition:"width 0.3s"}} />
          </div>
        </div>
      )}

      {/* HUD */}
      <div style={{position:"absolute",top:80,right:24,fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"rgba(255,255,255,0.4)",letterSpacing:"0.15em",lineHeight:1.8,pointerEvents:"none",textTransform:"uppercase"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
          <span style={{width:5,height:5,borderRadius:"50%",background:"#61ff83",display:"inline-block",animation:"earthPulse 2s ease-in-out infinite"}} />
          Live Routes: 8
        </div>
        <div>Escrow Active: $47.3M</div>
      </div>

      {/* Route tooltip */}
      {tooltip&&(<>
        <div style={{position:"fixed",inset:0,zIndex:18}} onClick={closeTooltip} />
        <div style={{position:"absolute",left:Math.min(tooltip.x+14,(containerRef.current?.clientWidth??400)-300),top:Math.max(tooltip.y-80,20),background:"rgba(0,0,0,0.9)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:"0.5px solid rgba(255,255,255,0.12)",padding:"20px 24px",fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"white",pointerEvents:"auto",zIndex:20,lineHeight:1.9,minWidth:240}}>
          <div style={{marginBottom:8,fontSize:10,letterSpacing:"0.15em",color:"rgba(255,255,255,0.4)",textTransform:"uppercase"}}>✈ Flight Route</div>
          <div style={{fontSize:14,fontWeight:500,marginBottom:10}}>{tooltip.route.from} → {tooltip.route.to}</div>
          <div style={{width:"100%",height:1,background:"rgba(255,255,255,0.08)",marginBottom:10}} />
          <div><span style={{color:"rgba(255,255,255,0.4)"}}>CARGO: </span>{tooltip.route.cargo}</div>
          <div><span style={{color:"rgba(255,255,255,0.4)"}}>ESCROW: </span>{tooltip.route.escrow} LOCKED</div>
          <div><span style={{color:"rgba(255,255,255,0.4)"}}>STATUS: </span><span style={{color:"#61ff83"}}>●</span> IN TRANSIT</div>
          <div><span style={{color:"rgba(255,255,255,0.4)"}}>ETA: </span>{tooltip.route.eta}</div>
          <div><span style={{color:"rgba(255,255,255,0.4)"}}>CONTRACT: </span>{tooltip.route.contract}</div>
        </div>
      </>)}

      <style jsx>{`@keyframes earthPulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}

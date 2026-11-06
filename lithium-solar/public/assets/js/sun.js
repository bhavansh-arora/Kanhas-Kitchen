/* Lithium — living sun.
   A WebGL sun with a plasma surface and corona, rising over a perspective field of solar panels.
   Falls back to the CSS gradient on the canvas when WebGL is unavailable. */
(function () {
  'use strict';

  var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

  var FRAG = [
    'precision highp float;',
    'uniform vec2 uRes;uniform float uTime;uniform vec2 uMouse;uniform float uScroll;',
    'uniform float uSunX;uniform float uSunY;uniform float uRadius;uniform float uHorizon;uniform float uGround;',
    'float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
    'float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);',
    ' return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}',
    'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}',
    'void main(){',
    ' vec2 uv=gl_FragCoord.xy/uRes;float asp=uRes.x/uRes.y;',
    ' vec2 p=vec2(uv.x*asp,uv.y);',
    ' float hz=uHorizon;',
    ' vec2 sc=vec2((uSunX+uMouse.x*.025)*asp,hz+uSunY-uScroll*.22+uMouse.y*.012);',
    ' float R=uRadius;',
    ' vec3 top=vec3(.012,.03,.058);vec3 hor=vec3(.05,.1,.18);',
    ' vec3 col=mix(hor,top,smoothstep(hz,1.,uv.y));',
    // stars
    ' vec2 sp=p*vec2(140.);vec2 sg=floor(sp);float s=hash(sg);',
    ' float tw=.45+.55*sin(uTime*1.7+s*90.);',
    ' float sd=length(fract(sp)-.5);',
    ' col+=vec3(.85,.9,1.)*step(.993,s)*smoothstep(.22,.0,sd)*tw*smoothstep(hz+.12,1.,uv.y)*.85;',
    // sun glow + corona
    ' vec2 d=p-sc;float r=length(d);float a=atan(d.y,d.x);',
    ' float ed=max(r-R,0.);',
    ' float rays=fbm(vec2(a*2.6+uTime*.03,ed*3.-uTime*.12));',
    ' float glow=exp(-ed*7.)*.75+exp(-ed*2.4)*.26+exp(-ed*1.)*.05;',
    ' glow*=.7+.6*rays;',
    ' vec3 gcol=mix(vec3(1.,.42,.08),vec3(.95,.70,.21),exp(-ed*4.));',
    ' col+=gcol*glow;',
    // disc with plasma
    ' float disc=smoothstep(R+.003,R-.003,r);',
    ' vec2 q=d/R;',
    ' float pl=fbm(q*3.2+vec2(uTime*.05,-uTime*.04));',
    ' pl=fbm(q*2.4+pl*2.2+vec2(-uTime*.03,uTime*.02));',
    ' vec3 core=mix(vec3(1.,.47,.09),vec3(1.,.83,.42),smoothstep(.25,.85,pl));',
    ' float limb=sqrt(max(0.,1.-dot(q,q)));',
    ' core*=.62+.48*limb;',
    ' core+=vec3(1.,.93,.75)*pow(limb,6.)*.28;',
    ' col=mix(col,core,disc);',
    // horizon haze
    ' col+=gcol*exp(-abs(uv.y-hz)*55.)*.42*exp(-abs(p.x-sc.x)*1.1);',
    // ground: a field of panels in perspective
    ' if(uv.y<hz && uGround>.5){',
    '  float dep=hz-uv.y;',
    '  float z=.075/(dep+.0008);',
    '  float wx=(p.x-sc.x)*z*4.2;',
    '  float wz=z*3.2+uTime*.12;',
    '  vec2 cell=vec2(fract(wx*.9),fract(wz*.55));',
    '  float lw=clamp(.02*z,.035,.5);',
    '  float lx=smoothstep(lw,0.,min(cell.x,1.-cell.x));',
    '  float lz=smoothstep(lw*1.2,0.,min(cell.y,1.-cell.y));',
    '  float fog=smoothstep(.0,.16,dep);',
    '  vec3 g=mix(vec3(.02,.05,.1),vec3(.03,.1,.22),.4+.6*fog);',
    '  float sub=step(.5,fract(wx*1.8))*.04+step(.5,fract(wz*1.1))*.03;',
    '  g+=vec3(.01,.04,.09)*sub*fog;',
    '  vec3 line=vec3(.1,.45,.95)*max(lx,lz)*(.15+.85*fog)*.7;',
    '  g+=line;',
    '  float refl=exp(-abs(p.x-sc.x)*(2.2+dep*9.))*exp(-dep*3.2);',
    '  float shim=.65+.35*noise(vec2(wx*2.,wz*6.-uTime*.6));',
    '  g+=gcol*refl*shim*.9;',
    '  g+=gcol*exp(-dep*30.)*.35;',
    '  col=g;',
    ' }',
    // vignette
    ' vec2 vv=uv-.5;col*=1.-dot(vv,vv)*.55;',
    ' col=pow(col,vec3(.95));',
    ' gl_FragColor=vec4(col,1.);',
    '}'
  ].join('\n');

  var PRESETS = {
    hero: function (w, h) {
      var mobile = w < 760 || h > w * 1.1;
      return { sunX: mobile ? 0.5 : 0.66, sunY: mobile ? -0.05 : 0.0, radius: mobile ? 0.17 : 0.26, horizon: mobile ? 0.22 : 0.27, ground: 1 };
    },
    cta: function (w, h) {
      var mobile = w < 760 || h > w * 1.1;
      return { sunX: 0.5, sunY: -0.06, radius: mobile ? 0.2 : 0.27, horizon: 0.16, ground: 1 };
    }
  };

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  }

  function Sun(canvas) {
    var gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) { canvas.classList.add('sun-fallback'); return; }
    var vs = compile(gl, gl.VERTEX_SHADER, VERT), fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { canvas.classList.add('sun-fallback'); return; }
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var U = {};
    ['uRes', 'uTime', 'uMouse', 'uScroll', 'uSunX', 'uSunY', 'uRadius', 'uHorizon', 'uGround'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

    var preset = PRESETS[canvas.getAttribute('data-sun')] || PRESETS.hero;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    var visible = true, raf = 0, start = performance.now(), cfg, w, h;
    var section = canvas.parentElement;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.25 : 1.5);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      cfg = preset(w, h);
      if (reduce) draw(performance.now());
    }

    function scrollProgress() {
      var r = section.getBoundingClientRect();
      var vh = window.innerHeight;
      // CTA: the sun rises as the section scrolls into view.
      if (canvas.getAttribute('data-sun') === 'cta') return 1 - Math.max(0, Math.min(1, (vh - r.top) / vh));
      return Math.max(0, Math.min(1, -r.top / Math.max(1, r.height)));
    }

    function draw(now) {
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uTime, reduce ? 12.0 : (now - start) / 1000);
      gl.uniform2f(U.uMouse, mouse.x, mouse.y);
      gl.uniform1f(U.uScroll, scrollProgress());
      gl.uniform1f(U.uSunX, cfg.sunX);
      gl.uniform1f(U.uSunY, cfg.sunY);
      gl.uniform1f(U.uRadius, cfg.radius);
      gl.uniform1f(U.uHorizon, cfg.horizon);
      gl.uniform1f(U.uGround, cfg.ground);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function loop(now) {
      raf = 0;
      if (!visible) return;
      draw(now);
      raf = requestAnimationFrame(loop);
    }

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', function (e) {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = -(e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && !reduce && !raf) raf = requestAnimationFrame(loop);
    }, { rootMargin: '100px' }).observe(canvas);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { visible = false; } else if (!reduce && !raf) { visible = true; raf = requestAnimationFrame(loop); }
    });

    resize();
    if (reduce) { draw(performance.now()); window.addEventListener('scroll', function () { draw(performance.now()); }, { passive: true }); }
    else raf = requestAnimationFrame(loop);
  }

  function init() {
    document.querySelectorAll('canvas[data-sun]').forEach(function (c) { Sun(c); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

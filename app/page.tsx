"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function LandingPage() {
    const [scrollY, setScrollY] = useState(0);
    const [visible, setVisible] = useState<Record<string, boolean>>({});
    const [activeVibe, setActiveVibe] = useState(0);
    const [vibeOut, setVibeOut] = useState(false);
    const observerRefs = useRef<IntersectionObserver[]>([]);

    useEffect(() => {
        const onScroll = () => setScrollY(window.scrollY);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        const els = document.querySelectorAll("[data-reveal]");
        els.forEach((el) => {
            const obs = new IntersectionObserver(
                ([e]) => { if (e.isIntersecting) setVisible((p) => ({ ...p, [el.id]: true })); },
                { threshold: 0.12 }
            );
            obs.observe(el);
            observerRefs.current.push(obs);
        });
        return () => observerRefs.current.forEach((o) => o.disconnect());
    }, []);

    useEffect(() => {
        const t = setInterval(() => {
            setVibeOut(true);
            setTimeout(() => {
                setActiveVibe((v) => (v + 1) % VIBES.length);
                setVibeOut(false);
            }, 400);
        }, 3000);
        return () => clearInterval(t);
    }, []);

    const r = (id: string, delay = 0) =>
        `transition-all duration-700 ease-out${delay ? ` delay-[${delay}ms]` : ""} ${visible[id] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`;

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@400;500;700;800;900&family=Satoshi:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --void:#04040a;--surface:#0a0a12;--card:#0f0f1a;--card2:#131320;
          --border:rgba(255,255,255,0.07);--border2:rgba(255,255,255,0.12);
          --blue:#4F7FFF;--blue-b:#6B96FF;--blue-dim:rgba(79,127,255,0.12);--blue-glow:rgba(79,127,255,0.28);
          --white:#fff;--muted:#6b6b7a;--soft:#a0a0b0;
          --D:'Cabinet Grotesk',sans-serif;--B:'Satoshi',sans-serif;
        }
        html{scroll-behavior:smooth;-webkit-font-smoothing:antialiased}
        body{background:var(--void);color:var(--white);font-family:var(--B);overflow-x:hidden;line-height:1.6}
        body::after{content:'';position:fixed;inset:0;pointer-events:none;z-index:9999;opacity:.018;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size:200px}

        /* NAV */
        .nav{position:fixed;top:0;left:0;right:0;z-index:200;display:flex;align-items:center;justify-content:space-between;padding:24px 48px;transition:all .4s cubic-bezier(.16,1,.3,1)}
        .nav.stuck{padding:14px 48px;background:rgba(4,4,10,.88);backdrop-filter:blur(24px) saturate(1.8);border-bottom:1px solid var(--border)}
        .nav-logo{display:flex;align-items:center;gap:10px;font-family:var(--D);font-weight:900;font-size:20px;color:var(--white);text-decoration:none;letter-spacing:-.5px}
        .logo-mark{width:32px;height:32px;background:var(--blue);border-radius:9px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px var(--blue-glow)}
        .nav-links{display:flex;align-items:center;gap:4px}
        .nl{font-size:14px;font-weight:500;color:var(--muted);text-decoration:none;padding:8px 14px;border-radius:8px;transition:color .2s}
        .nl:hover{color:var(--white)}
        .nav-btn{background:var(--blue);color:white;font-family:var(--B);font-size:14px;font-weight:700;padding:10px 22px;border-radius:100px;text-decoration:none;transition:all .2s;box-shadow:0 4px 20px var(--blue-glow)}
        .nav-btn:hover{transform:translateY(-1px);box-shadow:0 8px 32px var(--blue-glow);background:var(--blue-b)}

        /* HERO */
        .hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:140px 24px 100px;position:relative;overflow:hidden}
        .hglow{position:absolute;top:-10%;left:50%;transform:translateX(-50%);width:900px;height:700px;background:radial-gradient(ellipse,rgba(79,127,255,.09) 0%,transparent 65%);pointer-events:none}
        .hgrid{position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(79,127,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(79,127,255,.04) 1px,transparent 1px);background-size:72px 72px;mask-image:radial-gradient(ellipse 70% 70% at 50% 35%,black,transparent)}
        .eyebrow{display:inline-flex;align-items:center;gap:8px;background:rgba(79,127,255,.1);border:1px solid rgba(79,127,255,.22);color:#93b4ff;font-size:11px;font-weight:700;padding:6px 16px;border-radius:100px;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:36px}
        .edot{width:6px;height:6px;border-radius:50%;background:var(--blue);animation:blink 2s infinite}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        .h1{font-family:var(--D);font-weight:900;font-size:clamp(52px,8.5vw,102px);line-height:.95;letter-spacing:-4px;color:var(--white);max-width:1000px;margin-bottom:28px}
        .h1 em{font-style:normal;color:var(--blue)}
        .vibe{font-family:var(--D);font-weight:700;font-size:clamp(17px,2.2vw,24px);color:var(--soft);margin-bottom:48px;height:34px;display:flex;align-items:center;justify-content:center}
        .vt{transition:all .4s cubic-bezier(.16,1,.3,1);display:inline-block}
        .vt.out{opacity:0;transform:translateY(10px)}
        .hero-btns{display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;margin-bottom:80px}
        .btn-m{background:var(--blue);color:white;font-family:var(--B);font-size:16px;font-weight:700;padding:16px 40px;border-radius:100px;text-decoration:none;transition:all .25s;display:inline-flex;align-items:center;gap:10px;box-shadow:0 8px 32px var(--blue-glow)}
        .btn-m:hover{background:var(--blue-b);transform:translateY(-2px);box-shadow:0 16px 48px var(--blue-glow)}
        .btn-g{background:transparent;color:var(--soft);font-family:var(--B);font-size:15px;font-weight:500;padding:16px 28px;border-radius:100px;text-decoration:none;border:1px solid var(--border2);transition:all .2s}
        .btn-g:hover{color:var(--white);border-color:rgba(255,255,255,.25)}

        /* PHONES */
        .phones{display:flex;align-items:flex-start;justify-content:center;gap:20px;position:relative}
        .psh{background:var(--card);border:1px solid var(--border2);border-radius:44px;overflow:hidden;box-shadow:0 48px 96px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.04);width:264px}
        .psh.side{width:224px;transform:translateY(48px) rotate(-5deg);animation:fside 5s ease-in-out infinite;box-shadow:0 60px 100px rgba(0,0,0,.8)}
        @keyframes fside{0%,100%{transform:translateY(48px) rotate(-5deg)}50%{transform:translateY(32px) rotate(-5deg)}}
        .pnotch{width:90px;height:24px;background:var(--void);border-radius:0 0 18px 18px;margin:0 auto 14px;position:relative;z-index:2}
        .pbody{padding:0 14px 28px}
        .mhd{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
        .mlogo{font-family:var(--D);font-weight:900;font-size:15px;letter-spacing:-.5px}
        .mpill{font-size:9px;font-weight:700;padding:3px 8px;border-radius:100px}
        .mcard{background:#161621;border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:12px;margin-bottom:8px}
        .mrow{display:flex;align-items:center;gap:8px;margin-bottom:8px}
        .mav{width:28px;height:28px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:white}
        .mname{font-size:11px;font-weight:700;color:white}
        .msub{font-size:9px;color:#6b6b7a;margin-top:1px}
        .mint{display:inline-flex;align-items:center;gap:3px;font-size:8px;font-weight:700;padding:3px 7px;border-radius:100px;margin-bottom:6px}
        .mtxt{font-size:10px;color:#9090a0;line-height:1.5;margin-bottom:8px}
        .mprog{height:2px;border-radius:2px;background:rgba(255,255,255,.06);overflow:hidden;margin-bottom:8px}
        .mpf{height:100%;border-radius:2px;opacity:.6}
        .mbtn{width:100%;background:var(--blue);color:white;font-size:10px;font-weight:700;padding:7px;border-radius:9px;text-align:center}
        .mhot{display:inline-flex;align-items:center;gap:4px;font-size:8px;font-weight:700;padding:3px 7px;border-radius:100px;background:rgba(249,115,22,.12);border:1px solid rgba(249,115,22,.2);color:#fb923c;margin-bottom:6px}
        .mchd{display:flex;align-items:center;gap:8px;padding:0 0 12px;border-bottom:1px solid rgba(255,255,255,.05);margin-bottom:12px}
        .mbbl{margin-bottom:6px;display:flex}
        .mbbl.me{justify-content:flex-end}
        .mbt{max-width:75%;padding:7px 10px;border-radius:12px;font-size:10px;line-height:1.5}
        .mbt.them{background:#1a1a2a;color:#b0b0c0;border-radius:12px 12px 12px 2px}
        .mbt.me{background:var(--blue);color:white;border-radius:12px 12px 2px 12px}
        .mrev{background:rgba(79,127,255,.07);border:1px solid rgba(79,127,255,.15);border-radius:10px;padding:10px;margin-top:10px;text-align:center}

        /* MARQUEE */
        .mqw{overflow:hidden;border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:18px 0;background:var(--surface)}
        .mqt{display:flex;gap:0;width:max-content;animation:mq 30s linear infinite}
        @keyframes mq{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .mqi{white-space:nowrap;padding:0 36px;font-family:var(--D);font-weight:700;font-size:14px;color:var(--muted);letter-spacing:-.3px;display:flex;align-items:center;gap:14px}
        .mqs{color:var(--blue);font-size:18px}

        /* WRAP */
        .wrap{max-width:1120px;margin:0 auto;padding:0 24px}
        .sec{padding:120px 0}
        .stag{display:inline-block;font-size:11px;font-weight:700;letter-spacing:3px;color:var(--blue);text-transform:uppercase;margin-bottom:20px}
        .sh2{font-family:var(--D);font-weight:900;font-size:clamp(38px,5.5vw,64px);line-height:1.0;letter-spacing:-2.5px;color:var(--white);margin-bottom:20px}
        .sh2 em{font-style:normal;color:var(--blue)}
        .sdesc{font-size:17px;color:var(--soft);max-width:520px;line-height:1.75;font-weight:300}

        /* INSIGHT */
        .ig{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
        .bq{font-family:var(--D);font-weight:900;font-size:clamp(26px,3.5vw,42px);line-height:1.2;letter-spacing:-1.5px;color:var(--white);margin-bottom:28px}
        .bq em{font-style:normal;color:var(--blue)}
        .ip{font-size:16px;color:var(--soft);line-height:1.8;font-weight:300;margin-bottom:16px}
        .ir{display:flex;flex-direction:column;gap:14px}
        .icard{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:26px;display:flex;align-items:flex-start;gap:16px;transition:border-color .3s}
        .icard:hover{border-color:var(--border2)}
        .iem{font-size:22px;flex-shrink:0;margin-top:2px}
        .ih{font-family:var(--D);font-weight:800;font-size:15px;color:var(--white);margin-bottom:5px;letter-spacing:-.3px}
        .ipdesc{font-size:13px;color:var(--muted);line-height:1.7;font-weight:300}

        /* STEPS */
        .sg{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;border:1px solid var(--border);border-radius:24px;overflow:hidden;margin-top:64px}
        .sc{background:var(--card);padding:44px 36px;transition:background .3s;position:relative;overflow:hidden}
        .sc::before{content:attr(data-n);position:absolute;top:-10px;right:16px;font-family:var(--D);font-weight:900;font-size:100px;color:rgba(79,127,255,.04);line-height:1;pointer-events:none}
        .sc:hover{background:var(--card2)}
        .sn{font-size:10px;font-weight:700;letter-spacing:3px;color:var(--blue);opacity:.7;margin-bottom:14px;text-transform:uppercase}
        .si{font-size:30px;margin-bottom:18px}
        .sh{font-family:var(--D);font-weight:800;font-size:19px;letter-spacing:-.5px;color:var(--white);margin-bottom:10px}
        .sp{font-size:14px;color:var(--muted);line-height:1.75;font-weight:300}

        /* FEATURES */
        .fg{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;border:1px solid var(--border);border-radius:24px;overflow:hidden;margin-top:64px}
        .fc{background:var(--card);padding:36px;transition:background .3s}
        .fc:hover{background:var(--card2)}
        .fem{font-size:26px;margin-bottom:14px}
        .fh{font-family:var(--D);font-weight:800;font-size:16px;color:var(--white);margin-bottom:9px;letter-spacing:-.3px}
        .fp{font-size:13px;color:var(--muted);line-height:1.75;font-weight:300}

        /* FOUNDER */
        .fw{background:var(--card);border:1px solid var(--border);border-radius:28px;padding:56px;display:grid;grid-template-columns:1fr auto;gap:60px;align-items:center;margin-top:64px;position:relative;overflow:hidden}
        .fw::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent 10%,var(--blue) 50%,transparent 90%)}
        .fq{font-family:var(--D);font-weight:900;font-size:clamp(20px,2.8vw,30px);line-height:1.3;letter-spacing:-1px;color:var(--white);margin-bottom:22px}
        .fq em{font-style:normal;color:var(--blue)}
        .fb{font-size:15px;color:var(--soft);line-height:1.8;font-weight:300;margin-bottom:18px}
        .fsig{font-family:var(--D);font-weight:700;font-size:15px;color:var(--blue)}
        .fcr{text-align:center;min-width:160px}
        .fav{width:80px;height:80px;border-radius:22px;background:linear-gradient(135deg,var(--blue),#1D4ED8);display:flex;align-items:center;justify-content:center;font-family:var(--D);font-weight:900;font-size:32px;color:white;margin:0 auto 16px;box-shadow:0 12px 32px var(--blue-glow)}
        .fn{font-family:var(--D);font-weight:800;font-size:18px;color:var(--white);letter-spacing:-.5px;margin-bottom:4px}
        .ft{font-size:13px;color:var(--blue);font-weight:500;margin-bottom:16px}
        .fchips{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}
        .fch{background:rgba(255,255,255,.04);border:1px solid var(--border);color:var(--muted);font-size:11px;padding:4px 10px;border-radius:100px}

        /* CTA */
        .ctas{padding:140px 0;text-align:center;position:relative}
        .ctag{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:700px;height:400px;background:radial-gradient(ellipse,rgba(79,127,255,.1) 0%,transparent 70%);pointer-events:none}
        .ctai{background:var(--card);border:1px solid var(--border2);border-radius:36px;padding:88px 60px;max-width:700px;margin:0 auto;position:relative;overflow:hidden}
        .ctai::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(79,127,255,.6),transparent)}
        .ctah{font-family:var(--D);font-weight:900;font-size:clamp(36px,5vw,58px);letter-spacing:-2.5px;color:var(--white);margin-bottom:16px;line-height:1.0}
        .ctah em{font-style:normal;color:var(--blue)}
        .ctap{font-size:17px;color:var(--soft);margin-bottom:44px;font-weight:300;line-height:1.65}

        /* FOOTER */
        .footer{border-top:1px solid var(--border);padding:44px 48px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px}
        .fl{font-family:var(--D);font-weight:900;font-size:18px;color:var(--muted);text-decoration:none}
        .fl span{color:var(--blue)}
        .flinks{display:flex;gap:24px;list-style:none}
        .flinks a{font-size:13px;color:var(--muted);text-decoration:none;transition:color .2s}
        .flinks a:hover{color:var(--white)}
        .fcp{font-size:12px;color:#2a2a3a}

        /* FADE UP */
        .fu{opacity:0;transform:translateY(20px);animation:fuanim .9s cubic-bezier(.16,1,.3,1) forwards}
        @keyframes fuanim{to{opacity:1;transform:translateY(0)}}

        /* RESPONSIVE */
        @media(max-width:900px){
          .nav{padding:18px 20px}.nav.stuck{padding:12px 20px}.nav-links{display:none}
          .sg{grid-template-columns:1fr}.fg{grid-template-columns:1fr 1fr}
          .ig{grid-template-columns:1fr;gap:48px}.fw{grid-template-columns:1fr;gap:36px;padding:40px}
          .fcr{display:flex;flex-direction:column;align-items:flex-start}.fchips{justify-content:flex-start}
          .ctai{padding:56px 28px}.footer{padding:32px 20px;flex-direction:column;align-items:flex-start}
          .psh.side{display:none}.psh{width:248px}.sec{padding:80px 0}
        }
        @media(max-width:600px){
          .fg{grid-template-columns:1fr}.h1{letter-spacing:-2px}
        }
      `}</style>

            {/* NAV */}
            <nav className={`nav${scrollY > 60 ? " stuck" : ""}`}>
                <Link href="/" className="nav-logo">
                    <div className="logo-mark">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
                            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3" fill="white" stroke="none"/>
                        </svg>
                    </div>
                    SwayNow
                </Link>
                <div className="nav-links">
                    <a href="#how" className="nl">How it works</a>
                    <a href="#about" className="nl">About</a>
                    <a href="#features" className="nl">Features</a>
                </div>
                <Link href="/app" className="nav-btn">Open app →</Link>
            </nav>

            {/* HERO */}
            <section className="hero">
                <div className="hgrid"/><div className="hglow"/>
                <div className="eyebrow fu" style={{animationDelay:"0ms"}}>
                    <span className="edot"/>Real people · Real meetups
                </div>
                <h1 className="h1 fu" style={{animationDelay:"80ms"}}>
                    Your friends<br/>are busy.<br/><em>Someone nearby</em><br/>isn&apos;t.
                </h1>
                <div className="vibe fu" style={{animationDelay:"160ms"}}>
                    <span className={`vt${vibeOut ? " out" : ""}`}>{VIBES[activeVibe]}</span>
                </div>
                <div className="hero-btns fu" style={{animationDelay:"240ms"}}>
                    <Link href="/app" className="btn-m">
                        Find people near me
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </Link>
                    <a href="#how" className="btn-g">See how it works</a>
                </div>

                {/* PHONES */}
                <div className="phones fu" style={{animationDelay:"360ms"}}>
                    <div className="psh">
                        <div className="pnotch"/>
                        <div className="pbody">
                            <div className="mhd">
                                <span className="mlogo">SwayNow</span>
                                <span className="mpill" style={{background:"rgba(79,127,255,.12)",border:"1px solid rgba(79,127,255,.2)",color:"#93b4ff"}}>● 4 nearby</span>
                            </div>
                            {[
                                {av:"A",avc:"#4F7FFF",n:"Alex",age:24,city:"Mitte",int:"🧭 Explore",ic:"rgba(147,180,255,.12)",it:"#93b4ff",txt:"Anyone up for the flea market at Mauerpark?",t:"31min",p:.55,hot:true},
                                {av:"S",avc:"#10b981",n:"Sara",age:21,city:"Prenzlauer",int:"🌿 Chill",ic:"rgba(110,231,183,.12)",it:"#6ee7b7",txt:"Looking for a café and good conversation",t:"1h",p:.3,hot:false},
                            ].map((c,i)=>(
                                <div className="mcard" key={i}>
                                    {c.hot ? <div className="mhot">🔥 Happening now</div> : <div style={{marginBottom:6}}/>}
                                    <div className="mrow">
                                        <div className="mav" style={{background:`linear-gradient(135deg,${c.avc},${c.avc}88)`}}>{c.av}</div>
                                        <div><div className="mname">{c.n}, {c.age}</div><div className="msub">{c.city} · {c.t} left</div></div>
                                    </div>
                                    <div className="mint" style={{background:c.ic,border:`1px solid ${c.it}30`,color:c.it}}>{c.int}</div>
                                    <div className="mtxt">{c.txt}</div>
                                    <div className="mprog"><div className="mpf" style={{width:`${c.p*100}%`,background:c.it}}/></div>
                                    <div className="mbtn">Request to join →</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="psh side">
                        <div className="pnotch"/>
                        <div className="pbody">
                            <div className="mchd">
                                <div className="mav" style={{width:30,height:30,background:"linear-gradient(135deg,#4F7FFF,#1D4ED8)"}}>A</div>
                                <div><div className="mname">Alex</div><div className="msub" style={{color:"#22c55e"}}>● online</div></div>
                            </div>
                            {[
                                {me:false,t:"Hey! Near the entrance, blue hoodie 👋"},
                                {me:true, t:"I can see you! Walking over"},
                                {me:false,t:"This is wild haha 😄"},
                                {me:true, t:"SwayNow magic — what do you want to see first?"},
                            ].map((b,i)=>(
                                <div className={`mbbl${b.me?" me":""}`} key={i}>
                                    <div className={`mbt${b.me?" me":" them"}`}>{b.t}</div>
                                </div>
                            ))}
                            <div className="mrev">
                                <div style={{fontSize:9,color:"#6b7fff",marginBottom:6,fontWeight:600}}>Did you two meet? ⭐</div>
                                <div style={{display:"flex",gap:6}}>
                                    <div style={{flex:1,background:"rgba(16,185,129,.1)",border:"1px solid rgba(16,185,129,.2)",borderRadius:7,padding:"5px 0",fontSize:9,color:"#6ee7b7",textAlign:"center",fontWeight:700}}>✅ Great</div>
                                    <div style={{flex:1,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:7,padding:"5px 0",fontSize:9,color:"#52525b",textAlign:"center"}}>Skip</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* MARQUEE */}
            <div className="mqw">
                <div className="mqt">
                    {[0,1].map(ri=>MARQUEE.map((m,i)=>(
                        <div className="mqi" key={`${ri}-${i}`}>{m}<span className="mqs">·</span></div>
                    )))}
                </div>
            </div>

            {/* PROBLEM */}
            <section className="sec">
                <div className="wrap">
                    <div id="ins" data-reveal className="ig">
                        <div className={r("ins")}>
                            <div className="stag">The problem</div>
                            <div className="bq">You&apos;re somewhere new.<br/>Your contacts are busy.<br/><em>The moment passes alone.</em></div>
                            <p className="ip">Every app you have was built for people you already know. None of them were built for the moment you&apos;re standing somewhere exciting — and wanting someone to share it with.</p>
                            <p className="ip">SwayNow is that missing layer. The spontaneous social layer.</p>
                        </div>
                        <div className={`ir ${r("ins",200)}`}>
                            {INSIGHTS.map(ins=>(
                                <div className="icard" key={ins.h}>
                                    <div className="iem">{ins.em}</div>
                                    <div><div className="ih">{ins.h}</div><div className="ipdesc">{ins.p}</div></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section className="sec" id="how" style={{paddingTop:0}}>
                <div className="wrap">
                    <div id="howh" data-reveal>
                        <div className={`stag ${r("howh")}`}>How it works</div>
                        <h2 className={`sh2 ${r("howh",100)}`}>Three steps.<br/>One real meetup.</h2>
                        <p className={`sdesc ${r("howh",200)}`}>No algorithm. No matching queue. No waiting for someone to swipe back. Just real-time posts from people near you, right now.</p>
                    </div>
                    <div id="howg" data-reveal className={`sg ${r("howg",100)}`}>
                        {STEPS.map(s=>(
                            <div className="sc" key={s.n} data-n={s.n}>
                                <div className="sn">Step {s.n}</div>
                                <div className="si">{s.em}</div>
                                <div className="sh">{s.h}</div>
                                <div className="sp">{s.p}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section className="sec" id="features" style={{paddingTop:0}}>
                <div className="wrap">
                    <div id="feath" data-reveal>
                        <div className={`stag ${r("feath")}`}>Features</div>
                        <h2 className={`sh2 ${r("feath",100)}`}>Everything you need.<br/><em>Nothing you don&apos;t.</em></h2>
                    </div>
                    <div id="featg" data-reveal className={`fg ${r("featg",100)}`}>
                        {FEATURES.map(f=>(
                            <div className="fc" key={f.h}>
                                <div className="fem">{f.em}</div>
                                <div className="fh">{f.h}</div>
                                <div className="fp">{f.p}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FOUNDER */}
            <section className="sec" id="about" style={{paddingTop:0}}>
                <div className="wrap">
                    <div id="foundh" data-reveal>
                        <div className={`stag ${r("foundh")}`}>The founder</div>
                        <h2 className={`sh2 ${r("foundh",100)}`}>Built by someone<br/>who felt the gap.</h2>
                    </div>
                    <div id="foundc" data-reveal className={`fw ${r("foundc",150)}`}>
                        <div>
                            <div className="fq">&ldquo;I moved to Berlin as a student. I had <em>no one</em> to explore the city with. That feeling — being somewhere exciting and experiencing it alone — is exactly what SwayNow is built to solve.&rdquo;</div>
                            <p className="fb">SwayNow isn&apos;t built around metrics or growth hacks. It&apos;s built around a genuine belief: that the best experiences happen when you say yes to an unexpected person. Every feature exists because I needed it myself.</p>
                            <div className="fsig">— Kartik Kushwaha, Founder</div>
                        </div>
                        <div className="fcr">
                            <div className="fav">K</div>
                            <div className="fn">Kartik Kushwaha</div>
                            <div className="ft">Founder · SwayNow</div>
                            <div className="fchips">
                                {["Berlin","HTW Berlin","Media Informatics","Solo founder","From India"].map(c=>(
                                    <span className="fch" key={c}>{c}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="ctas">
                <div className="ctag"/>
                <div className="wrap">
                    <div id="ctab" data-reveal className={r("ctab")}>
                        <div className="ctai">
                            <div className="eyebrow" style={{marginBottom:28}}>
                                <span className="edot"/>Available in your city right now
                            </div>
                            <h2 className="ctah">Right plans.<br/><em>Right now.</em></h2>
                            <p className="ctap">Someone nearby is looking for exactly what you&apos;re looking for.<br/>Open SwayNow and find them.</p>
                            <Link href="/app" className="btn-m" style={{fontSize:17,padding:"18px 48px",display:"inline-flex"}}>
                                Open SwayNow
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                            </Link>
                            <p style={{marginTop:20,fontSize:13,color:"#2a2a3a"}}>Works on iPhone & Android · Add to home screen · No App Store needed</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="footer">
                <Link href="/" className="fl"><span>Sway</span>Now</Link>
                <ul className="flinks">
                    <li><a href="#how">How it works</a></li>
                    <li><Link href="/app">Open app</Link></li>
                    <li><Link href="/legal/privacy">Privacy</Link></li>
                    <li><Link href="/legal/terms">Terms</Link></li>
                </ul>
                <span className="fcp">© 2026 SwayNow · Made in Berlin</span>
            </footer>
        </>
    );
}

const VIBES = [
    "Find your people, anywhere.",
    "Right plans. Right now.",
    "Your friends are busy. Someone nearby isn't.",
    "Stop scrolling. Start meeting.",
    "The city is full of people. Go find them.",
];

const MARQUEE = [
    "Real meetups","5km radius","Travellers & locals",
    "Berlin · Amsterdam · Paris · Barcelona · London",
    "Posts expire in 4h","Trust reviews","No swiping",
    "Students & expats","Explore together","Spontaneous by design",
];

const INSIGHTS = [
    {em:"🗺️",h:"Dating apps aren't the answer",p:"You don't want a date. You want someone to explore the flea market with. There was no app for that. Until now."},
    {em:"⚡",h:"Social media is too passive",p:"By the time someone responds to your post, the moment has passed. SwayNow is built for right now — posts expire in hours."},
    {em:"🌍",h:"Perfect for travellers & expats",p:"New city, no contacts. SwayNow fills that gap instantly — connecting you with locals and other travellers who are out right now."},
];

const STEPS = [
    {n:"01",em:"📍",h:"Post what you're doing",p:"Takes 10 seconds. Tell people what you're up to — exploring, grabbing coffee, hitting the gym. Set a duration. Post it."},
    {n:"02",em:"👋",h:"Someone nearby requests to join",p:"People within 5km see your post in real time. They send a join request. You accept. Chat opens instantly — no waiting."},
    {n:"03",em:"🤝",h:"Meet. Leave a review.",p:"Go meet them in real life. Afterwards, leave an honest review on their profile. Trust is earned, not assumed."},
];

const FEATURES = [
    {em:"⏳",h:"Posts that expire",p:"Every post disappears after 15 min, 1 hour, or 4 hours. No dead posts. No clutter. Only what's happening right now."},
    {em:"📍",h:"5 km radius feed",p:"You only see people within walking distance. Proximity makes meetups actually happen — not just conversations."},
    {em:"⭐",h:"Public trust reviews",p:"After meeting someone, leave a short review on their profile. Real accountability. You know who you're meeting before you go."},
    {em:"🔔",h:"Instant notifications",p:"Someone wants to join your post? You know immediately. The whole point is spontaneous — not 3 hours later."},
    {em:"🗺️",h:"Explore any city",p:"Browse posts in Berlin, Amsterdam, Lisbon — anywhere. Perfect for when you land somewhere new and want to hit the ground running."},
    {em:"🔒",h:"Block & report",p:"One tap to block anyone. Every report is reviewed. Your safety is a non-negotiable, not an afterthought."},
];
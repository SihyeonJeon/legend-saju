/**
 * ChatGPT Apps SDK widget templates (MCP UI resources).
 *
 * Each widget is a self-contained HTML document served as an MCP resource
 * with mimeType "text/html+skybridge". ChatGPT renders it in a sandboxed
 * iframe and injects the window.openai bridge; the widget reads
 * window.openai.toolOutput (the tool's structuredContent) and re-renders on
 * "openai:set_globals". No network calls and no external assets — engine
 * facts are computed server-side and model-authored prose arrives as tool
 * input, so the widget stays a pure presentation layer.
 *
 * The widget set mirrors what people actually ask in Korean communities
 * (지식iN·네이트판 '사주' scrape, 2026-08): ① 원국 풀이·신살 ② 재물운·연애운·
 * 직업운 등 영역 운세 ③ 궁합 ④ 대운 흐름·시기.
 */

export const WIDGET_URIS = {
  natalCard: "ui://widget/saju-natal-card.html",
  fortuneCards: "ui://widget/saju-fortune-cards.html",
  compatibilityCard: "ui://widget/saju-compatibility-card.html",
  luckTimeline: "ui://widget/saju-luck-timeline.html",
} as const;

/** Shared pastel design system. */
const BASE_CSS = `
  :root{
    --bg:#fff8f3;--card:#ffffff;--ink:#4a4038;--sub:#a08d80;--line:#f3e4d7;
    --pink:#ffd3e0;--pink-d:#e0788f;--peach:#ffe3c9;--peach-d:#d18a4e;
    --mint:#ccefdd;--mint-d:#4f9e77;--sky:#d3e5ff;--sky-d:#5b83c0;
    --lilac:#e6dcf7;--lilac-d:#8d6fc0;--butter:#fff0bd;--butter-d:#b8933a;
    --rose:#ffdcd3;--rose-d:#cc6f5c;--shadow:0 4px 16px rgba(180,140,110,.13);
    --el-목:#4caf7d;--el-화:#ef7d7d;--el-토:#d4a94e;--el-금:#9aa5b5;--el-수:#6e9fe8;
  }
  @media (prefers-color-scheme: dark){
    :root{--bg:#211d1a;--card:#2b2622;--ink:#f0e7df;--sub:#b3a294;--line:#41372f;
    --pink:#5c3a45;--pink-d:#ff9cb4;--peach:#5a4530;--peach-d:#ffbe80;
    --mint:#2f4d3e;--mint-d:#7fd8ab;--sky:#32405a;--sky-d:#9dc0f5;
    --lilac:#453a58;--lilac-d:#c5aef0;--butter:#54491f;--butter-d:#f0d074;
    --rose:#553630;--rose-d:#ff9f8a;--shadow:0 4px 16px rgba(0,0,0,.35);}
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Apple SD Gothic Neo','Pretendard','Noto Sans KR',sans-serif;background:var(--bg);color:var(--ink);padding:12px;font-size:14px;line-height:1.6}
  .card{background:var(--card);border:1.5px solid var(--line);border-radius:22px;padding:18px;max-width:640px;margin:0 auto;box-shadow:var(--shadow)}
  .ribbon{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:12px}
  .ribbon h1{font-size:16.5px;font-weight:800;letter-spacing:-.01em}
  .ribbon .meta{font-size:11.5px;color:var(--sub);background:var(--bg);border-radius:999px;padding:3px 10px}
  .hanja{font-family:'Songti SC','Noto Serif KR',serif}
  .sec{margin-top:15px}
  .sec>h2{font-size:11.5px;color:var(--sub);letter-spacing:.1em;margin-bottom:7px;font-weight:700}
  .chip{display:inline-block;border-radius:999px;padding:3px 10px;font-size:11.5px;margin:2.5px 3px 2.5px 0;background:var(--bg);border:1px solid var(--line);white-space:nowrap}
  .dots{border-top:2px dotted var(--line);margin:15px 0 0}
  .bubble{position:relative;background:var(--bg);border:1.5px solid var(--line);border-radius:16px;padding:12px 14px;font-size:13.5px;margin-top:8px}
  .bubble .lab{font-size:10px;color:var(--sub);letter-spacing:.08em;margin-bottom:5px;font-weight:700}
  .foot{margin-top:14px;font-size:10.5px;color:var(--sub);text-align:center}
  .foot .brand{letter-spacing:.14em;font-weight:700}
  .empty{color:var(--sub);text-align:center;padding:30px 0;font-size:13px}
  .el-목{color:var(--el-목)} .el-화{color:var(--el-화)} .el-토{color:var(--el-토)} .el-금{color:var(--el-금)} .el-수{color:var(--el-수)}
  .elbg-목{background:var(--el-목)} .elbg-화{background:var(--el-화)} .elbg-토{background:var(--el-토)} .elbg-금{background:var(--el-금)} .elbg-수{background:var(--el-수)}
`;

const SHARED_JS = `
  var DOMS={
    "총운":{e:"\\uD83C\\uDF1F",bg:"var(--butter)",fg:"var(--butter-d)"},
    "재물운":{e:"\\uD83D\\uDCB0",bg:"var(--mint)",fg:"var(--mint-d)"},
    "연애운":{e:"\\uD83D\\uDC95",bg:"var(--pink)",fg:"var(--pink-d)"},
    "결혼운":{e:"\\uD83D\\uDC8D",bg:"var(--rose)",fg:"var(--rose-d)"},
    "재회운":{e:"\\uD83D\\uDC8C",bg:"var(--rose)",fg:"var(--rose-d)"},
    "직업운":{e:"\\uD83D\\uDCBC",bg:"var(--sky)",fg:"var(--sky-d)"},
    "건강운":{e:"\\uD83C\\uDF3F",bg:"var(--mint)",fg:"var(--mint-d)"},
    "학업운":{e:"\\uD83D\\uDCDA",bg:"var(--lilac)",fg:"var(--lilac-d)"},
    "이동운":{e:"\\u2708\\uFE0F",bg:"var(--peach)",fg:"var(--peach-d)"}
  };
  function dom(name){ return DOMS[name]||{e:"\\u2728",bg:"var(--bg)",fg:"var(--sub)"}; }
  function stars(n){
    var out=""; n=Math.max(0,Math.min(5,n|0));
    for(var i=0;i<5;i++) out+=i<n?"\\u2764\\uFE0F":"\\uD83E\\uDD0D";
    return out;
  }
  function chips(list,esc){ return (list||[]).map(function(t){return "<span class='chip'>"+esc(t)+"</span>";}).join(""); }
  function bubble(n,esc){
    if(!n||(!n.headline&&!n.reading)) return "";
    return "<div class='sec'><div class='bubble'><div class='lab'>\\uD83D\\uDCAC AI 해석 \\u00B7 계산은 Legend Saju 엔진</div>"
      +(n.headline?"<div style='font-weight:800;margin-bottom:4px'>"+esc(n.headline)+"</div>":"")
      +(n.reading?"<div>"+esc(n.reading)+"</div>":"")+"</div></div>";
  }
  function foot(d,esc){
    return "<div class='dots'></div><div class='foot'><span class='brand'>\\u2728 LEGEND SAJU \\u2728</span></div>";
  }
`;

function page(title: string, css: string, script: string): string {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><style>${BASE_CSS}${css}</style></head>
<body><div id="root"><div class="empty">🔮 계산 결과를 기다리는 중…</div></div>
<script>
(function(){
  var esc=function(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});};
  ${SHARED_JS}
  ${script}
  function tick(){ try{ var d=(window.openai&&window.openai.toolOutput)||null; if(d) document.getElementById("root").innerHTML=render(d,esc); }catch(e){ console.error(e); } }
  window.addEventListener("openai:set_globals",tick);
  tick();
})();
</script></body></html>`;
}

/* ─── ① 원국 카드: "사주 봐주세요 / 풀이 / 신살 있나요" ─── */
const NATAL_CSS = `
  .hero{display:flex;align-items:center;gap:14px}
  .hero .orb{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:38px;font-weight:800;color:#fff;flex:none;box-shadow:var(--shadow)}
  .hero .who{font-size:16px;font-weight:800}
  .hero .sub{font-size:12px;color:var(--sub);margin-top:2px}
  table.pillars{width:100%;border-collapse:separate;border-spacing:4px;table-layout:fixed;text-align:center}
  table.pillars th{font-size:10.5px;color:var(--sub);font-weight:700;padding-bottom:2px}
  table.pillars td{background:var(--bg);border-radius:12px;padding:8px 2px;vertical-align:top}
  .gz{font-size:23px;font-weight:800;line-height:1.18}
  .gz-ko{font-size:11px;color:var(--sub);margin-top:1px}
  .ss{font-size:10px;color:var(--sub);margin-top:3px;line-height:1.45}
  .bars .row{display:flex;align-items:center;gap:8px;margin:4px 0}
  .bars .name{width:52px;font-size:12px;font-weight:700;flex:none}
  .bars .track{flex:1;height:10px;background:var(--bg);border-radius:6px;overflow:hidden}
  .bars .fill{height:100%;border-radius:6px}
  .bars .val{width:28px;font-size:11px;color:var(--sub);text-align:right;flex:none}
  .verd{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:7px}
  .vbox{background:var(--bg);border-radius:14px;padding:10px 12px}
  .vbox .k{font-size:10px;color:var(--sub);font-weight:700;letter-spacing:.07em}
  .vbox .v{font-size:13.5px;font-weight:800;margin-top:2px}
  .vbox .d{font-size:11px;color:var(--sub);margin-top:2px}
`;
const NATAL_JS = `
  function pcell(p,esc){
    if(!p) return "<td>—</td>";
    return "<td><div class='gz'><span class='hanja el-"+esc(p.ganEl)+"'>"+esc(p.gan)+"</span><br><span class='hanja el-"+esc(p.zhiEl)+"'>"+esc(p.zhi)+"</span></div>"
      +"<div class='gz-ko'>"+esc(p.ganKo)+esc(p.zhiKo)+"</div>"
      +"<div class='ss'>"+esc(p.shiShenGan||"")+"<br>"+esc(p.diShi||"")+"</div></td>";
  }
  function render(d,esc){
    var els=["목","화","토","금","수"],maxW=1;
    if(d.elements) els.forEach(function(e){ if(d.elements.weights[e]>maxW) maxW=d.elements.weights[e]; });
    var h="<div class='card'>"
      +"<div class='ribbon'><h1>\\uD83C\\uDF38 나의 사주 원국</h1><span class='meta'>"+esc(d.birthLabel||"")+"</span></div>"
      +"<div class='hero'><div class='orb elbg-"+esc(d.dayMaster.el)+"'><span class='hanja'>"+esc(d.dayMaster.gan)+"</span></div>"
      +"<div><div class='who'>"+esc(d.dayMaster.label)+"</div><div class='sub'>"+esc(d.dayMaster.detail||"")+"</div></div></div>"
      +"<div class='sec'><h2>\\uD83C\\uDFAF 네 기둥</h2><table class='pillars'><tr><th>년주</th><th>월주</th><th>일주</th><th>시주</th></tr><tr>"
      +pcell(d.pillars.year,esc)+pcell(d.pillars.month,esc)+pcell(d.pillars.day,esc)+pcell(d.pillars.time,esc)+"</tr></table></div>";
    if(d.elements){
      h+="<div class='sec'><h2>\\uD83C\\uDF08 오행 밸런스</h2><div class='bars'>";
      els.forEach(function(e){
        h+="<div class='row'><span class='name el-"+e+"'>"+e+" "+esc(d.elements.hanja[e])+"</span>"
          +"<div class='track'><div class='fill elbg-"+e+"' style='width:"+Math.round((d.elements.weights[e]||0)/maxW*100)+"%'></div></div>"
          +"<span class='val'>"+(d.elements.weights[e]||0)+"</span></div>";
      });
      if(d.elements.missing&&d.elements.missing.length) h+="<div class='ss' style='margin-top:5px'>\\uD83D\\uDD0D 없는 오행: "+esc(d.elements.missing.join("\\u00B7"))+"</div>";
      h+="</div></div>";
    }
    if(d.verdicts){
      h+="<div class='sec'><h2>\\uD83D\\uDCDC 판정</h2><div class='verd'>";
      [["왕쇠",d.verdicts.wangswae],["격국",d.verdicts.geokguk],["용신 후보",d.verdicts.yongsin]].forEach(function(pair){
        if(pair[1]) h+="<div class='vbox'><div class='k'>"+pair[0]+"</div><div class='v'>"+esc(pair[1].label)+"</div><div class='d'>"+esc(pair[1].detail||"")+"</div></div>";
      });
      h+="</div></div>";
    }
    if(d.sinsal&&d.sinsal.length) h+="<div class='sec'><h2>\\u2728 신살</h2>"+chips(d.sinsal,esc)+"</div>";
    if(d.relations&&d.relations.length) h+="<div class='sec'><h2>\\uD83D\\uDD17 합·충·형·파·해</h2>"+chips(d.relations,esc)+"</div>";
    h+=bubble(d.narrative,esc)+foot(d,esc)+"</div>";
    return h;
  }
`;

/* ─── ② 운세 카드: "재물운·연애운·직업운 어때요" — 영역별 파스텔 카드 ─── */
const FORTUNE_CSS = `
  .luck{display:flex;gap:7px;flex-wrap:wrap}
  .lbox{flex:1;min-width:110px;background:var(--bg);border-radius:14px;padding:9px 12px}
  .lbox .k{font-size:10px;color:var(--sub);font-weight:700}
  .lbox .v{font-size:15px;font-weight:800}
  .dcard{border-radius:18px;padding:13px 15px;margin-top:10px}
  .dcard .t{display:flex;align-items:center;gap:8px}
  .dcard .t .e{font-size:19px}
  .dcard .t .n{font-weight:800;font-size:14.5px}
  .dcard .t .sc{margin-left:auto;font-size:12px;letter-spacing:1px}
  .dcard .tx{font-size:13.5px;margin-top:7px;background:var(--card);border-radius:12px;padding:10px 12px}
  .dcard .en{margin-top:7px}
  .act{display:flex;gap:9px;align-items:flex-start;margin:8px 0;background:var(--bg);border-radius:14px;padding:9px 12px}
  .act .n{flex:none;font-size:15px}
  .act .tt{font-weight:700;font-size:13px}
  .act .dd{font-size:12px;color:var(--sub)}
`;
const FORTUNE_JS = `
  function render(d,esc){
    var h="<div class='card'><div class='ribbon'><h1>\\uD83D\\uDD2E "+esc(d.title||"운세 리포트")+"</h1><span class='meta'>"+esc(d.birthLabel||"")+"</span></div>";
    h+="<div class='luck'>";
    if(d.dayMaster) h+="<div class='lbox'><div class='k'>일간</div><div class='v el-"+esc(d.dayMaster.el)+"'><span class='hanja'>"+esc(d.dayMaster.gan)+"</span> "+esc(d.dayMaster.label)+"</div></div>";
    if(d.luck&&d.luck.daYun) h+="<div class='lbox'><div class='k'>대운 "+esc(d.luck.daYunAge||"")+"</div><div class='v hanja'>"+esc(d.luck.daYun)+"</div></div>";
    if(d.luck&&d.luck.seYun) h+="<div class='lbox'><div class='k'>"+esc(String(d.luck.year||""))+" 세운</div><div class='v hanja'>"+esc(d.luck.seYun)+"</div></div>";
    h+="</div>";
    if(d.verdictChips&&d.verdictChips.length) h+="<div class='sec'>"+chips(d.verdictChips,esc)+"</div>";
    (d.cards||[]).forEach(function(c){
      var s=dom(c.domain);
      h+="<div class='dcard' style='background:"+s.bg+"'><div class='t'><span class='e'>"+s.e+"</span><span class='n' style='color:"+s.fg+"'>"+esc(c.domain)+"</span>"
        +(c.score?"<span class='sc'>"+stars(c.score)+"</span>":"")+"</div>";
      if(c.engineNotes&&c.engineNotes.length) h+="<div class='en'>"+chips(c.engineNotes,esc)+"</div>";
      if(c.text) h+="<div class='tx'>"+esc(c.text)+"</div>";
      h+="</div>";
    });
    if(d.actions&&d.actions.length){
      h+="<div class='sec'><h2>\\uD83C\\uDF40 개운 액션</h2>";
      d.actions.forEach(function(a){
        h+="<div class='act'><span class='n'>\\u2705</span><div><div class='tt'>"+esc(a.title)+"</div>"+(a.detail?"<div class='dd'>"+esc(a.detail)+"</div>":"")+"</div></div>";
      });
      h+="</div>";
    }
    h+=bubble(d.narrative,esc)+foot(d,esc)+"</div>";
    return h;
  }
`;

/* ─── ③ 궁합 카드: "사주 궁합 봐주세요" ─── */
const COMPAT_CSS = `
  .duo{display:flex;align-items:center;gap:8px}
  .person{flex:1;background:var(--bg);border-radius:18px;padding:13px 8px;text-align:center}
  .person .nm{font-size:11.5px;color:var(--sub);font-weight:700;margin-bottom:5px}
  .person .orb{width:58px;height:58px;border-radius:50%;margin:0 auto;display:flex;align-items:center;justify-content:center;font-size:27px;font-weight:800;color:#fff;box-shadow:var(--shadow)}
  .person .dk{font-size:11.5px;color:var(--sub);margin-top:5px}
  .mid{font-size:24px;flex:none}
  .meter{text-align:center;margin-top:10px;font-size:16px;letter-spacing:2px}
  .meter .cap{display:block;font-size:10.5px;color:var(--sub);margin-top:2px}
  .sig{display:flex;gap:9px;align-items:flex-start;margin:7px 0}
  .badge{flex:none;border-radius:9px;padding:3px 9px;font-size:11px;font-weight:800}
  .b-합{background:var(--mint);color:var(--mint-d)} .b-충{background:var(--rose);color:var(--rose-d)}
  .b-형{background:var(--peach);color:var(--peach-d)} .b-파{background:var(--lilac);color:var(--lilac-d)}
  .b-해{background:var(--butter);color:var(--butter-d)} .b-보{background:var(--sky);color:var(--sky-d)} .b-참{background:var(--bg);color:var(--sub)}
  .sig .tx{font-size:13px;padding-top:2px}
`;
const COMPAT_JS = `
  function person(p,esc){
    return "<div class='person'><div class='nm'>"+esc(p.name||"")+"</div>"
      +"<div class='orb elbg-"+esc(p.ganEl)+"'><span class='hanja'>"+esc(p.dayGan)+esc(p.dayZhi)+"</span></div>"
      +"<div class='dk'>"+esc(p.label||"")+"</div></div>";
  }
  function render(d,esc){
    var h="<div class='card'><div class='ribbon'><h1>\\uD83D\\uDC98 사주 궁합</h1><span class='meta'>일주 중심 1차 신호</span></div>";
    h+="<div class='duo'>"+person(d.personA,esc)+"<div class='mid'>\\uD83D\\uDC95</div>"+person(d.personB,esc)+"</div>";
    if(d.score) h+="<div class='meter'>"+stars(d.score)+"<span class='cap'>AI 종합 점수 \\u00B7 참고용</span></div>";
    if(d.signals&&d.signals.length){
      h+="<div class='sec'><h2>\\uD83D\\uDD0D 두 사주의 신호</h2>";
      d.signals.forEach(function(s){
        h+="<div class='sig'><span class='badge b-"+esc(s.type)+"'>"+esc(s.type)+"</span><span class='tx'>"+esc(s.text)+"</span></div>";
      });
      h+="</div>";
    }
    h+=bubble(d.narrative,esc)+foot(d,esc)+"</div>";
    return h;
  }
`;

/* ─── ④ 대운 타임라인: "대운 흐름 / 결혼·창업 시기" ─── */
const TIMELINE_CSS = `
  .rail{position:relative;margin-top:4px}
  .step{display:flex;gap:12px;position:relative;padding:0 0 14px 0}
  .step .node{flex:none;width:46px;text-align:center;position:relative;z-index:1}
  .step .node .pin{width:40px;height:40px;border-radius:50%;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;margin:0 auto;border:2px solid var(--line)}
  .step.cur .node .pin{background:var(--pink);border-color:var(--pink-d);box-shadow:var(--shadow)}
  .step .node .age{font-size:10px;color:var(--sub);margin-top:3px;font-weight:700;background:var(--card);border-radius:6px;display:inline-block;padding:0 4px}
  .step .line{position:absolute;left:22px;top:44px;bottom:0;width:2px;background:var(--line);z-index:0}
  .step:last-child .line{display:none}
  .step .info{flex:1;background:var(--bg);border-radius:14px;padding:8px 12px;min-width:0}
  .step.cur .info{background:var(--pink)}
  .step .info .gz{font-weight:800;font-size:14px}
  .step .info .ss{font-size:11px;color:var(--sub)}
  .step .info .now{font-size:10.5px;font-weight:800;color:var(--pink-d)}
  .focus{background:var(--butter);border-radius:14px;padding:10px 13px;margin-top:10px;font-size:13px}
  .focus b{color:var(--butter-d)}
`;
const TIMELINE_JS = `
  function render(d,esc){
    var h="<div class='card'><div class='ribbon'><h1>\\uD83C\\uDF0A 대운 흐름</h1><span class='meta'>"+esc(d.birthLabel||"")+"</span></div>";
    if(d.dayMaster) h+="<div style='font-size:12.5px;color:var(--sub)'>일간 <b class='el-"+esc(d.dayMaster.el)+"'>"+esc(d.dayMaster.label)+"</b> \\u00B7 "+esc(String(d.asOfYear||""))+"년 세운 <b class='hanja'>"+esc(d.seYun||"")+"</b></div>";
    h+="<div class='sec'><div class='rail'>";
    (d.daYun||[]).forEach(function(s){
      h+="<div class='step"+(s.current?" cur":"")+"'><div class='node'><div class='pin hanja'>"+esc(s.gz)+"</div><div class='age'>"+esc(s.ageRange)+"</div></div><div class='line'></div>"
        +"<div class='info'><span class='gz hanja'>"+esc(s.gz)+"</span> <span class='ss'>"+esc(s.tenGod||"")+" \\u00B7 "+esc(s.years||"")+"</span>"
        +(s.current?"<div class='now'>\\uD83D\\uDCCD 지금 여기</div>":"")
        +(s.note?"<div class='ss'>"+esc(s.note)+"</div>":"")+"</div></div>";
    });
    h+="</div></div>";
    if(d.focus) h+="<div class='focus'>\\uD83D\\uDD14 <b>"+esc(String(d.focus.year))+"년</b> \\u00B7 세운 <b class='hanja'>"+esc(d.focus.seYun||"")+"</b>"+(d.focus.note?" \\u00B7 "+esc(d.focus.note):"")+"</div>";
    h+=bubble(d.narrative,esc)+foot(d,esc)+"</div>";
    return h;
  }
`;

export const NATAL_CARD_HTML = page("사주 원국 카드", NATAL_CSS, NATAL_JS);
export const FORTUNE_CARDS_HTML = page("운세 리포트", FORTUNE_CSS, FORTUNE_JS);
export const COMPATIBILITY_CARD_HTML = page("궁합 카드", COMPAT_CSS, COMPAT_JS);
export const LUCK_TIMELINE_HTML = page("대운 타임라인", TIMELINE_CSS, TIMELINE_JS);

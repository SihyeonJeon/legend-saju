/**
 * 사주 엔진 종결 모듈 — 자미두수 궁별 개운 · 택일(좋은 날) · 작명 오행보완.
 * 결정적 계산(만세력/명반/일진)에 표준 통설 처방표를 얹는다. 개운·택일·작명은
 * 명리 보조 처방이며 효과를 보장하지 않는다(disclaimer).
 */
import { Solar } from "lunar-typescript";
import { computeSajuChart, type SajuInput, type Element } from "./saju-engine";
import { evaluateMyeongriJudgment, type UsefulGodLens } from "./myeongri-judgment";
import { computeZiweiChart, type ZiweiChart } from "./ziwei-engine";

// ===== ① 자미두수 궁별 개운 =====
const STAR_GAEUN: Record<string, string> = {
  자미:"책임·통솔 자리에서 안정. 보좌(인맥·조언)를 구하고 독선·고립을 경계.",
  천기:"기획·연구·변화 환경에서 발휘. 잔머리·과잉사고·잦은 변동 절제.",
  태양:"공적 활동·베풂·드러내는 일에 동력. 과로·생색·실속부족 주의.",
  무곡:"재무·결단·실무에 강. 강직함에 부드러운 조율을 더하라.",
  천동:"정서·복덕·관계의 따뜻함에서 행복. 안일·나태를 적당한 목표로 깨라.",
  염정:"기획·교제·예술 수완. 감정기복·관재·구설을 절제하라.",
  천부:"모으고 지키는 일에 강. 안정에 묶이지 말고 진취성을 보완.",
  태음:"저축·부동산·내면 작업에서 만족. 감정기복·침잠을 관리.",
  탐랑:"교제·재예·기회 포착에 강. 주색·투기·산만을 절제.",
  거문:"말·논리·연구·전문지식이 무기. 구설·의심·시비를 관리.",
  천상:"중재·보좌·신의에서 인정. 주체적 결단을 미루지 말라.",
  천량:"원칙·돌봄·위기해소(蔭)에 강. 노파심·간섭을 절제.",
  칠살:"개척·전문·결단의 자리. 과격·고독·번아웃을 관리.",
  파군:"변혁·개창·재시작에 강. 무모·소모·뒷마무리 약함을 보완."
};
const KEY_PALACES = ["명궁","재백","관록","부처","복덕","천이"];

export interface ZiweiGaeun { fiveElementsClass: string; soul: string; body: string; byPalace: { palace: string; stars: string[]; advice: string }[]; luckPalace: string; jealousPalace: string; disclaimer: string; }

/** 자미두수 명반 기반 궁별 개운 강령. */
export function ziweiGaeun(input: SajuInput): ZiweiGaeun {
  const c: ZiweiChart = computeZiweiChart(input);
  const norm = (n: string) => n.replace("궁", "");
  const byPalace = c.palaces
    .filter((p) => KEY_PALACES.some((k) => norm(p.name).includes(k.replace("궁", ""))))
    .map((p) => {
      const stars = p.majorStars.map((s) => s.name);
      const advice = stars.map((s) => STAR_GAEUN[s]).filter(Boolean).join(" / ") || "무주성 — 대궁(맞은편 궁) 성요를 빌려 보고, 보좌성·삼방으로 보완.";
      return { palace: p.name, stars, advice };
    });
  const findMut = (m: string) => c.palaces.find((p) => [...p.majorStars, ...p.minorStars].some((s) => s.mutagen === m));
  const luck = findMut("록"); const jeal = findMut("기");
  return {
    fiveElementsClass: c.fiveElementsClass, soul: c.soul, body: c.body,
    byPalace,
    luckPalace: luck ? `${luck.name}(화록 — 복·기회가 트이는 영역)` : "화록 명시 없음",
    jealousPalace: jeal ? `${jeal.name}(화기 — 집착·막힘 주의 영역)` : "화기 명시 없음",
    disclaimer: "[자미 궁별 개운 — 명반(iztro) 결정적 + 주성 처방. 八字와 별개 체계, 보조 처방이며 효과를 확정·보장하지 않음.]"
  };
}

// ===== ② 택일(擇日) — 좋은 날 자동 =====
const CHUNG: Record<string,string> = { 子:"午",午:"子",丑:"未",未:"丑",寅:"申",申:"寅",卯:"酉",酉:"卯",辰:"戌",戌:"辰",巳:"亥",亥:"巳" };
const STEM_EL: Record<string,Element> = { 甲:"목",乙:"목",丙:"화",丁:"화",戊:"토",己:"토",庚:"금",辛:"금",壬:"수",癸:"수" };
const BR_EL: Record<string,Element> = { 寅:"목",卯:"목",巳:"화",午:"화",辰:"토",戌:"토",丑:"토",未:"토",申:"금",酉:"금",亥:"수",子:"수" };
export interface TaekilEvidence {
  code: string;
  label: string;
  source: "calendar" | "natal_contact" | "myeongri_lens";
  sourceIds: string[];
}

export interface AuspiciousDay {
  date: string;
  ganZhi: string;
  disposition: "shortlist" | "review" | "excluded";
  calendar: { tianShen: string; tianShenLuck: string; yi: string[]; ji: string[] };
  supports: TaekilEvidence[];
  cautions: TaekilEvidence[];
  exclusions: TaekilEvidence[];
  lensContacts: { lensId: UsefulGodLens["id"]; status: UsefulGodLens["status"]; element: Element; position: "day_stem" | "day_branch" }[];
  selectionReason: string;
}

export interface TaekilSelection {
  policy: {
    id: "calendar-constraint-matrix-v2";
    rule: string;
    ordering: "group_then_chronological";
  };
  usefulGodLenses: UsefulGodLens[];
  shortlist: AuspiciousDay[];
  review: AuspiciousDay[];
  excluded: AuspiciousDay[];
  allDays: AuspiciousDay[];
  disclaimer: string;
}

function matchesPurpose(items: string[], purpose: string): boolean {
  return items.some((item) => item.includes(purpose) || purpose.includes(item));
}

/** 황도·의기·원국 충·관법별 오행 접촉을 점수로 합치지 않고 증거 벡터로 반환한다. */
export function selectAuspiciousDays(input: SajuInput, from: { year: number; month: number; day: number }, days = 60, purpose?: string): TaekilSelection {
  const chart = computeSajuChart(input);
  const judgment = evaluateMyeongriJudgment(chart);
  const lenses = judgment.usefulGods.lenses;
  const dayBranch = chart.pillars.day.zhi;
  let solar = Solar.fromYmd(from.year, from.month, from.day);
  const out: AuspiciousDay[] = [];
  for (let i = 0; i < days; i++) {
    const lu = solar.getLunar();
    const gz = lu.getDayInGanZhi();
    const g = gz[0], z = gz[1];
    const yi = lu.getDayYi();
    const ji = lu.getDayJi();
    const supports: TaekilEvidence[] = [];
    const cautions: TaekilEvidence[] = [];
    const exclusions: TaekilEvidence[] = [];
    const isYellow = lu.getDayTianShenLuck() === "吉";
    if (isYellow) {
      supports.push({ code: "YELLOW_PATH", label: `황도(${lu.getDayTianShen()})`, source: "calendar", sourceIds: ["lunar-typescript"] });
    } else {
      cautions.push({ code: "BLACK_PATH", label: `흑도(${lu.getDayTianShen()})`, source: "calendar", sourceIds: ["lunar-typescript"] });
    }
    if (CHUNG[z] === dayBranch) {
      exclusions.push({ code: "NATAL_DAY_BRANCH_CLASH", label: `일지 ${z}가 원국 일지 ${dayBranch}와 충`, source: "natal_contact", sourceIds: ["lunar-typescript", "sanming-tonghui"] });
    }
    if (purpose && matchesPurpose(yi, purpose)) {
      supports.push({ code: "PURPOSE_YI", label: `의(宜)에 ${purpose} 포함`, source: "calendar", sourceIds: ["lunar-typescript"] });
    }
    if (purpose && matchesPurpose(ji, purpose)) {
      exclusions.push({ code: "PURPOSE_JI", label: `기(忌)에 ${purpose} 포함`, source: "calendar", sourceIds: ["lunar-typescript"] });
    }
    const lensContacts = lenses.flatMap((lens) => {
      const contacts: AuspiciousDay["lensContacts"] = [];
      if (lens.candidateElements.includes(STEM_EL[g])) contacts.push({ lensId: lens.id, status: lens.status, element: STEM_EL[g], position: "day_stem" });
      if (lens.candidateElements.includes(BR_EL[z])) contacts.push({ lensId: lens.id, status: lens.status, element: BR_EL[z], position: "day_branch" });
      return contacts;
    });
    for (const contact of lensContacts) {
      supports.push({
        code: `LENS_CONTACT_${contact.lensId}_${contact.position}`,
        label: `${contact.lensId}[${contact.status}] 후보 ${contact.element}와 ${contact.position === "day_stem" ? "일간" : "일지"} 접촉`,
        source: "myeongri_lens",
        sourceIds: lenses.find((lens) => lens.id === contact.lensId)?.sourceIds ?? []
      });
    }
    const disposition: AuspiciousDay["disposition"] = exclusions.length
      ? "excluded"
      : cautions.length === 0 && supports.some((evidence) => evidence.code === "YELLOW_PATH" || evidence.code === "PURPOSE_YI")
        ? "shortlist"
        : "review";
    const selectionReason = disposition === "excluded"
      ? exclusions.map((evidence) => evidence.label).join(" / ")
      : disposition === "shortlist"
        ? supports.filter((evidence) => evidence.source === "calendar").map((evidence) => evidence.label).join(" / ")
        : `${cautions.map((evidence) => evidence.label).join(" / ") || "제외 조건 없음"}; 사안별 추가 검토`;
    out.push({
      date: solar.toYmd(),
      ganZhi: gz,
      disposition,
      calendar: { tianShen: lu.getDayTianShen(), tianShenLuck: lu.getDayTianShenLuck(), yi, ji },
      supports,
      cautions,
      exclusions,
      lensContacts,
      selectionReason
    });
    solar = solar.next(1);
  }
  return {
    policy: {
      id: "calendar-constraint-matrix-v2",
      rule: "기(忌) 목적 일치와 원국 일지 충은 제외군, 제외가 없고 흑도 경고 없이 황도 또는 의(宜) 목적 일치가 있으면 후보군, 나머지는 검토군으로 둔다.",
      ordering: "group_then_chronological"
    },
    usefulGodLenses: lenses,
    shortlist: out.filter((day) => day.disposition === "shortlist"),
    review: out.filter((day) => day.disposition === "review"),
    excluded: out.filter((day) => day.disposition === "excluded"),
    allDays: out,
    disclaimer: "[택일 증거 행렬: 날짜 계산과 명시된 분류 정책을 실행한다. 임의 합산점수는 없으며 관법 접촉은 길흉 보장이 아니다. 실제 사안의 시간·장소·당사자·계약 조건을 함께 검토해야 한다.]"
  };
}

// ===== ③ 작명 관법 비교 =====
const HANGUL_OHAENG: Record<Element, string[]> = {
  목: ["ㄱ","ㅋ","ㄲ"], 화: ["ㄴ","ㄷ","ㄹ","ㅌ","ㄸ"], 토: ["ㅇ","ㅎ"], 금: ["ㅅ","ㅈ","ㅊ","ㅆ","ㅉ"], 수: ["ㅁ","ㅂ","ㅍ","ㅃ"]
};
const HANJA_BUSU_HINT: Record<Element, string> = { 목:"木·艹·竹 계열 부수", 화:"火·日·光 계열", 토:"土·山·石 계열", 금:"金·玉·刀 계열", 수:"水·氵·雨 계열" };
export interface NamingGuide {
  myeongriLenses: {
    id: UsefulGodLens["id"];
    school: string;
    status: UsefulGodLens["status"];
    candidateElements: Element[];
    observations: string[];
    sourceIds: string[];
  }[];
  conflicts: string[];
  methodLayers: {
    id: "phonetic_five_element" | "radical_resource_element" | "five_grid_suri";
    status: "lineage_unverified" | "requires_separate_calculation";
    recommendationIssued: false;
    reference?: Record<Element, string[] | string>;
    boundary: string;
  }[];
  requiredChecks: string[];
  readyForNaming: false;
  sourceIds: string[];
  disclaimer: string;
}

/** 명리 세 관법과 성명학 방법을 분리해 검토 목록만 만든다. */
export function namingElements(input: SajuInput): NamingGuide {
  const chart = computeSajuChart(input);
  const judgment = evaluateMyeongriJudgment(chart);
  return {
    myeongriLenses: judgment.usefulGods.lenses.map((lens) => ({
      id: lens.id,
      school: lens.school,
      status: lens.status,
      candidateElements: [...lens.candidateElements],
      observations: [...lens.observations],
      sourceIds: [...lens.sourceIds]
    })),
    conflicts: [...judgment.usefulGods.conflicts],
    methodLayers: [
      {
        id: "phonetic_five_element",
        status: "lineage_unverified",
        recommendationIssued: false,
        reference: HANGUL_OHAENG,
        boundary: "초성 오행 배속은 성명학 계열마다 표와 적용 순서가 달라 이 표만으로 권장·회피 음을 정하지 않는다."
      },
      {
        id: "radical_resource_element",
        status: "lineage_unverified",
        recommendationIssued: false,
        reference: HANJA_BUSU_HINT,
        boundary: "부수와 자원오행의 연결은 유파 해석이며 법적 인명용 한자 여부나 글자의 뜻을 증명하지 않는다."
      },
      {
        id: "five_grid_suri",
        status: "requires_separate_calculation",
        recommendationIssued: false,
        boundary: "사용할 한자와 획수 자전을 확정한 뒤 별도 사격 산술을 수행한다. 길흉표를 합산 등급으로 만들지 않는다."
      }
    ],
    requiredChecks: [
      "대한민국 출생신고 허용 한자와 지정 음",
      "자형·동자·속자",
      "획수 자전과 산정법",
      "글자별 뜻과 이름 전체 의미",
      "성명 전체 발음·동음·사회적 사용성",
      "가족 항렬"
    ],
    readyForNaming: false,
    sourceIds: [...new Set([
      ...judgment.sourceIds,
      "kumazaki-unmei-no-shinpi-1930",
      "korean-family-registration-rule-article-37",
      "korean-efamily-name-hanja"
    ])],
    disclaimer: "[작명 관법 비교: 조후·격국·부억과 발음오행·자원오행·수리를 한 규칙으로 합치지 않는다. 현재 결과는 방법별 검토 자료이며 이름 추천이나 법적 사용 가능 판정이 아니다.]"
  };
}

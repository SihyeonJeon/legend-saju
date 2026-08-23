/**
 * 개운 요청을 관법별 행동 후보와 선택적 상징 대응으로 분리한다.
 * 상징표는 전통 대응 자료이며 행동의 원인이나 효과 근거가 아니다.
 */
import type { SajuInput, Element } from "./saju-engine";
import {
  buildMyeongriActionGuidanceForInput,
  serializeMyeongriActionGuidance,
  type MyeongriActionGuidance
} from "./myeongri-action-guidance";

export interface GaeunPrescription {
  actionGuidance: MyeongriActionGuidance;
  symbolicCandidateElements: { element: Element; lensIds: string[]; causalClaim: false }[];
  disclaimer: string;
}

function symbolicCandidates(guidance: MyeongriActionGuidance): GaeunPrescription["symbolicCandidateElements"] {
  const elements = [...new Set(guidance.lenses.flatMap((lens) => lens.candidateElements))];
  return elements.map((element) => ({
    element,
    lensIds: guidance.lenses.filter((lens) => lens.candidateElements.includes(element)).map((lens) => lens.id),
    causalClaim: false
  }));
}

export function gaeunPrescription(input: SajuInput, asOfYear = 2026): GaeunPrescription {
  const actionGuidance = buildMyeongriActionGuidanceForInput(input, asOfYear);
  return {
    actionGuidance,
    symbolicCandidateElements: symbolicCandidates(actionGuidance),
    disclaimer: "[관법별 행동 후보: 조후·격국·부억을 합치지 않고 현대 행동으로 번역한다. 행동 효과와 길흉을 보장하지 않는다.]"
  };
}

export function serializeGaeun(g: GaeunPrescription): string {
  return `${g.disclaimer}\n${serializeMyeongriActionGuidance(g.actionGuidance)}`;
}


// ===== 심화 개운(철학관 이상): 오행별 상세 비보(裨補)표 =====
export interface OhaengDetail { 색: string; 방위: string; 숫자: string; 맛: string; 음식: string; 향: string; 보석: string; 식물: string; 시간: string; 요일: string; 계절: string; 신체: string; 운동: string; 인테리어: string; 비보물: string; 감정: string; 직업: string }
export const OHAENG_GAEUN_DETAIL: Record<Element, OhaengDetail> = {"목": {"색": "청록·녹색", "방위": "동", "숫자": "3·8", "맛": "신맛", "음식": "푸른잎채소·신 과일·매실", "향": "우디·시트러스(소나무·레몬)", "보석": "에메랄드·녹옥(翡翠)", "식물": "관엽식물·대나무·난", "시간": "인묘시(03~07)", "요일": "목요일", "계절": "봄", "신체": "간·담·눈·근육·신경", "운동": "스트레칭·등산·요가", "인테리어": "원목가구·녹색식물·동쪽 창", "비보물": "화분·목재 소품·녹색 액세서리", "감정": "분노·짜증 조절", "직업": "교육·기획·출판·디자인·임업"}, "화": {"색": "적·자주", "방위": "남", "숫자": "2·7", "맛": "쓴맛", "음식": "붉은 음식(토마토·대추)·쓴 나물·커피", "향": "플로럴·시나몬", "보석": "루비·산호·가넷", "식물": "꽃 피는 식물·해바라기", "시간": "사오시(09~13)", "요일": "화요일", "계절": "여름", "신체": "심장·소장·혈액·혈압", "운동": "유산소·댄스·러닝", "인테리어": "밝은 조명·붉은 소품·남쪽", "비보물": "캔들·조명·붉은 액세서리", "감정": "조급·흥분 진정", "직업": "IT·방송·예술·요식·마케팅"}, "토": {"색": "황·베이지", "방위": "중앙", "숫자": "5·0", "맛": "단맛", "음식": "노란 음식(호박·기장·고구마)·곡물", "향": "머스크·앰버·흙내음", "보석": "황옥(黃玉)·호박·황수정", "식물": "다육·뿌리식물", "시간": "진술축미시(환절 토용)", "요일": "토요일", "계절": "환절기", "신체": "비장·위·소화기", "운동": "걷기·필라테스·등산", "인테리어": "도자기·황토색·낮고 안정된 가구", "비보물": "도자기·돌·노란 소품", "감정": "잡념·걱정 비우기", "직업": "부동산·중개·건축·관리·농업"}, "금": {"색": "백·금색", "방위": "서", "숫자": "4·9", "맛": "매운맛", "음식": "흰 음식(무·배·생강·마늘)·매운 것", "향": "미네랄·민트·메탈릭", "보석": "다이아·백금·수정·진주", "식물": "선인장·백색 꽃", "시간": "신유시(15~19)", "요일": "금요일", "계절": "가을", "신체": "폐·대장·피부·코·기관지", "운동": "헬스·복싱·웨이트", "인테리어": "금속 소품·화이트·서쪽", "비보물": "금속 장식·종(鐘)·백색 소품", "감정": "슬픔·집착 내려놓기", "직업": "금융·법조·의료·기계·군경"}, "수": {"색": "흑·남색", "방위": "북", "숫자": "1·6", "맛": "짠맛", "음식": "검은 음식(검은콩·김·해조)·견과", "향": "아쿠아·재스민·머린", "보석": "흑요석·진주·사파이어", "식물": "수경식물·연꽃", "시간": "해자시(21~01)", "요일": "수요일", "계절": "겨울", "신체": "신장·방광·귀·생식기·뼈", "운동": "수영·명상·필드워크", "인테리어": "어항·거울·검정 소품·북쪽", "비보물": "어항·물 그림·검정 소품", "감정": "불안·공포 다스리기", "직업": "무역·유통·수산·연구·유흥"}};

export interface SymbolicCorrespondence {
  element: Element;
  supportedByLensIds: string[];
  lensStatuses: string[];
  detail: OhaengDetail;
  evidenceRole: "cultural_correspondence";
  causalClaim: false;
}

export interface GaeunPro {
  actionGuidance: MyeongriActionGuidance;
  symbolicCorrespondences: SymbolicCorrespondence[];
  disclaimer: string;
}

/** 관법별 행동 후보에 전통 오행 상징표를 인과 근거와 분리해 덧붙인다. */
export function gaeunProDetail(input: SajuInput, asOfYear = 2026): GaeunPro {
  const actionGuidance = buildMyeongriActionGuidanceForInput(input, asOfYear);
  const candidates = symbolicCandidates(actionGuidance);
  return {
    actionGuidance,
    symbolicCorrespondences: candidates.map((candidate) => ({
      element: candidate.element,
      supportedByLensIds: candidate.lensIds,
      lensStatuses: actionGuidance.lenses.filter((lens) => candidate.lensIds.includes(lens.id)).map((lens) => lens.status),
      detail: OHAENG_GAEUN_DETAIL[candidate.element],
      evidenceRole: "cultural_correspondence",
      causalClaim: false
    })),
    disclaimer: "[심화 행동·상징 분리: 행동 후보는 관법별 기능의 현대 해석이고, 색·방위·향·물건은 선택 가능한 전통 대응표다. 어느 방향도 효과를 확정·보장하지 않는다.]"
  };
}

export function serializeGaeunPro(g: GaeunPro): string {
  const symbols = g.symbolicCorrespondences.map((item) =>
    `${item.element}[${item.supportedByLensIds.join("·") || "관법 보류"}]: 색 ${item.detail.색}, 방위 ${item.detail.방위}, 물건 ${item.detail.비보물}`
  ).join(" / ");
  return `${g.disclaimer}\n${serializeMyeongriActionGuidance(g.actionGuidance)}\n선택적 상징 대응(인과 근거 아님): ${symbols || "후보 없음"}`;
}

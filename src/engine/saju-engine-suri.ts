/**
 * 작명 연구 계산 경계.
 *
 * 입력 획수의 사격 산술, 특정 성명학 계열의 81수 해석표, 대한민국에서
 * 출생신고 이름에 쓸 수 있는 한자 여부는 서로 다른 자료다. 이 모듈은 세 층을
 * 합쳐 이름을 추천하지 않는다.
 */
import { computeSajuChart, type SajuInput, type Element } from "./saju-engine";
import { evaluateMyeongriJudgment, type UsefulGodLens } from "./myeongri-judgment";

export interface SuriEntry { fortune: string; name: string; meaning: string }
export const SURI_81: Record<string, SuriEntry> = {"1": {"fortune": "길", "name": "太初格·두령운", "meaning": "만물의 시작, 부귀명예 두령의 수"}, "2": {"fortune": "흉", "name": "分離格·분리운", "meaning": "분열·동요·좌절"}, "3": {"fortune": "길", "name": "名譽格·명예운", "meaning": "지달·복록·명예 성취"}, "4": {"fortune": "흉", "name": "破滅格·부정운", "meaning": "파괴·변동·곤고"}, "5": {"fortune": "길", "name": "成功格·정성운", "meaning": "음양화합 부귀번영"}, "6": {"fortune": "길", "name": "繼成格·계승운", "meaning": "조상덕·풍요·안태"}, "7": {"fortune": "길", "name": "獨立格·발달운", "meaning": "강건·독립·돌파"}, "8": {"fortune": "길", "name": "健暢格·전진운", "meaning": "의지·인내로 발전"}, "9": {"fortune": "흉", "name": "窮迫格·궁박운", "meaning": "재화·역경·불운"}, "10": {"fortune": "흉", "name": "空虛格·단명운", "meaning": "공허·종말·암흑"}, "11": {"fortune": "길", "name": "興家格·신성운", "meaning": "재흥·온건·번영"}, "12": {"fortune": "흉", "name": "薄弱格·박약운", "meaning": "박약·무력·고독"}, "13": {"fortune": "길", "name": "智謀格·지모운", "meaning": "지략·학문·통솔"}, "14": {"fortune": "흉", "name": "離散格·이산운", "meaning": "파괴·이별·실의"}, "15": {"fortune": "길", "name": "統率格·통솔운", "meaning": "덕망·인망·대성"}, "16": {"fortune": "길", "name": "德望格·덕망운", "meaning": "두령·신망·재부"}, "17": {"fortune": "길", "name": "健暢格·용진운", "meaning": "강건돌파·권위"}, "18": {"fortune": "길", "name": "發展格·발전운", "meaning": "의지관철·융창"}, "19": {"fortune": "흉", "name": "苦難格·고난운", "meaning": "재능있으나 좌절·병난"}, "20": {"fortune": "흉", "name": "虛妄格·허망운", "meaning": "공허·파란·단명"}, "21": {"fortune": "길", "name": "頭領格·자립운", "meaning": "두령·독립·존경"}, "22": {"fortune": "흉", "name": "中折格·중절운", "meaning": "중도좌절·박약"}, "23": {"fortune": "길", "name": "隆昌格·혁신운", "meaning": "융창·공명·발전"}, "24": {"fortune": "길", "name": "立身格·축재운", "meaning": "재략·축재·번영"}, "25": {"fortune": "길", "name": "健暢格·안전운", "meaning": "영민·재능·성공"}, "26": {"fortune": "흉반", "name": "變怪格·영웅운", "meaning": "파란만장·영웅 또는 변괴"}, "27": {"fortune": "흉반", "name": "中折格·중단운", "meaning": "중도좌절·비방"}, "28": {"fortune": "흉", "name": "破亂格·조난운", "meaning": "파란·조난·불화"}, "29": {"fortune": "길", "name": "成功格·성공운", "meaning": "지모·재력·성취"}, "30": {"fortune": "흉반", "name": "浮夢格·부몽운", "meaning": "길흉상반·투기"}, "31": {"fortune": "길", "name": "興盛格·융창운", "meaning": "지용겸비·대성"}, "32": {"fortune": "길", "name": "僥倖格·순풍운", "meaning": "요행·후원·성공"}, "33": {"fortune": "길", "name": "昇天格·등룡운", "meaning": "승천·왕성·과강(여성주의)"}, "34": {"fortune": "흉", "name": "破滅格·변란운", "meaning": "파멸·재화·파란"}, "35": {"fortune": "길", "name": "平安格·태평운", "meaning": "온화·평안·문예"}, "36": {"fortune": "흉", "name": "義俠格·파란운", "meaning": "의협·파란·풍파"}, "37": {"fortune": "길", "name": "仁德格·인덕운", "meaning": "충실·인덕·권위"}, "38": {"fortune": "반길", "name": "福壽格·문예운", "meaning": "문예·기예·평범한 성공"}, "39": {"fortune": "길", "name": "安樂格·부영운", "meaning": "권위·부귀·장수"}, "40": {"fortune": "흉반", "name": "無常格·변화운", "meaning": "지모있으나 투기·부침"}, "41": {"fortune": "길", "name": "大功格·고명운", "meaning": "덕망·실력·대성"}, "42": {"fortune": "흉", "name": "苦行格·고행운", "meaning": "박식하나 박약·고행"}, "43": {"fortune": "흉", "name": "散財格·산재운", "meaning": "외화내빈·산재"}, "44": {"fortune": "흉", "name": "魔障格·마장운", "meaning": "파괴·역경·재난"}, "45": {"fortune": "길", "name": "順風格·대지운", "meaning": "순조·통달·대성"}, "46": {"fortune": "흉", "name": "悲哀格·비애운", "meaning": "고난·박약·부침"}, "47": {"fortune": "길", "name": "出世格·전개운", "meaning": "천우·출세·번영"}, "48": {"fortune": "길", "name": "有德格·제중운", "meaning": "지덕겸비·고문"}, "49": {"fortune": "흉", "name": "變化格·은퇴운", "meaning": "길흉기로·변화"}, "50": {"fortune": "흉반", "name": "不和格·소실운", "meaning": "일성일패·말로불행"}, "51": {"fortune": "반", "name": "盛衰格·길흉운", "meaning": "성쇠교차·말운주의"}, "52": {"fortune": "길", "name": "躍進格·약진운", "meaning": "선견·약진·대성"}, "53": {"fortune": "흉", "name": "內憂格·장애운", "meaning": "외화내빈·전반후반차"}, "54": {"fortune": "흉", "name": "多難格·절망운", "meaning": "고독·신고·다난"}, "55": {"fortune": "흉반", "name": "不忍格·미달운", "meaning": "외길내흉·인내요"}, "56": {"fortune": "흉", "name": "浮沈格·부침운", "meaning": "의지박약·실패"}, "57": {"fortune": "길", "name": "努力格·노력운", "meaning": "곤란후 영달·강건"}, "58": {"fortune": "반길", "name": "後福格·후복운", "meaning": "선고후락·만년부귀"}, "59": {"fortune": "흉", "name": "失意格·실망운", "meaning": "무기력·역경·불운"}, "60": {"fortune": "흉", "name": "動搖格·암흑운", "meaning": "동요·암흑·재난"}, "61": {"fortune": "길", "name": "榮華格·재리운", "meaning": "명리쌍전·번영"}, "62": {"fortune": "흉", "name": "衰退格·고독운", "meaning": "내외불화·쇠퇴"}, "63": {"fortune": "길", "name": "順成格·발전운", "meaning": "순조·부귀·자손번창"}, "64": {"fortune": "흉", "name": "沈滯格·침체운", "meaning": "파멸·부침·고난"}, "65": {"fortune": "길", "name": "興家格·완미운", "meaning": "부귀장수·가운융창"}, "66": {"fortune": "흉", "name": "逆難格·진퇴운", "meaning": "내외불화·곤란"}, "67": {"fortune": "길", "name": "通達格·천복운", "meaning": "천부독립·번영"}, "68": {"fortune": "길", "name": "明智格·흥가운", "meaning": "지려·발명·창의성공"}, "69": {"fortune": "흉", "name": "停止格·정지운", "meaning": "불안·정체·병약·부진"}, "70": {"fortune": "흉", "name": "暗難格·공허운", "meaning": "공허·암흑·멸망"}, "71": {"fortune": "반", "name": "堅志格·견실운", "meaning": "견실하나 추진력부족"}, "72": {"fortune": "흉", "name": "相半格·후곤운", "meaning": "선길후흉·말로주의"}, "73": {"fortune": "길", "name": "平吉格·평복운", "meaning": "무난·평안·천복"}, "74": {"fortune": "흉", "name": "不交格·우매운", "meaning": "무능·번민·고독"}, "75": {"fortune": "반", "name": "退守格·정수운", "meaning": "수성길·진취흉"}, "76": {"fortune": "흉", "name": "離散格·후패운", "meaning": "파산·이별·신고"}, "77": {"fortune": "반", "name": "前吉格·불행운", "meaning": "전반길·후반흉"}, "78": {"fortune": "반", "name": "晩苦格·무력운", "meaning": "중년까지길·만년쇠"}, "79": {"fortune": "흉", "name": "不伸格·궁극운", "meaning": "무기력·궁핍·부진"}, "80": {"fortune": "흉", "name": "終結格·은둔운", "meaning": "파란·종결·은둔길"}, "81": {"fortune": "길", "name": "還元格·성대운", "meaning": "최극수 1로 환원, 부귀번영"}};
export const HANJA_NAMING: Record<string, { strokes: number; element: Element }> = {"木": {"strokes": 4, "element": "목"}, "林": {"strokes": 8, "element": "목"}, "森": {"strokes": 12, "element": "목"}, "植": {"strokes": 12, "element": "목"}, "榮": {"strokes": 14, "element": "목"}, "權": {"strokes": 22, "element": "목"}, "杰": {"strokes": 8, "element": "목"}, "東": {"strokes": 8, "element": "목"}, "松": {"strokes": 8, "element": "목"}, "柱": {"strokes": 9, "element": "목"}, "根": {"strokes": 10, "element": "목"}, "桓": {"strokes": 10, "element": "목"}, "梅": {"strokes": 11, "element": "목"}, "健": {"strokes": 11, "element": "목"}, "敬": {"strokes": 13, "element": "목"}, "楨": {"strokes": 13, "element": "목"}, "槿": {"strokes": 15, "element": "목"}, "樹": {"strokes": 16, "element": "목"}, "芸": {"strokes": 10, "element": "목"}, "花": {"strokes": 10, "element": "목"}, "英": {"strokes": 11, "element": "목"}, "茂": {"strokes": 11, "element": "목"}, "蓮": {"strokes": 17, "element": "목"}, "竹": {"strokes": 6, "element": "목"}, "和": {"strokes": 8, "element": "목"}, "火": {"strokes": 4, "element": "화"}, "炅": {"strokes": 8, "element": "화"}, "炫": {"strokes": 9, "element": "화"}, "昭": {"strokes": 9, "element": "화"}, "映": {"strokes": 9, "element": "화"}, "晙": {"strokes": 11, "element": "화"}, "晛": {"strokes": 11, "element": "화"}, "晟": {"strokes": 11, "element": "화"}, "晳": {"strokes": 12, "element": "화"}, "暎": {"strokes": 13, "element": "화"}, "煐": {"strokes": 13, "element": "화"}, "煜": {"strokes": 13, "element": "화"}, "熙": {"strokes": 13, "element": "화"}, "燦": {"strokes": 17, "element": "화"}, "燁": {"strokes": 16, "element": "화"}, "炳": {"strokes": 9, "element": "화"}, "丁": {"strokes": 2, "element": "화"}, "南": {"strokes": 9, "element": "화"}, "日": {"strokes": 4, "element": "화"}, "明": {"strokes": 8, "element": "화"}, "昊": {"strokes": 8, "element": "화"}, "旻": {"strokes": 8, "element": "화"}, "志": {"strokes": 7, "element": "화"}, "念": {"strokes": 8, "element": "화"}, "土": {"strokes": 3, "element": "토"}, "在": {"strokes": 6, "element": "토"}, "地": {"strokes": 6, "element": "토"}, "圭": {"strokes": 6, "element": "토"}, "城": {"strokes": 10, "element": "토"}, "基": {"strokes": 11, "element": "토"}, "培": {"strokes": 11, "element": "토"}, "執": {"strokes": 11, "element": "토"}, "堂": {"strokes": 11, "element": "토"}, "報": {"strokes": 12, "element": "토"}, "塤": {"strokes": 13, "element": "토"}, "墺": {"strokes": 16, "element": "토"}, "山": {"strokes": 3, "element": "토"}, "岩": {"strokes": 8, "element": "토"}, "峻": {"strokes": 10, "element": "토"}, "嵐": {"strokes": 12, "element": "토"}, "石": {"strokes": 5, "element": "토"}, "延": {"strokes": 7, "element": "토"}, "垠": {"strokes": 9, "element": "토"}, "宇": {"strokes": 6, "element": "토"}, "安": {"strokes": 6, "element": "토"}, "完": {"strokes": 7, "element": "토"}, "宙": {"strokes": 8, "element": "토"}, "容": {"strokes": 10, "element": "토"}, "金": {"strokes": 8, "element": "금"}, "鈞": {"strokes": 12, "element": "금"}, "鉉": {"strokes": 13, "element": "금"}, "銀": {"strokes": 14, "element": "금"}, "鋒": {"strokes": 15, "element": "금"}, "錫": {"strokes": 16, "element": "금"}, "鎬": {"strokes": 18, "element": "금"}, "鎭": {"strokes": 18, "element": "금"}, "鐘": {"strokes": 20, "element": "금"}, "鑫": {"strokes": 24, "element": "금"}, "玉": {"strokes": 5, "element": "금"}, "珍": {"strokes": 10, "element": "금"}, "珉": {"strokes": 10, "element": "금"}, "班": {"strokes": 11, "element": "금"}, "現": {"strokes": 12, "element": "금"}, "理": {"strokes": 12, "element": "금"}, "瑞": {"strokes": 14, "element": "금"}, "瑛": {"strokes": 14, "element": "금"}, "璇": {"strokes": 16, "element": "금"}, "鎰": {"strokes": 18, "element": "금"}, "瑢": {"strokes": 15, "element": "금"}, "剛": {"strokes": 10, "element": "금"}, "利": {"strokes": 7, "element": "금"}, "成": {"strokes": 7, "element": "금"}, "水": {"strokes": 4, "element": "수"}, "永": {"strokes": 5, "element": "수"}, "求": {"strokes": 7, "element": "수"}, "汝": {"strokes": 7, "element": "수"}, "沇": {"strokes": 8, "element": "수"}, "沅": {"strokes": 8, "element": "수"}, "洙": {"strokes": 10, "element": "수"}, "泰": {"strokes": 9, "element": "수"}, "海": {"strokes": 11, "element": "수"}, "浩": {"strokes": 11, "element": "수"}, "涉": {"strokes": 11, "element": "수"}, "淳": {"strokes": 12, "element": "수"}, "淵": {"strokes": 12, "element": "수"}, "湖": {"strokes": 13, "element": "수"}, "源": {"strokes": 14, "element": "수"}, "潤": {"strokes": 16, "element": "수"}, "澤": {"strokes": 17, "element": "수"}, "濟": {"strokes": 18, "element": "수"}, "雨": {"strokes": 8, "element": "수"}, "雲": {"strokes": 12, "element": "수"}, "霖": {"strokes": 16, "element": "수"}, "民": {"strokes": 5, "element": "수"}, "洪": {"strokes": 10, "element": "수"}, "潭": {"strokes": 16, "element": "수"}};

function reduce81(n: number): number {
  let result = n;
  while (result > 81) result -= 80;
  return result;
}

function lookSuri(n: number): { num: number; entry: SuriEntry } {
  const num = reduce81(n);
  return { num, entry: SURI_81[String(num)] };
}

const NUM_EL: Record<number, Element> = { 1: "목", 2: "목", 3: "화", 4: "화", 5: "토", 6: "토", 7: "금", 8: "금", 9: "수", 0: "수" };
const GEN: Record<Element, Element> = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };

function gyeokEl(n: number): Element {
  return NUM_EL[n % 10];
}

function validateStrokeArray(label: string, values: number[], maxLength: number): number[] {
  if (!Array.isArray(values) || values.length < 1 || values.length > maxLength) {
    throw new Error(`${label}_STROKE_COUNT_UNSUPPORTED`);
  }
  if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 81)) {
    throw new Error(`${label}_STROKE_VALUE_INVALID`);
  }
  return [...values];
}

export interface SuriTableInterpretation {
  fortune: string;
  name: string;
  meaning: string;
  status: "local_table_not_line_by_line_validated_against_primary_text";
  sourceIds: string[];
}

export interface SuriGyeok {
  id: "cheon" | "in" | "ji" | "oe" | "chong";
  name: string;
  strokes: number;
  suri: number;
  calculationStatus: "calculated_from_caller_supplied_strokes";
  interpretation: SuriTableInterpretation;
}

export interface SuriResult {
  surnameStrokes: number[];
  givenStrokes: number[];
  policy: {
    id: "kumazaki-five-grid-local-v2";
    lineage: "kumazaki_style_claim";
    strokeInput: "caller_supplied";
    strokeDictionary: "unspecified";
    formulaStatus: "primary_examples_validated_printed_pages_47_51";
    tableStatus: "local_table_not_line_by_line_validated_against_primary_text";
    formulas: Record<"cheon" | "in" | "ji" | "oe" | "chong", string>;
  };
  cheon: SuriGyeok;
  in_: SuriGyeok;
  ji: SuriGyeok;
  oe: SuriGyeok;
  chong: SuriGyeok;
  eumyang: {
    sequence: ("음" | "양")[];
    state: "mixed" | "uniform";
    observation: string;
    interpretationStatus: "lineage_interpretation";
  };
  samwon: {
    elements: { cheon: Element; in: Element; ji: Element };
    generationLinks: ("cheon_to_in" | "in_to_ji")[];
    observation: string;
    interpretationStatus: "lineage_interpretation";
  };
  aggregateVerdict: null;
  readyForNaming: false;
  sourceIds: string[];
  disclaimer: string;
}

/** 호출자가 넣은 획수로 사격·총격 산술을 수행하고 현지 해석표를 별도 층에 둔다. */
export function analyzeSuri(surnameStrokes: number[], givenStrokes: number[]): SuriResult {
  const s = validateStrokeArray("SURNAME", surnameStrokes, 2);
  const g = validateStrokeArray("GIVEN", givenStrokes, 2);
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  const virtualOne = (length: number) => (length === 1 ? 1 : 0);
  const cheonN = sum(s) + virtualOne(s.length);
  const inN = s[s.length - 1] + g[0];
  const jiN = sum(g) + virtualOne(g.length);
  const chongN = sum(s) + sum(g);
  const oeN = chongN - inN + virtualOne(s.length) + virtualOne(g.length);
  const mk = (id: SuriGyeok["id"], label: string, strokes: number): SuriGyeok => {
    const { num, entry } = lookSuri(strokes);
    return {
      id,
      name: label,
      strokes,
      suri: num,
      calculationStatus: "calculated_from_caller_supplied_strokes",
      interpretation: {
        fortune: entry.fortune,
        name: entry.name,
        meaning: entry.meaning,
        status: "local_table_not_line_by_line_validated_against_primary_text",
        sourceIds: ["kumazaki-unmei-no-shinpi-1930", "naming-table-audit"]
      }
    };
  };
  const cheon = mk("cheon", "천격", cheonN);
  const in_ = mk("in", "인격", inN);
  const ji = mk("ji", "지격", jiN);
  const oe = mk("oe", "외격", oeN);
  const chong = mk("chong", "총격", chongN);
  const sequence = [...s, ...g].map((value) => (value % 2 ? "양" as const : "음" as const));
  const state = new Set(sequence).size === 1 ? "uniform" as const : "mixed" as const;
  const elements = { cheon: gyeokEl(cheonN), in: gyeokEl(inN), ji: gyeokEl(jiN) };
  const generationLinks: SuriResult["samwon"]["generationLinks"] = [];
  if (GEN[elements.cheon] === elements.in) generationLinks.push("cheon_to_in");
  if (GEN[elements.in] === elements.ji) generationLinks.push("in_to_ji");
  return {
    surnameStrokes: s,
    givenStrokes: g,
    policy: {
      id: "kumazaki-five-grid-local-v2",
      lineage: "kumazaki_style_claim",
      strokeInput: "caller_supplied",
      strokeDictionary: "unspecified",
      formulaStatus: "primary_examples_validated_printed_pages_47_51",
      tableStatus: "local_table_not_line_by_line_validated_against_primary_text",
      formulas: {
        cheon: "성 획수 합 + 단성 가상 1",
        in: "성의 끝 글자 + 이름의 첫 글자",
        ji: "이름 획수 합 + 외자 이름 가상 1",
        oe: "총격 - 인격 + 단성 가상 1 + 외자 이름 가상 1",
        chong: "성명 전체 획수 합"
      }
    },
    cheon,
    in_,
    ji,
    oe,
    chong,
    eumyang: {
      sequence,
      state,
      observation: state === "mixed" ? `홀짝 혼재(${sequence.join("")})` : `홀짝 단일(${sequence[0]})`,
      interpretationStatus: "lineage_interpretation"
    },
    samwon: {
      elements,
      generationLinks,
      observation: `천${elements.cheon}·인${elements.in}·지${elements.ji}; 상생 연결 ${generationLinks.length}개`,
      interpretationStatus: "lineage_interpretation"
    },
    aggregateVerdict: null,
    readyForNaming: false,
    sourceIds: ["kumazaki-unmei-no-shinpi-1930", "naming-table-audit"],
    disclaimer: "[수리 작명 연구: 다섯 격 산술은 구마사키 1930년 원전 47~51쪽의 예시와 대조했다. 81수 현지 한국어 표는 원전 66~81쪽에서 위치만 확인했고 행별 번역·계보 대조와 획수 자전 지정이 남아 있어 길흉 등급이나 개명 판단을 내리지 않는다.]"
  };
}

export interface NamingMyeongriLens {
  id: UsefulGodLens["id"];
  school: string;
  status: UsefulGodLens["status"];
  candidateElements: Element[];
  observations: string[];
  sourceIds: string[];
}

export interface NamingHanjaResearchCandidate {
  char: string;
  localStrokeClaim: number;
  localElementClaim: Element;
  localClaimStatus: "unverified_reference_subset";
  legalEligibility: "unverified";
  officialReading: "unverified";
  variantStatus: "unverified";
  meaning: "unverified";
  strokePolicy: "local_original_form_claim_unverified";
}

export interface NamingHanjaResearchResult {
  myeongriLenses: NamingMyeongriLens[];
  conflicts: string[];
  researchCandidatesByElement: { element: Element; candidates: NamingHanjaResearchCandidate[] }[];
  candidateSetStatus: "research_only_unverified";
  readyForNaming: false;
  officialVerification: {
    legalRuleSourceId: "korean-family-registration-rule-article-37";
    lookupSourceId: "korean-efamily-name-hanja";
    requiredChecks: string[];
  };
  sourceIds: string[];
  disclaimer: string;
}

/** 세 명리 관법의 후보를 보존하고, 현지 한자 subset은 검증 전 연구 후보로만 돌려준다. */
export function suggestNamingHanja(input: SajuInput, limitPer = 8): NamingHanjaResearchResult {
  const chart = computeSajuChart(input);
  const judgment = evaluateMyeongriJudgment(chart);
  const myeongriLenses = judgment.usefulGods.lenses.map((lens) => ({
    id: lens.id,
    school: lens.school,
    status: lens.status,
    candidateElements: [...lens.candidateElements],
    observations: [...lens.observations],
    sourceIds: [...lens.sourceIds]
  }));
  const candidateElements = [...new Set(myeongriLenses.flatMap((lens) => lens.candidateElements))];
  const safeLimit = Math.max(0, Math.min(20, Math.trunc(limitPer)));
  const researchCandidatesByElement = candidateElements.map((element) => ({
    element,
    candidates: Object.entries(HANJA_NAMING)
      .filter(([, value]) => value.element === element)
      .slice(0, safeLimit)
      .map(([char, value]) => ({
        char,
        localStrokeClaim: value.strokes,
        localElementClaim: value.element,
        localClaimStatus: "unverified_reference_subset" as const,
        legalEligibility: "unverified" as const,
        officialReading: "unverified" as const,
        variantStatus: "unverified" as const,
        meaning: "unverified" as const,
        strokePolicy: "local_original_form_claim_unverified" as const
      }))
  }));
  return {
    myeongriLenses,
    conflicts: [...judgment.usefulGods.conflicts],
    researchCandidatesByElement,
    candidateSetStatus: "research_only_unverified",
    readyForNaming: false,
    officialVerification: {
      legalRuleSourceId: "korean-family-registration-rule-article-37",
      lookupSourceId: "korean-efamily-name-hanja",
      requiredChecks: [
        "대법원 전자가족관계등록시스템의 지정 음과 한자 일치",
        "허용된 자형·동자·속자 여부",
        "사용할 자전과 획수 산정법 고정",
        "글자 뜻과 이름 전체 의미",
        "성명 전체 발음과 동음·놀림 가능성",
        "가족 항렬과 실제 사용성"
      ]
    },
    sourceIds: [...new Set([
      ...judgment.sourceIds,
      "korean-family-registration-rule-article-37",
      "korean-efamily-name-hanja",
      "naming-table-audit"
    ])],
    disclaimer: "[한자 작명 연구: 명리 관법 세 갈래를 합산하지 않는다. 표시된 글자는 법적 사용 여부·지정 음·자형·뜻·획수를 검증하지 않은 현지 연구 후보라서 이름 추천이나 출생신고 가능 판정으로 쓸 수 없다.]"
  };
}

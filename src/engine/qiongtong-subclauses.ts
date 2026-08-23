/**
 * 窮通寶鑑의 월령 본문에 붙은 명시적 하위 조건.
 *
 * 고전의 신분·부귀·질병 결과문은 옮기지 않고, 재현할 수 있는 전제와
 * 조후 구조의 변화만 실행한다. 추출한 문장에 없는 조건은 만들지 않는다.
 */
import type { SajuChart } from "./saju-engine";

export type QiongtongFrame = "wood" | "fire" | "metal" | "water";
export type QiongtongSubclausePredicate =
  | { kind: "branch_frame"; frame: QiongtongFrame }
  | { kind: "all_visible"; stems: string[] }
  | { kind: "any_visible"; stems: string[] }
  | { kind: "none_visible"; stems: string[] }
  | { kind: "min_visible_count"; stems: string[]; minimum: number }
  | { kind: "rooted_visible"; stem: string }
  | { kind: "all_branches"; branches: string[] };

export interface QiongtongSubclauseRule {
  id: string;
  dayStem: string;
  monthBranches: string[];
  predicates: QiongtongSubclausePredicate[];
  classicalPattern: string;
  normalizedReading: string;
  section: string;
  sourceNote: string;
}

export interface QiongtongSubclauseMatch {
  ruleId: string;
  classicalPattern: string;
  normalizedReading: string;
  predicateFindings: string[];
  section: string;
  sourceNote: string;
}

const SEASONS = {
  spring: ["寅", "卯", "辰"],
  summer: ["巳", "午", "未"],
  autumn: ["申", "酉", "戌"],
  winter: ["亥", "子", "丑"]
} as const;

const FRAME_BRANCHES: Record<QiongtongFrame, string[]> = {
  wood: ["亥", "卯", "未"],
  fire: ["寅", "午", "戌"],
  metal: ["巳", "酉", "丑"],
  water: ["申", "子", "辰"]
};

const r = (
  id: string,
  dayStem: string,
  monthBranches: readonly string[],
  predicates: QiongtongSubclausePredicate[],
  classicalPattern: string,
  normalizedReading: string,
  section: string,
  sourceNote: string
): QiongtongSubclauseRule => ({ id, dayStem, monthBranches: [...monthBranches], predicates, classicalPattern, normalizedReading, section, sourceNote });

const frame = (value: QiongtongFrame): QiongtongSubclausePredicate => ({ kind: "branch_frame", frame: value });
const allVisible = (...stems: string[]): QiongtongSubclausePredicate => ({ kind: "all_visible", stems });
const anyVisible = (...stems: string[]): QiongtongSubclausePredicate => ({ kind: "any_visible", stems });
const noneVisible = (...stems: string[]): QiongtongSubclausePredicate => ({ kind: "none_visible", stems });
const minVisible = (minimum: number, ...stems: string[]): QiongtongSubclausePredicate => ({ kind: "min_visible_count", stems, minimum });
const rootedVisible = (stem: string): QiongtongSubclausePredicate => ({ kind: "rooted_visible", stem });
const allBranches = (...branches: string[]): QiongtongSubclausePredicate => ({ kind: "all_branches", branches });

export const QIONGTONG_SUBCLAUSE_RULES: QiongtongSubclauseRule[] = [
  r("QTB-SUB-JIA-SPRING-METAL-NO-FIRE", "甲", SEASONS.spring, [frame("metal"), anyVisible("庚", "辛"), noneVisible("丙", "丁")], "목피금상 조건", "금국과 금의 투출은 성립했으나 이를 조절할 화가 천간에 없어 금의 과다 작용을 우선 대조한다.", "삼춘갑목", "지성금국·다투경신·무병정 파금"),
  r("QTB-SUB-JIA-SPRING-FIRE-FRAME", "甲", SEASONS.spring, [frame("fire")], "화국 설기 과다", "화국이 완성되어 갑목의 설기가 커지는 분기로 들어간다.", "삼춘갑목", "지성화국·설로태과"),
  r("QTB-SUB-JIA-SPRING-WOOD-NO-GENG", "甲", SEASONS.spring, [frame("wood"), noneVisible("庚")], "목국 무경", "목국이 완성됐으나 경금이 천간에 없어 왕한 목을 다듬는 조건이 비어 있다.", "삼춘갑목", "지성목국·득경위귀·무경별론"),
  r("QTB-SUB-JIA-SPRING-WATER-WU", "甲", SEASONS.spring, [frame("water"), allVisible("戊")], "수국 무토 제수", "수국에 무토가 투출해 수다를 제어하는 하위 조건이 성립한다.", "삼춘갑목", "지성수국·무투제수"),
  r("QTB-SUB-JIA-SUMMER-GUI-DING-GENG", "甲", SEASONS.summer, [allVisible("癸", "丁", "庚")], "계정경 제투", "계수·정화·경금이 모두 투출한 여름 갑목의 수분·발현·재목 조건을 함께 본다.", "삼하갑목", "계정여경제투천간"),
  r("QTB-SUB-JIA-WINTER-WATER-REN", "甲", SEASONS.winter, [frame("water"), allVisible("壬")], "수범목부", "수국에 임수까지 투출해 물이 목을 띄우는 과다 분기를 우선 확인한다.", "삼동갑목", "지성수국·임투·수범목부"),

  r("QTB-SUB-YI-SPRING-WOOD-GUI-BING", "乙", SEASONS.spring, [frame("wood"), allVisible("癸", "丙")], "목국 계병 병용", "목국에 계수 자양과 병화 설기가 함께 드러난 분기다.", "삼춘을목", "지성목국·계투·병설목기"),
  r("QTB-SUB-YI-SUMMER-FIRE-REN-NO-GUI", "乙", SEASONS.summer, [frame("fire"), noneVisible("癸"), allVisible("壬")], "화국 임수 대체", "화국에서 계수가 보이지 않지만 임수가 투출해 건조를 완화하는 대체 조건을 확인한다.", "삼하을목", "지성화국·무계·견임가해"),
  r("QTB-SUB-YI-WEI-WATER-GUI", "乙", ["未"], [frame("water"), allVisible("癸")], "미월 수국 계투", "미월 을목이 수국을 이루고 계수가 투출해 수원 조건이 확보된 분기다.", "삼하을목·유월", "지성수국·계수투간"),
  r("QTB-SUB-YI-AUTUMN-METAL-NO-DING", "乙", SEASONS.autumn, [frame("metal"), noneVisible("丁")], "금국 무정", "금국이 완성됐으나 정화가 천간에 없어 금의 과다 작용을 제어하는 조건이 비어 있다.", "삼추을목", "지성금국·의암장정·무정별론"),
  r("QTB-SUB-YI-WINTER-WATER-COLD", "乙", SEASONS.winter, [frame("water"), anyVisible("壬", "癸"), noneVisible("丙", "丁")], "한수 무화", "수국과 수의 투출이 겹치고 화가 보이지 않아 해동 조건이 비어 있는 분기다.", "삼동을목", "수국·임계투·병정전무"),
  r("QTB-SUB-YI-WINTER-WOOD-WU-BING", "乙", SEASONS.winter, [frame("wood"), allVisible("癸", "戊", "丙")], "동목 무병계 병용", "겨울 목국에 계수·무토·병화가 함께 투출해 자양·제수·해동을 함께 검토한다.", "삼동을목", "지성목국·계출·무위존·병투"),

  r("QTB-SUB-BING-SPRING-FIRE-REN", "丙", SEASONS.spring, [frame("fire"), allVisible("壬")], "춘병 화국 임수", "화국에 임수가 투출해 과열을 비추고 조절하는 조건이 성립한다.", "삼춘병화", "지성화국·전취임수"),
  r("QTB-SUB-BING-SPRING-FIRE-NO-WATER", "丙", SEASONS.spring, [frame("fire"), noneVisible("壬", "癸")], "춘병 화국 무수", "화국이 완성됐으나 임계수가 천간에 없어 제염 조건이 비어 있다.", "삼춘병화", "화국·임계구무"),
  r("QTB-SUB-BING-SUMMER-FIRE-NO-WATER", "丙", SEASONS.summer, [frame("fire"), noneVisible("壬", "癸")], "하병 화국 무수", "여름 화국에 수가 드러나지 않아 과열 분기로 들어간다.", "삼하병화", "성화국·불견적수"),
  r("QTB-SUB-BING-SUMMER-EARTH-REN-JIA", "丙", SEASONS.summer, [allBranches("辰", "戌", "丑", "未"), allVisible("壬", "甲")], "토국 임갑 구응", "사고 토가 모두 있고 임수·갑목이 투출해 설기 과다를 조절하는 조건을 함께 본다.", "삼하병화", "성토국·득임자갑출간"),
  r("QTB-SUB-BING-YOU-METAL-XIN-NO-PEER", "丙", ["酉"], [frame("metal"), allVisible("辛"), noneVisible("丁")], "유월 금국 신투", "유월 금국에 신금이 투출하고 정화가 없어 재성 쪽으로 크게 기우는 분기를 확인한다.", "삼추병화·팔월", "성금국·신출간·불견비겁"),
  r("QTB-SUB-BING-XU-FIRE", "丙", ["戌"], [frame("fire")], "술월 염상실시", "술월 화국은 계절상 화의 때가 지나 과열을 그대로 강점으로 보지 않는 예외다.", "삼추병화·구월", "지성화국·염상실시"),

  r("QTB-SUB-DING-SPRING-WOOD-GENG", "丁", SEASONS.spring, [frame("wood"), allVisible("庚")], "목국 경금 벽갑", "목국에 경금이 투출해 습목을 다듬고 정화를 잇는 조건을 확인한다.", "삼춘정화", "지성목국·유경투"),
  r("QTB-SUB-DING-SPRING-WATER-WU-JI", "丁", SEASONS.spring, [frame("water"), allVisible("壬"), allVisible("戊", "己")], "수국 무기 제수", "수국과 임수 투출에 무기토가 함께 드러나 수의 과다를 제어하는 조건이 성립한다.", "삼춘정화", "지성수국·임투·무기양투"),
  r("QTB-SUB-DING-SUMMER-FIRE-GENG-REN", "丁", SEASONS.summer, [frame("fire"), allVisible("庚", "壬")], "화국 경임 병용", "화국에 경금과 임수가 함께 투출해 연료 구조와 제염을 함께 본다.", "삼하정화", "지성화국·경임양투"),
  r("QTB-SUB-DING-SUMMER-WATER-JIA", "丁", SEASONS.summer, [frame("water"), anyVisible("壬", "癸"), allVisible("甲")], "수국 갑목 인화", "수국에서 갑목이 투출해 젖은 목과 불씨의 연결 가능성을 확인한다.", "삼하정화", "지성수국·수투·유갑"),
  r("QTB-SUB-DING-YOU-XIN-FOLLOW-WEALTH", "丁", ["酉"], [minVisible(2, "辛"), noneVisible("庚")], "유월 신금 편중", "유월에 신금이 반복 투출하고 경금이 보이지 않아 재성 편중 예외를 별도로 본다.", "삼추정화·팔월", "일파신금·불견경금"),
  r("QTB-SUB-DING-XU-EARTH-NO-JIA", "丁", ["戌"], [minVisible(2, "戊"), noneVisible("甲")], "술월 토설 무갑", "술월에 무토 설기가 거듭되고 갑목이 없어 불씨를 잇는 조건이 비어 있다.", "삼추정화·구월", "일파무토·불견갑목"),

  r("QTB-SUB-WU-SPRING-FIRE-GUI", "戊", SEASONS.spring, [frame("fire"), allVisible("癸")], "춘무 화국 계투", "화국에 계수가 투출해 봄 무토의 건조를 조절하는 조건이 성립한다.", "삼춘무토", "지성화국·득계투"),
  r("QTB-SUB-WU-SPRING-WOOD-GENG", "戊", SEASONS.spring, [frame("wood"), anyVisible("甲", "乙"), allVisible("庚")], "목국 경금 제목", "목국과 목의 투출에 경금이 드러나 관살 과다를 정리하는 조건을 본다.", "삼춘무토", "지성목국·갑을출간·득경"),
  r("QTB-SUB-WU-SUMMER-FIRE-REN", "戊", SEASONS.summer, [frame("fire"), allVisible("壬")], "하무 화국 임투", "여름 화국에 임수가 투출해 큰 열을 식히는 조건을 확인한다.", "삼하무토", "지성화국·득임출간"),
  r("QTB-SUB-WU-AUTUMN-WATER-JIA", "戊", SEASONS.autumn, [frame("water"), allVisible("甲")], "추무 수국 갑설", "가을 수국에 갑목이 투출해 많은 물을 소통시키는 조건이 성립한다.", "삼추무토", "지성수국·의취갑설"),
  r("QTB-SUB-WU-XU-FIRE", "戊", ["戌"], [frame("fire")], "술월 토조", "술월 화국은 토의 건조를 키우므로 조후상 별도 과열 분기로 처리한다.", "삼추무토·구월", "지성화국·명토조"),
  r("QTB-SUB-WU-WINTER-REN-NO-PEER", "戊", SEASONS.winter, [minVisible(2, "壬"), noneVisible("己")], "동무 임수 편중", "겨울 임수가 반복 투출하고 기토 비겁이 보이지 않아 수다 분기를 별도 확인한다.", "삼동무토", "일파임수·불견비겁"),

  r("QTB-SUB-JI-SPRING-WOOD-GENG", "己", SEASONS.spring, [frame("wood"), allVisible("庚")], "춘기 목국 경투", "목국에 경금이 투출해 많은 목을 정리하는 조건이 성립한다.", "삼춘기토", "지성목국·경투"),
  r("QTB-SUB-JI-SUMMER-BING-GUI-XIN", "己", SEASONS.summer, [allVisible("丙", "癸", "辛")], "수화기제", "병화·계수가 함께 투출하고 신금이 계수의 근원을 돕는 삼하기토의 명시 조건이다.", "삼하기토", "병계양투·신금생계"),
  r("QTB-SUB-JI-SUMMER-FIRE-NO-WATER", "己", SEASONS.summer, [frame("fire"), noneVisible("壬", "癸")], "하전 무수", "여름 화국에 임계수가 천간에 없어 전답을 적시는 조건이 비어 있다.", "삼하기토", "화국·임계불투"),
  r("QTB-SUB-JI-AUTUMN-METAL-GUI-ROOT", "己", SEASONS.autumn, [frame("metal"), rootedVisible("癸")], "추기 금국 계근", "금국에서 계수가 투출하고 지장간에도 뿌리를 두어 금의 설기와 수분 조건이 연결된다.", "삼추기토", "지성금국·계투유근"),
  r("QTB-SUB-JI-YOU-METAL-NO-FIRE", "己", ["酉"], [frame("metal"), noneVisible("丙", "丁")], "유월 금국 무화", "유월 금국에 병정화가 드러나지 않아 추위를 덥히고 금을 조절하는 조건이 비어 있다.", "삼추기토·팔월", "지성금국·무병정출구"),
  r("QTB-SUB-JI-XU-FOUR-STORES-JIA", "己", ["戌"], [allBranches("辰", "戌", "丑", "未"), allVisible("甲")], "사고 갑투", "사고가 모두 놓이고 갑목이 투출해 두꺼운 토를 소통시키는 조건이 성립한다.", "삼추기토·구월", "지사고·갑투"),
  r("QTB-SUB-JI-WINTER-EARTH-JIA", "己", SEASONS.winter, [minVisible(2, "戊", "己"), allVisible("甲")], "동기 토중 갑소", "겨울 무기토가 겹칠 때 갑목이 투출해 흙을 소통시키는 조건을 본다.", "삼동기토", "일파무기·취갑제지"),

  r("QTB-SUB-GENG-SPRING-FIRE-REN-ROOT", "庚", SEASONS.spring, [frame("fire"), rootedVisible("壬")], "춘경 화국 임근", "화국에 뿌리 둔 임수가 투출해 제열 조건이 안정적으로 연결된다.", "삼춘경금", "지성화국·임투유근"),
  r("QTB-SUB-GENG-CHEN-EARTH-NO-WOOD", "庚", ["辰"], [allBranches("辰", "戌", "丑", "未"), noneVisible("甲", "乙")], "진월 토국 무목", "진월 사고 토가 모두 놓이고 갑을목이 없어 매금된 토를 소통시키는 조건이 비어 있다.", "삼춘경금·삼월", "지성토국·무목"),
  r("QTB-SUB-GENG-SUMMER-METAL-DING", "庚", SEASONS.summer, [frame("metal"), allVisible("丁")], "하경 금국 정련", "금국으로 신강해진 경금에 정화가 투출해 제련 조건이 성립한다.", "삼하경금", "지성금국·용정·정투위길"),
  r("QTB-SUB-GENG-SUMMER-FIRE-WATER", "庚", SEASONS.summer, [frame("fire"), anyVisible("壬", "癸")], "하경 화국 유수", "화국에 임계수가 투출해 화의 과다를 제어하는 조건을 확인한다.", "삼하경금", "지성화국·유임계제"),
  r("QTB-SUB-GENG-AUTUMN-WATER-JIA", "庚", SEASONS.autumn, [frame("water"), allVisible("甲")], "추경 수국 갑인", "수국에서 갑목이 투출해 정화 연료와 금수 유통의 연결을 확인한다.", "삼추경금", "지성수국·견갑인정"),
  r("QTB-SUB-GENG-WINTER-METAL-NO-FIRE", "庚", SEASONS.winter, [frame("metal"), noneVisible("丙", "丁")], "수랭금한", "겨울 금국에 병정화가 천간에 없어 해동·제련 조건이 비어 있다.", "삼동경금", "지성금국·무화·수랭금한"),

  r("QTB-SUB-XIN-SPRING-FIRE-GENG-REN", "辛", SEASONS.spring, [frame("fire"), allVisible("庚", "壬")], "춘신 화국 경임", "화국에 경금·임수가 함께 투출해 금의 보강과 제열 조건이 성립한다.", "삼춘신금", "지성화국·경임양투"),
  r("QTB-SUB-XIN-SPRING-WATER-BING", "辛", SEASONS.spring, [frame("water"), allVisible("丙")], "금약침한 해동", "수국에 병화가 투출해 차가운 금수를 덥히는 조건을 확인한다.", "삼춘신금", "지성수국·득병조난"),
  r("QTB-SUB-XIN-SI-METAL-WATER-WOOD", "辛", ["巳"], [frame("metal"), anyVisible("壬", "癸"), anyVisible("甲", "乙")], "사월 금국 수목 통관", "사월 금국에 수와 목이 함께 투출해 세척과 토 제어 조건을 연결한다.", "삼하신금·사월", "지성금국·수투·유목제무"),
  r("QTB-SUB-XIN-SUMMER-FIRE-WATER", "辛", SEASONS.summer, [frame("fire"), anyVisible("壬", "癸")], "하신 화국 유제", "화국에 임계수가 투출해 화의 과다를 제어하는 분기다.", "삼하신금", "지성화국·유제자"),
  r("QTB-SUB-XIN-AUTUMN-METAL-REN", "辛", SEASONS.autumn, [frame("metal"), allVisible("壬")], "추신 금국 임도", "금국에 임수가 투출해 왕한 금을 씻고 유통시키는 조건이 성립한다.", "삼추신금", "지성금국·일임고투"),
  r("QTB-SUB-XIN-WINTER-WATER-GUI-WU", "辛", SEASONS.winter, [frame("water"), allVisible("癸"), minVisible(2, "戊")], "동신 수국 이무", "수국에 계수가 투출하고 무토가 두 번 이상 드러나 물의 과다를 제어하는 조건을 본다.", "삼동신금", "지성수국·계출간·유이무제"),

  r("QTB-SUB-REN-SPRING-FIRE", "壬", SEASONS.spring, [frame("fire")], "춘임 화국 실시", "봄 임수의 화국은 계절상 완전한 종화로 곧바로 처리하지 않고 조후 불균형을 따로 본다.", "삼춘임수", "지성화국·석불봉시"),
  r("QTB-SUB-REN-SPRING-WOOD-GENG", "壬", SEASONS.spring, [frame("wood"), allVisible("庚")], "춘임 목국 경원", "목국에 경금이 투출해 설기된 임수의 근원을 보강하는 조건이 성립한다.", "삼춘임수", "지성목국·유경투"),
  r("QTB-SUB-REN-SUMMER-WATER", "壬", SEASONS.summer, [frame("water")], "하임 수국", "여름 수국이 완성되어 마른 계절에도 임수의 세력이 크게 달라지는 분기다.", "삼하임수", "지성수국"),
  r("QTB-SUB-REN-SUMMER-FIRE-NO-METAL-WATER", "壬", SEASONS.summer, [frame("fire"), noneVisible("庚", "辛", "壬", "癸")], "재다신약 조건", "화국인데 금수 보강이 천간에 없어 재성 과다와 일간 소모를 먼저 본다.", "삼하임수", "지성화국·전무금수"),
  r("QTB-SUB-REN-AUTUMN-WU-JIA", "壬", SEASONS.autumn, [minVisible(2, "戊"), allVisible("甲")], "다무 일갑", "무토가 반복 투출할 때 갑목 하나가 제방을 소통시키는 조건을 확인한다.", "삼추임수", "무다이투·득일갑제"),
  r("QTB-SUB-REN-WINTER-WOOD-GENG", "壬", SEASONS.winter, [frame("wood"), anyVisible("甲", "乙"), allVisible("庚")], "동임 목국 경원", "목국과 목의 투출로 설기가 커질 때 경금이 수원을 보강하는 조건이 성립한다.", "삼동임수", "지성목국·갑을출간·득경투"),
  r("QTB-SUB-REN-WINTER-WATER-NO-EARTH", "壬", SEASONS.winter, [frame("water"), noneVisible("戊", "己")], "윤하 무제", "겨울 수국에 무기토가 천간에 없어 물을 거두는 조건이 비어 있는 윤하 분기다.", "삼동임수", "지성수국·불견무기"),

  r("QTB-SUB-GUI-SPRING-FIRE-REN", "癸", SEASONS.spring, [frame("fire"), allVisible("壬")], "춘계 화국 임구신", "화국에서 임수가 투출해 손상된 수원을 돕는 조건을 확인한다.", "삼춘계수", "지성화국·유임출구"),
  r("QTB-SUB-GUI-SPRING-WATER-BING-NO-REN", "癸", SEASONS.spring, [frame("water"), allVisible("丙"), noneVisible("壬")], "춘계 수국 병난", "수국에 병화가 투출하고 임수가 더 겹치지 않아 온기 조건을 확인할 수 있다.", "삼춘계수", "지성수국·의유병투·무임"),
  r("QTB-SUB-GUI-SPRING-WOOD", "癸", SEASONS.spring, [frame("wood")], "목국 설수", "목국이 완성되어 계수의 설기가 커지는 분기로 들어간다.", "삼춘계수", "지성목국·설수태과"),
  r("QTB-SUB-GUI-SUMMER-FIRE-NO-REN", "癸", SEASONS.summer, [frame("fire"), noneVisible("壬")], "하계 화국 무임", "여름 화국에 임수가 투출하지 않아 큰 불을 제어하는 조건이 비어 있다.", "삼하계수", "지성화국·무임출간"),
  r("QTB-SUB-GUI-SUMMER-JI-NO-JIA", "癸", SEASONS.summer, [minVisible(2, "己"), noneVisible("甲")], "기토 편중 무갑", "기토가 반복 투출하고 갑목이 없어 토의 압박을 소통시키는 조건이 비어 있다.", "삼하계수", "일파기토·무갑출제"),
  r("QTB-SUB-GUI-WINTER-WOOD-DING", "癸", SEASONS.winter, [frame("wood"), allVisible("丁")], "동계 목국 정투", "목국에 정화가 투출해 설기된 목이 화로 이어지는 분기다.", "삼동계수", "지성목국·유정출간"),
  r("QTB-SUB-GUI-ZI-WATER-BING", "癸", ["子"], [frame("water"), minVisible(2, "丙")], "자월 수국 중병", "자월 수국에 병화가 반복 투출해 해동 조건이 강하게 드러난다.", "삼동계수·십일월", "지성수국·득병화중출"),
  r("QTB-SUB-GUI-CHOU-METAL-BING-ROOT", "癸", ["丑"], [frame("metal"), rootedVisible("丙")], "금온수난", "축월 금국에 병화가 투출하고 뿌리까지 두어 금수 해동 조건이 성립한다.", "삼동계수·십이월", "지성금국·병투득지·금온수난"),
  r("QTB-SUB-GUI-CHOU-FIRE-METAL", "癸", ["丑"], [frame("fire"), anyVisible("庚", "辛")], "화국 유금원", "축월 화국에 경신금이 투출해 계수의 근원을 보강하는 조건을 확인한다.", "삼동계수·십이월", "지성화국·유경신투"),
  r("QTB-SUB-GUI-CHOU-WOOD-METAL", "癸", ["丑"], [frame("wood"), anyVisible("庚", "辛")], "목국 금원 구응", "축월 목국으로 설기가 커질 때 경신금이 투출해 수원을 돕는 조건이 성립한다.", "삼동계수·십이월", "지성목국·득금출간보구")
];

function chartFacts(chart: SajuChart) {
  const pillars = Object.values(chart.pillars);
  const visible = pillars.map((pillar) => pillar.gan);
  const hidden = pillars.flatMap((pillar) => pillar.hideGan);
  const branches = pillars.map((pillar) => pillar.zhi);
  return { visible, hidden, branches, present: new Set([...visible, ...hidden]) };
}

function evaluatePredicate(
  predicate: QiongtongSubclausePredicate,
  facts: ReturnType<typeof chartFacts>
): { matched: boolean; finding: string } {
  switch (predicate.kind) {
    case "branch_frame": {
      const needed = FRAME_BRANCHES[predicate.frame];
      const matched = needed.every((branch) => facts.branches.includes(branch));
      return { matched, finding: `${predicate.frame}국 ${matched ? "성립" : "불성립"}(${needed.join("·")})` };
    }
    case "all_visible": {
      const matched = predicate.stems.every((stem) => facts.visible.includes(stem));
      return { matched, finding: `${predicate.stems.join("·")} 전부 투출 ${matched ? "예" : "아니오"}` };
    }
    case "any_visible": {
      const found = predicate.stems.filter((stem) => facts.visible.includes(stem));
      return { matched: found.length > 0, finding: `${predicate.stems.join("·")} 중 투출 ${found.join("·") || "없음"}` };
    }
    case "none_visible": {
      const found = predicate.stems.filter((stem) => facts.visible.includes(stem));
      return { matched: found.length === 0, finding: `${predicate.stems.join("·")} 투출 부재 ${found.length ? `아니오(${found.join("·")})` : "예"}` };
    }
    case "min_visible_count": {
      const count = facts.visible.filter((stem) => predicate.stems.includes(stem)).length;
      return { matched: count >= predicate.minimum, finding: `${predicate.stems.join("·")} 투출 ${count}회/${predicate.minimum}회 이상` };
    }
    case "rooted_visible": {
      const matched = facts.visible.includes(predicate.stem) && facts.hidden.includes(predicate.stem);
      return { matched, finding: `${predicate.stem} 투출·통근 동시 ${matched ? "예" : "아니오"}` };
    }
    case "all_branches": {
      const matched = predicate.branches.every((branch) => facts.branches.includes(branch));
      return { matched, finding: `${predicate.branches.join("·")} 지지 전부 존재 ${matched ? "예" : "아니오"}` };
    }
  }
}

export function evaluateQiongtongSubclauses(chart: SajuChart): QiongtongSubclauseMatch[] {
  const facts = chartFacts(chart);
  const dayStem = chart.pillars.day.gan;
  const monthBranch = chart.pillars.month.zhi;
  return QIONGTONG_SUBCLAUSE_RULES.flatMap((rule): QiongtongSubclauseMatch[] => {
    if (rule.dayStem !== dayStem || !rule.monthBranches.includes(monthBranch)) return [];
    const results = rule.predicates.map((predicate) => evaluatePredicate(predicate, facts));
    if (!results.every((result) => result.matched)) return [];
    return [{
      ruleId: rule.id,
      classicalPattern: rule.classicalPattern,
      normalizedReading: rule.normalizedReading,
      predicateFindings: results.map((result) => result.finding),
      section: rule.section,
      sourceNote: rule.sourceNote
    }];
  });
}

if (new Set(QIONGTONG_SUBCLAUSE_RULES.map((rule) => rule.id)).size !== QIONGTONG_SUBCLAUSE_RULES.length) {
  throw new Error("QTB_SUBCLAUSE_RULE_ID_DUPLICATE");
}

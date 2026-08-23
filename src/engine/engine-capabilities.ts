/**
 * Engine V2 capability and provenance registry.
 *
 * A calendar result, a school-dependent interpretation, and a prose fact are
 * deliberately different maturity levels.  Callers must pass this gate before
 * treating any legacy intent as primary evidence.
 */
import { LunarYear } from "lunar-typescript";
import { getBirthDateValidationError, type SajuInput } from "./saju-engine";

export const LEGACY_SAJU_INTENTS = [
  "chart", "strength_yongsin", "sinsal", "relations", "recommend",
  "date_yinyang", "compatibility", "ziwei", "twelve_sinsal", "joho",
  "current_luck", "geokguk", "gaeun", "ziwei_gaeun", "taekil", "naming",
  "suri", "naming_hanja", "gaeun_pro", "gusung", "juyeok_cast",
  "pungsu_bangwi", "yukim", "gimun", "dangsaju", "tojeong"
] as const;

export type LegacySajuIntent = typeof LEGACY_SAJU_INTENTS[number];
export type EngineCapabilityId = LegacySajuIntent |
  "myeongri_structure" |
  "myeongri_time_envelope" |
  "myeongri_doctrine" |
  "myeongri_judgment" |
  "ziwei_topology" |
  "ziwei_palace_flying" |
  "ziwei_horoscope" |
  "ziwei_lineage_compare" |
  "ziwei_doctrine" |
  "knowledge_asset_router" |
  "life_timeline" |
  "event_validation_matrix" |
  "event_rectification_matrix" |
  "korean_name_analysis" |
  "cheolpan_shenshu" |
  "shamanic_oral_tradition" |
  "cross_system_life_dossier";

export type EngineSystem =
  "calendar" | "myeongri" | "ziwei" | "juyeok" | "yukim" | "gimun" |
  "dangsaju" | "tojeong" | "pungsu" | "gusung" | "naming" |
  "cheolpan" | "musok" | "cross_system";

export type CapabilityMaturity =
  "verified_calculation" |
  "bounded_calculation" |
  "heuristic" |
  "experimental" |
  "knowledge_only";

export type EvidenceRole = "primary" | "support" | "blocked";
export type InputRequirement =
  "birth_date" | "birth_time" | "gender" | "partner_birth_date" |
  "partner_birth_time" | "target_date" | "question_datetime" |
  "line_values" | "name_characters" | "name_strokes" | "past_events";

export interface EngineSource {
  id: string;
  title: string;
  uri: string;
  kind: "official_library" | "official_government" | "primary_text" | "research_corpus" | "local_audit";
  scope: string;
  checkedAt: string;
}

export const ENGINE_SOURCES: Record<string, EngineSource> = {
  lunarTypescript: {
    id: "lunar-typescript",
    title: "6tail lunar-typescript",
    uri: "https://github.com/6tail/lunar-typescript/blob/master/README_EN.md",
    kind: "official_library",
    scope: "양력·음력 변환, 절기, 팔자와 운 계산 API",
    checkedAt: "2026-08-20"
  },
  iztroConfig: {
    id: "iztro-config",
    title: "iztro Configuration and Plugins",
    uri: "https://www.iztro.com/en_US/posts/config-n-plugin",
    kind: "official_library",
    scope: "자미두수 유파·사화·묘왕·연월일 경계 설정",
    checkedAt: "2026-08-20"
  },
  iztroAstrolabe: {
    id: "iztro-astrolabe",
    title: "iztro Astrolabes",
    uri: "https://www.iztro.com/en_US/posts/astrolabe",
    kind: "official_library",
    scope: "명반, 궁, 삼방사정, 운한 API",
    checkedAt: "2026-08-20"
  },
  iztroPalaceFlying: {
    id: "iztro-palace-flying",
    title: "iztro Palace Flying Transformations",
    uri: "https://docs.iztro.com/posts/palace",
    kind: "official_library",
    scope: "궁간 사화의 목표궁, 자화, 화기충 대궁 계산 API",
    checkedAt: "2026-08-21"
  },
  iztroMutagen: {
    id: "iztro-mutagen",
    title: "iztro 십간 사화와 비성 문서",
    uri: "https://docs.iztro.com/learn/mutagen",
    kind: "official_library",
    scope: "iztro 기본 십간 사화표와 궁간 비화·자화·화기충 정의",
    checkedAt: "2026-08-21"
  },
  sanmingTonghui: {
    id: "sanming-tonghui",
    title: "삼명통회(三命通會) 원문",
    uri: "https://ctext.org/wiki.pl?chapter=548506&if=gb",
    kind: "primary_text",
    scope: "자평법의 역사적 변화와 일주·월령·대운 원리",
    checkedAt: "2026-08-20"
  },
  kumazakiNaming1930: {
    id: "kumazaki-unmei-no-shinpi-1930",
    title: "운명의 신비 부록 선명자휘(熊崎健翁, 1930)",
    uri: "https://ndlsearch.ndl.go.jp/books/R100000002-I000000604672",
    kind: "primary_text",
    scope: "구마사키식 성명학 응용법의 공개 원전. 사격 공식은 인쇄 47~51쪽, 1~81수 해설은 66~81쪽으로 확인했으며 현지 한국어 표의 행별 번역·후대 격명 대조는 남아 있음",
    checkedAt: "2026-08-21"
  },
  koreanFamilyRegistrationRuleArticle37: {
    id: "korean-family-registration-rule-article-37",
    title: "가족관계의 등록 등에 관한 규칙 제37조",
    uri: "https://law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lspttninfSeq=104326",
    kind: "official_government",
    scope: "출생신고 이름에 쓸 수 있는 한자와 별표 1·2의 자형 범위",
    checkedAt: "2026-08-21"
  },
  koreanEfamilyNameHanja: {
    id: "korean-efamily-name-hanja",
    title: "전자가족관계등록시스템 인명용 한자 조회",
    uri: "https://efamily.scourt.go.kr/cs/CsBltnWrtList.do?bltnbordId=0000010",
    kind: "official_government",
    scope: "인명용 한자의 지정 음, 허용 자형, 동자·속자 조회",
    checkedAt: "2026-08-21"
  },
  unicodeUnihan17: {
    id: "unicode-unihan-17",
    title: "Unicode 17.0 Unihan Database",
    uri: "https://www.unicode.org/Public/17.0.0/ucd/Unihan.zip",
    kind: "official_library",
    scope: "한자 코드 포인트, 한국 독음 관찰, 총획과 변이자 메타데이터",
    checkedAt: "2026-08-22"
  },
  cjkDecomposition: {
    id: "amake-cjk-decomp-c29b391",
    title: "CJK Decomposition Data at c29b391",
    uri: "https://github.com/amake/cjk-decomp/tree/c29b391fd6267e7a3541387e03a3dd60b1cd34d1",
    kind: "research_corpus",
    scope: "Apache-2.0으로 고정한 한자 그래픽 구성요소와 배치 코드. 어원·길흉 근거가 아님",
    checkedAt: "2026-08-22"
  },
  localNamingTableAudit: {
    id: "naming-table-audit",
    title: "성명학 표 경계 감사",
    uri: "DATA_LICENSES.md",
    kind: "local_audit",
    scope: "81수 81행과 한자 121자 subset의 출처·법적 적격성·획수·음·뜻 미검증 상태",
    checkedAt: "2026-08-21"
  },
  diTianSuiChanWei: {
    id: "di-tian-sui-chan-wei",
    title: "적천수천미(滴天髓闡微) 원문",
    uri: "https://zh.wikisource.org/wiki/%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE",
    kind: "primary_text",
    scope: "월령만으로 왕쇠를 고정하지 않는 통근·생조·극설의 다축 판단",
    checkedAt: "2026-08-21"
  },
  yuanhaiZiping: {
    id: "yuanhai-ziping",
    title: "연해자평대전(淵海子平大全) 원문",
    uri: "https://zh.wikisource.org/zh-hant/%E6%B7%B5%E6%B5%B7%E5%AD%90%E5%B9%B3%E5%A4%A7%E5%85%A8",
    kind: "primary_text",
    scope: "월령 격국과 재관인식·살상겁인의 성립 및 훼손 장치",
    checkedAt: "2026-08-21"
  },
  qiongtongBaojian: {
    id: "qiongtong-baojian",
    title: "궁통보감(窮通寶鑑) 원문",
    uri: "https://zh.wikisource.org/zh-hant/%E7%A9%B7%E9%80%9A%E5%AF%B6%E9%91%91",
    kind: "primary_text",
    scope: "십간·월령별 한난조습과 조후 조건",
    checkedAt: "2026-08-20"
  },
  ziweiQuanshu: {
    id: "ziwei-doushu-quanshu",
    title: "자미두수전서(紫微斗數全書) 원문",
    uri: "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8",
    kind: "primary_text",
    scope: "성요·십이궁·격국과 권2 안록권과기 사성 변화결 원문",
    checkedAt: "2026-08-21"
  },
  wanliDoushuVolumeFive: {
    id: "wanli-doushu-volume-five",
    title: "두수권 권5 성상본기 공개 미리보기",
    uri: "https://www.wanlibk.com/readers/preread/9789621476197.pdf",
    kind: "primary_text",
    scope: "중주계 십간 사화 완전표",
    checkedAt: "2026-08-21"
  },
  tiebanResearchCorpus: {
    id: "tieban-research-corpus",
    title: "철판신수 출처·명례 교차감수 코퍼스",
    uri: "https://github.com/JiuJianZhang/tieban-shenshu/blob/main/references/verified-fixtures.md",
    kind: "research_corpus",
    scope: "황극 원회운세 세 판본 명례, 곤집 암호, 고각 후보와 미해결 선택기 경계",
    checkedAt: "2026-08-21"
  },
  xuYunongTiebanPublication: {
    id: "xu-yunong-tieban-publication",
    title: "서우농 철판신수대공개 서지·목차",
    uri: "https://wsdoc.cn/article.asp?id=1387",
    kind: "primary_text",
    scope: "황극 취수·기괘·원당·고각·육친 장절의 판본 위치",
    checkedAt: "2026-08-21"
  },
  tiebanStandardPublishedTables: {
    id: "tieban-standard-published-tables",
    title: "정통 철판신수 14계열 공개 산법·수표",
    uri: "https://www.scribd.com/document/867740979/%E6%AD%A3%E7%BB%9F%E9%93%81%E6%9D%BF%E7%A5%9E%E6%95%B0",
    kind: "primary_text",
    scope: "질문 시각을 쓰는 선천수·오음·일명수·시운수·본명수·십이벽괘·본명 및 유년 조문 번호",
    checkedAt: "2026-08-21"
  },
  baipaiFlyingManual: {
    id: "baipai-flying-manual",
    title: "백파 비궁 자미두수 속성체계 A권",
    uri: "https://www.vr-d.com/pdf-file/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B0%2F%E7%99%BD%E6%B4%BE%E9%A3%9E%E5%AE%AB%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B0%E9%80%9F%E6%88%90%E4%BD%93%E7%B3%BB.pdf",
    kind: "primary_text",
    scope: "이심 자화와 향심 자화의 궁간·대궁 계산 정의",
    checkedAt: "2026-08-21"
  },
  qintianLaiyinIntro: {
    id: "qintian-laiyin-intro",
    title: "흠천사화 초계 내인궁 강의 자료",
    uri: "https://pdfcoffee.com/-abcd12-pdf-free.html",
    kind: "research_corpus",
    scope: "생년 천간이 놓인 궁을 내인궁으로 정하는 위치 규칙",
    checkedAt: "2026-08-21"
  },
  qintianTiyongFaxiang: {
    id: "qintian-tiyong-faxiang",
    title: "흠천사화 체용·법상 공개 기초 자료",
    uri: "https://www.scribd.com/document/972717946/%E5%A4%A7%E8%8A%B1%E9%92%A6%E5%A4%A9%E5%9F%BA%E7%A1%80-%E8%B5%A0",
    kind: "research_corpus",
    scope: "생년 사화=체, 자화=용, 동일 사화 법상, 이심·향심 방향별 연결 정의",
    checkedAt: "2026-08-21"
  },
  iztroLaiyinPalace: {
    id: "iztro-laiyin-palace",
    title: "iztro 자미두수 궁위 시스템",
    uri: "https://iztro.com/zh_TW/learn/palace",
    kind: "official_library",
    scope: "내인궁과 자·축 천지불작내인의 중복 궁간 제외 규칙",
    checkedAt: "2026-08-21"
  },
  localDivinationAudit: {
    id: "divination-table-audit",
    title: "점술 계산표 독립 감수",
    uri: "docs/METHODOLOGY.md",
    kind: "local_audit",
    scope: "육임·기문·당사주·토정의 제한된 계산표 검증",
    checkedAt: "2026-06-28"
  },
  qimenRotatingGolden: {
    id: "qimen-rotating-golden",
    title: "atopx/qimen 전반·비반 금표본 판",
    uri: "https://github.com/atopx/qimen/blob/main/qimen_golden_test.go",
    kind: "research_corpus",
    scope: "拆補·置閏의 지반·천반·암간·구성·팔문·팔신·직부·직사 궁별 금표본과 회전 산법",
    checkedAt: "2026-08-21"
  },
  yukimClosed720Table: {
    id: "yukim-closed-720-table",
    title: "liuren-ts-lib 육십일진×십이천반 삼전표",
    uri: "https://github.com/look-fate/liuren-ts-lib/blob/bc733f73f0a8baeb1a4e1f1f763277f22136783e/src/sanchuan.json",
    kind: "research_corpus",
    scope: "720국 초전·중전·말전과 원수·중심·비용·지일·섭해·요극·묘성·별책·팔전·복음·반음 과체",
    checkedAt: "2026-08-21"
  }
};

export const ENGINE_SOURCE_BY_ID: Record<string, EngineSource> = Object.fromEntries(
  Object.values(ENGINE_SOURCES).map((source) => [source.id, source])
);

export interface CapabilityDescriptor {
  id: EngineCapabilityId;
  system: EngineSystem;
  maturity: CapabilityMaturity;
  evidenceRole: EvidenceRole;
  lineage: string;
  requiredInputs: InputRequirement[];
  improvesWith: InputRequirement[];
  domains: string[];
  sourceIds: string[];
  omittedDimensions: string[];
  note: string;
}

function capability(
  id: EngineCapabilityId,
  system: EngineSystem,
  maturity: CapabilityMaturity,
  evidenceRole: EvidenceRole,
  lineage: string,
  requiredInputs: InputRequirement[],
  improvesWith: InputRequirement[],
  domains: string[],
  sourceIds: string[],
  omittedDimensions: string[],
  note: string
): CapabilityDescriptor {
  return { id, system, maturity, evidenceRole, lineage, requiredInputs, improvesWith, domains, sourceIds, omittedDimensions, note };
}

export const ENGINE_CAPABILITIES: Record<EngineCapabilityId, CapabilityDescriptor> = {
  chart: capability("chart", "calendar", "verified_calculation", "primary", "6tail EightChar; 단일 시각", ["birth_date"], ["birth_time"], ["identity"], ["lunar-typescript"], ["진태양시 자동 보정", "시간 미상 단일 시주"], "입력된 현지 민용시를 사용한다. 시간 미상은 단일 원국이 아니라 후보 묶음만 허용한다."),
  strength_yongsin: capability("strength_yongsin", "myeongri", "bounded_calculation", "support", "월령·통근·투출 왕쇠와 조후·격국·부억 관법 분리 v2", ["birth_date", "birth_time"], [], ["identity", "career", "wealth"], ["lunar-typescript", "sanming-tonghui", "di-tian-sui-chan-wei", "yuanhai-ziping", "qiongtong-baojian"], ["진태양시 자동 보정", "월내 사령일수 전수", "종격·화격 최종 판정", "관법 충돌의 인간 최종 선택"], "숫자 점수와 단일 용신을 만들지 않고 세 관법의 후보와 충돌을 각각 반환한다."),
  sinsal: capability("sinsal", "myeongri", "bounded_calculation", "support", "년지·일지 보조 신살 통설표", ["birth_date", "birth_time"], [], ["identity", "movement", "relationship"], ["sanming-tonghui"], ["전 신살 유파 차이", "사건 예측"], "규칙표 검출만 계산이며 해석은 보조다."),
  relations: capability("relations", "myeongri", "bounded_calculation", "support", "천간합충·지지합충형파해 통설", ["birth_date", "birth_time"], [], ["relationship", "family", "career"], ["sanming-tonghui"], ["합화 성립 조건의 완전 판정"], "관계 존재와 실제 화기 성립을 구분한다."),
  recommend: capability("recommend", "myeongri", "heuristic", "support", "조후·격국·부억 분리 행동 번역 v2", ["birth_date", "birth_time"], ["gender"], ["career", "action"], ["sanming-tonghui", "di-tian-sui-chan-wei", "yuanhai-ziping", "qiongtong-baojian"], ["진태양시 자동 보정", "행동 효과 검증", "개인 환경", "인간의 최종 관법 선택"], "세 관법의 후보와 충돌을 보존하고 십신 기능을 현대 행동으로 번역한다. 행동 문장은 계산값이 아니다."),
  date_yinyang: capability("date_yinyang", "calendar", "bounded_calculation", "primary", "6tail 절기·일진", ["target_date"], [], ["timing"], ["lunar-typescript"], ["지역별 실시각", "개인 원국과의 작용"], "날짜의 일진과 절기 위치만 직접 계산한다."),
  compatibility: capability("compatibility", "myeongri", "bounded_calculation", "support", "양 원국 4×4 간지 교차·일간·배우자궁 우선 관찰 v2", ["birth_date", "birth_time", "partner_birth_date", "partner_birth_time"], [], ["relationship"], ["lunar-typescript", "sanming-tonghui", "di-tian-sui-chan-wei"], ["진태양시 자동 보정", "대운 동조", "자미 부처궁 교차", "실제 관계사 보정", "결혼 성사 확률"], "두 원국의 모든 천간·지지 접촉을 보존하되 합을 성사, 충을 이별로 바꾸지 않는다."),
  ziwei: capability("ziwei", "ziwei", "verified_calculation", "primary", "iztro explicit common profile", ["birth_date", "birth_time", "gender"], [], ["identity", "life_domains"], ["iztro-config", "iztro-astrolabe"], ["고전 해석 규칙 컴파일"], "명반 배치가 계산 결과이며 별 의미 해석은 별도 층이다."),
  twelve_sinsal: capability("twelve_sinsal", "myeongri", "bounded_calculation", "support", "삼합국 기준 십이신살", ["birth_date", "birth_time"], [], ["timing", "movement"], ["sanming-tonghui"], ["유파별 기산점"], "배속표 산출만 직접 근거다."),
  joho: capability("joho", "myeongri", "bounded_calculation", "support", "궁통보감 십간×십이 건월·하위절 조후 v2", ["birth_date", "birth_time"], [], ["identity", "health"], ["lunar-typescript", "qiongtong-baojian"], ["진태양시 자동 보정", "미컴파일 종격·화격 하위절", "월내 사령일수 전수", "의학적 체질 판정"], "정확 일간·건월 규칙과 조건부 하위절을 먼저 실행하고 네 계절 표는 보조로만 남긴다."),
  current_luck: capability("current_luck", "myeongri", "bounded_calculation", "primary", "6tail Yun; 성별 순역", ["birth_date", "birth_time", "gender"], [], ["timing"], ["lunar-typescript", "sanming-tonghui"], ["진태양시 자동 보정", "유파별 기운법 비교", "사건 의미 해석"], "대운·세운 간지와 연령 구간을 계산한다."),
  geokguk: capability("geokguk", "myeongri", "bounded_calculation", "support", "월령 본기·투출·보강·훼손 장치 분리 v2", ["birth_date", "birth_time"], [], ["identity", "career"], ["lunar-typescript", "sanming-tonghui", "yuanhai-ziping", "di-tian-sui-chan-wei"], ["진태양시 자동 보정", "모든 겸격·변격", "종격·화격 최종 판정", "운에서 격의 성패가 변하는 전 규칙"], "격 이름 후보와 성패 장치를 함께 반환하며 후보를 부귀 등급으로 승격하지 않는다."),
  gaeun: capability("gaeun", "myeongri", "heuristic", "support", "관법별 행동·운 접촉 분리 v2", ["birth_date", "birth_time", "gender"], [], ["action"], ["lunar-typescript", "sanming-tonghui", "di-tian-sui-chan-wei", "yuanhai-ziping", "qiongtong-baojian"], ["진태양시 자동 보정", "행동 효과 검증", "사건 결과", "개인 환경"], "조후·격국·부억 행동 후보와 대운·세운의 십신 접촉을 분리한다. 접촉을 길흉으로 바꾸지 않는다."),
  ziwei_gaeun: capability("ziwei_gaeun", "ziwei", "heuristic", "support", "주성 키워드·사화 처방 v1", ["birth_date", "birth_time", "gender"], [], ["action", "life_domains"], ["iztro-astrolabe", "ziwei-doushu-quanshu"], ["삼방사정·운한 결합", "유파별 해석"], "현재는 궁별 별 이름에 붙인 짧은 처방이다."),
  taekil: capability("taekil", "myeongri", "bounded_calculation", "support", "황도·의기·원국충·관법접촉 증거행렬 v2", ["birth_date", "birth_time", "target_date"], ["gender"], ["timing", "action"], ["lunar-typescript", "sanming-tonghui", "di-tian-sui-chan-wei", "yuanhai-ziping", "qiongtong-baojian"], ["사안별 신살", "당사자 다중 교차", "현장 시간·장소", "유파별 택일 규칙"], "서로 다른 근거를 숫자로 더하지 않고 명시한 제외·후보 정책과 증거 벡터를 반환한다."),
  naming: capability("naming", "naming", "heuristic", "support", "명리 세 관법·발음오행·자원오행·수리 분리 v2", ["birth_date", "birth_time"], [], ["naming"], ["sanming-tonghui", "di-tian-sui-chan-wei", "yuanhai-ziping", "qiongtong-baojian", "kumazaki-unmei-no-shinpi-1930", "korean-family-registration-rule-article-37", "korean-efamily-name-hanja"], ["발음오행 유파 확정", "자원오행 유파 확정", "공식 한자·지정 음 실시간 조회", "뜻·음운·항렬·사회적 사용성 검토"], "명리 관법과 성명학 방법을 나란히 보여줄 뿐 권장 초성이나 이름을 만들지 않는다."),
  suri: capability("suri", "naming", "bounded_calculation", "support", "원전 예시로 확인한 사격 산술·81수 해석표 분리 v3", ["name_strokes"], [], ["naming"], ["kumazaki-unmei-no-shinpi-1930", "naming-table-audit"], ["81수 81행의 원전 문구·후대 격명 대조", "획수 자전 지정", "유파 비교", "종합 길흉·개명 판단"], "입력 획수의 사격 산술은 원전 47~51쪽 예시와 대조했다. 81수 해설의 위치는 66~81쪽으로 확인했지만 한국어 문구는 행별 대조 전인 후대 유파 요약이다."),
  naming_hanja: capability("naming_hanja", "naming", "heuristic", "support", "명리 세 관법·한자 연구 subset 분리 v2", ["birth_date", "birth_time"], ["name_strokes"], ["naming"], ["sanming-tonghui", "di-tian-sui-chan-wei", "yuanhai-ziping", "qiongtong-baojian", "korean-family-registration-rule-article-37", "korean-efamily-name-hanja", "naming-table-audit"], ["후보별 공식 인명용 적격성", "지정 음", "허용 자형", "뜻", "획수 자전", "발음·항렬 종합"], "121자는 법적 인명용 목록이 아니라 연구 subset이다. 공식 조회가 끝나기 전에는 추천하지 않는다."),
  korean_name_analysis: capability("korean_name_analysis", "naming", "bounded_calculation", "primary", "대법원 9,495자 스냅샷·Unicode·그래픽 분해·호출자 선언 수리 분리 v1", ["name_characters"], ["name_strokes"], ["naming"], ["korean-family-registration-rule-article-37", "korean-efamily-name-hanja", "unicode-unihan-17", "amake-cjk-decomp-c29b391", "kumazaki-unmei-no-shinpi-1930", "naming-table-audit"], ["최신 법원 실시간 재확인", "획수 체계 자동 선택", "파자 어원·길흉 단정", "종합 개명 판정"], "입력 한자를 9,495개 공식 관찰과 대조하고 지정 음·법원 획수 후보·Unicode·그래픽 구성·호출자 선언 사격·81수를 독립 층으로 반환한다."),
  gaeun_pro: capability("gaeun_pro", "myeongri", "heuristic", "support", "관법별 행동과 오행 상징 분리 v2", ["birth_date", "birth_time"], ["gender"], ["action"], ["sanming-tonghui", "di-tian-sui-chan-wei", "yuanhai-ziping", "qiongtong-baojian"], ["행동 효과 검증", "상징 대응의 인과 검증", "환경 적합성"], "행동 후보와 색·방위·물건 대응을 다른 evidenceRole로 반환하며 상징을 인과 근거로 쓰지 않는다."),
  gusung: capability("gusung", "gusung", "bounded_calculation", "support", "구성 본명성 통설", ["birth_date"], [], ["direction", "timing"], ["divination-table-audit"], ["월명성·일명성·운반"], "본명성 한 층만 계산한다."),
  juyeok_cast: capability("juyeok_cast", "juyeok", "bounded_calculation", "primary", "주역 64괘·동효", ["line_values"], [], ["decision"], ["divination-table-audit"], ["괘효사 원문 해석", "점법별 취법"], "입력한 여섯 효의 본괘·지괘만 재현한다."),
  pungsu_bangwi: capability("pungsu_bangwi", "pungsu", "bounded_calculation", "support", "팔택 본명괘", ["birth_date", "gender"], [], ["direction", "home"], ["divination-table-audit"], ["현장 형세·좌향·이십사산"], "동서사택 표만으로 실제 풍수를 대신하지 않는다."),
  yukim: capability("yukim", "yukim", "bounded_calculation", "support", "월장·천반·사과·닫힌 720국 삼전표 v2", ["question_datetime"], [], ["decision", "timing"], ["lunar-typescript", "yukim-closed-720-table", "divination-table-audit"], ["질문별 류신", "본명·행년", "유파별 귀인 주야 경계", "응기·길흉 해석"], "60일진×12천반 배치의 삼전과 과체를 계산하며 질문별 점단으로 자동 확장하지 않는다."),
  gimun: capability("gimun", "gimun", "bounded_calculation", "support", "차보법 시가 전반 전반 轉盤 v2", ["question_datetime"], [], ["decision", "direction", "timing"], ["lunar-typescript", "qimen-rotating-golden"], ["置閏法", "飛盤", "일가·월가·연가", "진태양시·역사적 서머타임", "질문별 용신·길흉 해석"], "지반·천반·암간·구성·팔문·팔신·직부·직사·순공을 계산하며 해석 점수를 만들지 않는다."),
  dangsaju: capability("dangsaju", "dangsaju", "bounded_calculation", "support", "생년지 순행 12성 통설형", ["birth_date", "birth_time"], [], ["life_stages"], ["divination-table-audit"], ["유파별 기산·해석"], "네 시기 배속만 계산한다."),
  tojeong: capability("tojeong", "tojeong", "bounded_calculation", "support", "선천수 144괘 통용형", ["birth_date"], [], ["yearly_timing"], ["divination-table-audit"], ["서적별 상수 차이", "144괘 원문 풀이"], "여러 산법 중 한 구현이다."),
  myeongri_structure: capability("myeongri_structure", "myeongri", "bounded_calculation", "primary", "자평 구조 관찰; 무점수", ["birth_date", "birth_time"], [], ["identity", "career", "wealth", "relationship", "family"], ["lunar-typescript", "sanming-tonghui"], ["격국 성패의 최종 판정"], "통근·투출·십신 위치·월령·합충을 관찰값으로 보존한다."),
  myeongri_time_envelope: capability("myeongri_time_envelope", "myeongri", "bounded_calculation", "primary", "12시진 후보 전수", ["birth_date"], ["birth_time"], ["identity"], ["lunar-typescript"], ["출생시각 역추정"], "시간 미상 때 하나를 고르지 않고 불변값과 변동값을 분리한다."),
  myeongri_doctrine: capability("myeongri_doctrine", "myeongri", "bounded_calculation", "support", "궁통보감 십간×12건월 120칸·명시 하위절 66개 규칙 팩 v4", ["birth_date", "birth_time"], [], ["identity", "career", "wealth", "relationship"], ["sanming-tonghui", "qiongtong-baojian"], ["미컴파일된 나머지 종격·화격·국 하위절", "월내 사령일수의 전수 계산", "격국 성패 전 체계"], "십간 120개 건월 규칙과 원문에 조건이 명시된 66개 하위절을 투출·통근·삼합국·지지 전수 조건식으로 실행한다. 조회값만으로 최종 용신을 확정하지 않는다."),
  myeongri_judgment: capability("myeongri_judgment", "myeongri", "bounded_calculation", "support", "삼명통회 월령·적천수 통근·연해자평 성패 장치 분리 관법 v1", ["birth_date", "birth_time"], [], ["identity", "career", "wealth", "relationship"], ["lunar-typescript", "sanming-tonghui", "di-tian-sui-chan-wei", "yuanhai-ziping", "qiongtong-baojian"], ["월내 사령일수 전수", "전 종격·화격 확정", "모든 겸격·변격", "운에서 격의 성패가 변하는 전 규칙"], "월령·통근·투출의 독립 축과 격별 보강·훼손 장치를 무점수로 계산하고 조후·격국·부억 후보의 충돌을 보존한다."),
  ziwei_topology: capability("ziwei_topology", "ziwei", "verified_calculation", "primary", "iztro 삼방사정", ["birth_date", "birth_time", "gender"], [], ["life_domains"], ["iztro-astrolabe", "iztro-config"], ["성요 의미 규칙"], "각 궁의 본궁·대궁·재백·관록 연결을 계산한다."),
  ziwei_palace_flying: capability("ziwei_palace_flying", "ziwei", "verified_calculation", "primary", "출처 고정 3종 사화표·자화·내인궁·체용법상 v5", ["birth_date", "birth_time", "gender"], [], ["identity", "career", "wealth", "relationship", "family", "timing"], ["iztro-palace-flying", "iztro-mutagen", "ziwei-doushu-quanshu", "wanli-doushu-volume-five", "iztro-astrolabe", "iztro-config", "baipai-flying-manual", "qintian-laiyin-intro", "qintian-tiyong-faxiang", "iztro-laiyin-palace"], ["점험·도가 등 아직 독립 출처를 확보하지 않은 사화표", "비화 심리·길흉·사건 의미 규칙", "선후천 인과의 단일 사건 단정"], "세 사화표를 각각 12궁 48간선으로 계산하고 자화·화기충 대궁을 보존한다. 생년 사화를 체, 이심·향심 자화를 용으로 분리해 동일 사화의 법상과 방향별 연결을 산출하고, 운한은 그 구조와의 접촉까지만 계산한다."),
  ziwei_horoscope: capability("ziwei_horoscope", "ziwei", "verified_calculation", "primary", "iztro 대운·소한·유년월일시·층별 사화", ["birth_date", "birth_time", "gender", "target_date"], [], ["timing", "life_domains"], ["iztro-astrolabe", "iztro-config"], ["궁간비화", "유파별 비성 해석", "운한 성요 의미 규칙"], "생년과 여섯 운한 층의 록·권·과·기 및 원명반·운한 궁 위치를 계산하며 사건 의미는 별도다."),
  ziwei_lineage_compare: capability("ziwei_lineage_compare", "ziwei", "bounded_calculation", "primary", "통행판 대 중주파 배치 비교", ["birth_date", "birth_time", "gender"], [], ["lineage_conflict"], ["iztro-config"], ["모든 대만·중국 세부 유파"], "유파 선택이 실제 결과를 바꾸는 지점을 diff로 드러낸다."),
  ziwei_doctrine: capability("ziwei_doctrine", "ziwei", "bounded_calculation", "support", "자미두수전서 권1 7개 조합·권2 십이궁 163개 주성 규칙 팩 v3", ["birth_date", "birth_time", "gender"], [], ["identity", "career", "wealth", "relationship", "family", "health"], ["ziwei-doushu-quanshu", "iztro-astrolabe"], ["권2 보조성 단독 항목의 전수 컴파일", "성별·궁지·생년간의 모든 하위 분기", "대만 현대파 비성 해석"], "십이궁의 공개 원문 주성 항목을 실행하며 고전의 자녀 수·질병·형극 문구는 현대 관찰과 안전 경계로 정규화한다."),
  knowledge_asset_router: capability("knowledge_asset_router", "cross_system", "knowledge_only", "support", "계산 특징 기반 기존 지식 저장소 검색", ["birth_date", "birth_time"], ["gender"], ["identity", "career", "wealth", "relationship", "family", "methodology"], [], ["판본·권차·쪽 또는 안정 URL이 없는 항목의 원문 검증", "검색 일치에서 결론으로 가는 추론"], "기존 777개 요약 자산을 관련 계산값에 연결하되 출처 위치가 없는 항목은 보조 자료로만 반환한다."),
  life_timeline: capability("life_timeline", "cross_system", "bounded_calculation", "primary", "대운·세운·자미 운한 연도별 병렬 시간축", ["birth_date", "birth_time", "gender", "target_date"], [], ["timing", "career", "wealth", "relationship", "family"], ["lunar-typescript", "iztro-config", "iztro-astrolabe", "sanming-tonghui"], ["접촉의 길흉 점수", "사건 발생 보장", "대만 현대 운한 관법"], "최대 30년의 배치와 원국 접촉을 계산하며 접촉 개수로 좋고 나쁨을 정하지 않는다."),
  event_validation_matrix: capability("event_validation_matrix", "cross_system", "bounded_calculation", "support", "알려진 시각의 과거 사건 영역·당시 구조 자료 대조", ["birth_date", "birth_time", "gender", "past_events"], [], ["methodology", "timing", "life_events"], ["lunar-typescript", "iztro-config", "iztro-astrolabe", "sanming-tonghui"], ["사건 문장 자동 채점", "적중률", "인과 판정", "미검출 사건 반증"], "사건 영역과 당시 대운·세운·자미 운한 자료의 존재만 대조하며 적중으로 승격하지 않는다."),
  event_rectification_matrix: capability("event_rectification_matrix", "cross_system", "bounded_calculation", "support", "과거 사건 기반 시각 후보 무점수 비교", ["birth_date", "gender", "past_events"], ["birth_time"], ["methodology", "timing", "life_events"], ["lunar-typescript", "iztro-config", "iztro-astrolabe", "sanming-tonghui"], ["후보 확률", "사건 의미의 자동 채점", "정답 시각 자동 선택"], "과거 사건별 대운·세운·자미 서명을 후보 시각마다 계산하고 같은 서명 후보를 묶는다."),
  cheolpan_shenshu: capability("cheolpan_shenshu", "cheolpan", "bounded_calculation", "support", "황극·곤집·질문시각 표준표 분리 계산 v2", ["birth_date", "birth_time"], ["gender", "target_date", "past_events"], ["identity", "family", "timing", "methodology"], ["tieban-research-corpus", "xu-yunong-tieban-publication", "tieban-standard-published-tables"], ["12,000 조문의 문장 코퍼스", "공개 표에서 비어 있는 일부 고령 유년 셀", "서로 다른 유파를 합친 단일 만능 선택기", "사실 대조 없이 고각 정답 자동 확정"], "황극 원회운세, 곤집 암호, 질문 시각 14계열 표준표를 유파별로 분리한다. 표준표는 선천수에서 본명 조문과 108세 유년 표 조회까지 실행하고, 고각은 독립 과거 사실 세 건·두 주제에서 한 후보만 전부 일치할 때만 잠근다."),
  shamanic_oral_tradition: capability("shamanic_oral_tradition", "musok", "knowledge_only", "blocked", "지역·전승별 구술 지식", [], [], ["ritual", "culture"], [], ["재현 가능한 보편 계산법", "효과 검증"], "문화·상담 맥락 자료이지 출생 데이터 결정 계산이 아니다."),
  cross_system_life_dossier: capability("cross_system_life_dossier", "cross_system", "bounded_calculation", "primary", "체계 독립 claim graph v2", ["birth_date"], ["birth_time", "gender", "target_date"], ["identity", "career", "wealth", "relationship", "family", "timing"], ["lunar-typescript", "iztro-astrolabe", "sanming-tonghui", "ziwei-doushu-quanshu"], ["미컴파일 고전 관법", "회고 사건 보정"], "서로 다른 체계의 관찰을 합치지 않고 같은 생애 영역에서 병렬 비교한다.")
};

export interface EngineQueryShape {
  birth?: SajuInput;
  birthA?: SajuInput;
  birthB?: SajuInput;
  date?: { year: number; month: number; day: number; hour?: number; minute?: number };
  lineValues?: number[];
  surnameStrokes?: number[];
  givenStrokes?: number[];
  name?: { surname?: unknown[]; givenName?: unknown[] };
  pastEvents?: unknown[];
}

export interface InputIssue {
  code: string;
  severity: "warning" | "blocking";
  field: string;
  message: string;
}

export interface BirthInputAudit {
  timeStatus: "known" | "unknown";
  timeAccuracy: SajuInput["birthTimeAccuracy"] | "unspecified";
  calendar: "solar" | "lunar";
  leapMonthStatus: "not_applicable" | "resolved" | "ambiguous";
  locationStatus: "longitude_known" | "place_only" | "unknown";
  issues: InputIssue[];
}

function validDateParts(input: SajuInput | undefined): boolean {
  return Boolean(input && getBirthDateValidationError(input) === null);
}

export function auditBirthInput(input?: SajuInput): BirthInputAudit {
  const issues: InputIssue[] = [];
  if (!input) {
    issues.push({ code: "BIRTH_REQUIRED", severity: "blocking", field: "birth", message: "생년월일 입력이 없다." });
    return { timeStatus: "unknown", timeAccuracy: "unspecified", calendar: "solar", leapMonthStatus: "not_applicable", locationStatus: "unknown", issues };
  }
  const dateError = getBirthDateValidationError(input);
  if (dateError) issues.push({ code: "INVALID_BIRTH_DATE", severity: "blocking", field: "birth", message: dateError });
  if (input.hour !== undefined && (!Number.isInteger(input.hour) || input.hour < 0 || input.hour > 23)) {
    issues.push({ code: "INVALID_BIRTH_HOUR", severity: "blocking", field: "birth.hour", message: "출생시는 0~23의 정수여야 한다." });
  }
  if (input.minute !== undefined && (!Number.isInteger(input.minute) || input.minute < 0 || input.minute > 59)) {
    issues.push({ code: "INVALID_BIRTH_MINUTE", severity: "blocking", field: "birth.minute", message: "출생분은 0~59의 정수여야 한다." });
  }
  const calendar = input.calendar ?? "solar";
  let leapMonthStatus: BirthInputAudit["leapMonthStatus"] = "not_applicable";
  if (calendar === "lunar" && !dateError) {
    const leap = LunarYear.fromYear(input.year).getLeapMonth();
    const canBeLeap = leap === Math.abs(input.month);
    if (canBeLeap && input.isLeapMonth === undefined) {
      leapMonthStatus = "ambiguous";
      issues.push({ code: "LUNAR_LEAP_MONTH_AMBIGUOUS", severity: "blocking", field: "birth.isLeapMonth", message: `${input.year}년 음력 ${input.month}월은 평달과 윤달을 구분해야 한다.` });
    } else {
      leapMonthStatus = "resolved";
    }
  }
  if (input.hour === undefined) {
    issues.push({ code: "BIRTH_TIME_UNKNOWN", severity: "warning", field: "birth.hour", message: "시주·자미두수 명반·운 시작 시점은 단일값으로 확정하지 않는다." });
  } else if (!input.birthTimeAccuracy) {
    issues.push({ code: "BIRTH_TIME_SOURCE_UNSPECIFIED", severity: "warning", field: "birth.birthTimeAccuracy", message: "시각은 있으나 기록·가족기억·추정 중 출처가 없다." });
  }
  if (input.hour !== undefined && (input.longitudeE !== undefined || input.timezone)) {
    issues.push({ code: "TIME_BASIS_UNCORRECTED", severity: "warning", field: "birth.hour", message: "경도·시간대는 출생지 메타데이터로 보존한다. 기본 원국은 입력한 현지 민용시를 쓰며 진태양시를 자동 적용하지 않는다." });
  }
  return {
    timeStatus: input.hour === undefined ? "unknown" : "known",
    timeAccuracy: input.birthTimeAccuracy ?? "unspecified",
    calendar,
    leapMonthStatus,
    locationStatus: input.longitudeE !== undefined ? "longitude_known" : input.birthplace ? "place_only" : "unknown",
    issues
  };
}

function missingRequirement(req: InputRequirement, q: EngineQueryShape): string | null {
  const birth = q.birth ?? q.birthA;
  switch (req) {
    case "birth_date": return validDateParts(birth) ? null : "생년월일";
    case "birth_time": return birth?.hour !== undefined ? null : "출생시각";
    case "gender": return birth?.gender ? null : "성별";
    case "partner_birth_date": return validDateParts(q.birthB) ? null : "상대 생년월일";
    case "partner_birth_time": return q.birthB?.hour !== undefined ? null : "상대 출생시각";
    case "target_date": return q.date ? null : "대상 날짜";
    case "question_datetime": return q.date && (q.date.hour !== undefined || q.birth?.hour !== undefined) ? null : "점시 연월일시";
    case "line_values": return q.lineValues?.length === 6 ? null : "6개 효값";
    case "name_characters": return q.name?.surname?.length && q.name?.givenName?.length ? null : "성·이름 한자";
    case "name_strokes": return q.surnameStrokes?.length && q.givenStrokes?.length ? null : "성·이름 획수";
    case "past_events": return q.pastEvents?.length ? null : "검증용 과거 사건";
  }
}

export interface CapabilityPreflight {
  capability: CapabilityDescriptor;
  status: "available" | "partial" | "blocked";
  missingRequired: string[];
  missingOptional: string[];
  inputAudit?: BirthInputAudit;
  reasons: string[];
}

export function preflightCapability(id: EngineCapabilityId, q: EngineQueryShape): CapabilityPreflight {
  const capability = ENGINE_CAPABILITIES[id];
  const missingRequired = capability.requiredInputs.map((r) => missingRequirement(r, q)).filter((v): v is string => Boolean(v));
  const missingOptional = capability.improvesWith.map((r) => missingRequirement(r, q)).filter((v): v is string => Boolean(v));
  const birth = q.birth ?? q.birthA;
  const inputAudit = birth ? auditBirthInput(birth) : undefined;
  if (inputAudit?.issues.some((i) => i.severity === "blocking")) {
    for (const issue of inputAudit.issues.filter((i) => i.severity === "blocking")) {
      if (!missingRequired.includes(issue.message)) missingRequired.push(issue.message);
    }
  }
  const reasons: string[] = [];
  let status: CapabilityPreflight["status"] = "available";
  if (capability.evidenceRole === "blocked") {
    status = "blocked";
    reasons.push(capability.note);
  }
  if (missingRequired.length) {
    status = "blocked";
    reasons.push(`필수 입력 부족: ${missingRequired.join(", ")}`);
  } else if (missingOptional.length) {
    status = "partial";
    reasons.push(`정밀도 보강 입력 없음: ${missingOptional.join(", ")}`);
  }
  return { capability, status, missingRequired, missingOptional, inputAudit, reasons };
}

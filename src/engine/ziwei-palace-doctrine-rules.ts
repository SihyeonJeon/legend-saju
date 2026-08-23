/**
 * Source-located palace/main-star rules from 紫微斗數全書 卷二.
 *
 * These are condition records, not deterministic life predictions. Historical
 * status, gender, punishment, and wealth language is normalized into a modern
 * life-domain observation while the exact source section remains attached.
 */
import type { LifeDomain } from "./engine-v2";
import { ZIWEI_REMAINING_PALACE_DOCTRINE_RULES } from "./ziwei-palace-doctrine-rules-remaining";

export interface ZiweiCompanionModifier {
  allStars: string[];
  normalizedReading: string;
}

export interface ZiweiPalaceDoctrineRule {
  id: string;
  domain: LifeDomain;
  palaceNames: string[];
  mainStar: string;
  normalizedReading: string;
  companionModifiers: ZiweiCompanionModifier[];
  brightnessSensitive: boolean;
  disruptiveSensitive: boolean;
  section: string;
  boundary?: string;
}

const wealth = (
  mainStar: string,
  normalizedReading: string,
  companionModifiers: ZiweiCompanionModifier[] = [],
  brightnessSensitive = false,
  disruptiveSensitive = true
): ZiweiPalaceDoctrineRule => ({
  id: `ZW2-WEALTH-${mainStar}`,
  domain: "wealth",
  palaceNames: ["재백", "財帛", "财帛"],
  mainStar,
  normalizedReading,
  companionModifiers,
  brightnessSensitive,
  disruptiveSensitive,
  section: `권2·오재백·${mainStar}`
});

const career = (
  mainStar: string,
  normalizedReading: string,
  companionModifiers: ZiweiCompanionModifier[] = [],
  brightnessSensitive = true,
  disruptiveSensitive = true
): ZiweiPalaceDoctrineRule => ({
  id: `ZW2-CAREER-${mainStar}`,
  domain: "career",
  palaceNames: ["관록", "官祿", "官禄"],
  mainStar,
  normalizedReading,
  companionModifiers,
  brightnessSensitive,
  disruptiveSensitive,
  section: `권2·구관록·${mainStar}`
});

const relationship = (
  mainStar: string,
  normalizedReading: string,
  companionModifiers: ZiweiCompanionModifier[] = [],
  brightnessSensitive = false,
  disruptiveSensitive = true
): ZiweiPalaceDoctrineRule => ({
  id: `ZW2-RELATIONSHIP-${mainStar}`,
  domain: "relationship",
  palaceNames: ["부처", "夫妻"],
  mainStar,
  normalizedReading,
  companionModifiers,
  brightnessSensitive,
  disruptiveSensitive,
  section: `권2·삼처첩·${mainStar}`
});

const ZIWEI_PALACE_DOCTRINE_RULES_BASE: ZiweiPalaceDoctrineRule[] = [
  wealth("자미", "재산을 보유하고 관리하는 힘을 먼저 보되, 함께 놓인 변동성 성요에 따라 축적 방식이 달라진다.", [
    { allStars: ["파군"], normalizedReading: "재산 형성 과정에 해체와 재구성의 순서가 겹친다." },
    { allStars: ["천상"], normalizedReading: "보관·축적 기능이 함께 강조된다." },
    { allStars: ["천부"], normalizedReading: "보수적으로 지키는 재산 운용이 함께 강조된다." },
    { allStars: ["칠살"], normalizedReading: "지원 성요가 있을 때 비정기적 기회를 다루는 힘을 함께 본다." }
  ]),
  wealth("천기", "계획·정보·기술을 계속 운용해 재원을 만드는 형식으로 읽는다.", [
    { allStars: ["거문"], normalizedReading: "협상·경쟁·말이 많은 환경에서 재원이 움직이는 조합이다." },
    { allStars: ["천량"], normalizedReading: "기획과 판단을 외부 기회로 연결하는 조합이다." },
    { allStars: ["태음"], normalizedReading: "축적과 변동이 번갈아 나타나는지 확인한다." }
  ], true),
  wealth("태양", "공개 활동·책임·가시성을 재원으로 연결하는 힘을 보며 밝기 조건의 영향이 크다.", [
    { allStars: ["태음"], normalizedReading: "드러내는 힘과 축적하는 힘을 함께 쓴다." },
    { allStars: ["록존"], normalizedReading: "재원을 크게 관리하는 기능을 함께 본다." },
    { allStars: ["거문"], normalizedReading: "말과 경쟁에서 생기는 초기 변동을 함께 본다." }
  ], true),
  wealth("무곡", "수치·재무·운영처럼 결과를 계산하고 관리하는 능력이 재산 영역의 중심이 된다.", [
    { allStars: ["파군"], normalizedReading: "자금 회전과 재구성의 진폭이 커질 수 있다." },
    { allStars: ["천상"], normalizedReading: "관리와 축적 기능이 함께 강화된다." },
    { allStars: ["칠살"], normalizedReading: "독립적으로 재원을 세우는 실행성이 함께 강조된다." },
    { allStars: ["탐랑"], normalizedReading: "확장 욕구가 성숙한 시기에 성과로 이어지는지 본다." }
  ]),
  wealth("천동", "초기 속도보다 시간이 지나며 생활 기반과 재원을 안정시키는 형식으로 읽는다.", [
    { allStars: ["거문"], normalizedReading: "수입과 지출의 진폭을 말·계약 문제와 함께 본다." },
    { allStars: ["천량"], normalizedReading: "보호·조정 기능이 재산 확장에 관여한다." }
  ]),
  wealth("염정", "경쟁·규칙·조직 안에서 재원을 만드는 힘과 변동성을 함께 본다.", [
    { allStars: ["탐랑"], normalizedReading: "큰 기회와 큰 지출이 함께 움직이는 고변동 조합이다." },
    { allStars: ["칠살"], normalizedReading: "경쟁 환경에서 직접 성과를 취하는 힘을 본다." },
    { allStars: ["천상"], normalizedReading: "관리와 보관 기능이 변동성을 낮추는지 본다." }
  ]),
  wealth("천부", "재산을 보관하고 오래 유지하는 능력을 중심으로 읽는다.", [
    { allStars: ["자미"], normalizedReading: "큰 단위의 자원을 관리하고 축적하는 기능이 겹친다." },
    { allStars: ["염정"], normalizedReading: "규칙과 권한을 활용한 재원 관리가 강조된다." },
    { allStars: ["무곡"], normalizedReading: "수치·재무 실행력이 보관 능력과 결합한다." }
  ]),
  wealth("태음", "저축·보유·내부 자원 관리가 재산 형성의 중심이며 밝기 조건을 중시한다.", [
    { allStars: ["태양"], normalizedReading: "초기보다 뒤로 갈수록 재원 규모가 커지는지를 본다." },
    { allStars: ["천기"], normalizedReading: "기술과 기획으로 스스로 재원을 만드는 형식이다." },
    { allStars: ["천동"], normalizedReading: "생활 안정과 재산 축적이 서로 돕는 조합이다." },
    { allStars: ["록존"], normalizedReading: "보유와 축적 기능이 거듭 강조된다." }
  ], true),
  wealth("탐랑", "확장·거래·욕구가 재산 증감의 폭을 키우는 형식으로 읽는다.", [
    { allStars: ["자미"], normalizedReading: "확장 욕구를 관리 체계 안에 보존하는지 본다." },
    { allStars: ["화성"], normalizedReading: "빠른 확대와 급한 손실이 같은 시기에 생기지 않는지 본다." }
  ], true),
  wealth("거문", "협상·설명·문제 해결을 통해 스스로 재원을 만드는 형식으로 읽는다.", [
    { allStars: ["태양"], normalizedReading: "공개 활동과 말의 영향력이 기존 기반을 키우는지 본다." },
    { allStars: ["천기"], normalizedReading: "여러 방식의 일과 수입원을 다루는 성격이 강해진다." },
    { allStars: ["천동"], normalizedReading: "생활 기반을 스스로 세우는 과정에 말과 계약이 관여한다." }
  ]),
  wealth("천상", "재원을 정리·배분·보관하는 관리 기능을 중심으로 읽는다.", [
    { allStars: ["자미"], normalizedReading: "관리 범위와 재원 규모가 함께 커지는지 본다." },
    { allStars: ["무곡"], normalizedReading: "전문 기술과 재무 실행으로 재원을 만든다." },
    { allStars: ["염정"], normalizedReading: "상업·조직 활동과 재산 관리가 결합한다." }
  ]),
  wealth("천량", "보호·조정·판단을 통해 안정적인 재원을 만드는 형식이며 밝기 조건을 중시한다.", [
    { allStars: ["천동"], normalizedReading: "기존 기반을 넘어 생활 재원을 새로 세우는 힘을 본다." },
    { allStars: ["천기"], normalizedReading: "기획을 계속 바꾸며 재원을 만드는 수고가 커질 수 있다." }
  ], true),
  wealth("파군", "재산을 한 번 해체하고 다시 구성하는 회전성과 변동을 중심으로 읽는다.", [
    { allStars: ["무곡"], normalizedReading: "자금의 유입과 유출이 크므로 운영 통제가 중요해진다." },
    { allStars: ["자미"], normalizedReading: "손실 뒤 관리 체계를 다시 세우는 힘을 본다." },
    { allStars: ["염정"], normalizedReading: "노력과 경쟁을 거쳐 재원을 재구성하는 조합이다." }
  ], true),

  career("자미", "통솔·조정·관리 책임을 맡는 직업 구조를 중심으로 읽는다.", [
    { allStars: ["천부"], normalizedReading: "권한과 자원 관리가 함께 놓인다." },
    { allStars: ["천상"], normalizedReading: "공적 책임과 절차 관리가 함께 강조된다." },
    { allStars: ["파군"], normalizedReading: "안정된 조직보다 변화가 큰 환경에서 자리를 잡는지 본다." }
  ]),
  career("천기", "기획·기술·분석·변경 대응을 직업의 핵심 기능으로 읽는다.", [
    { allStars: ["문곡"], normalizedReading: "기획과 문서·표현 능력이 함께 쓰인다." },
    { allStars: ["천량"], normalizedReading: "기획과 감독·보호 기능을 함께 맡는 조합이다." },
    { allStars: ["태음"], normalizedReading: "내부 운영과 기획으로 성과를 내는 형식이다." }
  ]),
  career("태양", "공개성·대표성·책임을 지는 일을 중심으로 읽으며 밝기 조건의 영향이 크다.", [
    { allStars: ["태음"], normalizedReading: "대외 역할과 내부 운영을 함께 다루는 조합이다." },
    { allStars: ["문창"], normalizedReading: "공개 활동에 문서·표현 능력이 더해진다." },
    { allStars: ["문곡"], normalizedReading: "공개 활동에 기획·콘텐츠 능력이 더해진다." }
  ]),
  career("무곡", "재무·운영·통제·실행처럼 결과가 분명한 일을 중심으로 읽는다.", [
    { allStars: ["문창"], normalizedReading: "실행력과 문서·분석 능력이 결합한다." },
    { allStars: ["문곡"], normalizedReading: "실행력과 설계·표현 능력이 결합한다." },
    { allStars: ["파군"], normalizedReading: "위기 대응·개편·현장 실행 쪽으로 기운다." },
    { allStars: ["칠살"], normalizedReading: "강한 결단과 책임을 요구하는 환경에 놓인다." }
  ]),
  career("천동", "사람·생활·서비스를 조정하며 시간이 지나 역할을 키우는 직업 구조로 읽는다.", [
    { allStars: ["거문"], normalizedReading: "작은 역할에서 시작해 말과 문제 해결로 범위를 넓히는지 본다." },
    { allStars: ["태양"], normalizedReading: "서비스 기능이 대외 책임으로 확장된다." },
    { allStars: ["태음"], normalizedReading: "돌봄과 내부 운영 능력을 함께 쓴다." }
  ]),
  career("염정", "규정·정치·경쟁·권한을 다루는 직업에서 성과와 지속성을 함께 본다.", [
    { allStars: ["탐랑"], normalizedReading: "경쟁과 네트워크가 큰 환경에서 권한을 얻는지 본다." },
    { allStars: ["칠살"], normalizedReading: "강한 현장 판단과 조직 규율을 요구하는 역할이다." },
    { allStars: ["천상"], normalizedReading: "권한을 절차와 관리 체계 안에서 쓰는 조합이다." },
    { allStars: ["천부"], normalizedReading: "조직 운영과 자원 관리로 성과를 내는 조합이다." }
  ]),
  career("천부", "조직·자원·운영을 안정적으로 관리하는 직업 구조를 중심으로 읽는다.", [
    { allStars: ["자미"], normalizedReading: "대표성과 실무 관리가 함께 놓인다." },
    { allStars: ["염정"], normalizedReading: "규정과 권한을 활용한 조직 운영이 강조된다." },
    { allStars: ["무곡"], normalizedReading: "재무·운영 실행력이 관리 기능과 결합한다." }
  ]),
  career("태음", "내부 운영·자원 관리·정밀한 관찰을 직업 기능으로 쓰는 형식이며 밝기 조건을 중시한다.", [
    { allStars: ["태양"], normalizedReading: "내부 운영과 대외 책임을 함께 맡는다." },
    { allStars: ["천동"], normalizedReading: "사람과 생활 기반을 다루는 업무로 이어진다." },
    { allStars: ["천기"], normalizedReading: "기획과 운영을 오가며 경력을 만드는지 본다." }
  ]),
  career("탐랑", "거래·네트워크·확장·경쟁을 직업 자원으로 쓰는 형식으로 읽는다.", [
    { allStars: ["화성"], normalizedReading: "빠른 승부와 큰 권한을 다룰 때 변동성도 커진다." },
    { allStars: ["령성"], normalizedReading: "기회를 빠르게 잡는 힘과 과열 가능성을 함께 본다." },
    { allStars: ["자미"], normalizedReading: "확장 욕구를 관리 권한 안에서 쓰는 조합이다." }
  ]),
  career("거문", "설명·협상·논쟁·문제 해결이 직업의 핵심 수단이 되는 형식으로 읽는다.", [
    { allStars: ["태양"], normalizedReading: "공개적 발언과 책임이 커지며 경력의 진퇴도 함께 본다." },
    { allStars: ["천기"], normalizedReading: "분석과 말이 결합해 전문성을 만드는 조합이다." }
  ]),
  career("천상", "절차·조정·행정·감독 기능을 중심으로 읽는다.", [
    { allStars: ["자미"], normalizedReading: "공적 권한과 관리 책임이 커지는 조합이다." },
    { allStars: ["무곡"], normalizedReading: "관리와 현장 실행을 함께 맡는다." },
    { allStars: ["염정"], normalizedReading: "규정과 권한을 운용하는 역할이 강조된다." }
  ]),
  career("천량", "보호·감독·심사·조언처럼 경험과 판단을 제공하는 직업 구조로 읽는다.", [
    { allStars: ["천동"], normalizedReading: "사람을 돕는 기능과 조직 책임이 결합한다." },
    { allStars: ["천기"], normalizedReading: "기획과 전문 판단을 함께 쓰는 조합이다." }
  ]),
  career("칠살", "높은 책임·위험 대응·빠른 결단을 요구하는 직업 구조로 읽는다.", [
    { allStars: ["무곡"], normalizedReading: "실행과 통제 권한을 함께 맡는 조합이다." },
    { allStars: ["염정"], normalizedReading: "규율과 현장 판단으로 성과를 내는 조합이다." }
  ]),
  career("파군", "개편·전환·위기 수습·새 판을 만드는 직업 구조로 읽는다.", [
    { allStars: ["무곡"], normalizedReading: "재무·운영 개편을 직접 실행하는 힘이 강조된다." },
    { allStars: ["자미"], normalizedReading: "변화 속에서 관리 권한을 다시 세우는 조합이다." },
    { allStars: ["염정"], normalizedReading: "규정과 이해관계가 복잡한 개편을 맡는지 본다." }
  ]),

  relationship("자미", "관계에서 독립성·주도권·성숙한 약속을 어떻게 조율하는지 본다.", [
    { allStars: ["천부"], normalizedReading: "오래 유지하는 힘과 책임 분담이 함께 강조된다." },
    { allStars: ["천상"], normalizedReading: "상호 존중과 역할 조정이 관계의 핵심이 된다." },
    { allStars: ["파군"], normalizedReading: "관계의 단절과 재구성 가능성을 다른 조건과 함께 본다." },
    { allStars: ["탐랑"], normalizedReading: "강한 끌림을 안정된 약속으로 옮길 수 있는지 본다." }
  ]),
  relationship("천기", "관계에서 생각과 상황이 자주 바뀌므로 대화·시기·생활 조율이 중요해지는 형식이다.", [
    { allStars: ["천량"], normalizedReading: "성숙도와 책임감의 차이를 조율하는 관계로 읽는다." },
    { allStars: ["태음"], normalizedReading: "정서적 세심함과 현실 조율이 함께 강조된다." }
  ]),
  relationship("태양", "관계에서 책임·가시성·사회적 역할의 비중이 크며 약속의 시기를 함께 본다.", [
    { allStars: ["천량"], normalizedReading: "책임감과 보호 기능이 관계를 지탱하는지 본다." },
    { allStars: ["태음"], normalizedReading: "대외 역할과 사적 돌봄의 균형이 핵심이 된다." },
    { allStars: ["거문"], normalizedReading: "말과 책임의 충돌을 조율할 수 있는지 본다." }
  ], true),
  relationship("무곡", "감정보다 책임·생활·재정 분담을 분명히 하는 관계 형식으로 읽는다.", [
    { allStars: ["탐랑"], normalizedReading: "현실적 약속과 강한 욕구의 속도를 맞출 필요가 있다." },
    { allStars: ["칠살"], normalizedReading: "두 사람의 결단과 통제 욕구가 충돌하지 않는지 본다." }
  ]),
  relationship("천동", "편안함과 돌봄을 중시하며 서두르기보다 생활 리듬을 맞추는 관계로 읽는다.", [
    { allStars: ["거문"], normalizedReading: "편안함을 깨는 말과 오해를 어떻게 풀지 본다." },
    { allStars: ["태음"], normalizedReading: "정서적 돌봄과 생활 안정이 함께 강조된다." },
    { allStars: ["천량"], normalizedReading: "성숙한 보호와 책임 분담이 관계를 돕는 조합이다." }
  ]),
  relationship("염정", "끌림·경계·규칙·질투처럼 강도가 높은 관계 요소를 어떻게 다루는지 본다.", [
    { allStars: ["탐랑"], normalizedReading: "매력과 욕구의 강도가 커져 약속의 경계가 중요해진다." },
    { allStars: ["칠살"], normalizedReading: "강한 결단과 갈등의 파장을 함께 본다." },
    { allStars: ["천부"], normalizedReading: "안정과 책임이 관계의 강도를 누그러뜨리는지 본다." }
  ]),
  relationship("천부", "관계를 오래 유지하고 생활 기반을 함께 지키는 힘을 중심으로 읽는다.", [
    { allStars: ["자미"], normalizedReading: "책임과 주도권을 나누는 방식이 관계의 핵심이 된다." },
    { allStars: ["염정"], normalizedReading: "강한 감정과 안정적 생활을 함께 관리해야 한다." }
  ]),
  relationship("태음", "정서적 세심함·돌봄·사생활의 안정이 관계의 중심이며 밝기 조건을 중시한다.", [
    { allStars: ["문창"], normalizedReading: "감정을 말과 글로 정리하는 힘이 관계를 돕는다." },
    { allStars: ["문곡"], normalizedReading: "정서와 미감·표현이 함께 강조된다." },
    { allStars: ["태양"], normalizedReading: "사적 돌봄과 대외 책임의 균형을 본다." },
    { allStars: ["천기"], normalizedReading: "세심한 소통과 생활 조율이 중요해진다." }
  ], true),
  relationship("탐랑", "강한 끌림·교제 욕구·새로움이 관계의 속도를 높이므로 약속의 안정성을 함께 본다.", [
    { allStars: ["염정"], normalizedReading: "감정의 강도와 경계 문제가 함께 커지는지 본다." },
    { allStars: ["자미"], normalizedReading: "강한 끌림을 책임 있는 약속으로 관리할 수 있는지 본다." }
  ], true),
  relationship("거문", "말·해석·의심이 관계의 핵심 변수가 되므로 사실 확인과 소통 방식을 중시한다.", [
    { allStars: ["태양"], normalizedReading: "책임에 관한 말이 공개적 갈등으로 번지지 않는지 본다." },
    { allStars: ["천기"], normalizedReading: "생각이 많아지는 관계에서 합의 방식을 정해야 한다." },
    { allStars: ["천동"], normalizedReading: "편안함을 지키려다 중요한 말을 미루지 않는지 본다." }
  ]),
  relationship("천상", "상호 존중·역할 분담·예의를 갖춘 동반자 관계를 중심으로 읽는다.", [
    { allStars: ["자미"], normalizedReading: "주도권과 책임을 제도적으로 나누는 관계가 된다." },
    { allStars: ["무곡"], normalizedReading: "생활과 재정 분담의 현실성이 중요해진다." },
    { allStars: ["염정"], normalizedReading: "감정의 강도를 명확한 약속으로 다루는지 본다." }
  ]),
  relationship("천량", "보호·책임·성숙함이 관계의 중심이 되며 두 사람의 생활 단계 차이를 함께 본다.", [
    { allStars: ["천동"], normalizedReading: "돌봄과 편안함이 관계를 오래 유지하게 돕는다." },
    { allStars: ["천기"], normalizedReading: "상황 변화 속에서 책임을 재조정하는 힘을 본다." }
  ]),
  relationship("칠살", "관계의 시작과 결정이 빠르고 강할 수 있어 통제·거리·갈등 회복 방식을 함께 본다.", [
    { allStars: ["무곡"], normalizedReading: "현실적 책임과 강한 결단이 충돌하지 않는지 본다." },
    { allStars: ["염정"], normalizedReading: "강한 끌림과 갈등이 반복되지 않도록 경계를 확인한다." }
  ]),
  relationship("파군", "기존 관계 방식을 크게 바꾸거나 끊고 다시 세우는 변동성을 중심으로 읽는다.", [
    { allStars: ["무곡"], normalizedReading: "생활·재정 문제를 계기로 관계 구조를 바꾸는지 본다." },
    { allStars: ["염정"], normalizedReading: "강한 감정과 단절 충동이 번갈아 나타나는지 본다." },
    { allStars: ["자미"], normalizedReading: "변화 뒤 더 성숙한 약속을 다시 세울 수 있는지 본다." }
  ])
];

export const ZIWEI_PALACE_DOCTRINE_RULES: ZiweiPalaceDoctrineRule[] = [
  ...ZIWEI_PALACE_DOCTRINE_RULES_BASE,
  ...ZIWEI_REMAINING_PALACE_DOCTRINE_RULES
];

const expectedCounts: Record<"wealth" | "career" | "relationship", number> = { wealth: 13, career: 14, relationship: 14 };
for (const [domain, expected] of Object.entries(expectedCounts)) {
  const actual = ZIWEI_PALACE_DOCTRINE_RULES_BASE.filter((rule) => rule.domain === domain).length;
  if (actual !== expected) throw new Error(`ZIWEI_PALACE_RULE_COUNT_MISMATCH: ${domain} ${actual}/${expected}`);
}
if (new Set(ZIWEI_PALACE_DOCTRINE_RULES.map((rule) => rule.id)).size !== ZIWEI_PALACE_DOCTRINE_RULES.length) {
  throw new Error("ZIWEI_PALACE_RULE_ID_DUPLICATE");
}

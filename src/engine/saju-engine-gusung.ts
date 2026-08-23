/**
 * 구성기학(九星氣學) 본명성 엔진 — 생년(입춘 기준)으로 九星 본명성을 결정적 산출.
 * 일본·동양에서 방위·이사·택일에 쓰는 체계. 명리(命理)와 별개. 보조 정보이며
 * 길흉을 확정·보장하지 않는다(disclaimer).
 */
import { Solar } from "lunar-typescript";

const STARS: Record<number, { name: string; element: string; trait: string }> = {
  1: { name: "일백수성(一白水星)", element: "수", trait: "지혜·유연·인내, 흐름을 타는 적응력. 고독·기복 주의." },
  2: { name: "이흑토성(二黑土星)", element: "토", trait: "근면·포용·보좌, 묵묵한 실속. 우유부단·소극 주의." },
  3: { name: "삼벽목성(三碧木星)", element: "목", trait: "추진·발전·행동력, 새 시작에 강. 성급·구설 주의." },
  4: { name: "사록목성(四綠木星)", element: "목", trait: "신용·교제·조화, 인연·거래운. 우유부단·휩쓸림 주의." },
  5: { name: "오황토성(五黃土星)", element: "토", trait: "중심·강력·제왕, 흥망의 진폭이 큼. 독선·과욕 주의." },
  6: { name: "육백금성(六白金星)", element: "금", trait: "지도·권위·결단, 책임지는 자리. 완고·고집 주의." },
  7: { name: "칠적금성(七赤金星)", element: "금", trait: "사교·화술·금전·즐거움, 인기. 낭비·구설 주의." },
  8: { name: "팔백토성(八白土星)", element: "토", trait: "축적·변화·부동산·계승, 끈기. 변덕·고집 주의." },
  9: { name: "구자화성(九紫火星)", element: "화", trait: "명예·표현·예술·총명, 빛나는 자리. 다혈·이별 주의." }
};

/** 생년월일(양력)로 입춘 기준 본명성(本命星)을 산출한다. */
export function bonMyeongSeong(year: number, month: number, day: number): { star: number; name: string; element: string; trait: string; ipchunAdjustedYear: number; disclaimer: string } {
  // 입춘(2/4경) 이전 출생은 전년으로 본다 — 절기 정밀은 lunar로 보정.
  const lunar = Solar.fromYmd(year, month, day).getLunar();
  const prevJie = lunar.getPrevJieQi(true).getName();
  let y = year;
  // 1~2월 초 입춘 이전이면 전년
  if (month === 1 || (month === 2 && day < 4) || (prevJie !== "立春" && prevJie !== "雨水" && (month <= 2))) {
    if (month <= 2 && !["立春","雨水","驚蟄","惊蛰"].includes(prevJie)) y = year - 1;
  }
  // 본명성 = 11 - (연도 각 자리수 합을 한 자리로 축약), 9순환
  let s = String(y).split("").reduce((a, c) => a + Number(c), 0);
  while (s > 9) s = String(s).split("").reduce((a, c) => a + Number(c), 0);
  const star = ((11 - s - 1) % 9 + 9) % 9 + 1;
  const info = STARS[star];
  return { star, name: info.name, element: info.element, trait: info.trait, ipchunAdjustedYear: y, disclaimer: "[구성기학 본명성 — 입춘 기준 결정적 산출. 명리와 별개 체계. 방위 길흉(오황살·암검살 등)은 해당 연반(年盤)이 추가로 필요. 보조 정보이며 확정·보장 아님.]" };
}

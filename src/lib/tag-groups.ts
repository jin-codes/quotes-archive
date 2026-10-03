// Two-level classification: broad groups on top, detailed tags inside each group.
// Tags that are not listed here fall into an automatic "기타" group.
export const TAG_GROUPS: { name: string; tags: string[] }[] = [
  { name: "시작·희망", tags: ["시작", "도전", "희망", "기회", "성장", "성취"] },
  { name: "용기·끈기", tags: ["용기", "끈기", "역경", "극복", "실패", "신념", "태도"] },
  { name: "삶·시간", tags: ["삶", "시간", "현재", "의미", "죽음", "변화", "위기", "선택", "책임"] },
  { name: "마음·지혜", tags: ["마음", "자기성찰", "지혜", "진실", "겸손", "준비", "집중", "배움"] },
  { name: "고통·위로", tags: ["고통", "두려움", "위로", "후회"] },
  { name: "관계·행복", tags: ["인간관계", "사랑", "행복", "즐거움", "감사", "위선"] },
  { name: "일·성공", tags: ["일", "성공", "리더십", "약속", "신뢰"] },
  { name: "문학·철학", tags: ["문학", "철학", "속담"] },
];

export const OTHER_GROUP = "기타";

const known = new Map<string, string>();
TAG_GROUPS.forEach((g) => g.tags.forEach((t) => known.set(t, g.name)));

export function groupOfTag(tag: string): string {
  return known.get(tag) ?? OTHER_GROUP;
}

/** Tags of a group, including unlisted tags for the "기타" group. */
export function tagsOfGroup(group: string, allTags: Iterable<string>): string[] {
  if (group === OTHER_GROUP) return Array.from(new Set(allTags)).filter((t) => !known.has(t));
  return TAG_GROUPS.find((g) => g.name === group)?.tags ?? [];
}

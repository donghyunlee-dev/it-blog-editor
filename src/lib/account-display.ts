/**
 * 계정을 "누구인지" 나타내는 일반 표시 문구를 계산한다(P5-5). 이름이 있으면
 * "이름(이메일)" 형식으로, 없으면(하위 호환 — `accountMeta`가 아직 없거나 온보딩
 * 전인 계정) 기존처럼 이메일만 보여준다.
 *
 * `AccountInfoModal`의 "이메일" 필드처럼 값 자체가 이메일이라는 걸 라벨로 명시하는
 * 곳은 이 함수의 대상이 아니다 — 그런 곳은 이메일 원본을 그대로 보여줘야 한다.
 */
export function formatAccountLabel(email: string, name?: string): string {
  const trimmedName = name?.trim();
  return trimmedName ? `${trimmedName}(${email})` : email;
}

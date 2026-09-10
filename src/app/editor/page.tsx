import Link from "next/link";
import { Card, Typography } from "@sfood/ui";
import { BrandIcon } from "@/components/BrandIcon";
import { LandingSearchButton } from "@/components/editor/LandingSearchButton";

/*
 * 문서를 아직 하나도 열지 않은 상태의 기본 화면. 처음엔 EmptyState 한 줄만 있었고,
 * 그다음엔 5개 팁을 같은 무게로 나열했는데도 "화면 구성이 단조롭다... 특별한 기능의
 * 소개처럼 안 보여"라는 피드백을 받았다(2026-08-26). 모든 기능을 똑같은 카드로
 * 늘어놓으면 무엇이 이 서비스를 다른 문서 도구와 다르게 만드는지 눈에 띄지 않는다 —
 * 서비스 기획자라면 "이게 제일 중요한 기능이다"를 먼저 보여주고, 나머지는 그걸
 * 뒷받침하는 보조 정보로 배치할 것이다. 그래서 가장 차별화된 기능(문서를 바로 외부에
 * 공개하는 것 — 단순 사내 메모장이 아니라 퍼블리싱 도구라는 정체성)을 스포트라이트
 * 카드로 먼저 보여주고, 나머지 4개는 그보다 작은 보조 카드 그리드로 내린다.
 */
function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function GlobeIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3 10h14M10 3c2.2 2 3.5 4.6 3.5 7s-1.3 5-3.5 7c-2.2-2-3.5-4.6-3.5-7s1.3-5 3.5-7Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function SlashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M13 4L7 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SelectionIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M6 4H4v3M6 16H4v-3M14 4h2v3M14 16h2v-3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TagOutlineIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 4.5h6.2L16 10.3l-5.7 5.7L4.5 10.2V4.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="7.5" r="1" fill="currentColor" />
    </svg>
  );
}

function ImageOutlineIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="7.2" cy="8.2" r="1.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4 14.5l3.8-3.8 2.7 2.7 2.5-2.5L16.5 14" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

const SUPPORTING_TIPS = [
  {
    icon: <SlashIcon />,
    title: "빠른 서식",
    body: "본문에서 '/'를 입력하면 제목, 목록, 표, 정보/경고 패널 등을 바로 넣을 수 있어요.",
  },
  {
    icon: <SelectionIcon />,
    title: "선택해서 꾸미기",
    body: "문장을 드래그해서 선택하면 굵게·기울임·글자색·링크를 바로 적용할 수 있어요.",
  },
  {
    icon: <TagOutlineIcon />,
    title: "태그로 정리",
    body: "문서에 태그를 붙이면 왼쪽 문서함에서 태그로 필터링해 빠르게 찾을 수 있어요.",
  },
  {
    icon: <ImageOutlineIcon />,
    title: "이미지 추가",
    body: "문서를 먼저 저장하면, 그 뒤로는 이미지를 끌어다 놓거나 붙여넣을 수 있어요.",
  },
];

export default function EditorHomePage() {
  return (
    <div className="mx-auto flex h-full max-w-[640px] flex-col gap-10 px-6 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <BrandIcon size={40} className="rounded-lg" />
        <div className="flex flex-col items-center gap-1.5">
          <Typography variant="h2" className="text-2xl font-semibold">
            SFOOD IT Editor
          </Typography>
          <Typography variant="body-sm" className="text-muted">
            SFOOD IT/AX팀을 위한 사내 문서 작성 도구입니다.
          </Typography>
        </div>
        <Link
          href="/editor/new"
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-btn bg-brand px-5 py-2.5 text-sm font-medium text-on-brand transition-colors duration-default hover:bg-brand-hover"
        >
          <PlusIcon />
          새 문서 작성
        </Link>
        {/*
          support.claude.com/ko 벤치마킹(design.md "8. 검색" 절, P8-4) — 히어로에 큰 검색
          진입점을 추가한다. "새 문서 작성"이 이 화면의 유일한 primary 액션이라(CLAUDE.md
          "한 화면에 primary는 1개"), 이 버튼은 중립 톤(border+bg-surface)으로 둬 시각적
          우선순위가 겹치지 않게 한다.
        */}
        <div className="mt-1 w-full max-w-[420px]">
          <LandingSearchButton />
        </div>
      </div>

      <Card padding="lg" className="spotlight-card">
        <div className="flex items-start gap-4">
          <span className="spotlight-icon-chip spotlight-accent-text flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
            <GlobeIcon />
          </span>
          <div>
            <p className="spotlight-accent-text text-xs font-semibold uppercase tracking-wide">대표 기능</p>
            <p className="mt-1 text-base font-semibold text-foreground">
              쓴 문서를 바로 외부에 공개하세요
            </p>
            <p className="mt-1 text-sm text-muted">
              단순 사내 메모가 아니라 퍼블리싱까지 이어지는 도구예요. 문서를 저장한 뒤
              &apos;게시 설정&apos;에서 Tech Blog 등 원하는 뷰어에 선택적으로 공개할 수 있어요.
            </p>
          </div>
        </div>
      </Card>

      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
          더 빠르게 쓰는 법
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SUPPORTING_TIPS.map((tip) => (
            <Card key={tip.title} padding="md">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-subtle text-muted">
                  {tip.icon}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{tip.title}</p>
                  <p className="mt-0.5 text-sm text-muted">{tip.body}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

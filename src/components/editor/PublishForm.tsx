"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, FormField, Input, Modal, Switch, Textarea, useToast } from "@sfood/ui";

interface ViewerMetadata {
  slug: string;
  metaDescription: string;
  /** 서버가 계산해 돌려주는 실제 공개 slug(`slug-내부고유키`, P0-7/P0-5b). 읽기 전용 —
   * 폼이 직접 편집하거나 서버로 다시 보내지 않는다. */
  publicSlug?: string;
}

export interface PublishFormInitial {
  isPublished: boolean;
  viewers: Record<string, ViewerMetadata>;
}

interface PublishFormProps {
  pageId: string;
  initial: PublishFormInitial;
}

const VIEWER_OPTIONS = [{ value: "tech-blog", label: "Tech Blog" }];

const emptyMetadata = (): ViewerMetadata => ({ slug: "", metaDescription: "" });

/**
 * 2026-08-26, "게시 설정 오버레이로 바꿔줘" + "설정 팝업을 누가 체크박스로 해" 피드백으로
 * 재구성했다.
 *
 * - 예전엔 별도 페이지였다가 이번에 모달(오버레이)로 옮겨졌다(DocumentEditor.tsx 참고).
 * - Switch였던 걸 한 번 Checkbox로 바꿨었는데("게시 설정 저장" 버튼을 눌러야만
 *   반영되는데 Switch는 "지금 바로 적용된다"는 신호를 줘서 신호 불일치가 있었다),
 *   사용자가 "설정 팝업에 체크박스는 안 맞다"고 되돌려달라고 했다 — 맞는 지적이다.
 *   그래서 Switch로 다시 바꾸되, 이번엔 신호 불일치 자체를 없앴다: 토글을 누르는
 *   순간 곧바로 저장 요청을 보낸다(더 이상 "저장" 버튼이 없다) — Notion·Linear의
 *   공유 설정 팝업과 같은 방식이다. 자유 텍스트(slug/메타 설명)는 매 타이핑마다
 *   요청을 보내면 낭비이자 slug 중복 검사에도 부담이라, 입력을 벗어날 때(blur)
 *   저장한다. 두 경우 모두 "지금 이 컴포넌트가 들고 있는 전체 상태"를 함께 보내
 *   부분 업데이트로 인한 값 덮어쓰기(레이스)를 막는다 — 서버 API가 부분이 아니라
 *   전체 스냅샷을 받는 구조이기 때문이다.
 */
export function PublishForm({ pageId, initial }: PublishFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPublished, setIsPublished] = useState(initial.isPublished);
  // 저장된 설정이 없는 새 문서는 모든 뷰어를 노출 대상으로 시작한다(기존 동작 유지).
  const [enabledViewers, setEnabledViewers] = useState<string[]>(() => {
    const saved = VIEWER_OPTIONS.map((option) => option.value).filter(
      (viewerId) => initial.viewers[viewerId]
    );
    return saved.length ? saved : VIEWER_OPTIONS.map((option) => option.value);
  });
  // slug/메타 설명은 뷰어마다 따로 관리한다. 뷰어가 늘어나도 한 벌의 값을 모든
  // 뷰어에 복사하지 않도록 카드(뷰어) 단위로 상태를 나눠 둔다.
  const [viewerFields, setViewerFields] = useState<
    Record<string, ViewerMetadata>
  >(() =>
    Object.fromEntries(
      VIEWER_OPTIONS.map((option) => [
        option.value,
        initial.viewers[option.value] ?? emptyMetadata(),
      ])
    )
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  // 토글 옆 안내 문구를 aria-describedby로 연결하기 위한 id 접두사.
  const hintId = useId();
  // 이미 게시된 문서를 끄려는 시도만 확인을 받는다(P0-2 — 감사에서 지적된 위험은
  // "이미 공개된 문서가 실수로 순간 비공개 전환"되는 쪽이지, 게시 시작이 아니다).
  const [unpublishConfirmOpen, setUnpublishConfirmOpen] = useState(false);

  /** 응답 본문에서 공통 에러 형식의 메시지를 꺼낸다(비-JSON 응답이면 기본 문구). */
  async function errorMessageOf(response: Response, fallback: string) {
    const data = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    return data?.error?.message ?? fallback;
  }

  /**
   * 매번 "지금 컴포넌트가 들고 있는" isPublished/enabledViewers/viewerFields 전체를
   * 인자로 받아 그대로 전송한다 — React state는 비동기라, 방금 setState한 값을
   * 클로저 밖(같은 이벤트 핸들러 안)에서 바로 읽으면 갱신 전 값을 읽을 수 있다.
   * 호출부가 "다음에 반영될 값"을 직접 계산해 넘기게 해서 이 문제를 피한다.
   */
  async function persist(next: {
    isPublished: boolean;
    enabledViewers: string[];
    viewerFields: Record<string, ViewerMetadata>;
  }) {
    setSaveState("saving");
    const viewers: Record<string, ViewerMetadata> = {};
    for (const viewerId of next.enabledViewers) {
      viewers[viewerId] = next.viewerFields[viewerId] ?? emptyMetadata();
    }

    try {
      const response = await fetch(`/api/editor/documents/${pageId}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: next.isPublished, viewers }),
      });
      if (!response.ok) {
        // slug 중복(409)·필수값 누락(400) 등은 서버 문구가 더 구체적이므로 그대로 띄운다.
        throw new Error(
          await errorMessageOf(response, "게시 설정 저장에 실패했습니다.")
        );
      }
      setSaveState("saved");
      // 게시 상태는 서버 컴포넌트(사이드바·문서 헤더)에서 렌더되므로 갱신을 요청한다.
      router.refresh();
    } catch (err) {
      setSaveState("idle");
      toast(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
        "danger"
      );
    }
  }

  /**
   * 이미 게시된 문서를 끄려는 시도(next===false && 현재 isPublished===true)는 즉시
   * 반영하지 않고 확인 Modal부터 띄운다(P0-2 — `window.confirm()` 대신 `Modal`을 쓰는
   * 이 프로젝트 규칙, `DocumentEditor.tsx`의 삭제 확인 모달과 같은 패턴). `setIsPublished`를
   * 아직 호출하지 않으므로 `Switch`의 `checked`는 그대로 true를 가리켜, 사용자가 확인하기
   * 전까지는 시각적으로도 켜진 상태 그대로 남는다.
   */
  function handlePublishedChange(next: boolean) {
    if (!next && isPublished) {
      setUnpublishConfirmOpen(true);
      return;
    }
    setIsPublished(next);
    void persist({ isPublished: next, enabledViewers, viewerFields });
  }

  function confirmUnpublish() {
    setUnpublishConfirmOpen(false);
    setIsPublished(false);
    void persist({ isPublished: false, enabledViewers, viewerFields });
  }

  function cancelUnpublish() {
    setUnpublishConfirmOpen(false);
  }

  function handleViewerToggle(viewerId: string, enabled: boolean) {
    const next = enabled
      ? enabledViewers.includes(viewerId)
        ? enabledViewers
        : [...enabledViewers, viewerId]
      : enabledViewers.filter((value) => value !== viewerId);
    setEnabledViewers(next);
    void persist({ isPublished, enabledViewers: next, viewerFields });
  }

  function updateViewerField(
    viewerId: string,
    field: keyof ViewerMetadata,
    value: string
  ) {
    setViewerFields((prev) => ({
      ...prev,
      [viewerId]: { ...prev[viewerId], [field]: value },
    }));
  }

  function handleFieldBlur() {
    void persist({ isPublished, enabledViewers, viewerFields });
  }

  return (
    // 예전엔 <form>이었지만 더 이상 제출 버튼이 없어(자동 저장) 폼일 필요가 없다 —
    // 이 컴포넌트는 이제 DocumentEditor.tsx의 Modal 안, 즉 문서 저장용 <form> 내부에
    // 놓이는데, HTML은 <form> 중첩을 허용하지 않으므로 어차피 <form>일 수 없었다.
    <div className="flex flex-col gap-8">
      {/*
        이 문서 전체의 게시 여부를 결정하는 최상위 스위치라 나머지 뷰어별 설정과
        같은 톤으로 두면 묻힌다 — 옅은 배경 박스로 시각적으로 분리해 "이게 이
        화면의 마스터 스위치다"를 바로 알 수 있게 한다.
      */}
      <div className="flex items-center justify-between gap-4 rounded-card border border-border bg-surface-subtle px-4 py-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">게시함</p>
          <p id={`${hintId}-publish`} className="text-xs text-muted">
            켜면 아래 노출 중인 뷰어에 이 문서가 바로 공개됩니다.
          </p>
        </div>
        <Switch
          checked={isPublished}
          onChange={handlePublishedChange}
          label="게시함"
          disabled={saveState === "saving"}
          aria-describedby={`${hintId}-publish`}
        />
      </div>

      {/*
        뷰어마다 Card로 감싸지 않는다 — 문서 편집 화면이 "박스 없는 캔버스"인 것과
        같은 방향이다. Card 대신 위쪽 구분선 + 제목으로 섹션을 나눈다. 뷰어 이름과
        그 뷰어의 노출 스위치를 한 줄(제목 왼쪽·스위치 오른쪽)에 짝지어, 스위치가
        어떤 섹션에 속한 것인지 시각적으로 바로 연결되게 한다.
      */}
      {VIEWER_OPTIONS.map((option, index) => (
        <div
          key={option.value}
          className={index === 0 ? "flex flex-col gap-4" : "flex flex-col gap-4 border-t border-border pt-8"}
        >
          <div className="flex items-center justify-between gap-4">
            <p className="font-semibold text-foreground">{option.label}</p>
            <Switch
              checked={enabledViewers.includes(option.value)}
              onChange={(enabled) => handleViewerToggle(option.value, enabled)}
              label={`${option.label} 노출`}
              disabled={saveState === "saving"}
              aria-describedby={`${hintId}-viewer-${option.value}`}
            />
          </div>
          {/* 노출 뷰어가 하나도 없으면 게시 저장이 거부되므로(서버의
              "게시 시 최소 하나의 뷰어 설정이 필요합니다") 미리 알린다. */}
          <p id={`${hintId}-viewer-${option.value}`} className="-mt-2 text-xs text-muted">
            게시하려면 최소 1개 뷰어가 노출 상태여야 합니다.
          </p>

          {/*
            라벨마다 "Tech Blog"를 반복하지 않는다 — 필드가 이미 "Tech Blog"라는
            섹션 제목 아래 명확히 묶여 있어 뷰어 이름을 또 반복하는 게 중복이었다.
          */}
          <FormField label="공개 경로(slug)">
            <Input
              value={viewerFields[option.value].slug}
              onChange={(event) =>
                updateViewerField(option.value, "slug", event.target.value)
              }
              onBlur={handleFieldBlur}
              placeholder="예: my-first-post"
            />
            {/* P0-7/P0-5b: 실제 공개 URL은 여기 입력한 값 그대로가 아니라 뒤에 내부
                고유키가 덧붙는다(다른 사용자의 slug와 절대 겹치지 않게 하기 위해).
                저장된 적이 있을 때만(publicSlug가 있을 때만) 실제 값을 보여준다. */}
            {viewerFields[option.value].publicSlug && (
              <p className="mt-1 text-xs text-muted">
                실제 공개 경로: {viewerFields[option.value].publicSlug}
              </p>
            )}
          </FormField>

          <FormField label="메타 설명">
            <Textarea
              value={viewerFields[option.value].metaDescription}
              onChange={(event) =>
                updateViewerField(
                  option.value,
                  "metaDescription",
                  event.target.value
                )
              }
              onBlur={handleFieldBlur}
              rows={3}
            />
          </FormField>
        </div>
      ))}

      {/* 더 이상 "저장" 버튼이 없으니(자동 저장), 지금 저장 중인지·저장됐는지를
          알려줄 최소한의 상태 표시가 필요하다. aria-live로 스크린리더에도 알린다. */}
      <p className="text-xs text-muted" role="status" aria-live="polite">
        {saveState === "saving" && "저장 중..."}
        {saveState === "saved" && "모든 변경 사항이 저장됨"}
      </p>

      {/*
        이 컴포넌트 자체가 이미 DocumentEditor.tsx의 게시 설정 Modal 안에서 렌더링되므로
        이건 중첩된 두 번째 Modal이다. @sfood/ui의 Modal은 포털을 쓰지 않고 자기 위치에서
        `fixed inset-0`로 그리지만, `position: fixed`는 `relative` 조상(바깥 Modal의 다이얼로그
        박스)에 갇히지 않고 뷰포트 기준으로 그대로 전체 화면을 덮으므로 정상적으로 위에
        쌓인다(DOM상 더 늦게 그려지는 안쪽 Modal이 바깥 Modal 위에 자연스럽게 올라온다).
      */}
      <Modal
        open={unpublishConfirmOpen}
        onClose={cancelUnpublish}
        title="게시 취소"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={cancelUnpublish}>
              취소
            </Button>
            <Button type="button" variant="danger" onClick={confirmUnpublish}>
              게시 취소
            </Button>
          </>
        }
      >
        게시를 취소하면 이 문서가 즉시 비공개로 전환되어 더 이상 노출 중인 뷰어에서
        보이지 않습니다. 계속하시겠습니까?
      </Modal>
    </div>
  );
}

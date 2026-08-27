"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal } from "@sfood/ui";

interface NavigateEvent {
  preventDefault(): void;
}

interface UnsavedChangesContextValue {
  isDirty: boolean;
  /** 문서 제목/본문/태그가 바뀔 때마다 호출한다. 저장·삭제가 성공하면 false로 되돌린다. */
  setDirty: (dirty: boolean) => void;
  /**
   * `<Link onNavigate>`에 그대로 연결한다. 저장하지 않은 변경사항이 있을 때만
   * `event.preventDefault()`로 이동을 막고 확인 Modal을 띄운다 — 없으면 아무 일도
   * 하지 않아 평소처럼 이동한다.
   */
  guardNavigate: (event: NavigateEvent, href: string) => void;
}

/**
 * Provider 없이 쓰이면(예: DocumentEditor를 단독 렌더링하는 컴포넌트 테스트) 이탈 경고
 * 기능은 조용히 비활성화되고 기존 동작(즉시 이동) 그대로 유지된다 — `useToast()`와 같은
 * "기본값이 no-op인 Context" 패턴이다. Provider가 필수라며 던지지 않는다.
 */
const noop = () => {};
const UnsavedChangesContext = createContext<UnsavedChangesContextValue>({
  isDirty: false,
  setDirty: noop,
  guardNavigate: noop,
});

export function useUnsavedChanges(): UnsavedChangesContextValue {
  return useContext(UnsavedChangesContext);
}

/**
 * 저장하지 않은 변경사항이 있을 때 이탈을 막는다(2026-08-27, P0-1a — 감사에서 지적된
 * "저장 전 이탈 시 경고 없이 사라짐" 문제).
 *
 * 두 가지 이탈 경로를 다르게 다룬다:
 * - 브라우저 자체 이탈(탭 닫기·새로고침·주소창에 새 URL 입력): `beforeunload`의 네이티브
 *   대화상자를 쓴다. 브라우저가 강제하는 UI라 커스터마이즈할 수 없고 문구도 브라우저마다
 *   고정이다.
 * - 앱 내부 이동(`<Link>` 클릭): Next.js 16의 `<Link onNavigate>`(v15.3.0+, 공식 문서
 *   "Blocking navigation" 절)로 가로챈 뒤, `window.confirm()` 대신 `Modal`로 확인받는다
 *   (CLAUDE.md 규칙). 확인하면 원래 가려던 곳(`pendingHref`)으로 이 컴포넌트가 직접
 *   `router.push`한다.
 */
export function UnsavedChangesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isDirty, setIsDirty] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!isDirty) {
      return;
    }
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      // Chrome은 returnValue를 설정해야 대화상자를 띄운다(표시되는 문구 자체는
      // 브라우저가 고정 문자열로 대체하므로 이 값은 실제로 노출되지 않는다).
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const guardNavigate = useCallback(
    (event: NavigateEvent, href: string) => {
      if (isDirty) {
        event.preventDefault();
        setPendingHref(href);
      }
    },
    [isDirty]
  );

  function confirmLeave() {
    const href = pendingHref;
    setPendingHref(null);
    setIsDirty(false);
    if (href) {
      router.push(href);
    }
  }

  function cancelLeave() {
    setPendingHref(null);
  }

  return (
    <UnsavedChangesContext.Provider
      value={{ isDirty, setDirty: setIsDirty, guardNavigate }}
    >
      {children}
      <Modal
        open={pendingHref !== null}
        onClose={cancelLeave}
        title="저장하지 않은 변경사항이 있습니다"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={cancelLeave}>
              계속 편집
            </Button>
            <Button type="button" variant="danger" onClick={confirmLeave}>
              변경사항 버리고 이동
            </Button>
          </>
        }
      >
        지금 이동하면 저장하지 않은 내용이 사라집니다.
      </Modal>
    </UnsavedChangesContext.Provider>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, FormField, Input, Switch, Textarea, useToast } from "@sfood/ui";

interface ViewerMetadata {
  slug: string;
  metaDescription: string;
}

interface PublishFormProps {
  pageId: string;
  initial: {
    isPublished: boolean;
    viewers: Record<string, ViewerMetadata>;
  };
}

const VIEWER_OPTIONS = [{ value: "tech-blog", label: "Tech Blog" }];

const emptyMetadata = (): ViewerMetadata => ({ slug: "", metaDescription: "" });

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
  const [status, setStatus] = useState<"idle" | "saving">("idle");

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

  function toggleViewer(viewerId: string, enabled: boolean) {
    setEnabledViewers((prev) =>
      enabled
        ? prev.includes(viewerId)
          ? prev
          : [...prev, viewerId]
        : prev.filter((value) => value !== viewerId)
    );
  }

  /** 응답 본문에서 공통 에러 형식의 메시지를 꺼낸다(비-JSON 응답이면 기본 문구). */
  async function errorMessageOf(response: Response, fallback: string) {
    const data = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    return data?.error?.message ?? fallback;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("saving");

    // 노출로 켜 둔 뷰어만 전송한다. 게시 여부(isPublished)와는 독립적이므로,
    // 게시를 내려도 뷰어별 slug/메타 설명 설정은 그대로 보존된다.
    const viewers: Record<string, ViewerMetadata> = {};
    for (const viewerId of enabledViewers) {
      viewers[viewerId] = viewerFields[viewerId] ?? emptyMetadata();
    }

    try {
      const response = await fetch(`/api/editor/documents/${pageId}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished, viewers }),
      });
      if (!response.ok) {
        // slug 중복(409)·필수값 누락(400) 등은 서버 문구가 더 구체적이므로 그대로 띄운다.
        throw new Error(
          await errorMessageOf(response, "게시 설정 저장에 실패했습니다.")
        );
      }
      toast("게시 설정이 저장되었습니다.", "success");
      // 게시 상태는 서버 컴포넌트(게시 설정 페이지·사이드바)에서 렌더되므로 갱신을 요청한다.
      router.refresh();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
        "danger"
      );
    } finally {
      setStatus("idle");
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      {/* Switch의 label prop은 sr-only로만 렌더되므로 화면용 텍스트를 따로 두고,
          중복 안내를 막기 위해 그 텍스트는 aria-hidden으로 감춘다. */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground" aria-hidden="true">
          게시함
        </span>
        <Switch
          checked={isPublished}
          onChange={setIsPublished}
          label="게시함"
          disabled={status === "saving"}
        />
      </div>

      {VIEWER_OPTIONS.map((option) => (
        <Card
          key={option.value}
          title={option.label}
          description="이 뷰어로 공개할 때 사용할 주소와 검색 노출 문구입니다."
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted" aria-hidden="true">
                노출
              </span>
              <Switch
                checked={enabledViewers.includes(option.value)}
                onChange={(enabled) => toggleViewer(option.value, enabled)}
                label={`${option.label} 노출`}
                disabled={status === "saving"}
              />
            </div>

            <FormField label={`${option.label} 공개 경로(slug)`}>
              <Input
                value={viewerFields[option.value].slug}
                onChange={(event) =>
                  updateViewerField(option.value, "slug", event.target.value)
                }
                placeholder="예: my-first-post"
              />
            </FormField>

            <FormField label={`${option.label} 메타 설명`}>
              <Textarea
                value={viewerFields[option.value].metaDescription}
                onChange={(event) =>
                  updateViewerField(
                    option.value,
                    "metaDescription",
                    event.target.value
                  )
                }
                rows={3}
              />
            </FormField>
          </div>
        </Card>
      ))}

      <div>
        <Button type="submit" variant="primary" disabled={status === "saving"}>
          {status === "saving" ? "저장 중..." : "게시 설정 저장"}
        </Button>
      </div>
    </form>
  );
}

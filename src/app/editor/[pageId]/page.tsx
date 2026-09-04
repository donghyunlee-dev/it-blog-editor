import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getDocumentDetail,
  requireDocumentOwner,
  type DocumentDetail,
} from "@/lib/editor/documents";
import { getTags } from "@/lib/editor/tags";
import { listTagSuggestions } from "@/lib/editor/tag-suggestions";
import { getPublishState, type PublishMetadata } from "@/lib/editor/publish";
import { NotFoundError, UnauthorizedError } from "@/lib/editor/errors";
import { DocumentEditor } from "@/components/editor/DocumentEditor";

interface EditDocumentPageProps {
  params: Promise<{ pageId: string }>;
}

export default async function EditDocumentPage({
  params,
}: EditDocumentPageProps) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    redirect("/login");
  }

  const { pageId } = await params;

  // 태그 자동완성 목록은 이 문서와 무관한(작성자 본인 소유의) 데이터이므로 문서 조회와 겹쳐
  // 시작해 왕복 한 번을 절약한다. 아래 try/catch 밖에서 시작·await하는 것이 핵심이다 —
  // 이 호출은 소유권 매핑(NotFoundError/UnauthorizedError → notFound())에 절대 끼어들면
  // 안 된다. listTagSuggestions는 던지지 않도록 만들어져 있어, 중간에 notFound()가 던져져
  // 이 promise를 await하지 못해도 unhandled rejection이 생기지 않는다.
  const tagSuggestionsPromise = listTagSuggestions(email);

  let document: DocumentDetail;
  let tags: string[];
  let publishState: PublishMetadata;
  try {
    document = await getDocumentDetail(pageId);
    // 남의 문서는 "없는 문서"와 똑같이 404로 처리한다. 별도의 권한 오류 화면을 보여주면
    // pageId를 찍어보는 직원이 "존재하지 않음"과 "존재하지만 내 것이 아님"을 구별할 수 있다.
    await requireDocumentOwner(pageId, email);
    // 태그·게시 설정 조회는 소유권 확인을 통과한 뒤에 한다. getDocumentDetail과 병렬로
    // 돌리면 왕복 한 번을 아낄 수 있지만, 남의 문서 데이터를 인가 전에 읽게 되므로
    // 그대로 둔다. 게시 설정은 예전에는 별도 페이지(/editor/[pageId]/publish)에서
    // 그때 가서 조회했는데, 이제 그 화면이 편집 화면 위 오버레이(Modal)로 바뀌면서
    // (2026-08-26, 사용자 피드백 — "게시 설정 오버레이로 바꿔줘") DocumentEditor가
    // 클라이언트 컴포넌트라 직접 서버 데이터를 못 읽어, 여기서 함께 가져와 내려준다.
    [tags, publishState] = await Promise.all([getTags(pageId), getPublishState(pageId)]);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof UnauthorizedError) {
      notFound();
    }
    throw error;
  }

  const tagSuggestions = await tagSuggestionsPromise;

  // DocumentEditor가 헤더(탐색기로·삭제·게시 설정·저장)와 본문 캔버스를 전부 소유한다
  // (2026-08-25, "박스 없이 페이지 전체가 에디터처럼 보이게" 요청 — 산출물:
  // DocumentEditor.tsx). 예전에는 여기서 별도 h1("문서 편집")과 부제목(문서 제목)을
  // 카드 바깥에 뒀는데, 이제 카드 자체가 없어져 그 자리가 필요 없다 — 문서 제목은
  // DocumentEditor 안의 편집 가능한 제목 입력창 하나로만 보인다.
  return (
    <main>
      <DocumentEditor
        mode="edit"
        pageId={document.pageId}
        initialTitle={document.title}
        initialDoc={document.doc}
        initialTags={tags}
        tagSuggestions={tagSuggestions}
        initialVersion={document.version}
        initialPublishState={publishState}
        initialUpdatedAt={document.updatedAt}
        initialLastEditedBy={document.lastEditedBy}
      />
    </main>
  );
}

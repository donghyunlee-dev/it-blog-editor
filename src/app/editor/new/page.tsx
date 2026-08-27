import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listTagSuggestions } from "@/lib/editor/tag-suggestions";
import { DocumentEditor } from "@/components/editor/DocumentEditor";

export default async function NewDocumentPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    redirect("/login");
  }

  const tagSuggestions = await listTagSuggestions(email);

  // DocumentEditor가 헤더(탐색기로·저장)와 본문 캔버스를 전부 소유한다(2026-08-25,
  // "박스 없이 페이지 전체가 에디터처럼 보이게" 요청 — 산출물: DocumentEditor.tsx).
  return (
    <main>
      <DocumentEditor mode="create" tagSuggestions={tagSuggestions} />
    </main>
  );
}

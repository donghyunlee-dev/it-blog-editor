import { EmptyState } from "@sfood/ui";

export default function EditorHomePage() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <EmptyState title="문서를 선택하거나 새로 작성하세요" />
    </div>
  );
}

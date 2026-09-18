import { generateJSON } from "@tiptap/core";
import type { Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, Color, FontSize } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { common, createLowlight } from "lowlight";
import {
  AttachmentImage,
  CodeBlockWithLanguagePicker,
  DocumentLink,
  LinkWithOpenHint,
  Panel,
  TableWithToolbar,
} from "@/components/editor/RichTextEditor";
import type { JSONContent } from "./tiptap-to-storage";

/**
 * `RichTextEditor.tsx`가 실제 편집에 쓰는 확장 목록과 최대한 같게 맞춘다(P19-6, 복원용
 * 역변환) — 스키마가 다르면 같은 노드 타입인데도 파싱이 실패하거나 다르게 해석될 수 있다.
 * `Placeholder`/`SlashCommandExtension`은 플러그인일 뿐 노드/마크를 정의하지 않아 스키마
 * (파싱 결과)에 영향이 없으므로 뺐다 — `pageId`에 의존하는 슬래시 메뉴 설정도 필요 없다.
 */
function buildParseExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: false,
      codeBlock: false,
    }),
    LinkWithOpenHint.configure({ openOnClick: false }),
    CodeBlockWithLanguagePicker.configure({
      lowlight: createLowlight(common),
      enableTabIndentation: true,
    }),
    TextStyle,
    Color,
    FontSize,
    Highlight.configure({ multicolor: true }),
    AttachmentImage,
    Panel,
    DocumentLink,
    TableWithToolbar.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
  ];
}

/** `tiptap-to-storage.ts`의 `escapeHtml`이 만든 4가지 엔티티만 되돌린다(속성값 전용). */
function decodeBasicHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/**
 * Confluence storage format의 매크로 태그(`ac:image`, `ac:structured-macro`)는 일반
 * HTML이 아니라서 표준 파서(`generateJSON`)가 인식하지 못한다 — 파싱 전에 각 노드뷰의
 * `parseHTML`이 기대하는 평범한 HTML 형태로 미리 바꿔둔다.
 *
 * "문서 링크 카드"(`documentLink`)는 대상에서 제외한다 — `tiptap-to-storage.ts`가 원래
 * pageId를 알아볼 수 없는 순수 텍스트로만 저장하도록 만들어져 있어(의도적 단방향), 이
 * 전처리로 되살릴 방법이 없다. 그 자리는 텍스트 그대로 복원된다(사용자 확인,
 * task.md 참고).
 */
export function preprocessConfluenceStorageHtml(html: string, pageId: string): string {
  let result = html;

  // <ac:image ac:alt="..." ...>
  //   <ri:attachment ri:filename="..." .../>  또는  <ri:url ri:value="..." .../>
  // </ac:image>  ->  <img src="..." filename="..." alt="...">
  //
  // 실제 Confluence는 `ri:attachment`에 `ri:version-at-save`처럼 우리 직렬화기가 쓰지 않는
  // 추가 속성을 덧붙인다(실제 문서로 확인, 2026-09-18) — `[^>]*`로 태그 끝까지 관대하게
  // 허용해야 한다. `ac:name="X">` 뒤에 바로 `>`가 온다고 가정하면 실제 문서에서 매칭에
  // 실패한다.
  result = result.replace(
    /<ac:image([^>]*)>\s*<ri:attachment ri:filename="([^"]*)"[^>]*\/>\s*<\/ac:image>/g,
    (_match, attrs: string, rawFilename: string) => {
      const filename = decodeBasicHtmlEntities(rawFilename);
      const altMatch = /ac:alt="([^"]*)"/.exec(attrs);
      const alt = altMatch ? ` alt="${decodeBasicHtmlEntities(altMatch[1])}"` : "";
      const src = `/api/editor/documents/${pageId}/images/${encodeURIComponent(filename)}`;
      return `<img src="${src}" filename="${filename}"${alt} />`;
    }
  );
  result = result.replace(
    /<ac:image([^>]*)>\s*<ri:url ri:value="([^"]*)"[^>]*\/>\s*<\/ac:image>/g,
    (_match, attrs: string, rawUrl: string) => {
      const altMatch = /ac:alt="([^"]*)"/.exec(attrs);
      const alt = altMatch ? ` alt="${decodeBasicHtmlEntities(altMatch[1])}"` : "";
      return `<img src="${decodeBasicHtmlEntities(rawUrl)}"${alt} />`;
    }
  );

  // <ac:structured-macro ac:name="TYPE" ...>
  //   <ac:parameter ac:name="icon">ICON</ac:parameter>
  //   <ac:rich-text-body>BODY</ac:rich-text-body>
  // </ac:structured-macro>  ->  <div data-panel-type="TYPE" data-panel-icon="ICON"><div class="panel-content">BODY</div></div>
  //
  // 실제 Confluence는 `ac:structured-macro`에 `ac:schema-version`/`ac:macro-id`처럼 우리가
  // 쓰지 않는 추가 속성을 덧붙인다(실제 문서로 확인) — 위와 같은 이유로 `[^>]*`를 둔다.
  result = result.replace(
    /<ac:structured-macro ac:name="([^"]*)"[^>]*>\s*<ac:parameter ac:name="icon">([^<]*)<\/ac:parameter>\s*<ac:rich-text-body>([\s\S]*?)<\/ac:rich-text-body>\s*<\/ac:structured-macro>/g,
    (_match, panelType: string, icon: string, body: string) =>
      `<div data-panel-type="${panelType}" data-panel-icon="${icon}"><div class="panel-content">${body}</div></div>`
  );

  return result;
}

/**
 * Confluence storage format(HTML)을 TipTap JSON으로 되돌린다(P19-6, 복원용). 브라우저의
 * `DOMParser`가 필요해(`@tiptap/core`의 `generateJSON` 구현 참고) 클라이언트에서만 호출할
 * 수 있다 — 서버 컴포넌트/API 라우트에서는 쓸 수 없다.
 */
export function storageHtmlToTiptapDoc(html: string, pageId: string): JSONContent {
  const preprocessed = preprocessConfluenceStorageHtml(html, pageId);
  return generateJSON(preprocessed, buildParseExtensions()) as JSONContent;
}

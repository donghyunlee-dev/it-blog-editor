import { Alert, Button, Typography } from "@sfood/ui";
import { AuthSplitShell } from "@/components/AuthSplitShell";
import { formatAccountLabel } from "@/lib/account-display";

export interface AccessBlockedScreenProps {
  email: string;
  /** 계정 폴더의 accountMeta.name(P5-5). 있으면 "이름(이메일)" 형식으로 표시한다. */
  name?: string;
  /**
   * 이 컴포넌트는 서버 컴포넌트라 `<form action={onLogout}>`에 넘기는 값은 반드시
   * `"use server"`로 선언된 진짜 Server Action이어야 한다(`src/lib/actions/logout.ts`의
   * `logoutAction`처럼) — 임의 함수를 넘기면 "Functions cannot be passed directly to
   * Client Components..." 런타임 오류가 난다(개발 중 임시 라우트로 실제 렌더링을 확인하다
   * 직접 겪은 오류).
   */
  onLogout: () => void | Promise<void>;
}

/**
 * 관리자가 접속을 차단(`accountMeta.accessEnabled = false`)한 계정이 로그인 직후 보게
 * 되는 화면(P5-3). `/editor/layout.tsx`가 리다이렉트 없이 이 화면을 그 자리에서 대신
 * 렌더링한다(다른 URL로 옮기지 않음 — prd.md "접속 차단 안내 화면" 참고). 로그인·온보딩
 * 화면과 같은 `AuthSplitShell`을 재사용해 브랜드 정체성을 이어간다.
 */
export function AccessBlockedScreen({ email, name, onLogout }: AccessBlockedScreenProps) {
  return (
    <AuthSplitShell>
      <div className="flex w-full max-w-md flex-col gap-4">
        <Typography variant="h2" className="text-2xl font-semibold tracking-normal">
          접속이 제한되었어요
        </Typography>
        <Alert variant="danger">
          <span className="font-medium">{formatAccountLabel(email, name)}</span> 계정은 아직
          사용할 수 없어요. 관리자에게 문의해주세요.
        </Alert>
        <form action={onLogout}>
          <Button type="submit" variant="secondary">
            로그아웃
          </Button>
        </form>
      </div>
    </AuthSplitShell>
  );
}

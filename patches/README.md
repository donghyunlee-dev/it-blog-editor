# `patches/` — `@sfood/ui` React 19 호환성 패치

## 무엇을 패치했는가

`@sfood/ui@0.1.2`의 배포된 `dist/index.js`는 `react/jsx-runtime`을 외부 의존성으로
import하지 않고, 그 구현을 자체 번들 안에 통째로 인라인(vendor)해 두었다. 이 인라인
코드는 모듈이 평가되는 즉시(즉 `import`하는 순간, 어떤 named export를 쓰든 무조건)
호스트 `react` 패키지의 `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED` 내부
객체에서 `ReactCurrentOwner`/`ReactCurrentDispatcher`를 읽는다.

`patches/@sfood+ui+0.1.2.patch`는 이 인라인 jsx-runtime을 제거하고, 대신 실제
`react/jsx-runtime` 모듈을 사용하도록 두 군데를 바꾼다:

```diff
+import * as PatchedJsxRuntime from "react/jsx-runtime";
 var xs = { exports: {} }, $e = {};
 ...
-process.env.NODE_ENV === "production" ? xs.exports = it() : xs.exports = ot();
-var e = xs.exports;
+var e = PatchedJsxRuntime;
```

## 왜 필요한가

**React 19는 `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED`를
`__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE`로 이름을 바꾸고,
그 내부 필드도 `ReactCurrentOwner`/`ReactCurrentDispatcher`에서 `H`/`A`/`T`/`S` 같은
축약 키로 재구성했다.** 이 프로젝트는 `react@19.2.8`을 쓰지만 `@sfood/ui`는
`peerDependencies`에 `"react": "^18.0.0"`만 선언되어 있고(최신 배포 버전도 여전히
`0.1.2`), 위에서 설명한 인라인 코드가 존재하지 않는 필드를 읽으려다
`TypeError: Cannot read properties of undefined (reading 'ReactCurrentDispatcher')`로
크래시한다.

이 버그는 `@sfood/ui`의 아무 export든 import하는 순간 무조건 발생하므로, 패치 전에는
`@sfood/ui`를 쓰는 모든 페이지가 런타임에 500 에러였다(`next dev`로 `/login`을 직접
띄워서 확인함 — Task 8에서 `Button`을 처음 들여온 시점부터 이미 깨져 있었고, 지금까지
드러나지 않은 건 그 이후 태스크들의 테스트가 전부 Node 환경 `.test.ts`뿐이라 실제로
React 컴포넌트를 렌더링/실행해 본 적이 없었기 때문으로 보인다).

## 제거 조건

이 패치와 `package.json`의 정확한 버전 고정(`"@sfood/ui": "0.1.2"`, `^` 없음)은
**`@sfood/ui`가 React 19와 호환되는 새 버전을 배포하면 함께 제거해야 한다.**
그 시점에 해야 할 일:

1. `@sfood/ui`를 새 버전으로 올리고, 다시 `^` 범위로 되돌린다.
2. `patches/@sfood+ui+0.1.2.patch`를 삭제한다.
3. `npm install`을 다시 실행해 `postinstall`(`patch-package --error-on-warn`)이
   더 이상 아무 것도 할 일이 없는지 확인한다.
4. 전체 테스트(`npm test`)와 `npm run dev`로 `/login` 등 주요 페이지가 여전히
   정상 렌더링되는지 확인한다.

## 왜 `patch-package`인가 (그리고 왜 `--error-on-warn`인가)

- `@sfood/ui`는 `package.json`에서 `^0.1.2`가 아니라 **정확히 `0.1.2`로 고정**했다.
  이 패치는 `0.1.2`의 정확한 번들 코드(변수명까지)를 대상으로 만들어졌기 때문에,
  범위 지정을 허용하면 `npm install`이 조용히 `0.1.3` 등을 받아올 수 있고, 그 경우
  `patch-package`는 **기본적으로 대상 파일이 존재하지 않을 때만** 실패하고 코드가
  달라 patch가 안 먹는 경우는 경고만 띄운 채 넘어간다. 즉 버전이 바뀌면 패치가
  조용히 무효화되고, CI는 초록불인데 배포된 앱은 다시 전부 500이 되는 상황이
  발생할 수 있었다.
- `postinstall`에 `--error-on-warn` 플래그를 추가해, 패치가 완전히 그대로 적용되지
  않는 모든 경우(버전 드리프트 포함)를 **설치 자체를 실패시키는 하드 에러**로
  바꿨다. 즉, 누군가 `@sfood/ui`를 실수로 올리면 `npm install`/`npm ci`가 그 자리에서
  바로 실패한다.
- `patch-package`는 `dependencies`에 있다(devDependencies가 아님). `postinstall`은
  `npm ci --omit=dev` 같은 프로덕션 전용 설치에서도 무조건 실행되므로,
  `patch-package` 자체가 devDependency로만 있으면 그런 설치가 설치 도중
  "커맨드를 찾을 수 없음"으로 실패한다.

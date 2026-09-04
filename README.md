# SFOOD IT Editor

사내 직원 전용 문서 작성·게시 도구. sfood-it-tech-blog(Viewer) 저장소에서 분리되었다.

환경변수 설정은 `.env.example`을 참고한다. 계정 폴더/서브폴더는 최초 로그인 시 코드가 자동으로 만들므로 별도 운영 작업은 필요 없다.

## 개발 도구

- **계정 초기화**: 온보딩(신규 가입 흐름)을 반복해서 테스트하려면 `npm run reset-account -- <email>`로 미리 보고, `npm run reset-account -- <email> --yes`로 실제 계정 폴더(및 하위 문서)를 Confluence 휴지통으로 옮길 수 있다. 영구 삭제가 아니라 휴지통 이동이라 Confluence 관리자 화면에서 복구 가능하다.


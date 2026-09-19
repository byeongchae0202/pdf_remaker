# Repage

PDF 페이지를 골라 원하는 순서의 새 PDF로 만드는 Azure 기반 웹앱입니다.

## Local development

```bash
npm install
npm run dev
```

프론트엔드의 PDF 선택, 순서 변경, 회전, 병합은 브라우저에서 동작합니다. AI 요약 API를 사용하려면 `api` 디렉터리에서 의존성을 설치하고 Azure Functions Core Tools로 실행합니다.

```bash
cd api
npm install
npm run build
func start
```

API 환경변수:

- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_DEPLOYMENT`
- `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`

Azure 배포 시 Managed Identity와 최소 권한 RBAC를 사용하고, 업로드 파일은 임시 처리 후 즉시 삭제하도록 Blob Storage 수명 주기 정책을 설정해야 합니다.
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

## Azure deployment

Azure CLI와 Azure Developer CLI가 설치되어 있고 로그인한 뒤 실행합니다. 인증되지 않은 상태에서는 먼저 `az login`과 `azd auth login`을 수행하세요.

```bash
azd auth login
azd up
```

`infra/main.bicep`은 하나의 리소스 그룹에 Static Web Apps, Linux Consumption Functions, 임시 Blob 컨테이너, Document Intelligence, Azure OpenAI를 구성합니다. `temp/` 접두사의 Blob은 1일 후 자동 삭제됩니다.

현재 환경에서는 Azure 확장 인증이 로그인되지 않아 실제 리소스 생성과 `azd up` 실행은 완료하지 않았습니다. 로그인 후 배포 명령을 실행하고, 생성된 출력값을 Function App 설정에 확인해야 합니다.

Azure OpenAI 모델 배포의 지역별 가용성이 다를 수 있으므로 `infra/main.parameters.json`의 리전과 모델 파라미터는 배포 전에 확인해야 합니다. 실제 배포에는 Azure 구독과 리소스 그룹 선택이 필요합니다.
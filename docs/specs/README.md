# Feature Specifications

이 디렉터리는 프로젝트의 기능 스펙을 보관한다. 기능을 구현하기 전에 스펙을 작성하고, 스펙의 수용 기준을 충족한 뒤 구현을 완료한다.

## Specification Template

새 기능은 `docs/specs/<feature-name>.md` 파일로 작성한다.

```markdown
# <기능 이름>

## Status

Draft

## Problem

해결하려는 문제를 작성한다.

## User Scenarios

- 사용자가 ... 하면 ... 한다.

## Scope

### In Scope

- 포함할 범위

### Out of Scope

- 제외할 범위

## Requirements

- 기능 요구사항
- 비기능 요구사항

## Acceptance Criteria

- [ ] Given ..., when ..., then ...
- [ ] 오류 상황을 검증한다.

## Open Questions

- 결정이 필요한 사항

## Implementation Notes

구현 및 검증 결과를 기록한다.
```

## Status Values

- `Draft`: 작성 중이며 구현하지 않는다.
- `Approved`: 요구사항과 수용 기준이 합의되어 구현할 수 있다.
- `In Progress`: 구현 중이다.
- `Verified`: 수용 기준과 관련 테스트를 통과했다.
- `Superseded`: 새 스펙으로 대체되었다.
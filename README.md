Github action commands for automating issue management.

Based on work from: https://github.com/microsoft/vscode-github-triage-actions


## Commands

Type: `label`

- `action`: defines what action to perform (`close` or `addToProject`)
- `name`: defines which label to match on
- `addToProject` - an object that is required when the `action` is `addToProject` and is optional otherwise.
- `addToProject.url`: Absolute url of the project, the project `id` will be parsed.
- `addToProject.column`: Column name to add the issues to, required for old type of projects
- `removeFromProject` - an object that is required when the `action` is `removeFromProject` and is optional otherwise.
- `removeFromProject.url`: Absolute url of the project, the project `id` will be parsed.

Note: When removed, the issue will irreversibly loose the project-specific metadata assigned to it. removeFromProject doesn't current work for old type of projects.

**Syntax**:
```json
{
  "type": "label",
  "name": "plugins",
  "action": "addToProject",
  "addToProject": {
    "url": "https://github.com/orgs/grafana/projects/76",
    "column": "To Do"
  }
}
```

## PR Checks

Mark commits with an error, failure, pending, or success state, which is then reflected in pull requests involving those commits.

**Syntax**:
```json
[
  {
    "type": "<check>"
    // check specific properties
  }
]
```

### Milestone Check

This will check if a milestone is set on a pull request or not. All properties below except `type` is optional.

**Syntax**:
```json
{
  "type": "check-milestone",
  "title": "Milestone Check",
  "targetUrl": "https://something",
  "success": "Milestone set",
  "failure": "Milestone not set"
}
```

### Label Check

This will check if `labels.matches` matches any labels on a pull request.
- If matches, it will create a success status with `labels.exists` message.
- If it doesn't match it will create a failure status with `labels.notExists` message.

If `skip.matches` is specified it will check if any of the labels exists on a pull request and if so, it will create a success status with `skip.message` message. This will happen before considering returning a failure status according to above,

All properties below except `type` and `labels.matches` is optional. The `labels.matches` and `skip.matches` supports providing a `*` (star) at the end to denote only matching the beginning of a label.

```json
{
  "type": "check-label",
  "title": "New Label Backport Check",
  "labels": {
    "exists": "Backport enabled",
    "notExists": "Backport decision needed",
    "matches": [
      "backport v*"
    ]
  },
  "skip": {
    "message": "Backport skipped",
    "matches": [
      "backport",
      "no-backport"
    ]
  },
  "targetUrl": "https://github.com/grafana/grafana/blob/main/contribute/merge-pull-request.md#should-the-pull-request-be-backported"
}
```

### Changelog Check

This check will enforce that an active decision of including a change in changelog/release notes needs to be taken for every pull request.

This check uses the [Label Check](#label-check) and it's detailed description is applicable to this check config as well.

If the result of the Label Check is success status with `labels.exists` message the check will continue to validate the PR title:
- If the PR title formatting is not valid, e.g. `<Area>: <Summary>`, it will create a failure status explaining that PR title formatting is invalid.

If the PR title is valid it will continue to validate the PR body. If you use `breakingChangeLabels` it will check if any of the labels exists on a pull request and if so, it will verify that a breaking change notice section has been added to the PR body:
- If there's no breaking change notice section it will create a failure status explaining that PR lacks a breaking change notice.

```json
{
  "type": "check-changelog",
  "title": "Changelog Check",
  "labels": {
    "exists": "Changelog enabled",
    "notExists": "Changelog decision needed",
    "matches": [
      "add to changelog"
    ]
  },
  "breakingChangeLabels": [
    "breaking-change"
  ],
  "skip": {
    "message": "Changelog skipped",
    "matches": [
      "no-changelog"
    ]
  },
  "targetUrl": "https://github.com/grafana/grafana/blob/main/contribute/merge-pull-request.md#include-in-changelog-and-release-notes"
}
```

### All issues to project

Type: `allissuestoproject`

Used to add all created issues to a project.

- `action`: defines what action to perform (`close` or `addToProject`)
- `addToProject` - an object that is required when the `action` is `addToProject` and is optional otherwise.
- `addToProject.url`: Absolute url of the project, the project `id` will be parsed.
- `addToProject.column`: Column name to add the issues to, required for old type of projects
- `removeFromProject` - an object that is required when the `action` is `removeFromProject` and is optional otherwise.
- `removeFromProject.url`: Absolute url of the project, the project `id` will be parsed.

Note: When removed, the issue will irreversibly loose the project-specific metadata assigned to it. removeFromProject doesn't current work for old type of projects.

**Syntax**:
```json
{
  "type": "allissuestoproject",
  "action": "addToProject",
  "addToProject": {
    "url": "https://github.com/orgs/grafana/projects/76",
    "column": "To Do"
  }
}
```

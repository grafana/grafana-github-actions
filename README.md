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

Note: removeFromProject doesn't current work for old type of projects

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

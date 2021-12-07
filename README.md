Github action commands for automating issue management. 

Based on work from: https://github.com/microsoft/vscode-github-triage-actions 


## Commands

Type: `label`

- `action`: defines what action to perform (`close` or `addToProject`)
- `name`: defines which label to match on
- `addToProject` - an object that is required when the `action` is `addToProject` and is optional otherwise.
- `addToProject.url`: Absolute url of the project, the project `id` will be parsed.

**Syntax**:
```
  {
    "type": "label",
    "name": "plugins",
    "action": "addToProject",
    "addToProject": {
      "url": "https://github.com/orgs/grafana/projects/76"
    }
  }
```
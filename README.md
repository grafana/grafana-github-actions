Github action commands for automating issue management. 

Based on work from: https://github.com/microsoft/vscode-github-triage-actions 


## Commands

Type: `addToProject`

Description: This command should be used to add issues to projects automatically, when they receive a matching label. Only work for new type of github projects.

- `name`: defines which label to match on
- `projectId`: id of the project. You can find it in the url when viewing your project. For example: `https://github.com/orgs/grafana/projects/76/` would mean the `ID` is `76`

**Syntax**:
```
{
    "type": "addToProject",
    "name": "plugins",
    "projectId": "76"
  }
```
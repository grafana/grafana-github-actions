Github action commands for automating issue management. 

Based on work from: https://github.com/microsoft/vscode-github-triage-actions 


### Commands

Type: `addToProject`

Description: This command should be used to add issues to projects automatically, when they receive a matching label. Only work for new type of github projects.

Syntax:
```
{
    "type": "addToProject",
    "name": "plugins",
    "projectId": "76"
  }
```
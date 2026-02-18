# GitHub Actions OpenTelemetry Exporter

Export GitHub Actions workflow runs as OpenTelemetry traces for observability and monitoring.

## Overview

This action converts GitHub Actions workflow runs into OpenTelemetry traces, allowing you to visualize and analyze your CI pipelines using standard observability tools. It creates a hierarchical trace structure:

### Trace Structure

```
Workflow Run (root span)      // Represents the entire workflow run
├── Job 1 (child span)        // Each job in the workflow becomes a child span
│   ├── Step 1 (child span)   // Each step within a job becomes a child span of its job
│   ├── Step 2 (child span)
│   └── Step 3 (child span)
├── Job 2 (child span)
│   ├── Step 1 (child span)
│   └── Step 2 (child span)
```

### Deterministic Trace and Span IDs

To ensure the same workflow run always produces the same trace ID, the action generates deterministic trace and span IDs based on:

- Repository name
- Workflow run ID
- Run attempt number
- Job and step names

| ID             | Value                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| `trace-id`     | `sha256("${repo}${run_id}${run_attempt}t")[0:32]`                        |
| `root-span-id` | `sha256("${repo}${run_id}${run_attempt}s")[16:32]`                       |
| `job-span-id`  | `sha256("${repo}${run_id}${run_attempt}${job_name}")[16:32]`             |
| `step-span-id` | `sha256("${repo}${run_id}${run_attempt}${job_name}${step_name}")[16:32]` |

## Usage

This action is designed to be triggered by the `workflow_run` event of type `completed`, which fires after a workflow completes as we need all jobs to finish before exporting traces.

### Basic Example

```yaml
name: Export Workflow Traces

on:
    workflow_run:
        workflows: ['Workflow Name']
        types: [completed]

jobs:
    export-traces:
        runs-on: ubuntu-latest
        steps:
            - uses: grafana/grafana-github-actions/gha-otel-export
              env:
                  OTEL_SERVICE_NAME: grafana-ci-reporter
                  OTEL_LOG_LEVEL: debug
                  OTEL_EXPORTER_OTLP_PROTOCOL: 'http/protobuf'
                  OTEL_EXPORTER_OTLP_ENDPOINT: 'https://otlp-gateway.example.com/otlp'
                  OTEL_EXPORTER_OTLP_HEADERS: 'Authorization=Basic $(base64(OTEL_API_KEY)'
                  OTEL_RESOURCE_ATTRIBUTES: team=team,env=ci
              with:
                  github-token: ${{ secrets.GITHUB_TOKEN }}
                  trace-artifacts-glob: traces-*.jsonl
```

## Inputs

| Input                  | Description                                                                                                                                                                                            | Required |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `github-token`         | GitHub token for API access. Use `${{ secrets.GITHUB_TOKEN }}`                                                                                                                                         | Yes      |
| `trace-artifacts-glob` | Glob pattern to match GitHub artifact(s) containing trace files. Files should be in JSONL format (output of OTEL logging provider). Files can be in plain text or compressed formats (brotli, zstandard) | No       |

> **Note:** To avoid polluting traces, the action appends at most 100 spans per file and aggregates the remaining spans into a single aggregate span.

| ---------- | ------------------------------------------------------------------ |
| `trace-id` | The generated OpenTelemetry trace ID for the exported workflow run |

## Environment Variables

Configure OpenTelemetry exporter behavior using standard OTEL environment variables:

### Required Variables

| Variable                      | Description        | Example                                 |
| ----------------------------- | ------------------ | --------------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP endpoint URL  | `https://otlp-gateway.example.com/otlp` |
| `OTEL_EXPORTER_OTLP_HEADERS`  | Additional headers | `Authorization=Basic <token>`           |

### Optional Variables

| Variable                      | Description                           | Default         | Example                 |
| ----------------------------- | ------------------------------------- | --------------- | ----------------------- |
| `OTEL_SERVICE_NAME`           | Service name for traces               | -               | `grafana-ci-reporter`   |
| `OTEL_LOG_LEVEL`              | Logging level                         | `info`          | `debug`                 |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | OTLP protocol                         | `http/protobuf` | `http/protobuf`         |
| `OTEL_RESOURCE_ATTRIBUTES`    | Resource attributes (comma-separated) | -               | `team=backend,env=prod` |

import { detectResources, envDetector, Resource } from "@opentelemetry/resources";
import { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { InstrumentationScope } from "@opentelemetry/core";

let exporter: OTLPTraceExporter | null = null;
let resource: Resource | null = null;

const instrumentationScope: InstrumentationScope = {
  name: "gha-otel-export",
  version: "1.0.0",
};

export async function initTracing(): Promise<void> {
  resource = await detectResources({ detectors: [envDetector] });
  exporter = new OTLPTraceExporter({});
}

export function getResource(): Resource {
  if (!resource) {
    throw new Error("Tracing not initialized. Call initTracing() first.");
  }
  return resource;
}

export function getInstrumentationScope(): InstrumentationScope {
  return instrumentationScope;
}

export async function exportSpans(spans: ReadableSpan[]): Promise<void> {
  if (!exporter) {
    throw new Error("Tracing not initialized. Call initTracing() first.");
  }

  return new Promise((resolve, reject) => {
    exporter!.export(spans, (result) => {
      if (result.code === 0) {
        resolve();
      } else {
        reject(new Error(result.error?.message ?? "Failed to export spans"));
      }
    });
  });
}

export async function shutdownTracing(): Promise<void> {
  if (!exporter) {
    console.log("Exporter not initialized");
    return;
  }

  console.log("Shutting down exporter...");
  await exporter.shutdown();
  console.log("Tracing shut down");
}

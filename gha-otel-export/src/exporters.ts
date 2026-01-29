import { detectResources, envDetector, Resource } from "@opentelemetry/resources"
import { BasicTracerProvider, SimpleSpanProcessor, ReadableSpan } from "@opentelemetry/sdk-trace-base"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto"
import { InstrumentationScope } from "@opentelemetry/core"
import { trace } from "@opentelemetry/api"
import assert from "assert"

let traceProvider: BasicTracerProvider | null = null
let resource: Resource | null = null
let spanProcessor: SimpleSpanProcessor | null = null

const instrumentationScope: InstrumentationScope = {
  name: "gha-otel-export",
  version: "1.0.0",
}

export async function initTracing(): Promise<void> {
  resource = await detectResources({ detectors: [envDetector] })
  
  spanProcessor = new SimpleSpanProcessor(new OTLPTraceExporter({}))
  
  traceProvider = new BasicTracerProvider({
    resource: resource,
    spanProcessors: [spanProcessor]
  })
  
  const result = trace.setGlobalTracerProvider(traceProvider)
  assert(result, "Failed to set global tracer provider - it may already be set")
}

export function getResource(): Resource {
  assert(resource, "Tracing not initialized. Call initTracing() first.")
  return resource
}

export function getInstrumentationScope(): InstrumentationScope {
  return instrumentationScope
}

export async function exportSpans(spans: ReadableSpan[]): Promise<void> {
  assert(spanProcessor, "Tracing not initialized. Call initTracing() first.")

  for (const span of spans) {
    spanProcessor.onEnd(span)
  }
  
  await spanProcessor.forceFlush()
}

export async function shutdownTracing(): Promise<void> {
  if (!traceProvider) {
    console.log("Trace provider not initialized")
    return
  }

  console.log("Shutting down exporter...")
  await traceProvider.shutdown()
  console.log("Tracing shut down")
}

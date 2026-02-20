import { detectResources, envDetector, Resource } from '@opentelemetry/resources'
import {
	BasicTracerProvider,
	SimpleSpanProcessor,
	BatchSpanProcessor,
	ReadableSpan,
} from '@opentelemetry/sdk-trace-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { InstrumentationScope } from '@opentelemetry/core'
import { trace } from '@opentelemetry/api'
import assert from 'assert'

let traceProvider: BasicTracerProvider | null = null
let resource: Resource | null = null
let spanProcessor: SimpleSpanProcessor | BatchSpanProcessor | null = null

const instrumentationScope: InstrumentationScope = {
	name: 'gha-otel-export',
	version: '1.0.0',
}

export async function initTracing(): Promise<void> {
	resource = await detectResources({ detectors: [envDetector] })

	const exporter = new OTLPTraceExporter({})

	// Below are arbitrary numbers made out of thin air
	spanProcessor = new BatchSpanProcessor(exporter, {
		maxQueueSize: 10000,
		maxExportBatchSize: 512,
		scheduledDelayMillis: 5000,
		exportTimeoutMillis: 30000,
	})

	traceProvider = new BasicTracerProvider({
		resource: resource,
		spanProcessors: [spanProcessor],
	})

	const result = trace.setGlobalTracerProvider(traceProvider)
	assert(result, 'Failed to set global tracer provider - it may already be set')

	console.log('[initTracing] Using BatchSpanProcessor with maxQueueSize=10000, maxExportBatchSize=512')
}

export function getResource(): Resource {
	assert(resource, 'Tracing not initialized. Call initTracing() first.')
	return resource
}

export function getInstrumentationScope(): InstrumentationScope {
	return instrumentationScope
}

export async function exportSpans(spans: ReadableSpan[]): Promise<void> {
	assert(spanProcessor, 'Tracing not initialized. Call initTracing() first.')

	console.log(`Attempting to export ${spans.length} spans`)
	let exportedCount = 0
	let failedCount = 0

	for (const span of spans) {
		try {
			spanProcessor.onEnd(span)
			exportedCount++
		} catch (error) {
			failedCount++
			console.error(`Failed to export span ${span.name}:`, error)
		}
	}

	console.log(`Queued ${exportedCount} spans, ${failedCount} failed`)

	try {
		await spanProcessor.forceFlush()
		console.log(`Flush completed successfully`)
	} catch (error) {
		console.error(`Flush failed:`, error)
		throw error
	}
}

export async function shutdownTracing(): Promise<void> {
	if (!traceProvider) {
		console.log('Trace provider not initialized')
		return
	}

	console.log('Shutting down exporter...')
	await traceProvider.shutdown()
	console.log('Tracing shut down')
}

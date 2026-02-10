import * as fs from 'fs'
import * as readline from 'readline'
import { ReadableSpan } from '@opentelemetry/sdk-trace-base'
import { SpanKind, SpanStatusCode, TraceFlags, SpanContext } from '@opentelemetry/api'
import { hrTimeDuration } from '@opentelemetry/core'
import { getResource, getInstrumentationScope } from './exporters.js'
import assert from 'assert'

/**
 * Convert RFC3339 timestamp to OpenTelemetry HrTime format [seconds, nanoseconds]
 */
function rfc3339ToHrTime(timestamp: string): [number, number] {
	const date = new Date(timestamp)
	const ms = date.getTime()
	const seconds = Math.floor(ms / 1000)
	const nanos = (ms % 1000) * 1_000_000
	return [seconds, nanos]
}

/**
 * Parse trace flags from hex string (e.g., "01") to number
 */
function parseTraceFlags(flags: string): number {
	return parseInt(flags, 16) || TraceFlags.SAMPLED
}

/**
 * Parse status code from Go trace format
 */
function parseStatus(statusCode: string): SpanStatusCode {
	switch (statusCode) {
		case 'Ok':
		case 'OK':
			return SpanStatusCode.OK
		case 'Error':
		case 'ERROR':
			return SpanStatusCode.ERROR
		case 'Unset':
		case 'UNSET':
		default:
			return SpanStatusCode.UNSET
	}
}

/**
 * Convert Go toolexec attributes array to simple key-value object
 */
function extractAttributes(attrs?: any[]): Record<string, any> {
	if (!attrs || attrs.length === 0) return {}

	const result: Record<string, any> = {}
	for (const attr of attrs) {
		if (attr.Key && attr.Value?.Value !== undefined) {
			result[attr.Key] = attr.Value.Value
		}
	}
	return result
}

/**
 * Parse a Go toolexec trace and convert to ReadableSpan
 */
function parseToolexecTrace(line: string): ReadableSpan {
	const span = JSON.parse(line)

	assert(span.Name, 'Span Name is required')
	assert(span.StartTime, 'Span StartTime is required')
	assert(span.EndTime, 'Span EndTime is required')

	// Span details
	assert(span.SpanContext, 'Span SpanContext object is required')
	assert(span.SpanContext.TraceID, 'Span SpanContext.TraceID is required')
	assert(span.SpanContext.SpanID, 'Span SpanContext.SpanID is required')
	assert(span.SpanContext.TraceFlags, 'Span SpanContext.TraceFlags is required')

	// Parent Span details
	assert(span.Parent, 'Span Parent object is required')
	assert(span.Parent.SpanID, 'Span Parent.SpanID is required')
	assert(span.Parent.TraceID, 'Span Parent.TraceID is required')
	assert(span.Parent.Remote, 'Span Parent.Remote is required')

	// Span Attributes
	assert(span.Attributes, 'Span Attributes object is required')

	const spanContext: SpanContext = {
		traceId: span.SpanContext.TraceID,
		spanId: span.SpanContext.SpanID,
		traceFlags: TraceFlags.SAMPLED,
		isRemote: span.SpanContext.Remote,
	}

	const parentSpanContext: SpanContext = {
		traceId: span.Parent.TraceID,
		spanId: span.Parent.SpanID,
		traceFlags: TraceFlags.SAMPLED,
		isRemote: span.Parent.Remote,
	}

	const attributes = extractAttributes(span.Attributes)

	const status = {
		code: parseStatus(span.Status?.Code || 'Unset'),
		message: span.Status?.Description || undefined,
	}

	const startTime = rfc3339ToHrTime(span.StartTime)
	const endTime = rfc3339ToHrTime(span.EndTime)

	const readableSpan: ReadableSpan = {
		name: span.Name,
		kind: span.SpanKind || SpanKind.INTERNAL,
		spanContext: () => spanContext,
		parentSpanContext,
		startTime,
		endTime,
		status,
		attributes,
		links: [],
		events: [],
		duration: hrTimeDuration(startTime, endTime),
		ended: true,
		resource: getResource(),
		instrumentationScope:
			span.InstrumentationScope || span.InstrumentationLibrary || getInstrumentationScope(),
		droppedAttributesCount: span.DroppedAttributes || 0,
		droppedEventsCount: span.DroppedEvents || 0,
		droppedLinksCount: span.DroppedLinks || 0,
	}

	return readableSpan
}

/**
 * Read all lines from a toolexec JSONL file
 */
async function readLines(filePath: string): Promise<string[]> {
	assert(fs.existsSync(filePath), `Toolexec trace file not found: ${filePath}`)

	const lines: string[] = []
	const fileStream = fs.createReadStream(filePath)
	const rl = readline.createInterface({
		input: fileStream,
		crlfDelay: Infinity,
	})

	for await (const line of rl) {
		if (line.trim() !== '') {
			lines.push(line)
		}
	}

	return lines
}

function processToolexecLines(lines: string[]): ReadableSpan[] {
	return lines.map(parseToolexecTrace)
}

export async function readToolexecTraces(filePath: string): Promise<ReadableSpan[]> {
	const lines = await readLines(filePath)
	const spans = processToolexecLines(lines)

	console.log(`Loaded ${spans.length} toolexec spans from ${filePath}`)
	return spans
}

export async function readMultipleToolexecTraces(filePaths: string[]): Promise<ReadableSpan[]> {
	const allSpans: ReadableSpan[] = []

	for (const filePath of filePaths) {
		console.log(`Reading toolexec traces from: ${filePath}`)
		const spans = await readToolexecTraces(filePath)
		allSpans.push(...spans)
	}

	console.log(`Total toolexec spans loaded: ${allSpans.length}`)
	return allSpans
}

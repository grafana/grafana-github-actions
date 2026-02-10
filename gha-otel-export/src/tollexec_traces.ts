import * as fs from 'fs'
import * as readline from 'readline'
import { ReadableSpan } from '@opentelemetry/sdk-trace-base'
import { SpanKind, SpanStatusCode, TraceFlags, SpanContext } from '@opentelemetry/api'
import { hrTimeDuration } from '@opentelemetry/core'
import { getResource, getInstrumentationScope } from './exporters.js'
import assert from 'assert'

function rfc3339ToHrTime(timestamp: string): [number, number] {
	const date = new Date(timestamp)
	const ms = date.getTime()
	const seconds = Math.floor(ms / 1000)
	const nanos = (ms % 1000) * 1_000_000
	return [seconds, nanos]
}

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
export function parseToolexecTrace(original: any): ReadableSpan {
	assert(original.Name, 'Span Name is required')
	assert(original.StartTime, 'Span StartTime is required')
	assert(original.EndTime, 'Span EndTime is required')

	// Span details
	assert(original.SpanContext, 'Span SpanContext object is required')
	assert(original.SpanContext.TraceID, 'Span SpanContext.TraceID is required')
	assert(original.SpanContext.SpanID, 'Span SpanContext.SpanID is required')
	assert(original.SpanContext.TraceFlags, 'Span SpanContext.TraceFlags is required')

	// Parent Span details
	assert(original.Parent, 'Span Parent object is required')
	assert(original.Parent.SpanID, 'Span Parent.SpanID is required')
	assert(original.Parent.TraceID, 'Span Parent.TraceID is required')
	assert(original.Parent.Remote, 'Span Parent.Remote is required')

	// Span Attributes
	assert(original.Attributes, 'Span Attributes object is required')

	const originalContext: SpanContext = {
		traceId: original.SpanContext.TraceID,
		spanId: original.SpanContext.SpanID,
		traceFlags: TraceFlags.SAMPLED,
		isRemote: original.SpanContext.Remote,
	}

	const parentSpanContext: SpanContext = {
		traceId: original.Parent.TraceID,
		spanId: original.Parent.SpanID,
		traceFlags: TraceFlags.SAMPLED,
		isRemote: original.Parent.Remote,
	}

	const attributes = extractAttributes(original.Attributes)

	const status = {
		code: parseStatus(original.Status?.Code || 'Unset'),
		message: original.Status?.Description || undefined,
	}

	const startTime = rfc3339ToHrTime(original.StartTime)
	const endTime = rfc3339ToHrTime(original.EndTime)

	const readableSpan: ReadableSpan = {
		name: original.Name,
		kind: original.SpanKind || SpanKind.INTERNAL,
		spanContext: () => originalContext,
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
			original.InstrumentationScope || original.InstrumentationLibrary || getInstrumentationScope(),
		droppedAttributesCount: original.DroppedAttributes || 0,
		droppedEventsCount: original.DroppedEvents || 0,
		droppedLinksCount: original.DroppedLinks || 0,
	}

	return readableSpan
}

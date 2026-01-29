import {SpanContext, SpanKind, SpanStatusCode, TraceFlags} from "@opentelemetry/api"
import {ReadableSpan} from "@opentelemetry/sdk-trace-base"
import {hrTimeDuration} from "@opentelemetry/core"
import {getResource, getInstrumentationScope} from "./exporters.js"

/**
 * Convert a Date to OpenTelemetry HrTime format [seconds, nanoseconds]
 */
export function dateToHrTime(date: Date): [number, number] {
    const ms = date.getTime()
    const seconds = Math.floor(ms / 1000)
    const nanos = (ms % 1000) * 1_000_000
    return [seconds, nanos]
}

/**
 * Map GitHub conclusion to OpenTelemetry SpanStatusCode
 */
export function conclusionToStatus(conclusion: string): { code: SpanStatusCode, message?: string } {
    switch (conclusion) {
        case "success":
            return {code: SpanStatusCode.OK}
        case "failure":
        case "cancelled":
        case "timed_out":
            return {code: SpanStatusCode.ERROR, message: conclusion}
        default:
            return {code: SpanStatusCode.UNSET}
    }
}

/**
 * Create a SpanContext with deterministic IDs
 */
export function createSpanContext(traceId: string, spanId: string): SpanContext {
    return {
        traceId,
        spanId,
        traceFlags: TraceFlags.SAMPLED,
        isRemote: false,
    }
}

/**
 * Common function to create a ReadableSpan with standard configuration
 */
export function createSpan(
    name: string,
    traceId: string,
    spanId: string,
    startTime: Date,
    endTime: Date,
    conclusion: string,
    attributes: Record<string, string | number | undefined>,
    parentSpanContext?: SpanContext
): ReadableSpan {
    const startHrTime = dateToHrTime(startTime)
    const endHrTime = dateToHrTime(endTime)

    return {
        name,
        kind: SpanKind.INTERNAL,
        spanContext: () => createSpanContext(traceId, spanId),
        parentSpanContext,
        startTime: startHrTime,
        endTime: endHrTime,
        status: conclusionToStatus(conclusion),
        attributes,
        links: [],
        events: [],
        duration: hrTimeDuration(startHrTime, endHrTime),
        ended: true,
        resource: getResource(),
        instrumentationScope: getInstrumentationScope(),
        droppedAttributesCount: 0,
        droppedEventsCount: 0,
        droppedLinksCount: 0,
    }
}

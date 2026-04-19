import {
    CaseData,
    ChecklistItem,
    Document,
    RiskFlagSummary,
    TimelineEvent,
} from '@/types/case';

interface ChecklistWithOverride extends ChecklistItem {
    overriddenAt?: string | Date;
    overriddenBy?: string;
    overrideReason?: string;
    checkedAt?: string | Date;
    checkedBy?: string;
}

interface BuildTimelineArgs {
    createdAt: Date;
    companyName?: string;
    decision?: CaseData['decision'];
    publication?: CaseData['publication'];
    documents: Document[];
    checklist: ChecklistWithOverride[];
    riskFlags?: RiskFlagSummary[];
}

export function buildTimelineEvents({
    createdAt,
    companyName,
    decision,
    publication,
    documents,
    checklist,
    riskFlags = [],
}: BuildTimelineArgs): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    if (createdAt) {
        events.push({
            id: 'evt-created',
            timestamp: createdAt,
            action: 'Request created',
            user: 'System',
            details: companyName ? `Intake for ${companyName}` : undefined,
        });
    }

    for (const doc of documents) {
        if (!doc.uploadedAt) continue;
        events.push({
            id: `evt-doc-${doc.id}`,
            timestamp: doc.uploadedAt,
            action: 'Document uploaded',
            user: 'Broker',
            details: `${doc.name} (${doc.type})`,
        });
    }

    for (const item of checklist) {
        if (item.overriddenAt) {
            events.push({
                id: `evt-override-${item.id}`,
                timestamp: new Date(item.overriddenAt),
                action: 'Check overridden',
                user: item.overriddenBy || 'Operator',
                details: `${item.label}${item.overrideReason ? ` — ${item.overrideReason}` : ''}`,
            });
        } else if (item.checkedAt && item.checked) {
            events.push({
                id: `evt-check-${item.id}`,
                timestamp: new Date(item.checkedAt),
                action: 'Check completed',
                user: item.checkedBy || 'Operator',
                details: item.label,
            });
        }
    }

    for (const flag of riskFlags) {
        if (flag.resolvedAt) {
            events.push({
                id: `evt-flag-${flag.id}`,
                timestamp: flag.resolvedAt,
                action: `Risk flag resolved (${flag.severity})`,
                user: flag.resolvedBy || 'Operator',
                details: `${flag.title}${flag.resolutionNote ? ` — ${flag.resolutionNote}` : ''}`,
            });
        }
    }

    if (decision?.at) {
        events.push({
            id: 'evt-decision',
            timestamp: decision.at,
            action: `Request ${decision.outcome.toLowerCase()}`,
            user: decision.by || 'Operator',
            details: decision.comment || undefined,
        });
    }

    if (publication?.at) {
        events.push({
            id: 'evt-publication',
            timestamp: publication.at,
            action: 'Request published',
            user: publication.by || 'Operator',
            details: 'Data pushed to core system',
        });
    }

    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

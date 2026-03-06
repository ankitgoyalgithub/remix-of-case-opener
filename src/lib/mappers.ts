import { RequestListItem } from '@/data/mockRequestsData';
import { Stage, ChecklistItem, Document, DocumentType, calculateSlaRemaining, getSlaStatus, getAutoAssignedQueue } from '@/types/case';

export function mapBackendRequestToListItem(backendReq: any): RequestListItem {
    const createdAt = new Date(backendReq.created_at);
    const now = new Date();
    const age = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    const priority = backendReq.priority === 'urgent' ? 'Urgent' : 'Normal';
    const slaRemaining = calculateSlaRemaining(createdAt, priority);
    const slaTargetHours = priority === 'Urgent' ? 24 : 48;
    const slaStatus = getSlaStatus(slaRemaining, slaTargetHours);

    // Mapping backend status to frontend status
    const statusMap: Record<string, RequestListItem['status']> = {
        'submitted': 'New',
        'in_review': 'In Review',
        'missing_info': 'Missing Info',
        'ready_for_export': 'Ready for Export',
        'issued': 'Issued'
    };

    return {
        id: backendReq.id.toString(),
        companyName: backendReq.company_name,
        brokerName: 'Broker X', // Not in backend yet
        brokerEmail: 'broker@example.com', // Not in backend yet
        age,
        slaRemaining,
        slaStatus,
        slaTargetHours,
        currentStage: backendReq.current_stage_name || 'Intake',
        currentStageId: backendReq.current_stage || 1,
        status: statusMap[backendReq.status] || 'New',
        owner: 'Unassigned', // Not in backend yet
        priority,
        queue: getAutoAssignedQueue(priority),
        createdAt,
    };
}

export function mapBackendStageToStage(rs: any): Stage {
    const statusMap: Record<string, Stage['status']> = {
        'pending': 'pending',
        'in_review': 'active',
        'completed': 'complete',
        'missing_info': 'needs-review',
        'skipped': 'pending'
    };

    return {
        id: rs.stage,
        instanceId: rs.id,
        name: rs.stage_name,
        status: statusMap[rs.status] || 'pending',
        description: '', // Could be fetched if needed
        nextStageId: rs.next_stage_id,
        prevStageId: rs.previous_stage_id,
    };
}

export function mapBackendRequestChecklistToChecklistItem(rc: any): ChecklistItem {
    return {
        id: rc.id.toString(),
        label: rc.name,
        checked: rc.checked,
        stageId: rc.stage_id,
        required: rc.required,
        documentType: rc.document_type && rc.document_type.length > 0 ? rc.document_type[0] as DocumentType : undefined
    };
}

export function mapBackendDocumentToDocument(backendDoc: any): Document {
    return {
        id: backendDoc.id,
        name: backendDoc.file.split('/').pop() || 'document',
        type: backendDoc.doc_type as DocumentType,
        uploadedAt: new Date(backendDoc.uploaded_at),
        status: backendDoc.status === 'processed' ? 'extracted' : (backendDoc.status as any),
        url: backendDoc.file
            ? (backendDoc.file.includes('amazonaws.com')
                ? backendDoc.file
                : new URL(backendDoc.file, 'http://dummy.com').pathname)
            : '',
        extraction: backendDoc.extraction,
        requestStageId: backendDoc.request_stage,
        checklistId: backendDoc.checklist_item ? backendDoc.checklist_item.toString() : undefined,
        highlights: backendDoc.extraction?.data ? Object.entries(backendDoc.extraction.data).map(([label, info]: [string, any]) => ({
            label: label,
            value: info.value || 'N/A'
        })) : []
    };
}

export function mapBackendExtractionToField(fieldName: string, fieldData: any, documentId: string): any {
    return {
        label: fieldName,
        value: fieldData.value,
        confidence: (fieldData.confidence || 0.95) * 100, // Converting to percentage
        status: fieldData.verified ? 'verified' : 'needs-review',
        source: fieldData.source || 'Source Document',
        documentId: documentId,
    };
}

export function groupExtractionsBySection(extractionsRecords: any[]): any[] {
    const sections: Record<string, any[]> = {
        'Employer & Legal': [],
        'Workforce': [],
        'Commercial': [],
        'Signatory': [],
    };

    extractionsRecords.forEach(record => {
        const docId = record.document;
        const data = record.data || {};

        Object.entries(data).forEach(([fieldName, fieldData]: [string, any]) => {
            // Basic logic to group by keyword in field name
            const name = fieldName.toLowerCase();
            let section = 'Employer & Legal';

            if (name.includes('member') || name.includes('employee') || name.includes('census')) {
                section = 'Workforce';
            } else if (name.includes('quote') || name.includes('premium') || name.includes('plan')) {
                section = 'Commercial';
            } else if (name.includes('signatory') || name.includes('emirates id')) {
                section = 'Signatory';
            }

            if (!sections[section]) sections[section] = [];
            sections[section].push(mapBackendExtractionToField(fieldName, fieldData, docId));
        });
    });

    return Object.entries(sections)
        .filter(([_, fields]) => fields.length > 0)
        .map(([title, fields]) => ({ title, fields }));
}

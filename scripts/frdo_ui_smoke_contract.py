"""Source contracts for the distributed FRDO workspace; no API or DB calls."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def check_frdo_workspace(root=ROOT):
    base='frontend/src/'
    names={
        'page':'pages/FrdoRegistryWorkspace.jsx',
        'history':'components/admin/FrdoPoBatchesPanel.jsx',
        'selected':'components/admin/registries/SelectedRegistryBatch.jsx',
        'create':'components/admin/registries/FrdoBatchCreation.jsx',
        'download':'components/admin/registries/FrdoBatchDownload.jsx',
        'download_guard':'utils/frdoBatchDownload.js',
        'submission':'components/admin/registries/FrdoBatchSubmission.jsx',
        'hook':'hooks/useFrdoSubmissionFence.js',
        'results':'components/admin/registries/FrdoBatchResults.jsx',
    }
    text={key:(root/base/path).read_text(encoding='utf-8') for key,path in names.items()}
    contracts={
        'page':['<FrdoBatchCreation','useFrdoSubmissionFence(setConfirmedFrdoSubmission)','<SelectedRegistryBatch','frdoScope !== "work"','confirmedSubmission={confirmedFrdoSubmission}'],
        'history':['data-testid="admin-registries-frdo-batches"','data-testid="admin-registries-frdo-batches-readonly"','getAdminFrdoSubmissionBatches()','getAdminFrdoSubmissionBatch(batch.id)'],
        'selected':['<FrdoBatchDownload','<FrdoBatchSubmission','<FrdoBatchResults','readOnly='],
        'create':['item.registry === "frdo"','item.applicability_decision === "required"','item.status === "approved"','item.regulatory_program_type === "vocational_training"','if (inFlight.current || readOnly || !visible) return','ids.length > 1001','selectedVisible.map(item => item.id)','prepareAdminFrdoSubmissionBatch(ids)','downloadAdminFrdoSubmissionBatch(batch.id)','validBatchId(batch.id)','batch.has_artifact !== true','artifact_sha256','current.current.onRefresh?.()','не передаёт сведения автоматически'],
        'download':['canDownloadFrdoBatch(batch)','isBatchDownloading(batch.id)','runBatchDownload(batch, downloadAdminFrdoSubmissionBatch)'],
        'download_guard':['batch?.registry === "frdo"','validBatchId(batch.id)','batch.has_artifact === true','pending.has(batch.id)'],
        'submission':['!readOnly && !confirmed && canConfirmFrdoSubmission(batch)','checking || unknown','if (!eligible || blocked) return','submission.confirm(batch, reference)','maxLength={255}','submission.check(batch.id)','Подтвердить фактическую отправку','не передаёт сведения во внешний реестр автоматически'],
        'hook':['markAdminFrdoSubmissionBatchSubmitted(batch.id, { external_reference: reference.trim() || null })','getAdminFrdoSubmissionBatch(id)','journal.current.begin(batch)','journal.current.readback(id, detail)'],
        'results':['recordAdminFrdoSubmissionBatchResults(batch.id, {','source_description: sourceDescription.trim()','source_reference: sourceReference.trim() || null','item.result_status == null && forms[item.obligation_id]?.selected','if (!items.length)','result_status: form.result_status','form.result_status === "accepted"','!readOnly && detail.registry === "frdo" && detail.status === "submitted" && !detail.reconciled_at','detail.has_artifact','approval_fingerprint','approval_snapshot_json','setForms(Object.fromEntries','pendingForm(item)','...defaults,','...(previous[obligationId] || {}),','fence.current.begin','fence.current.readback','Проверить сохранённые результаты'],
    }
    for owner,markers in contracts.items():
        for marker in markers:
            if marker not in text[owner]:raise AssertionError(names[owner]+' missing FRDO contract: '+marker)
    if text['page'].count('<FrdoBatchCreation')!=1 or text['page'].count('useFrdoSubmissionFence(')!=1:
        raise AssertionError('FRDO creation/submission must have one page owner')
    for marker in ['prepareAdminFrdoSubmissionBatch','downloadAdminFrdoSubmissionBatch','markAdminFrdoSubmissionBatchSubmitted','recordAdminFrdoSubmissionBatchResults','admin-registries-frdo-batch-create','admin-registries-frdo-batch-results-form']:
        if marker in text['history']:raise AssertionError('Duplicate legacy action in history: '+marker)
    for owner in ['page','history','create','download','submission','results']:
        for marker in ['window.prompt(', 'window.alert(', 'localStorage.setItem(', 'sessionStorage.setItem(']:
            # The page retains unrelated Mintrud session storage; FRDO forms do not own journals.
            if owner=='page' and marker=='sessionStorage.setItem(':continue
            if marker in text[owner]:raise AssertionError(names[owner]+' forbidden pattern: '+marker)
    print('FRDO_DISTRIBUTED_WORKSPACE_CONTRACT=PASS')

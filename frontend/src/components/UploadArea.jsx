import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import ResumeList from "./ResumeList";

const UploadArea = ({ selectedJobContext }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [batchId, setBatchId] = useState(null);
  const [totalFiles, setTotalFiles] = useState(0); // known upfront from upload response
  const [error, setError] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isBatchCompleted, setIsBatchCompleted] = useState(false);
  const [resumes, setResumes] = useState([]);

  // Live SSE status: filename -> {status, score, reason}
  const [fileStatus, setFileStatus] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  const navigate = useNavigate();

  const handleComplete = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    setIsBatchCompleted(true);
  }, []);

  const fetchResumes = async () => {
    try {
      const response = await api.get("/resume/all");
      setResumes(response.data);
    } catch (err) {
      console.error("Failed to fetch resumes", err);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, [refreshTrigger]);

  // ---- SSE live progress ----
  useEffect(() => {
    if (!batchId) return;
    setFileStatus({});
    setIsProcessing(true);
    setIsBatchCompleted(false);

    const es = new EventSource(
      `http://localhost:8000/api/v1/batch/${batchId}/progress`,
      { withCredentials: true }
    );

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Terminal event: stop processing, refresh DB-backed counts + audit button
      if (data.status === "COMPLETED" || data.status === "FAILED") {
        setIsProcessing(false);
        es.close();
        handleComplete();
        return;
      }

      // Per-file update (used only to compute live counts, not shown as a list)
      setFileStatus(prev => ({
        ...prev,
        [data.filename]: { status: data.status, score: data.score, reason: data.reason },
      }));
    };

    es.onerror = () => {
      // Flaky event: still surface the audit button via handleComplete
      setIsProcessing(false);
      es.close();
      handleComplete();
    };

    return () => es.close();
  }, [batchId, handleComplete]);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 10) {
      setError("You can only upload up to 10 PDFs at a time.");
      return;
    }
    setError("");
    setFiles(selectedFiles);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 10) {
      setError("You can only upload up to 10 PDFs at a time.");
      return;
    }
    setError("");
    setFiles(droppedFiles);
  };

  const handleRemoveFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    if (!selectedJobContext) {
      setError("Please select a Job Context first before uploading.");
      return;
    }

    setUploading(true);
    setError("");
    setIsBatchCompleted(false);

    const formData = new FormData();
    formData.append("job_context_id", selectedJobContext.id);
    files.forEach((file) => formData.append("files", file));

    try {
      const response = await api.post("/batch/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setBatchId(response.data.batch_id);
      setTotalFiles(response.data.total_files || files.length);
      setFiles([]);
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // ---- Progress (fluid bar) from SSE ----
  const sseEntries = Object.entries(fileStatus);
  const sseDone = sseEntries.filter(([, i]) => i.status !== "Processing...").length;
  const barTotal = totalFiles || sseEntries.length;
  const pct = isBatchCompleted ? 100 : (barTotal ? (sseDone / barTotal) * 100 : 0);

  // Count "Added" and "Review" from SSE while processing, from DB otherwise.
  // DB source keeps counts correct after refresh/login AND updates live when a
  // review resume is added to the pipeline.
  const tally = (getStatus) => (list) =>
    list.reduce((a, item) => {
      const s = getStatus(item);
      if (s === "AUTO_ADDED" || s === "ADDED_BY_RECRUITER") a.added++;
      else if (s === "NEEDS_REVIEW") a.review++;
      else if (s === "DUPLICATE_SKIPPED") a.dupe++;
      else if (s === "UNREADABLE") a.flag++;
      return a;
    }, { added: 0, review: 0, dupe: 0, flag: 0 });

  const sseCounts = tally(([, i]) => i.status)(sseEntries);
  const dbCounts = tally((r) => r.status)(resumes);
  const view = isProcessing ? sseCounts : dbCounts;

  // ---- Audit button visibility ----
  // Show when at least one resume is ready (added). Hide only if all are in
  // review / unreadable / duplicate, or the DB is empty.
  const hasReadyResumes = resumes.some(r => r.status === "AUTO_ADDED" || r.status === "ADDED_BY_RECRUITER");
  const hasReviewResumes = resumes.some(r => r.status === "NEEDS_REVIEW");

  const goToAudit = () => {
    const targetBatchId = batchId || resumes[0]?.batch_id;
    if (targetBatchId) navigate(`/audit?batch=${targetBatchId}`);
  };

  const showPanel = barTotal > 0 || resumes.length > 0;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-8">
      <h2 className="text-xl font-bold mb-4 text-gray-800">
        Upload Resumes{" "}
        {selectedJobContext ? (
          <span className="text-sm font-normal text-gray-500">for {selectedJobContext.job_title}</span>
        ) : (
          <span className="text-sm font-normal text-red-500"> (No Context Selected)</span>
        )}
      </h2>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-300 p-8 text-center rounded-lg hover:border-blue-500 transition-colors"
      >
        <input type="file" multiple accept="application/pdf" onChange={handleFileChange} className="hidden" id="file-upload" />
        <label htmlFor="file-upload" className="cursor-pointer text-blue-600 font-semibold hover:underline">Click to select</label>
        <span className="text-gray-500"> or drag and drop PDF files here</span>
      </div>

      {error && <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

      {files.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">{files.length} file(s) selected:</p>
          <ul className="mt-2 text-sm text-gray-600 space-y-1">
            {files.map((file, idx) => (
              <li key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded border">
                <span className="truncate pr-2">{file.name}</span>
                <button onClick={() => handleRemoveFile(idx)} className="text-red-500 hover:text-red-700 font-bold flex-shrink-0">❌</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={files.length === 0 || uploading || !selectedJobContext}
        className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Start Processing"}
      </button>

      {/* ---- Single fluid line + live count segments (no per-file list) ---- */}
      {showPanel && (
        <div className="mt-6 border rounded-xl p-4 bg-gray-50">
          {/* Fluid progress line: only during/after a batch in this session */}
          {barTotal > 0 && (
            <>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-700">
                  {isProcessing ? "Processing resumes..." : "Processing complete"}
                </h4>
                <span className="text-xs text-gray-500">{Math.min(sseDone, barTotal)} of {barTotal} processed</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full mb-4 overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
            </>
          )}

          {/* Count segments — numbers only, update live */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm font-semibold text-green-700">Added: {view.added}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-sm font-semibold text-amber-700">Review: {view.review}</span>
            </div>
            {view.dupe > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200">
                <span className="h-2 w-2 rounded-full bg-gray-400" />
                <span className="text-sm font-medium text-gray-500">Already uploaded: {view.dupe}</span>
              </div>
            )}
            {view.flag > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-sm font-medium text-red-700">Flagged: {view.flag}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- Deep AI Audit CTA ---- */}
      {hasReadyResumes ? (
        <div className="mt-6 bg-green-50 border border-green-200 p-4 rounded-lg text-center">
          <p className="text-sm font-medium text-green-800 mb-3">✅ Resumes are ready for AI evaluation.</p>
          <button onClick={goToAudit} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
            Run Deep AI Audit →
          </button>
        </div>
      ) : hasReviewResumes ? (
        <div className="mt-6 bg-amber-50 border border-amber-200 p-4 rounded-lg text-center">
          <p className="text-sm font-medium text-amber-800">⚠️ All resumes are in 'Needs Review'. Add them to the pipeline below to run the AI Audit.</p>
        </div>
      ) : null}

      <div className="mt-8">
        <ResumeList resumes={resumes} onRefresh={fetchResumes} />
      </div>
    </div>
  );
};

export default UploadArea;
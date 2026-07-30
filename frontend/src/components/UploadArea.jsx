import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import ResumeList from "./ResumeList";

const UploadArea = ({ selectedJobContext }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [batchId, setBatchId] = useState(null);
  const [totalFiles, setTotalFiles] = useState(0);
  const [error, setError] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isBatchCompleted, setIsBatchCompleted] = useState(false);
  const [resumes, setResumes] = useState([]);

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

  // SSE live progress
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

      if (data.status === "COMPLETED" || data.status === "FAILED") {
        setIsProcessing(false);
        es.close();
        handleComplete();
        return;
      }

      setFileStatus(prev => ({
        ...prev,
        [data.filename]: { status: data.status, score: data.score, reason: data.reason },
      }));
    };

    es.onerror = () => {
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

  const sseEntries = Object.entries(fileStatus);
  const sseDone = sseEntries.filter(([, i]) => i.status !== "Processing...").length;
  const barTotal = totalFiles || sseEntries.length;
  const pct = isBatchCompleted ? 100 : (barTotal ? (sseDone / barTotal) * 100 : 0);

  // FIX FOR "2 of 3 processed": Ensure display counter shows total when batch completes/stops processing
  const processedDisplayCount = (!isProcessing || isBatchCompleted) ? barTotal : Math.min(sseDone, barTotal);

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

  const hasReadyResumes = resumes.some(r => r.status === "AUTO_ADDED" || r.status === "ADDED_BY_RECRUITER");
  const hasReviewResumes = resumes.some(r => r.status === "NEEDS_REVIEW");

  const goToAudit = () => {
    const targetBatchId = batchId || resumes[0]?.batch_id;
    if (targetBatchId) navigate(`/audit?batch=${targetBatchId}`);
  };

  const showPanel = resumes.length > 0 && (isProcessing || (barTotal > 0 && isBatchCompleted));

  return (
    <div className="space-y-4">
      
      {/* Modern Drag & Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`p-6 rounded-xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center relative ${
          !selectedJobContext 
            ? "border-slate-200 bg-slate-50/50 opacity-60 cursor-not-allowed" 
            : "border-slate-300 hover:border-indigo-500 bg-slate-50/30 hover:bg-indigo-50/20 cursor-pointer"
        }`}
      >
        <input 
          type="file" 
          multiple 
          accept="application/pdf" 
          onChange={handleFileChange} 
          disabled={!selectedJobContext}
          className="hidden" 
          id="file-upload" 
        />
        
        <label 
          htmlFor="file-upload" 
          className={`flex flex-col items-center justify-center w-full h-full ${!selectedJobContext ? "cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-indigo-600 mb-2.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>

          <p className="text-xs font-bold text-slate-800">
            <span className="text-indigo-600 hover:underline">Click to browse</span> or drag and drop candidate PDFs
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Supports batch processing up to 10 PDFs (Max 20MB per file)
          </p>
        </label>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Selected Files List with SVG Delete Icon */}
      {files.length > 0 && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>{files.length} file(s) selected:</span>
          </div>
          <ul className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {files.map((file, idx) => (
              <li key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-200 text-xs shadow-xs">
                <span className="truncate text-slate-700 font-medium pr-2">{file.name}</span>
                
                {/* SVG TRASH DELETE BUTTON (REPLACED 'X') */}
                <button 
                  onClick={() => handleRemoveFile(idx)} 
                  className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-all cursor-pointer shrink-0"
                  title="Remove file"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={files.length === 0 || uploading || !selectedJobContext}
        className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer disabled:cursor-not-allowed shadow-sm"
      >
        {uploading ? "Uploading Batch..." : "Start Pre-Filter Processing"}
      </button>

      {/* Progress Panel */}
      {showPanel && (
        <div className="p-3.5 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-bold">
              {isProcessing ? "Processing resumes..." : "Processing Complete"}
            </span>
            <span className="text-slate-400 text-[10px] font-mono">
              {processedDisplayCount} of {barTotal} processed
            </span>
          </div>

          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-rose-500 transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              <span>Added: {view.added}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
              <span>Review: {view.review}</span>
            </div>
          </div>
        </div>
      )}

      {/* Audit CTA */}
      {hasReadyResumes ? (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-2">
          <p className="text-xs font-bold text-emerald-800">✅ Resumes are ready for 5-Vector AI evaluation.</p>
          <button onClick={goToAudit} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs cursor-pointer">
            View Candidates in Audit Pipeline →
          </button>
        </div>
      ) : hasReviewResumes ? (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
          <p className="text-xs font-bold text-amber-800">⚠️ All resumes are in 'Needs Review'. Add them to the pipeline below.</p>
        </div>
      ) : null}

      <div className="pt-2">
        <ResumeList resumes={resumes} onRefresh={fetchResumes} />
      </div>
    </div>
  );
};

export default UploadArea;
import { useState, useCallback } from "react";
import api from "../api/axios";
import ProgressLog from "./ProgressLog";
import ResumeList from "./ResumeList";

const UploadArea = ({ selectedJobContext }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [batchId, setBatchId] = useState(null);
  const [error, setError] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isBatchCompleted, setIsBatchCompleted] = useState(false); // FIX: Added state to track batch completion

  const handleComplete = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    setIsBatchCompleted(true); // FIX: Mark batch as completed to show ResumeList
  }, []);

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
    setIsBatchCompleted(false); // FIX: Reset completion state for new batch
    
    const formData = new FormData();
    formData.append("job_context_id", selectedJobContext.id);
    
    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await api.post("/batch/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      setBatchId(response.data.batch_id);
      setFiles([]); // Clear selected files after successful upload
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed. Make sure a valid Job Context is selected.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-8">
      <h2 className="text-xl font-bold mb-4 text-gray-800">
        Upload Resumes 
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
        <input 
          type="file" 
          multiple 
          accept="application/pdf" 
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer text-blue-600 font-semibold hover:underline">
          Click to select
        </label>
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
                <button 
                  onClick={() => handleRemoveFile(idx)}
                  className="text-red-500 hover:text-red-700 font-bold flex-shrink-0"
                  title="Remove file"
                >
                  ❌
                </button>
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

      {batchId && (
        <div className="mt-6 border-t pt-4">
          <ProgressLog batchId={batchId} onProcessingComplete={handleComplete} />
        </div>
      )}

      {/* FIX: Only render the final list when batch is completed to avoid double list confusion */}
      {isBatchCompleted && (
        <div className="mt-8">
          <ResumeList refreshTrigger={refreshTrigger} />
        </div>
      )}
    </div>
  );
};

export default UploadArea;
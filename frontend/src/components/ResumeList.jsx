import api from "../api/axios";

const STATUS_TEXT = {
  AUTO_ADDED: "Processed",
  NEEDS_REVIEW: "Needs Review",
  ADDED_BY_RECRUITER: "Added Manually",
  UNREADABLE: "Unreadable",
  DUPLICATE_SKIPPED: "Already Uploaded"
};

const ResumeList = ({ resumes, onRefresh }) => {
  const handleAddResume = async (resumeId) => {
    try {
      await api.patch(`/resume/${resumeId}`, { status: "ADDED_BY_RECRUITER" });
      onRefresh(); // moves Review -> Added counts live in UploadArea
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to override resume status.");
    }
  };

  const handleAddAll = async () => {
    // Bulk add all needs_review resumes
    const needsReview = resumes.filter(r => r.status === "NEEDS_REVIEW");
    try {
      // Run sequentially; refresh once at the end
      for (const r of needsReview) {
        await api.patch(`/resume/${r.id}`, { status: "ADDED_BY_RECRUITER" });
      }
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to add some resumes.");
    } finally {
      onRefresh(); // always refresh so counts stay in sync even on partial failure
    }
  };

  const handleDeleteResume = async (resumeId) => {
    if (window.confirm("Delete this resume permanently?")) {
      try {
        await api.delete(`/resume/${resumeId}`);
        onRefresh();
      } catch (error) {
        alert("Failed to delete resume.");
      }
    }
  };

  // Group resumes by status for a cleaner UI
  const readyForAI = resumes.filter(r => r.status === "AUTO_ADDED" || r.status === "ADDED_BY_RECRUITER");
  const needsReview = resumes.filter(r => r.status === "NEEDS_REVIEW");
  const others = resumes.filter(r => ["UNREADABLE", "DUPLICATE_SKIPPED"].includes(r.status));

  const renderGroup = (title, list, color) => (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <h4 className={`text-sm font-bold ${color}`}>{title} ({list.length})</h4>
        {title === "Needs Review" && list.length > 0 && (
          <button onClick={handleAddAll} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold hover:bg-blue-200">
            Add All to Pipeline
          </button>
        )}
      </div>
      <div className="space-y-2">
        {list.map((resume) => (
          <div key={resume.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border text-sm">
            <div className="min-w-0 pr-2">
              <p className="font-medium text-gray-800 truncate">{resume.original_filename}</p>
              <p className="text-xs text-gray-500">
                Score: {resume.quick_score ? `${resume.quick_score}%` : "N/A"}
                <span className="ml-2 text-gray-400">· {STATUS_TEXT[resume.status] || resume.status}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {resume.status === "NEEDS_REVIEW" && (
                <button onClick={() => handleAddResume(resume.id)} className="bg-blue-600 text-white text-xs font-semibold py-1 px-2 rounded">Add</button>
              )}
              <button onClick={() => handleDeleteResume(resume.id)} className="text-red-500 hover:text-red-700 text-xs font-bold">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (resumes.length === 0) return <p className="text-gray-500 text-sm">No resumes processed yet.</p>;

  return (
    <div>
      <h3 className="text-lg font-bold mb-4 text-gray-800">Resume Pipeline</h3>
      {readyForAI.length > 0 && renderGroup("Ready for AI", readyForAI, "text-green-600")}
      {needsReview.length > 0 && renderGroup("Needs Review", needsReview, "text-yellow-600")}
      {others.length > 0 && renderGroup("Archived/Skipped", others, "text-gray-500")}
    </div>
  );
};

export default ResumeList;
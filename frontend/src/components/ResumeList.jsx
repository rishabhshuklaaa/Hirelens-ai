import { useState, useEffect } from "react";
import api from "../api/axios";

const ResumeList = ({ refreshTrigger }) => {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchResumes = async () => {
    setLoading(true);
    try {
      const response = await api.get("/resume/all");
      setResumes(response.data);
    } catch (error) {
      console.error("Failed to fetch resumes", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, [refreshTrigger]);

  const handleAddResume = async (resumeId) => {
    try {
      await api.patch(`/resume/${resumeId}`, { status: "ADDED_BY_RECRUITER" });
      fetchResumes();
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to override resume status.");
    }
  };

  const handleDeleteResume = async (resumeId) => {
    if (window.confirm("Are you sure you want to permanently delete this resume?")) {
      try {
        await api.delete(`/resume/${resumeId}`);
        fetchResumes(); // Refresh list
      } catch (error) {
        alert("Failed to delete resume.");
      }
    }
  };

  return (
    <div>
      <h3 className="text-lg font-bold mb-4 text-gray-800">Processed Resumes</h3>
      {loading ? (
        <p>Loading resumes...</p>
      ) : resumes.length === 0 ? (
        <p className="text-gray-500 text-sm">No resumes processed yet.</p>
      ) : (
        <div className="space-y-3">
          {resumes.map((resume) => (
            <div key={resume.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
              <div>
                <p className="font-medium text-gray-800">{resume.original_filename}</p>
                <p className="text-xs text-gray-500">
                  Pages: {resume.page_count || "N/A"} | Email: {resume.candidate_email || "N/A"} | Score: {resume.quick_score ? `${resume.quick_score}%` : "N/A"}
                </p>
                <span className={`text-xs font-semibold mt-1 inline-block px-2 py-1 rounded ${
                  resume.status === "AUTO_ADDED" || resume.status === "ADDED_BY_RECRUITER" ? "bg-green-100 text-green-700" :
                  resume.status === "NEEDS_REVIEW" ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {resume.status.replace(/_/g, " ")}
                  {resume.unreadable_reason ? ` (${resume.unreadable_reason})` : ""}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {resume.status === "NEEDS_REVIEW" && (
                  <button 
                    onClick={() => handleAddResume(resume.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-1 px-3 rounded"
                  >
                    Add to AI Pipeline
                  </button>
                )}
                {/* Delete Button Added */}
                <button 
                  onClick={() => handleDeleteResume(resume.id)}
                  className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-1 px-3 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResumeList;
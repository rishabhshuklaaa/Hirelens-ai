import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import EmailGenerator from "../components/EmailGenerator";
import api from "../api/axios";

const Decisions = () => {
  const [searchParams] = useSearchParams();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const batchId = searchParams.get("batch");

  useEffect(() => {
    if (!batchId) {
      navigate("/audit");
      return;
    }

    const fetchDecisions = async () => {
      try {
        const res = await api.get(`/audit/batch/${batchId}/results`);
        setResumes(res.data);
      } catch (error) {
        console.error("Error fetching decisions", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDecisions();
  }, [batchId, navigate]);

  const approvedResumes = resumes.filter(r => r.recruiter_decision === "APPROVED");
  const rejectedResumes = resumes.filter(r => r.recruiter_decision === "REJECTED");

  // FIX: Friendly empty state if no decisions made yet
  if (loading) return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="container mx-auto py-8 text-center text-gray-500">Loading decisions...</div>
    </div>
  );

  // If no one is approved or rejected, show a friendly message
  const hasNoDecisions = approvedResumes.length === 0 && rejectedResumes.length === 0;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="container mx-auto py-8 px-4">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Candidate Decisions & Outreach</h2>
            <p className="text-sm text-gray-500">Generate AI emails for approved candidates or send feedback to rejected ones.</p>
          </div>
          <button 
            onClick={() => navigate(`/audit?batch=${batchId}`)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded text-sm"
          >
            ← Back to Audit
          </button>
        </div>

        {hasNoDecisions ? (
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <p className="text-gray-600 mb-4">You haven't approved or rejected any candidates in this batch yet.</p>
            <button 
              onClick={() => navigate(`/audit?batch=${batchId}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded"
            >
              Go to Audit Page
            </button>
          </div>
        ) : (
          <>
            {/* APPROVED SECTION */}
            <div className="mb-12">
              <h3 className="text-lg font-bold text-green-700 mb-4 border-b pb-2">
                ✅ Approved for Hiring ({approvedResumes.length})
              </h3>
              
              {approvedResumes.length === 0 ? (
                <p className="text-gray-500 text-sm bg-white p-4 rounded shadow-sm">No candidates approved yet.</p>
              ) : (
                <div className="space-y-6">
                  {approvedResumes.map(resume => (
                    <div key={resume.id} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h4 className="text-xl font-bold text-gray-800">{resume.original_filename}</h4>
                          <p className="text-sm text-gray-500">{resume.candidate_email || "No email extracted"}</p>
                        </div>
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                          AI Score: {resume.ai_overall_score}%
                        </span>
                      </div>
                      <EmailGenerator resume={resume} type="approved" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* REJECTED SECTION */}
            <div>
              <h3 className="text-lg font-bold text-red-700 mb-4 border-b pb-2">
                ❌ Rejected ({rejectedResumes.length})
              </h3>
              
              {rejectedResumes.length === 0 ? (
                <p className="text-gray-500 text-sm bg-white p-4 rounded shadow-sm">No candidates rejected.</p>
              ) : (
                <div className="space-y-6">
                  {rejectedResumes.map(resume => (
                    <div key={resume.id} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h4 className="text-xl font-bold text-gray-800">{resume.original_filename}</h4>
                          <p className="text-sm text-gray-500">{resume.candidate_email || "No email extracted"}</p>
                        </div>
                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
                          AI Score: {resume.ai_overall_score}%
                        </span>
                      </div>
                      <EmailGenerator resume={resume} type="rejected" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

      </main>
    </div>
  );
};

export default Decisions;
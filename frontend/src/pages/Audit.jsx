import { useState, useEffect } from "react";
// ADDED: Imported useNavigate to handle the Next button routing
import { useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import CandidateCard from "../components/CandidateCard";
import api from "../api/axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const Audit = () => {
  const [batchId, setBatchId] = useState(null);   // resolved silently, no dropdown
  const [resumes, setResumes] = useState([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);
  const [showChart, setShowChart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  
  // ADDED: Initialize navigate hook
  const navigate = useNavigate();

  // Step 1: Resolve which batch to show.
  // Prefer the batch passed in the URL (from Upload page). Otherwise pick the latest batch.
  useEffect(() => {
    const resolveBatch = async () => {
      const batchFromUrl = searchParams.get("batch");
      if (batchFromUrl) {
        setBatchId(Number(batchFromUrl));
        return;
      }
      try {
        const res = await api.get("/resume/all");
        if (res.data.length > 0) {
          // Latest batch = highest batch_id
          const latest = Math.max(...res.data.map(r => r.batch_id));
          setBatchId(latest);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error resolving batch", error);
        setLoading(false);
      }
    };
    resolveBatch();
  }, [searchParams]);

  // Step 2: Fetch results for the resolved batch. Poll while auditing.
  useEffect(() => {
    if (!batchId) return;

    const fetchResults = async () => {
      try {
        const res = await api.get(`/audit/batch/${batchId}/results`);
        setResumes(res.data);
        setLoading(false);

        // Stop polling once nothing is left in PENDING_AI.
        if (isAuditing) {
          const stillPending = res.data.some(r => r.ai_status === "PENDING_AI");
          if (!stillPending) setIsAuditing(false);
        }
      } catch (error) {
        console.error("Error fetching results", error);
        setLoading(false);
      }
    };

    fetchResults();

    let interval;
    if (isAuditing) interval = setInterval(fetchResults, 4000);
    return () => clearInterval(interval);
  }, [batchId, isAuditing]);

  const handleRunAudit = async () => {
    if (!batchId) return;
    try {
      await api.post(`/audit/batch/${batchId}/run-audit`);
      setIsAuditing(true);
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to start audit.");
    }
  };

  const handleDecisionUpdate = (resumeId, decision) => {
    setResumes(prev => prev.map(r => r.id === resumeId ? { ...r, recruiter_decision: decision } : r));
  };

  const handleBarClick = (data) => {
    const resumeId = data?.id ?? data?.payload?.id;
    if (!resumeId) return;
    setHighlightedId(resumeId);
    document.getElementById(`card-${resumeId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => setHighlightedId(null), 2000);
  };

  // ADDED: Function to navigate to the Decisions page with the current batchId
  const goToDecisions = () => {
    if (batchId) navigate(`/decisions?batch=${batchId}`);
  };

  // Derived data
  const scoredResumes = resumes.filter(r => r.ai_status !== "PENDING_AI");
  const pendingCount = resumes.filter(r => r.ai_status === "PENDING_AI").length;
  const progressPercent = resumes.length > 0 ? (scoredResumes.length / resumes.length) * 100 : 0;

  // ADDED: Check if at least one resume has been approved or rejected by the recruiter
  const hasDecisions = resumes.some(
    (r) => r.recruiter_decision === "APPROVED" || r.recruiter_decision === "REJECTED"
  );

  // Summary counts for the report strip
  const summary = {
    total: resumes.length,
    strong: resumes.filter(r => r.ai_tier_decision === "STRONG_FIT").length,
    maybe: resumes.filter(r => r.ai_tier_decision === "MAYBE").length,
    no: resumes.filter(r => r.ai_tier_decision === "NO").length,
    pending: pendingCount,
  };

  const chartData = resumes
    .filter(r => r.ai_status === "AI_SCORED")
    .map(r => ({
      id: r.id,
      name: r.original_filename.length > 10 ? r.original_filename.substring(0, 10) + "..." : r.original_filename,
      score: r.ai_overall_score,
      tier: r.ai_tier_decision,
    }));

  const getBarColor = (tier) => {
    switch (tier) {
      case "STRONG_FIT": return "#16a34a";
      case "MAYBE": return "#d97706";
      case "NO": return "#dc2626";
      default: return "#3b82f6";
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="container mx-auto py-8 px-4">

        {/* Header + Run button */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Deep AI Audit Report</h2>
            <p className="text-sm text-gray-500">Comprehensive analysis of your shortlisted resumes.</p>
          </div>
          <button
            onClick={handleRunAudit}
            disabled={!batchId || isAuditing || resumes.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded disabled:opacity-50 flex items-center gap-2"
          >
            {isAuditing ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              </>
            ) : (
              "Run AI Audit"
            )}
          </button>
        </div>

        {/* Summary stats strip */}
        {resumes.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm text-center">
              <p className="text-2xl font-bold text-gray-800">{summary.total}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm text-center">
              <p className="text-2xl font-bold text-green-600">{summary.strong}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Strong Fit</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm text-center">
              <p className="text-2xl font-bold text-amber-600">{summary.maybe}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Maybe</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm text-center">
              <p className="text-2xl font-bold text-red-600">{summary.no}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wide">No</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm text-center">
              <p className="text-2xl font-bold text-blue-500">{summary.pending}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Pending</p>
            </div>
          </div>
        )}

        {/* Progress bar while auditing */}
        {isAuditing && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6 text-center">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Deep AI Analysis in Progress</h3>
            <p className="text-sm text-gray-500 mb-4">
              Evaluated {scoredResumes.length} of {resumes.length} resumes... ({pendingCount} remaining)
            </p>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
        )}

        {/* On-demand comparison graph */}
        {chartData.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Candidate Comparison</h3>
              <button
                onClick={() => setShowChart(prev => !prev)}
                className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-1.5 px-4 rounded"
              >
                {showChart ? "Hide Graph" : "Show Graph"}
              </button>
            </div>
            {showChart && (
              <>
                <p className="text-xs text-gray-500 mb-4 mt-1">Click a bar to jump to that candidate's card.</p>
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                      <YAxis domain={[0, 100]} stroke="#6b7280" />
                      <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
                      <Bar dataKey="score" radius={[4, 4, 0, 0]} onClick={handleBarClick} cursor="pointer">
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getBarColor(entry.tier)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )}

        {/* Candidate cards (each appears as it gets scored) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <p className="text-gray-500 text-center col-span-2 py-8">Loading report...</p>
          ) : resumes.length === 0 ? (
            <p className="text-gray-500 text-center col-span-2 py-8">No resumes found. Upload resumes first.</p>
          ) : (
            resumes.map(resume => (
              <CandidateCard
                key={resume.id}
                resume={resume}
                onDecisionUpdate={handleDecisionUpdate}
                highlighted={highlightedId === resume.id}
              />
            ))
          )}
        </div>
      </main>

      {/* ADDED: Fixed Next button at Bottom Right, only visible if at least one resume is Approved/Rejected */}
      {hasDecisions && (
        <div className="fixed bottom-8 right-8 z-50">
          <button
            onClick={goToDecisions}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full shadow-lg flex items-center gap-2 transition-all hover:scale-105"
            title="Go to Decisions & Emails"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default Audit;
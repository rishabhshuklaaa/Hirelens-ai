import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import CandidateCard from "../components/CandidateCard";
import api from "../api/axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const Audit = () => {
  const [batchId, setBatchId] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);
  const [showChart, setShowChart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  
  const navigate = useNavigate();

  // Step 1: Resolve batch
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

  // Step 2: Fetch & Poll results
  useEffect(() => {
    if (!batchId) return;

    const fetchResults = async () => {
      try {
        const res = await api.get(`/audit/batch/${batchId}/results`);
        setResumes(res.data);
        setLoading(false);

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

  const goToDecisions = () => {
    if (batchId) navigate(`/decisions?batch=${batchId}`);
  };

  const scoredResumes = resumes.filter(r => r.ai_status !== "PENDING_AI");
  const pendingCount = resumes.filter(r => r.ai_status === "PENDING_AI").length;
  const progressPercent = resumes.length > 0 ? (scoredResumes.length / resumes.length) * 100 : 0;

  const hasDecisions = resumes.some(
    (r) => r.recruiter_decision === "APPROVED" || r.recruiter_decision === "REJECTED"
  );

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
      case "STRONG_FIT": return "#10b981";
      case "MAYBE": return "#f59e0b";
      case "NO": return "#f43f5e";
      default: return "#6366f1";
    }
  };

  return (
    <div className="min-h-full bg-slate-100/80 text-slate-900 font-sans selection:bg-rose-500 selection:text-white pb-24">
      <main className="max-w-[1500px] mx-auto  px-4 md:px-8 space-y-6">

        {/* HEADER BAR */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 uppercase tracking-wider">
                Step 2 • Evaluation
              </span>
              {batchId && (
                <span className="text-xs font-mono text-slate-400">Batch ID: #{batchId}</span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-display">
              Deep 5-Vector AI Audit
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Semantic analysis assessing technical depth, project metrics, and career trajectory.
            </p>
          </div>

          <button
            onClick={handleRunAudit}
            disabled={!batchId || isAuditing || resumes.length === 0}
            className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shrink-0"
          >
            {isAuditing ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Evaluating 5 Vectors...</span>
              </>
            ) : (
              <span>Run AI Audit</span>
            )}
          </button>
        </div>

        {/* SUMMARY STATS STRIP */}
        {resumes.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs text-center">
              <p className="text-2xl font-extrabold text-slate-900">{summary.total}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Total Shortlisted</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/20 shadow-xs text-center">
              <p className="text-2xl font-extrabold text-emerald-600">{summary.strong}</p>
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mt-0.5">Strong Fit</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-amber-200/80 bg-amber-50/20 shadow-xs text-center">
              <p className="text-2xl font-extrabold text-amber-600">{summary.maybe}</p>
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mt-0.5">Maybe</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-rose-200/80 bg-rose-50/20 shadow-xs text-center">
              <p className="text-2xl font-extrabold text-rose-600">{summary.no}</p>
              <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider mt-0.5">No Fit</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-indigo-200/80 bg-indigo-50/20 shadow-xs text-center col-span-2 md:col-span-1">
              <p className="text-2xl font-extrabold text-indigo-600">{summary.pending}</p>
              <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider mt-0.5">Pending AI</p>
            </div>
          </div>
        )}

        {/* PROGRESS BAR WHILE AUDITING */}
        {isAuditing && (
          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping"></span>
                <span className="font-bold">Deep AI Analysis in Progress...</span>
              </div>
              <span className="text-slate-400 font-mono text-[11px]">
                {scoredResumes.length} of {resumes.length} Evaluated ({pendingCount} pending)
              </span>
            </div>

            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* COMPARISON GRAPH CARD */}
        {chartData.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Candidate Score Comparison</h3>
                <p className="text-xs text-slate-500">Visual breakdown across 5 semantic vectors.</p>
              </div>
              <button
                onClick={() => setShowChart(prev => !prev)}
                className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                {showChart ? "Hide Graph ✕" : "Show Graph 📊"}
              </button>
            </div>

            {showChart && (
              <div className="pt-2 space-y-2">
                <p className="text-[11px] text-slate-400 font-medium">💡 Click any bar to jump directly to candidate details.</p>
                <div style={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <Tooltip 
                        cursor={{ fill: "rgba(241,245,249,0.6)" }} 
                        contentStyle={{ 
                          backgroundColor: "#0F172A", 
                          borderColor: "#1E293B", 
                          borderRadius: "12px", 
                          color: "#F8FAFC",
                          fontSize: "12px"
                        }} 
                      />
                      <Bar dataKey="score" radius={[6, 6, 0, 0]} onClick={handleBarClick} cursor="pointer">
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getBarColor(entry.tier)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CANDIDATE CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {loading ? (
            <div className="col-span-2 py-12 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Loading audit reports...</span>
            </div>
          ) : resumes.length === 0 ? (
            <div className="col-span-2 py-12 text-center bg-white rounded-2xl border border-slate-200/90 shadow-sm space-y-2">
              <p className="text-xs font-bold text-slate-700">No resumes found in this batch.</p>
              <p className="text-xs text-slate-400">Upload candidate PDFs first to trigger deep evaluation.</p>
            </div>
          ) : (
            resumes.map(resume => (
              <CandidateCard
                key={resume.id}
                resume={resume}
                onDecisionUpdate={handleDecisionUpdate}
                highlighted={highlightedId === resume.id}
                isAuditing={isAuditing} // Pass isAuditing prop to CandidateCard
              />
            ))
          )}
        </div>

      </main>

      {/* FLOATING NEXT BUTTON */}
      {hasDecisions && (
        <div className="fixed bottom-8 right-8 z-50">
          <button
            onClick={goToDecisions}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-7 rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer text-xs uppercase tracking-wider"
            title="Proceed to Decisions & Outreach"
          >
            <span>Proceed to Outreach</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      )}

    </div>
  );
};

export default Audit;
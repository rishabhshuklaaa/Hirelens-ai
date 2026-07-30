import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import EmailGenerator from "../components/EmailGenerator";
import api from "../api/axios";

const Decisions = () => {
  const [searchParams] = useSearchParams();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  // State to track which candidate card is expanded (Accordion mode)
  const [expandedId, setExpandedId] = useState(null);
  
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

  const toggleExpand = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  if (loading) return (
    <div className="min-h-full bg-slate-100/80 text-slate-900 font-sans selection:bg-rose-500 selection:text-white flex items-center justify-center py-20">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
        <svg className="animate-spin h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Loading decisions pipeline...</span>
      </div>
    </div>
  );

  const hasNoDecisions = approvedResumes.length === 0 && rejectedResumes.length === 0;

  return (
    <div className="min-h-full bg-slate-100/80 text-slate-900 font-sans selection:bg-rose-500 selection:text-white pb-20">
      <main className="max-w-[1500px] mx-auto py-6 px-4 md:px-8 space-y-6">
        
        {/* HEADER BAR */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                Step 3 • Outreach
              </span>
              {batchId && (
                <span className="text-xs font-mono text-slate-400">Batch ID: #{batchId}</span>
              )}
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 font-display">
              Candidate Decisions & Outreach
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any candidate to expand and generate automated email drafts.
            </p>
          </div>

          <button 
            onClick={() => navigate(`/audit?batch=${batchId}`)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs transition-all border border-slate-200 cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Audit</span>
          </button>
        </div>

        {hasNoDecisions ? (
          <div className="bg-white p-10 rounded-2xl border border-slate-200/90 shadow-xs text-center space-y-3 max-w-lg mx-auto">
            <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto text-base font-bold">
              ⚡
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">No Decisions Made Yet</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                You haven't approved or rejected any candidates in this batch. Review candidates on the Audit page first.
              </p>
            </div>
            <button 
              onClick={() => navigate(`/audit?batch=${batchId}`)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-5 rounded-xl text-xs transition-all shadow-xs cursor-pointer inline-flex items-center gap-2"
            >
              <span>Go to Audit Page</span>
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* APPROVED SECTION */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Approved Candidates
                  </h2>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-md">
                  {approvedResumes.length} Ready
                </span>
              </div>

              {approvedResumes.length === 0 ? (
                <p className="text-slate-400 text-xs py-2 italic">No candidates approved in this batch.</p>
              ) : (
                <div className="space-y-2">
                  {approvedResumes.map(resume => {
                    const isExpanded = expandedId === resume.id;
                    return (
                      <div 
                        key={resume.id} 
                        className={`bg-white rounded-xl border transition-all overflow-hidden ${
                          isExpanded 
                            ? "border-emerald-500 shadow-md ring-1 ring-emerald-500/20" 
                            : "border-slate-200/90 hover:border-slate-300 shadow-2xs"
                        }`}
                      >
                        {/* COMPACT STRIP (HEADER) */}
                        <div 
                          onClick={() => toggleExpand(resume.id)}
                          className="p-3.5 px-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors select-none"
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-mono shrink-0">
                              APPROVED
                            </span>
                            <div className="min-w-0">
                              <h3 className="text-xs font-bold text-slate-900 truncate">
                                {resume.original_filename}
                              </h3>
                              <p className="text-[11px] text-slate-500 truncate">
                                {resume.candidate_email || "No email extracted"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="bg-slate-900 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono">
                              {resume.ai_overall_score}%
                            </span>
                            <button className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 px-3 py-1 rounded-lg transition-all">
                              {isExpanded ? "Close ▲" : "Draft Email ▼"}
                            </button>
                          </div>
                        </div>

                        {/* EXPANDABLE EMAIL DRAFT BOX */}
                        {isExpanded && (
                          <div className="p-4 bg-slate-50/50 border-t border-slate-100 animate-fadeIn">
                            <EmailGenerator resume={resume} type="approved" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* REJECTED SECTION */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]"></span>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Rejected Candidates
                  </h2>
                </div>
                <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200/80 px-2.5 py-0.5 rounded-md">
                  {rejectedResumes.length} Pending Feedback
                </span>
              </div>

              {rejectedResumes.length === 0 ? (
                <p className="text-slate-400 text-xs py-2 italic">No candidates rejected in this batch.</p>
              ) : (
                <div className="space-y-2">
                  {rejectedResumes.map(resume => {
                    const isExpanded = expandedId === resume.id;
                    return (
                      <div 
                        key={resume.id} 
                        className={`bg-white rounded-xl border transition-all overflow-hidden ${
                          isExpanded 
                            ? "border-rose-500 shadow-md ring-1 ring-rose-500/20" 
                            : "border-slate-200/90 hover:border-slate-300 shadow-2xs"
                        }`}
                      >
                        {/* COMPACT STRIP (HEADER) */}
                        <div 
                          onClick={() => toggleExpand(resume.id)}
                          className="p-3.5 px-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors select-none"
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded font-mono shrink-0">
                              REJECTED
                            </span>
                            <div className="min-w-0">
                              <h3 className="text-xs font-bold text-slate-900 truncate">
                                {resume.original_filename}
                              </h3>
                              <p className="text-[11px] text-slate-500 truncate">
                                {resume.candidate_email || "No email extracted"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono">
                              {resume.ai_overall_score}%
                            </span>
                            <button className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 px-3 py-1 rounded-lg transition-all">
                              {isExpanded ? "Close ▲" : "Draft Feedback ▼"}
                            </button>
                          </div>
                        </div>

                        {/* EXPANDABLE EMAIL DRAFT BOX */}
                        {isExpanded && (
                          <div className="p-4 bg-slate-50/50 border-t border-slate-100 animate-fadeIn">
                            <EmailGenerator resume={resume} type="rejected" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  );
};

export default Decisions;
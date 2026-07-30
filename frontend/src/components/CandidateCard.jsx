import { useState } from "react";
import api from "../api/axios";

const CandidateCard = ({ resume, onDecisionUpdate, highlighted, isAuditing }) => {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDecision = async (decision) => {
    setLoading(true);
    try {
      await api.patch(`/resume/${resume.id}/decision`, { decision });
      onDecisionUpdate(resume.id, decision);
    } catch (error) {
      alert("Failed to update decision.");
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case "STRONG_FIT": return "#10b981"; // Emerald Green
      case "MAYBE": return "#f59e0b";      // Amber
      case "NO": return "#f43f5e";         // Rose Red
      default: return "#64748b";           // Slate Gray
    }
  };

  const getTierBadge = (tier) => {
    if (!tier) return null;
    const text = tier.replace("_", " ");
    const color = getTierColor(tier);

    return (
      <span
        style={{ backgroundColor: `${color}15`, color: color, borderColor: `${color}30` }}
        className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider border shadow-2xs"
      >
        {text}
      </span>
    );
  };

  const isScored = resume.ai_status === "AI_SCORED";
  const isCurrentlyAuditing = isAuditing && resume.ai_status === "PENDING_AI";

  // FIX: Safely parse skills arrays regardless of backend stream order or nulls
  const strongPoints = Array.isArray(resume.ai_strong_points) ? resume.ai_strong_points : [];
  const missingSkills = Array.isArray(resume.ai_missing_skills) ? resume.ai_missing_skills : [];
  const redFlags = Array.isArray(resume.ai_red_flags) ? resume.ai_red_flags : [];

  return (
    <div
      id={`card-${resume.id}`}
      className={`bg-white rounded-2xl border p-5 transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
        highlighted
          ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg -translate-y-0.5"
          : "border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-md"
      }`}
    >
      {/* Top Accent Indicator */}
      <div 
        className="absolute top-0 left-0 right-0 h-1" 
        style={{ 
          backgroundColor: isScored 
            ? getTierColor(resume.ai_tier_decision) 
            : isCurrentlyAuditing 
            ? "#6366f1" 
            : "#cbd5e1" 
        }}
      ></div>

      <div>
        {/* CARD HEADER */}
        <div className="flex justify-between items-start gap-3 mb-4 pt-1">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-mono">
                PDF
              </span>
              <h3 
                className="text-sm font-extrabold text-slate-900 truncate tracking-tight" 
                title={resume.original_filename}
              >
                {resume.original_filename}
              </h3>
            </div>
            {resume.candidate_email && (
              <p className="text-xs text-slate-500 mt-0.5 font-medium truncate">
                {resume.candidate_email}
              </p>
            )}
          </div>

          <div className="text-right shrink-0">
            {isScored ? (
              <div className="flex flex-col items-end gap-1">
                <span 
                  className="text-2xl font-black tracking-tight leading-none" 
                  style={{ color: getTierColor(resume.ai_tier_decision) }}
                >
                  {resume.ai_overall_score}%
                </span>
                {getTierBadge(resume.ai_tier_decision)}
              </div>
            ) : isCurrentlyAuditing ? (
              <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-ping"></span>
                AUDITING NOW...
              </span>
            ) : resume.ai_status === "AI_FAILED" ? (
              <span className="bg-rose-50 border border-rose-200 text-rose-600 px-2.5 py-1 rounded-md text-[10px] font-bold">
                Analysis Failed
              </span>
            ) : (
              <span className="bg-slate-100 border border-slate-200 text-slate-500 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase">
                Queued for Audit
              </span>
            )}
          </div>
        </div>

        {/* UN-AUDITED STATE */}
        {!isScored && !isCurrentlyAuditing && resume.ai_status !== "AI_FAILED" && (
          <div className="my-4 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/70 text-center space-y-1">
            <p className="text-xs font-bold text-slate-700">Candidate Shortlisted & Queued</p>
            <p className="text-[11px] text-slate-500">
              Click <strong className="text-slate-900">"Run AI Audit"</strong> on the top right to start analysis.
            </p>
          </div>
        )}

        {/* PENDING AUDIT ANIMATION */}
        {isCurrentlyAuditing && (
          <div className="my-4 p-3.5 bg-indigo-50/40 border border-indigo-100 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900 mb-1">
              <span>Executing 5-Vector Engine...</span>
              <span className="font-mono text-indigo-600">Active</span>
            </div>
            {[
              "Evaluating technical depth & code metrics...",
              "Analyzing project impact & scale...",
              "Checking career trajectory & stability..."
            ].map((msg, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-[10px] font-medium text-slate-500">
                  <span>{msg}</span>
                </div>
                <div className="h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 rounded-full animate-pulse transition-all duration-500" 
                    style={{ width: `${50 + i * 20}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SCORED SECTION - PERMANENT RENDERING */}
        {isScored && (
          <>
            {/* STRENGTHS & MISSING SKILLS PILLS (Guaranteed to stay) */}
            <div className="mb-3 flex flex-wrap gap-1.5 min-h-[28px]">
              {strongPoints.map((skill, idx) => (
                <span 
                  key={`strong-${idx}`} 
                  className="bg-emerald-50 text-emerald-800 text-[11px] font-semibold px-2.5 py-0.5 rounded-md border border-emerald-200/80"
                >
                  + {skill}
                </span>
              ))}
              {missingSkills.map((skill, idx) => (
                <span 
                  key={`missing-${idx}`} 
                  className="bg-rose-50 text-rose-800 text-[11px] font-semibold px-2.5 py-0.5 rounded-md border border-rose-200/80"
                >
                  - {skill}
                </span>
              ))}
            </div>

            {/* RED FLAGS */}
            {redFlags.length > 0 && (
              <div className="mb-3 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-700 font-semibold flex items-center gap-1.5">
                <span>⚠️</span>
                <span>{redFlags.join(", ")}</span>
              </div>
            )}

            <button 
              onClick={() => setExpanded(!expanded)} 
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors mb-3 flex items-center gap-1 cursor-pointer"
            >
              <span>{expanded ? "Hide Breakdown ✕" : "View AI Vector Breakdown ↓"}</span>
            </button>

            {/* EXPANDED VECTOR ANALYSIS */}
            {expanded && (
              <div className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs space-y-3 mb-4 border border-slate-800 shadow-inner">
                <div>
                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">AI Reasoning Justification</p>
                  <p className="leading-relaxed text-slate-300 font-sans">{resume.ai_score_justification || "No justification generated."}</p>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">5-Vector Radar Scores</p>
                  
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="bg-slate-800/80 p-2 rounded border border-slate-700/60 flex justify-between">
                      <span className="text-slate-400">Tech Depth:</span>
                      <span className="font-bold text-indigo-400">{resume.ai_vector_scores?.tech_depth ?? 0}%</span>
                    </div>

                    <div className="bg-slate-800/80 p-2 rounded border border-slate-700/60 flex justify-between">
                      <span className="text-slate-400">Project Impact:</span>
                      <span className="font-bold text-emerald-400">{resume.ai_vector_scores?.project_impact ?? 0}%</span>
                    </div>

                    <div className="bg-slate-800/80 p-2 rounded border border-slate-700/60 flex justify-between">
                      <span className="text-slate-400">Trajectory:</span>
                      <span className="font-bold text-amber-400">{resume.ai_vector_scores?.career_trajectory ?? 0}%</span>
                    </div>

                    <div className="bg-slate-800/80 p-2 rounded border border-slate-700/60 flex justify-between">
                      <span className="text-slate-400">Resume Quality:</span>
                      <span className="font-bold text-blue-400">{resume.ai_vector_scores?.resume_quality ?? 0}%</span>
                    </div>
                  </div>

                  <div className="bg-slate-800/80 p-2 rounded border border-slate-700/60 flex justify-between text-[11px] font-mono mt-1">
                    <span className="text-slate-400">Risk Assessment Score:</span>
                    <span className="font-bold text-rose-400">{resume.ai_vector_scores?.risk_score ?? 0}%</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* RECRUITER DECISION CONTROLS */}
      {isScored && (
        <div className="flex gap-2.5 pt-3 border-t border-slate-100 mt-auto">
          <button
            onClick={() => handleDecision("APPROVED")}
            disabled={loading || resume.recruiter_decision === "APPROVED"}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
              resume.recruiter_decision === "APPROVED" 
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20" 
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80"
            }`}
          >
            {resume.recruiter_decision === "APPROVED" ? "✓ Approved" : "Approve Candidate"}
          </button>

          <button
            onClick={() => handleDecision("REJECTED")}
            disabled={loading || resume.recruiter_decision === "REJECTED"}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
              resume.recruiter_decision === "REJECTED" 
                ? "bg-rose-600 text-white shadow-md shadow-rose-600/20" 
                : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/80"
            }`}
          >
            {resume.recruiter_decision === "REJECTED" ? "✕ Rejected" : "Reject Candidate"}
          </button>
        </div>
      )}
    </div>
  );
};

export default CandidateCard;
import { useState } from "react";
import api from "../api/axios";

const CandidateCard = ({ resume, onDecisionUpdate, highlighted }) => {
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

  // Map tier to a consistent color across badge and score
  const getTierColor = (tier) => {
    switch (tier) {
      case "STRONG_FIT": return "#16a34a"; // Green
      case "MAYBE": return "#d97706";       // Amber
      case "NO": return "#dc2626";          // Red
      default: return "#6b7280";            // Gray
    }
  };

  const getTierBadge = (tier) => {
    if (!tier) return <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">PENDING</span>;
    const text = tier.replace("_", " ");
    return (
      <span
        style={{ backgroundColor: `${getTierColor(tier)}20`, color: getTierColor(tier) }}
        className="px-2 py-1 rounded text-xs font-bold"
      >
        {text}
      </span>
    );
  };

  const isScored = resume.ai_status === "AI_SCORED";

  return (
    <div
      id={`card-${resume.id}`}
      className={`bg-white p-4 rounded-lg shadow border mb-4 transition-all duration-500 ${
        highlighted ? "border-blue-500 ring-4 ring-blue-200" : "border-gray-100"
      }`}
    >
      {/* Header: filename + score/status */}
      <div className="flex justify-between items-start mb-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-gray-800 truncate" title={resume.original_filename}>
            {resume.original_filename}
          </h3>
          {resume.candidate_email && <p className="text-xs text-gray-500">{resume.candidate_email}</p>}
        </div>
        <div className="text-right pl-2">
          {isScored ? (
            <div className="flex flex-col items-end gap-1">
              <span className="text-2xl font-extrabold" style={{ color: getTierColor(resume.ai_tier_decision) }}>
                {resume.ai_overall_score}%
              </span>
              {getTierBadge(resume.ai_tier_decision)}
            </div>
          ) : resume.ai_status === "AI_FAILED" ? (
            <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded text-xs font-bold">Could not analyze</span>
          ) : (
            <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs font-bold animate-pulse">ANALYZING...</span>
          )}
        </div>
      </div>

      {/* Pending: fake progress lines so it doesn't look frozen */}
      {resume.ai_status === "PENDING_AI" && (
        <div className="mt-3 space-y-2">
          {["Evaluating technical depth...", "Analyzing project impact...", "Checking career trajectory..."].map((msg, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden flex-1">
                <div className="h-full bg-blue-300 rounded-full animate-pulse" style={{ width: `${40 + i * 20}%` }} />
              </div>
              <span className="shrink-0 w-48">{msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* Scored: strengths, gaps, red flags, reasoning */}
      {isScored && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {resume.ai_strong_points?.map((skill, idx) => (
              <span key={idx} className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded border border-green-100">+ {skill}</span>
            ))}
            {resume.ai_missing_skills?.map((skill, idx) => (
              <span key={idx} className="bg-red-50 text-red-700 text-xs px-2 py-1 rounded border border-red-100">- {skill}</span>
            ))}
          </div>

          {resume.ai_red_flags?.length > 0 && (
            <div className="mb-3 text-xs text-red-600 font-medium">
              ⚠️ {resume.ai_red_flags.join(", ")}
            </div>
          )}

          <button onClick={() => setExpanded(!expanded)} className="text-blue-600 text-sm font-medium hover:underline mb-3">
            {expanded ? "Hide Details" : "View AI Reasoning"}
          </button>

          {expanded && (
            <div className="bg-gray-50 p-3 rounded text-sm text-gray-600 mb-3 border">
              <p className="font-semibold mb-1">Justification:</p>
              <p>{resume.ai_score_justification}</p>
              <br />
              <p className="font-semibold">Vector Scores:</p>
              <ul className="list-disc list-inside">
                <li>Tech Depth: {resume.ai_vector_scores?.tech_depth}%</li>
                <li>Project Impact: {resume.ai_vector_scores?.project_impact}%</li>
                <li>Career Trajectory: {resume.ai_vector_scores?.career_trajectory}%</li>
                <li>Resume Quality: {resume.ai_vector_scores?.resume_quality}%</li>
                <li>Risk Score: {resume.ai_vector_scores?.risk_score}%</li>
              </ul>
            </div>
          )}
        </>
      )}

      {/* Approve/Reject only after scoring is done */}
      {isScored && (
        <div className="flex gap-2 mt-2 border-t pt-3">
          <button
            onClick={() => handleDecision("APPROVED")}
            disabled={loading || resume.recruiter_decision === "APPROVED"}
            className={`flex-1 py-2 rounded text-sm font-bold ${
              resume.recruiter_decision === "APPROVED" ? "bg-green-500 text-white" : "bg-green-100 text-green-700 hover:bg-green-200"
            }`}
          >
            {resume.recruiter_decision === "APPROVED" ? "✓ Approved" : "Approve"}
          </button>
          <button
            onClick={() => handleDecision("REJECTED")}
            disabled={loading || resume.recruiter_decision === "REJECTED"}
            className={`flex-1 py-2 rounded text-sm font-bold ${
              resume.recruiter_decision === "REJECTED" ? "bg-red-500 text-white" : "bg-red-100 text-red-700 hover:bg-red-200"
            }`}
          >
            {resume.recruiter_decision === "REJECTED" ? "✕ Rejected" : "Reject"}
          </button>
        </div>
      )}
    </div>
  );
};

export default CandidateCard;
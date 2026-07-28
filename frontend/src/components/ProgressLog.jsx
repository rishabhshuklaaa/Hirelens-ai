import { useState, useEffect } from "react";

/**
 * Maps raw backend status enums to human-friendly UI properties.
 * Centralizing this ensures consistent styling and labels across the component.
 */
const STATUS_UI = {
  "Processing...":     { label: "Analyzing…",        icon: "⏳", color: "text-gray-500",  badge: "bg-gray-100 text-gray-600" },
  "AUTO_ADDED":        { label: "Added to pipeline",  icon: "✅", color: "text-green-600", badge: "bg-green-100 text-green-700" },
  "NEEDS_REVIEW":      { label: "Needs review",       icon: "⚠️", color: "text-amber-600", badge: "bg-amber-100 text-amber-700" },
  "UNREADABLE":        { label: "Couldn't read",      icon: "❌", color: "text-red-600",   badge: "bg-red-100 text-red-700" },
  "DUPLICATE_SKIPPED": { label: "Duplicate skipped",  icon: "🔁", color: "text-gray-400",  badge: "bg-gray-100 text-gray-500" },
};

const ProgressLog = ({ batchId, onProcessingComplete }) => {
  // Using an object (dictionary) mapped by filename for O(1) lookups and in-place updates.
  // This prevents appending duplicate lines for the same file as its status changes.
  const [fileStatus, setFileStatus] = useState({});
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!batchId) return;

    // Reset state for the new batch
    setFileStatus({});
    setIsCompleted(false);

    // Initialize SSE connection with credentials for cross-origin cookie support
    const eventSource = new EventSource(
      `http://localhost:8000/api/v1/batch/${batchId}/progress`,
      { withCredentials: true }
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Handle terminal batch statuses
      if (data.status === "COMPLETED" || data.status === "FAILED") {
        // Clear any stuck "Processing..." rows so the final UI is clean
        setFileStatus((prev) => {
          const cleaned = { ...prev };
          Object.keys(cleaned).forEach((f) => {
            if (cleaned[f].status === "Processing...") delete cleaned[f];
          });
          return cleaned;
        });
        setIsCompleted(true);
        eventSource.close();
        onProcessingComplete();
        return; // Exit early
      } else {
        // Update the specific file's status in the dictionary.
        // React will re-render only the affected row due to state diffing.
        setFileStatus((prev) => ({
          ...prev,
          [data.filename]: {
            status: data.status,
            score: data.score,
            reason: data.reason,
          },
        }));
      }
    };

    eventSource.onerror = () => {
      setIsCompleted(true);
      eventSource.close();
    };

    // Cleanup function: closes the connection if the component unmounts
    // or if the batchId changes, preventing memory leaks.
    return () => {
      eventSource.close();
    };
  }, [batchId, onProcessingComplete]);

  // Derived state: Calculated directly from the state object before render
  const entries = Object.entries(fileStatus);
  const total = entries.length;
  const done = entries.filter(([, i]) => i.status !== "Processing...").length;

  // Calculate summary counts for the final completion chips
  const summary = entries.reduce((acc, [, i]) => {
    if (i.status === "AUTO_ADDED") acc.added++;
    else if (i.status === "NEEDS_REVIEW") acc.review++;
    else if (i.status === "UNREADABLE") acc.failed++;
    else if (i.status === "DUPLICATE_SKIPPED") acc.dupe++;
    return acc;
  }, { added: 0, review: 0, failed: 0, dupe: 0 });

  return (
    <div className="bg-gray-50 border rounded-xl p-4">
      {/* Header + Progress Bar */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700">
          {isCompleted ? "Processing complete" : "Processing resumes…"}
        </h4>
        {/* FIX: Show clean text on completion instead of 0 of ? */}
        <span className="text-xs text-gray-500">
          {isCompleted ? "All files processed" : `${done} of ${total || "?"} done`}
        </span>
      </div>

      {total > 0 && (
        <div className="w-full h-1.5 bg-gray-200 rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            // Force 100% width when completed, otherwise calculate dynamically
            style={{ width: `${isCompleted ? 100 : total ? (done / total) * 100 : 0}%` }}
          />
        </div>
      )}

      {/* File Rows */}
      <div className="space-y-2">
        {entries.map(([filename, info]) => {
          // Fallback to default UI properties if an unknown status is received
          const ui = STATUS_UI[info.status] || { label: info.status, icon: "•", color: "text-gray-500", badge: "bg-gray-100 text-gray-600" };
          return (
            <div key={filename} className="flex items-center justify-between p-3 bg-white border rounded-lg">
              <div className="flex items-center gap-3 min-w-0">
                <span className="shrink-0">{ui.icon}</span>
                <span className="text-sm font-medium text-gray-800 truncate">{filename}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {info.score != null && (
                  <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {Math.round(info.score)}%
                  </span>
                )}
                <span className={`text-xs font-semibold ${ui.color}`}>{ui.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Chips on Completion */}
      {isCompleted && total > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
          {summary.added > 0 && <span className="px-2 py-1 rounded bg-green-100 text-green-700">{summary.added} added</span>}
          {summary.review > 0 && <span className="px-2 py-1 rounded bg-amber-100 text-amber-700">{summary.review} need review</span>}
          {summary.dupe > 0 && <span className="px-2 py-1 rounded bg-gray-100 text-gray-500">{summary.dupe} duplicate</span>}
          {summary.failed > 0 && <span className="px-2 py-1 rounded bg-red-100 text-red-700">{summary.failed} unreadable</span>}
        </div>
      )}
    </div>
  );
};

export default ProgressLog;
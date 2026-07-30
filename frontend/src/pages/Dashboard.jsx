import { useState } from "react";
import JobContextForm from "./JobContextForm";
import UploadArea from "../components/UploadArea";

const Dashboard = () => {
  const [selectedJobContext, setSelectedJobContext] = useState(null);
  const [refreshContexts, setRefreshContexts] = useState(0);

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-900 p-4 md:px-8 md:pt-4 font-sans selection:bg-rose-500 selection:text-white">
      <div className="max-w-[1500px] mx-auto space-y-4">
        
        {/* TOP HEADER */}
        <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 uppercase tracking-wider">
                Pipeline Setup • Step 1
              </span>
              <span className="text-xs text-slate-400 font-medium">• HireLens Engine v2.4</span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 font-display">
              Candidate Screening Workspace
            </h1>
            <p className="text-slate-500 text-xs md:text-sm mt-0.5">
              Configure job intent rules and upload candidate resumes for 5-vector semantic analysis.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-900 text-white p-3 rounded-xl shadow-md shrink-0">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm">
              ⚡
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cost Optimization Shield</p>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <p className="text-xs font-bold text-white">Python Pre-Filter Active (~40% Token Saved)</p>
              </div>
            </div>
          </div>
        </div>

        {/* ACTIVE SELECTION BANNER */}
        {selectedJobContext ? (
          <div className="p-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-xl border border-slate-800 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></div>
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">SELECTED CONTEXT: </span>
                <span className="text-sm font-extrabold text-white ml-1">
                  {selectedJobContext.job_title}
                </span>
                <span className="text-xs text-slate-400 font-normal ml-2">({selectedJobContext.company_name})</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedJobContext(null)}
              className="text-xs font-bold text-rose-300 hover:text-white bg-rose-500/20 hover:bg-rose-500/30 px-3 py-1 rounded-lg border border-rose-500/30 transition-all cursor-pointer"
            >
              Reset Selection ✕
            </button>
          </div>
        ) : (
          <div className="px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
            <span><strong>Tip:</strong> Select an existing Job Context from the list or create a new one before uploading resumes.</span>
          </div>
        )}

        {/* WORKSPACE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 md:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                  01
                </div>
                <h2 className="text-sm font-bold text-slate-900">Job Context & Requirements</h2>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                RULE DEFINITION
              </span>
            </div>

            <JobContextForm 
              selectedJobContext={selectedJobContext}
              setSelectedJobContext={setSelectedJobContext}
              refreshTrigger={refreshContexts}
              setRefreshTrigger={setRefreshContexts}
            />
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 md:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 font-bold text-xs">
                  02
                </div>
                <h2 className="text-sm font-bold text-slate-900">Batch Resume Upload</h2>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200">
                BATCH QUEUE
              </span>
            </div>

            <UploadArea selectedJobContext={selectedJobContext} />
          </div>

        </div>

      </div>
    </div>
  );
};

export default Dashboard;
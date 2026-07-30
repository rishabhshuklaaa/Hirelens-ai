import { useState, useEffect } from "react";
import api from "../api/axios";

const JobContextForm = ({ selectedJobContext, setSelectedJobContext, refreshTrigger, setRefreshTrigger }) => {
  const [contexts, setContexts] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ company_name: "", company_sector: "Tech", job_title: "", jd_text: "" });
  const [loading, setLoading] = useState(true);

  const fetchContexts = async () => {
    setLoading(true);
    try {
      const response = await api.get("/job-context/");
      setContexts(response.data);
      
      if (response.data.length > 0) {
        const stillExists = response.data.find(c => c.id === selectedJobContext?.id);
        if (!stillExists) {
          setSelectedJobContext(response.data[0]);
        }
      } else {
        setSelectedJobContext(null);
      }
    } catch (error) {
      console.error("Error fetching contexts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContexts();
  }, [refreshTrigger]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/job-context/", formData);
      setRefreshTrigger(prev => prev + 1);
      setIsCreating(false);
      setFormData({ company_name: "", company_sector: "Tech", job_title: "", jd_text: "" });
    } catch (error) {
      console.error("Create error:", error);
      alert("Failed to save context.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Permanently delete this Job Context?")) {
      try {
        await api.delete(`/job-context/${id}`);
        setRefreshTrigger(prev => prev + 1);
      } catch (error) {
        console.error("Delete error:", error);
        alert("Failed to delete.");
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center gap-2 text-slate-500 text-xs font-semibold">
        <svg className="animate-spin h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Loading Context Rules...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      
      {/* Top Action Bar */}
      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Active Rule Presets</h3>
          <p className="text-[11px] text-slate-400">Select or create target evaluation rules</p>
        </div>

        {!isCreating && (
          <button 
            onClick={() => setIsCreating(true)} 
            className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
          >
            + New Context
          </button>
        )}
      </div>

      {isCreating ? (
        <form onSubmit={handleSubmit} className="space-y-3.5 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">Job Title</label>
            <input 
              type="text" 
              name="job_title" 
              value={formData.job_title} 
              onChange={handleChange} 
              required 
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-medium" 
              placeholder="e.g., Senior Python Developer" 
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">Company</label>
              <input 
                type="text" 
                name="company_name" 
                value={formData.company_name} 
                onChange={handleChange} 
                required 
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-medium" 
                placeholder="e.g., Google" 
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">Sector</label>
              <select 
                name="company_sector" 
                value={formData.company_sector} 
                onChange={handleChange} 
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-medium"
              >
                <option>Tech</option>
                <option>FinTech</option>
                <option>Healthcare</option>
                <option>E-commerce</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">JD Intent Text</label>
            <textarea 
              name="jd_text" 
              value={formData.jd_text} 
              onChange={handleChange} 
              required 
              rows="4" 
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs font-mono leading-relaxed resize-none" 
              placeholder="Paste job description..."
            />
          </div>

          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-lg font-bold text-xs cursor-pointer">
              Save Context
            </button>
            <button type="button" onClick={() => setIsCreating(false)} className="flex-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 py-2 rounded-lg font-bold text-xs cursor-pointer">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
          {contexts.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50">
              <p className="text-slate-500 text-xs font-medium">No contexts yet. Click "+ New Context" to start.</p>
            </div>
          ) : (
            contexts.map((ctx) => {
              const isSelected = selectedJobContext?.id === ctx.id;
              return (
                <div 
                  key={ctx.id} 
                  onClick={() => setSelectedJobContext(ctx)}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected 
                      ? 'border-indigo-600 bg-indigo-50/60 shadow-xs ring-1 ring-indigo-600/20' 
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${isSelected ? 'bg-indigo-600' : 'bg-slate-300'}`}></span>
                      <p className={`font-bold text-xs truncate ${isSelected ? 'text-indigo-950' : 'text-slate-800'}`}>
                        {ctx.job_title}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 ml-4 truncate">
                      {ctx.company_name} • <span className="font-medium text-slate-600">{ctx.company_sector}</span>
                    </p>
                  </div>

                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(ctx.id); }} 
                    className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors text-xs shrink-0 cursor-pointer"
                    title="Delete Context"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {selectedJobContext && (
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              Active Target JD Text
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">ID: #{selectedJobContext.id}</span>
          </div>

          <div className="bg-[#0B0F19] text-slate-300 p-3 rounded-xl text-xs font-mono whitespace-pre-wrap max-h-32 overflow-y-auto leading-relaxed border border-slate-800 shadow-inner">
            {selectedJobContext.jd_text}
          </div>
        </div>
      )}

    </div>
  );
};

export default JobContextForm;
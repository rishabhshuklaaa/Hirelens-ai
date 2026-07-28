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

  if (loading) return <div className="p-8">Loading Job Contexts...</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-fit">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Job Contexts</h2>
        {!isCreating && (
          <button onClick={() => setIsCreating(true)} className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded font-semibold hover:bg-blue-200">
            + New Context
          </button>
        )}
      </div>

      {isCreating ? (
        <form onSubmit={handleSubmit} className="space-y-4 mb-6 border p-4 rounded bg-gray-50">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
            <input type="text" name="job_title" value={formData.job_title} onChange={handleChange} required className="w-full p-2 border rounded" placeholder="e.g., Senior Python Developer" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input type="text" name="company_name" value={formData.company_name} onChange={handleChange} required className="w-full p-2 border rounded" placeholder="e.g., Google" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sector</label>
            <select name="company_sector" value={formData.company_sector} onChange={handleChange} className="w-full p-2 border rounded">
              <option>Tech</option><option>FinTech</option><option>Healthcare</option><option>E-commerce</option><option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">JD</label>
            <textarea name="jd_text" value={formData.jd_text} onChange={handleChange} required rows="4" className="w-full p-2 border rounded text-sm font-mono" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded font-semibold">Save</button>
            <button type="button" onClick={() => setIsCreating(false)} className="flex-1 bg-gray-200 py-2 rounded font-semibold">Cancel</button>
          </div>
        </form>
      ) : (
        <div className="space-y-2 mb-6">
          {contexts.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No contexts yet. Create one to start.</p>
          ) : (
            contexts.map((ctx) => (
              <div 
                key={ctx.id} 
                onClick={() => setSelectedJobContext(ctx)}
                className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center ${selectedJobContext?.id === ctx.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                <div>
                  {/* Yahan Job Title prominently dikhayenge */}
                  <p className="font-medium text-gray-800">{ctx.job_title}</p>
                  <p className="text-xs text-gray-500">{ctx.company_name} • {ctx.company_sector}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(ctx.id); }} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
              </div>
            ))
          )}
        </div>
      )}

      {selectedJobContext && (
        <div className="mt-4 border-t pt-4">
          <h3 className="text-sm font-bold text-gray-700 mb-2">Active Context JD:</h3>
          <div className="bg-gray-900 text-gray-300 p-3 rounded text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
            {selectedJobContext.jd_text}
          </div>
        </div>
      )}
    </div>
  );
};

export default JobContextForm;
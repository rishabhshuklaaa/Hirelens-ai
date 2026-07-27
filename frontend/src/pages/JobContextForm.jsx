import { useState, useEffect } from "react";
import api from "../api/axios";

const JobContextForm = () => {
  const [formData, setFormData] = useState({
    company_name: "",
    company_sector: "Tech",
    jd_text: ""
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  // Fetch existing context on mount
  useEffect(() => {
    const fetchContext = async () => {
      try {
        const response = await api.get("/job-context/");
        setFormData({
          company_name: response.data.company_name,
          company_sector: response.data.company_sector,
          jd_text: response.data.jd_text
        });
      } catch (error) {
        // 404 is expected if no context exists yet
        if (error.response?.status !== 404) {
          console.error("Error fetching context:", error);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchContext();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    
    try {
      await api.post("/job-context/", formData);
      setMessage("Job Context saved successfully! AI is ready for resumes.");
    } catch (error) {
      setMessage(error.response?.data?.detail || "Failed to save context.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Set Job Context (AI Persona)</h2>
      
      {message && (
        <div className={`mb-4 p-3 rounded ${message.includes("success") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
          <input
            type="text"
            name="company_name"
            value={formData.company_name}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g., Google, Stripe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Sector</label>
          <select
            name="company_sector"
            value={formData.company_sector}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="Tech">Tech</option>
            <option value="FinTech">FinTech</option>
            <option value="Healthcare">Healthcare</option>
            <option value="E-commerce">E-commerce</option>
            <option value="Other">Other</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">This defines how the AI will evaluate resumes.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Description (JD)</label>
          <textarea
            name="jd_text"
            value={formData.jd_text}
            onChange={handleChange}
            required
            rows="8"
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
            placeholder="Paste the full Job Description here..."
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save Job Context"}
        </button>
      </form>
    </div>
  );
};

export default JobContextForm;
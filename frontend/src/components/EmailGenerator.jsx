import { useState } from "react";
import api from "../api/axios";

const EmailGenerator = ({ resume, type }) => {
  const [emailType, setEmailType] = useState(type === "approved" ? "offer" : "rejection");
  const [subject, setSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentStatus, setSentStatus] = useState("");

  const candidateName = resume.candidate_name || "Candidate";

  const handleGenerate = async (newType) => {
    if (loading) return;
    setEmailType(newType);
    setLoading(true);
    setSubject("");
    setEmailBody("");
    setSentStatus("");
    
    try {
      const response = await api.post("/email/generate", {
        resume_id: resume.id,
        email_type: newType
      });
      setSubject(response.data.subject);
      setEmailBody(response.data.body);
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to generate email.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!resume.candidate_email) {
      alert("No candidate email found in resume to send the message.");
      return;
    }
    
    setSending(true);
    setSentStatus("");
    
    try {
      // FIX: Not sending to_email in body, backend will take it from DB securely
      await api.post("/email/send", {
        resume_id: resume.id,
        subject: subject,
        body: emailBody,
        email_type: emailType
      });
      setSentStatus("✅ Email sent successfully!");
    } catch (error) {
      setSentStatus("❌ Failed to send email. Check backend SMTP config.");
      alert(error.response?.data?.detail || "Failed to send email.");
    } finally {
      setSending(false);
    }
  };

  // FIX: Disable send button if already sent successfully to prevent duplicates
  const isSent = sentStatus.includes("✅");

  return (
    <div className="mt-4 border-t pt-4">
      {type === "approved" ? (
        <div className="flex gap-2 mb-4">
          <button 
            onClick={() => handleGenerate("offer")}
            disabled={loading || sending || isSent}
            className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${emailType === "offer" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"} disabled:opacity-50`}
          >
            Offer / Selection
          </button>
          <button 
            onClick={() => handleGenerate("assessment")}
            disabled={loading || sending || isSent}
            className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${emailType === "assessment" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"} disabled:opacity-50`}
          >
            Assessment
          </button>
          <button 
            onClick={() => handleGenerate("interview")}
            disabled={loading || sending || isSent}
            className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${emailType === "interview" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"} disabled:opacity-50`}
          >
            Interview
          </button>
        </div>
      ) : (
        <div className="mb-4">
          <button 
            onClick={() => handleGenerate("rejection")}
            disabled={loading || sending || isSent}
            className="px-4 py-2 rounded text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            Generate Rejection Feedback
          </button>
        </div>
      )}

      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
        <input 
          type="text" 
          value={subject} 
          onChange={(e) => setSubject(e.target.value)}
          disabled={loading || sending || isSent}
          className="w-full p-2 border rounded text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50"
          placeholder="Email subject will appear here"
        />
      </div>

      <div className="relative">
        <textarea
          className="w-full p-3 border rounded text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50"
          rows="6"
          value={emailBody}
          onChange={(e) => setEmailBody(e.target.value)}
          disabled={loading || sending || isSent}
          placeholder={loading ? "Generating email..." : "Click a button above to generate email draft..."}
        ></textarea>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
            <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>

      {sentStatus && (
        <div className={`mt-3 text-sm font-medium ${sentStatus.includes("✅") ? "text-green-600" : "text-red-600"}`}>
          {sentStatus}
        </div>
      )}

      <div className="flex justify-end mt-3">
        <button 
          onClick={handleSendEmail}
          disabled={loading || sending || !emailBody || isSent}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded disabled:opacity-50 flex items-center gap-2"
        >
          {isSent ? "Sent ✓" : sending ? "Sending..." : "Send via Email"}
        </button>
      </div>
    </div>
  );
};

export default EmailGenerator;
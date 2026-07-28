import { useState } from "react";
import Navbar from "../components/Navbar";
import JobContextForm from "./JobContextForm";
import UploadArea from "../components/UploadArea";

const Dashboard = () => {
  const [selectedJobContext, setSelectedJobContext] = useState(null);
  const [refreshContexts, setRefreshContexts] = useState(0);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="container mx-auto py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Pass props to sync selected context and trigger refresh */}
          <JobContextForm 
            selectedJobContext={selectedJobContext}
            setSelectedJobContext={setSelectedJobContext}
            refreshTrigger={refreshContexts}
            setRefreshTrigger={setRefreshContexts}
          />
          <UploadArea selectedJobContext={selectedJobContext} />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
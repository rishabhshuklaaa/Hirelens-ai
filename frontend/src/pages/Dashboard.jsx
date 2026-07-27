import Navbar from "../components/Navbar";
import JobContextForm from "./JobContextForm";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="container mx-auto py-8">
        <JobContextForm />
      </main>
    </div>
  );
};

export default Dashboard;
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navLink = (path, label) => (
    <button 
      onClick={() => navigate(path)}
      className={`px-3 py-1 rounded text-sm font-semibold ${location.pathname === path ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
    >
      {label}
    </button>
  );

  return (
    <nav className="bg-gray-800 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold mr-4">HireLens AI</h1>
          {user && (
            <>
              {navLink("/", "Setup & Upload")}
              {navLink("/audit", "AI Audit")}
            </>
          )}
        </div>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300">{user.email}</span>
            <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded text-sm font-semibold">
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
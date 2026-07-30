import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData);
      } else {
        await signup(formData);
        await login(formData);
      }
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden">
      
      {/* LEFT SIDE: Real Image with Overlay */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img 
          src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1000&q=80" 
          alt="Team collaborating" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/70 to-slate-900/40"></div>

        <div className="relative z-10 h-full flex flex-col justify-between p-10 text-white">
          
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-white text-slate-900 flex items-center justify-center font-extrabold text-xl shadow-lg">H</div>
            <span className="text-xl font-bold tracking-tight font-display">HireLens AI</span>
          </div>

          <div className="max-w-md">
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight mb-3 font-display">
              Stop fighting ATS algorithms. <br /> Start hiring <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-400 to-red-400">real talent.</span>
            </h1>
            <p className="text-slate-200 text-base mb-6 font-light">
              The modern recruitment platform that evaluates candidate intent, not just keywords.
            </p>

            <div className="space-y-4">
              {/* Point 1 */}
              <div className="flex items-start gap-3.5">
                <div className="mt-1 bg-white/20 backdrop-blur-sm p-1.5 rounded-lg">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-base text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-200 to-white">Smart Cost Optimization</h3>
                  <p className="text-slate-300 text-sm">Python gatekeepers filter junk PDFs before hitting expensive AI APIs.</p>
                </div>
              </div>

              {/* Point 2 */}
              <div className="flex items-start gap-3.5">
                <div className="mt-1 bg-white/20 backdrop-blur-sm p-1.5 rounded-lg">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-base text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-200 to-white">Deep 5-Vector Audit</h3>
                  <p className="text-slate-300 text-sm">Analyze project scope, metrics, tech depth & career trajectory in seconds.</p>
                </div>
              </div>

              {/* Point 3: NEW */}
              <div className="flex items-start gap-3.5">
                <div className="mt-1 bg-white/20 backdrop-blur-sm p-1.5 rounded-lg">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-base text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-200 to-white">Personalized Rejection Emails</h3>
                  <p className="text-slate-300 text-sm">AI sends constructive feedback to rejected candidates explaining exactly what to improve.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-400 font-medium tracking-wide uppercase">
            Trusted by modern HR teams worldwide
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Clean Light Auth Form with Premium Graphic */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative overflow-hidden">
        
        {/* Premium Abstract Graphic Top Right */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 pointer-events-none"></div>

        <div className="w-full max-w-md relative z-10">
          
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-xl">H</div>
            <h1 className="text-xl font-bold text-slate-900 font-display">HireLens AI</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 font-display">
              {isLogin ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-slate-500 text-sm mt-2">
              {isLogin ? "Sign in to access your recruitment dashboard" : "Start automating your hiring pipeline today"}
            </p>
          </div>
          
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm flex items-center gap-2">
              <svg className="h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{error}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Work Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all"
                placeholder="recruiter@company.com"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                {isLogin && (
                  <a href="#" className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors">
                    Forgot password?
                  </a>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all pr-10"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a8.972 8.972 0 013.982-.892c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
              {!isLogin && <p className="text-xs text-slate-400 mt-1.5">Must be at least 8 characters</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 flex justify-center items-center gap-2 mt-6"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <span>{isLogin ? "Sign in" : "Create account"}</span>
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center text-sm text-slate-500">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(""); }}
              className="font-semibold text-slate-900 hover:underline transition-colors ml-1"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
"use client";

import { useAuthenticationStatus, useSignInEmailPassword, useSignUpEmailPassword } from "@nhost/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState, MouseEvent } from "react";
import { Activity, Workflow, ArrowRight, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";

// Helper for password strength
function getPasswordStrength(password: string) {
  let score = 0;
  if (!password) return 0;
  if (password.length > 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const { signInEmailPassword, isLoading: isSigningIn, error: signInError } = useSignInEmailPassword();
  const { signUpEmailPassword, isLoading: isSigningUp, error: signUpError } = useSignUpEmailPassword();
  
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // 3D Tilt Effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  if (!isMounted || isLoading || isAuthenticated) {
    return <div className="flex items-center justify-center min-h-screen bg-[#050505] text-white"><Activity className="animate-spin text-blue-500 w-8 h-8" /></div>;
  }

  const error = isLogin ? signInError : signUpError;
  const isSubmitting = isLogin ? isSigningIn : isSigningUp;
  const passStrength = getPasswordStrength(password);
  
  // Colors for strength meter
  const strengthColors = ["bg-neutral-800", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500"];
  const currentStrengthColor = strengthColors[passStrength];

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#050505] text-white relative overflow-hidden [perspective:1000px]">
      {/* Animated Background Glowing Orbs */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
          x: [0, 50, 0],
          y: [0, -50, 0]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-15%] left-[-10%] w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" 
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
          x: [0, -50, 0],
          y: [0, 50, 0]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-[-15%] right-[-10%] w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" 
      />
      
      {/* Central Sparkle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[800px] bg-gradient-radial from-blue-500/10 to-transparent blur-[80px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
        className="w-full max-w-md p-6 sm:p-8 relative z-10"
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div 
          className="bg-neutral-900/50 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_0_50px_rgba(37,99,235,0.15)] p-8 sm:p-10 relative overflow-hidden group/card"
          style={{ transform: "translateZ(50px)" }}
        >
          {/* Mouse Spotlight effect (pure css over overlay) */}
          <div className="absolute inset-0 opacity-0 group-hover/card:opacity-100 pointer-events-none transition-opacity duration-500" 
            style={{
               background: `radial-gradient(600px circle at calc(50% + ${x.get() * 500}px) calc(50% + ${y.get() * 500}px), rgba(59,130,246,0.1), transparent 40%)`
            }} 
          />

          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
          
          <div className="relative z-10 text-center mb-10 flex flex-col items-center">
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
              className="w-20 h-20 bg-gradient-to-br from-blue-600/30 to-indigo-600/30 rounded-2xl flex items-center justify-center mb-6 border border-white/10 shadow-[0_0_30px_rgba(37,99,235,0.3)] backdrop-blur-md relative"
            >
              <motion.div
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, ease: "easeInOut" }}
              >
                 <Workflow className="w-10 h-10 text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.8)]" />
              </motion.div>
            </motion.div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-br from-white via-blue-100 to-neutral-400 bg-clip-text text-transparent mb-3">
              AgentBuilder
            </h1>
            <p className="text-neutral-400 font-medium text-sm">
              {isLogin ? "Welcome back to your workspace" : "Begin your automation journey"}
            </p>
          </div>

          <form onSubmit={async (e) => {
            e.preventDefault();
            if (isLogin) {
              await signInEmailPassword(email, password);
            } else {
              await signUpEmailPassword(email, password, {
                displayName: name
              });
            }
          }} className="space-y-6 relative z-10">
            
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  key="error"
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: "auto", scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  className="p-4 text-sm font-medium text-red-300 bg-red-950/40 rounded-2xl border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)] flex items-center gap-3 backdrop-blur-md"
                >
                  <div className="w-1.5 h-full absolute left-0 top-0 bottom-0 bg-red-500/50 rounded-l-2xl" />
                  {error.message}
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="space-y-5">
              <AnimatePresence mode="popLayout">
                {!isLogin && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, y: -20 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -20 }}
                    layout
                  >
                    <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">Username / Full Name</label>
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl opacity-0 group-focus-within:opacity-30 blur transition duration-500" />
                      <input 
                        type="text" 
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="relative w-full px-5 py-4 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-2xl focus:border-blue-500/50 outline-none transition-all text-white placeholder:text-neutral-600 shadow-inner"
                        placeholder="e.g. John Doe"
                        required={!isLogin}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div layout>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl opacity-0 group-focus-within:opacity-30 blur transition duration-500" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="relative w-full px-5 py-4 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-2xl focus:border-blue-500/50 outline-none transition-all text-white placeholder:text-neutral-600 shadow-inner"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </motion.div>
              <motion.div layout>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl opacity-0 group-focus-within:opacity-30 blur transition duration-500" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="relative w-full px-5 py-4 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-2xl focus:border-blue-500/50 outline-none transition-all text-white placeholder:text-neutral-600 shadow-inner tracking-widest pr-12"
                    placeholder="••••••••"
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                
                {/* Password Strength Meter (only on Sign Up) */}
                {!isLogin && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3"
                  >
                    <div className="flex gap-1 h-1.5 w-full rounded-full overflow-hidden bg-neutral-900/50">
                      {[1, 2, 3, 4].map((level) => (
                        <motion.div 
                          key={level}
                          layout
                          className={`h-full flex-1 transition-colors duration-300 ${
                            passStrength >= level ? currentStrengthColor : "bg-neutral-800"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-2 ml-1 flex justify-between">
                      <span>{passStrength === 0 ? "Enter password" : passStrength < 3 ? "Weak password" : passStrength === 3 ? "Good password" : "Strong password"}</span>
                    </div>
                  </motion.div>
                )}

              </motion.div>
            </div>

            <motion.button 
              layout
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative w-full h-14 mt-4 flex items-center justify-center font-bold text-white bg-blue-600 rounded-2xl shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:shadow-[0_0_40px_rgba(37,99,235,0.6)] transition-all focus:outline-none disabled:opacity-50 overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-100 group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-1000 ease-in-out" />
              <span className="relative z-10 flex items-center gap-3 tracking-wide">
                {isSubmitting ? <Activity className="w-5 h-5 animate-spin" /> : null}
                {isSubmitting ? (isLogin ? "Authenticating..." : "Creating Workspace...") : (isLogin ? "Sign In" : "Create Account")}
                {!isSubmitting && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
              </span>
            </motion.button>
          </form>



          <motion.div layout className="relative z-10 mt-10 text-center text-sm font-medium text-neutral-400">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-400 hover:text-blue-300 transition-colors ml-1 hover:underline underline-offset-4"
            >
              {isLogin ? "Sign up now" : "Log in"}
            </button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

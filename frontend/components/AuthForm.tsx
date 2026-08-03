"use client";
import Link from "next/link";
import { FormEvent, useState, useMemo } from "react";
import { ApiError, ApiStatus, api, setToken } from "../lib/api";
import { Loader2, Bot, Mail, Lock } from "lucide-react";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState(""); 
  const [error, setError] = useState(""); 
  const [status, setStatus] = useState<ApiStatus>("idle");

  const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;

  const passwordStrength = useMemo(() => {
    if (mode === "login" || !password) return null;
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    return score;
  }, [password, mode]);

  const strengthColor = 
    passwordStrength === null ? "" :
    passwordStrength <= 2 ? "bg-destructive" :
    passwordStrength <= 4 ? "bg-yellow-500" : "bg-green-500";
    
  const strengthTextColor = 
    passwordStrength === null ? "" :
    passwordStrength <= 2 ? "text-destructive" :
    passwordStrength <= 4 ? "text-yellow-500" : "text-green-500";

  const strengthText = 
    passwordStrength === null ? "" :
    passwordStrength <= 2 ? "Weak" :
    passwordStrength <= 4 ? "Fair" : "Strong";

  const submit = async (event: FormEvent) => { 
    event.preventDefault(); 
    setError(""); 
    if (!emailRegex.test(email)) return setError("Enter a valid email address."); 
    if (mode === "signup" && passwordStrength !== null && passwordStrength < 5) {
      return setError("Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character.");
    }
    
    try { 
      const result = mode === "login" 
        ? await api.login(email, password, setStatus) 
        : await api.signup(email, password, setStatus); 
      setToken(result.access_token); 
      window.location.assign("/chat"); 
    } catch (e) { 
      setError(e instanceof ApiError ? e.message : "Something went wrong."); 
    } finally { 
      setStatus("idle"); 
    } 
  };

  const title = mode === "login" ? "Welcome back" : "Create account";

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background"></div>
      
      <form 
        onSubmit={submit} 
        className="glass z-10 w-full max-w-md rounded-2xl p-8 sm:p-10 animate-fade-in-up"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4 ring-1 ring-primary/20 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
            <Bot size={28} className="animate-pulse-glow" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground text-center">
            {mode === "login" ? "Sign in to continue your conversations." : "Start a new conversation in seconds."}
          </p>
        </div>

        {status !== "idle" && (
          <p className="mb-5 flex items-center justify-center gap-2 rounded-lg bg-primary/10 p-3 text-sm text-primary animate-fade-in border border-primary/20">
            <Loader2 className="h-4 w-4 animate-spin" />
            {status === "waking" ? "Waking up the server..." : "Signing you in..."}
          </p>
        )}
        
        {error && (
          <p role="alert" className="mb-5 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive animate-fade-in">
            {error}
          </p>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                type="email" 
                autoComplete="email" 
                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200" 
                placeholder="m@example.com"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                type="password" 
                autoComplete={mode === "login" ? "current-password" : "new-password"} 
                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
                placeholder="••••••••"
              />
            </div>
            
            {mode === "signup" && password.length > 0 && (
              <div className="mt-2 space-y-1 animate-fade-in">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Password strength</span>
                  <span className={strengthTextColor}>{strengthText}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${strengthColor}`} 
                    style={{ width: `${(passwordStrength || 0) * 20}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        <button 
          disabled={status !== "idle" || !email || !password} 
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground h-10 px-4 py-2 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-[0_0_15px_rgba(139,92,246,0.5)]"
        >
          {status !== "idle" && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "login" ? "Log in" : "Sign up"}
        </button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>New here? <Link className="font-medium text-primary hover:underline hover:text-primary/80 transition-colors" href="/signup">Create an account</Link></>
          ) : (
            <>Already have an account? <Link className="font-medium text-primary hover:underline hover:text-primary/80 transition-colors" href="/login">Log in</Link></>
          )}
        </p>
      </form>
    </main>
  );
}

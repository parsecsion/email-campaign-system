import React, { useState } from "react";
import { LayoutTemplate, Loader2 } from "lucide-react";
import Loader from "./Loader";
import GradientBlinds from "./GradientBlinds";

export const FullScreenSignup = ({ onLogin, loading, error }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");

    const validateEmail = (value) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    };

    const validatePassword = (value) => {
        return value.length >= 1;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        let valid = true;

        if (!validateEmail(email)) {
            setEmailError("Please enter a valid email address.");
            valid = false;
        } else {
            setEmailError("");
        }

        if (!validatePassword(password)) {
            setPasswordError("Password is required.");
            valid = false;
        } else {
            setPasswordError("");
        }

        if (valid) {
            onLogin(email, password);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center overflow-hidden p-4 bg-gray-100">
            <div className="w-full relative max-w-5xl overflow-hidden flex flex-col md:flex-row shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)] rounded-none">

                {/* Background Image Layer (Left Side in Desktop, Top in Mobile) */}
                <div className="hidden md:block absolute inset-0 z-0">
                    <GradientBlinds
                        gradientColors={['#000000', '#1a1a1a', '#00ffcb']}
                        angle={120}
                        noise={0.3}
                        blindCount={8}
                        blindMinWidth={50}
                        spotlightRadius={0} /* Remove spotlight for non-interactive feeling */
                        spotlightSoftness={1}
                        spotlightOpacity={0} /* Hide spotlight */
                        mouseDampening={0} /* Disable mouse interaction */
                        distortAmount={0}
                        shineDirection="left"
                        mixBlendMode="normal"
                    />
                    <div className="absolute inset-0 bg-noise opacity-20 mix-blend-overlay pointer-events-none"></div>
                    <div className="absolute inset-0 bg-black/20 mix-blend-multiply"></div>
                </div>

                {/* Left Side (Text Overview) */}
                <div className="bg-transparent text-white p-8 md:p-12 md:w-1/2 relative flex flex-col justify-between z-10">
                    {/* Mobile Background overlay if needed, but we used bg-black above */}

                    <div className="mt-auto">
                        <div className="w-12 h-12 bg-white text-black flex items-center justify-center mb-6 shadow-lg rounded-none">
                            <LayoutTemplate size={24} />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight mb-4">
                            Campaign Manager
                        </h1>
                        <p className="text-gray-400 text-lg leading-relaxed">
                            Streamline your recruitment outreach with our advanced email automation platform. Design, schedule, and analyze campaigns with precision.
                        </p>
                    </div>

                    <div className="mt-12 text-sm text-gray-500">
                        &copy; {new Date().getFullYear()} Email Campaign System. Internal Restricted Access.
                    </div>
                </div>

                {/* Right Side (Login Form) */}
                <div className="p-8 md:p-12 md:w-1/2 flex flex-col justify-center bg-white z-20 relative">
                    <div className="flex flex-col items-start mb-8">
                        <h2 className="text-3xl font-bold mb-2 tracking-tight text-gray-900">
                            Welcome Back
                        </h2>
                        <p className="text-gray-500">
                            Please sign in to access your dashboard.
                        </p>
                    </div>

                    <form
                        className="flex flex-col gap-5"
                        onSubmit={handleSubmit}
                        noValidate
                    >
                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                placeholder="name@company.com"
                                className={`text-sm w-full py-3 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-gray-50 ${emailError ? "border-red-500 focus:ring-red-200" : "border-gray-200"
                                    }`}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            {emailError && (
                                <p className="text-red-500 text-xs mt-1 font-medium">{emailError}</p>
                            )}
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                                    Password
                                </label>
                            </div>
                            <input
                                type="password"
                                id="password"
                                placeholder="••••••••"
                                className={`text-sm w-full py-3 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-gray-50 ${passwordError ? "border-red-500 focus:ring-red-200" : "border-gray-200"
                                    }`}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            {passwordError && (
                                <p className="text-red-500 text-xs mt-1 font-medium">{passwordError}</p>
                            )}
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-black hover:bg-gray-800 text-white font-bold py-3.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? <Loader size="small" /> : "Sign In"}
                        </button>

                        <div className="text-center text-gray-500 text-xs mt-6">
                            Protected by enterprise-grade security. <br />
                            Access is monitored and logged.
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

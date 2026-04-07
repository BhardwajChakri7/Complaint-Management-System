import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    ShieldCheckIcon,
    ClockIcon,
    ChatBubbleLeftRightIcon,
    DocumentTextIcon,
    CheckCircleIcon,
    ArrowRightIcon,
    Bars3Icon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { WavyBackground } from '../components/ui/wavy-background';


import Lottie from 'lottie-react';
import animationData from '../assets/animations/Man and robot with computers sitting together in workplace.json';


function Landing() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const features = [
        {
            icon: DocumentTextIcon,
            title: "Smart Complaint Filing",
            description: "Submit complaints with AI-powered categorization and priority detection for faster resolution."
        },
        {
            icon: ClockIcon,
            title: "Real-time Tracking",
            description: "Track your complaint status in real-time with instant notifications and updates."
        },
        {
            icon: ChatBubbleLeftRightIcon,
            title: "AI Assistant",
            description: "Get instant help with our Gemini-powered chatbot that understands your queries."
        },
        {
            icon: ShieldCheckIcon,
            title: "Secure & Private",
            description: "Your data is protected with enterprise-grade security and privacy measures."
        }
    ];

    const stats = [
        { number: "99.9%", label: "Uptime Guarantee" },
        { number: "24/7", label: "Support Available" },
        { number: "< 2hrs", label: "Average Response" },
        { number: "95%", label: "Resolution Rate" }
    ];

    const testimonials = [
        {
            name: "Sarah Johnson",
            role: "Student",
            content: "The AI-powered system made submitting my hostel complaint so easy. Got it resolved within hours!",
            avatar: "SJ"
        },
        {
            name: "Dr. Michael Chen",
            role: "Faculty",
            content: "Finally, a complaint system that actually works. The real-time tracking is a game-changer.",
            avatar: "MC"
        },
        {
            name: "Admin Team",
            role: "University Staff",
            content: "Managing complaints has never been easier. The categorization and priority system saves us hours.",
            avatar: "AT"
        }
    ];

    return (
        <div className="min-h-screen bg-white overflow-x-hidden">
            {/* Navigation */}
            <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
                }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                    Complaint Care
                                </h1>
                            </div>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:block">
                            <div className="ml-10 flex items-baseline space-x-8">
                                <Link
                                    to="/login"
                                    className="text-blue-600 hover:text-blue-700 px-3 py-2 text-sm font-medium transition-colors"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    to="/admin-login"
                                    className="text-purple-600 hover:text-purple-700 px-3 py-2 text-sm font-medium transition-colors"
                                >
                                    Admin
                                </Link>
                                <Link
                                    to="/staff-login"
                                    className="text-blue-600 hover:text-blue-700 px-3 py-2 text-sm font-medium transition-colors"
                                >
                                    Staff
                                </Link>
                                <Link
                                    to="/register"
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:shadow-lg"
                                >
                                    Get Started
                                </Link>
                            </div>
                        </div>

                        {/* Mobile menu button */}
                        <div className="md:hidden">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="text-gray-700 hover:text-blue-600 p-2"
                            >
                                {isMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {isMenuOpen && (
                    <div className="md:hidden bg-white border-t">
                        <div className="px-2 pt-2 pb-3 space-y-1">
                            <Link to="/login" className="block px-3 py-2 text-blue-600">Sign In</Link>
                            <Link to="/admin-login" className="block px-3 py-2 text-purple-600">Admin</Link>
                            <Link to="/staff-login" className="block px-3 py-2 text-emerald-600">Staff</Link>
                            <Link to="/register" className="block px-3 py-2 bg-blue-600 text-white rounded-lg mx-3">Get Started</Link>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
                {/* Geometric Background Elements */}
                <div className="absolute inset-0">
                    {/* Grid Pattern */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>

                    {/* Floating Shapes */}
                    <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        {/* Left Content */}
                        <div className="text-left">
                            {/* Badge */}
                            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200/50 rounded-full text-blue-800 text-sm font-medium mb-8 hover:shadow-lg transition-all duration-300">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                                AI-Powered • Real-time • Secure
                            </div>

                            {/* Main Heading */}
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-8 leading-tight">
                                Resolve
                                <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
                                    Complaints
                                </span>
                                <span className="text-4xl md:text-5xl lg:text-6xl text-gray-700 font-light">
                                    10x Faster
                                </span>
                            </h1>

                            {/* Subtitle */}
                            <p className="text-xl text-gray-600 mb-10 max-w-2xl leading-relaxed">
                                Transform your complaint management with AI-powered categorization,
                                intelligent routing, and real-time tracking. Get issues resolved in
                                <span className="font-semibold text-blue-600"> under 2 hours</span>.
                            </p>

                            {/* Feature Pills */}
                            <div className="flex flex-wrap gap-3 mb-10">
                                <div className="flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full text-gray-700 text-sm font-medium shadow-sm">
                                    <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2 text-blue-600" />
                                    AI Chatbot
                                </div>
                                <div className="flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full text-gray-700 text-sm font-medium shadow-sm">
                                    <ClockIcon className="h-4 w-4 mr-2 text-green-600" />
                                    Real-time Tracking
                                </div>
                                <div className="flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full text-gray-700 text-sm font-medium shadow-sm">
                                    <DocumentTextIcon className="h-4 w-4 mr-2 text-purple-600" />
                                    Smart Reports
                                </div>
                            </div>

                            {/* CTA Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 mb-12">
                                <Link
                                    to="/register"
                                    className="group relative bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-2xl text-lg font-semibold transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/25 hover:scale-105 flex items-center justify-center"
                                >
                                    Start Here
                                    <ArrowRightIcon className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                                {/* <button className="group flex items-center justify-center px-8 py-4 text-gray-700 hover:text-blue-600 text-lg font-semibold transition-all duration-300 border-2 border-gray-200 hover:border-blue-300 rounded-2xl hover:bg-blue-50">
                                    <div className="w-10 h-10 bg-gray-100 group-hover:bg-blue-100 rounded-full flex items-center justify-center mr-3 transition-colors">
                                        <div className="w-0 h-0 border-l-[6px] border-l-gray-600 group-hover:border-l-blue-600 border-y-[4px] border-y-transparent ml-1"></div>
                                    </div>
                                    Watch Demo
                                </button> */}
                            </div>

                            {/* Trust Indicators */}
                            <div className="flex items-center space-x-8 text-sm text-gray-500">
                                <div className="flex items-center">
                                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                                    No credit card required
                                </div>
                                <div className="flex items-center">
                                    <ShieldCheckIcon className="h-5 w-5 text-blue-500 mr-2" />
                                    Enterprise security
                                </div>
                            </div>
                        </div>

                        {/* Right Visual */}
                        <div className="relative lg:ml-10">
                            {/* Main Dashboard Mockup */}
                            <div className="relative bg-white rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden transform rotate-3 hover:rotate-0 transition-transform duration-500">
                                {/* Header */}
                                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-white font-semibold text-lg">Complaint Care Dashboard</h3>
                                        <div className="flex space-x-2">
                                            <div className="w-3 h-3 bg-white/30 rounded-full"></div>
                                            <div className="w-3 h-3 bg-white/30 rounded-full"></div>
                                            <div className="w-3 h-3 bg-white/30 rounded-full"></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6 space-y-4">
                                    {/* Stats Cards */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-blue-50 p-4 rounded-xl">
                                            <div className="text-2xl font-bold text-blue-600">247</div>
                                            <div className="text-xs text-gray-600">Active Cases</div>
                                        </div>
                                        <div className="bg-green-50 p-4 rounded-xl">
                                            <div className="text-2xl font-bold text-green-600">1.2h</div>
                                            <div className="text-xs text-gray-600">Avg Response</div>
                                        </div>
                                        <div className="bg-purple-50 p-4 rounded-xl">
                                            <div className="text-2xl font-bold text-purple-600">98%</div>
                                            <div className="text-xs text-gray-600">Satisfaction</div>
                                        </div>
                                    </div>

                                    {/* Recent Complaints */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                                <span className="text-sm font-medium">Hostel WiFi Issue</span>
                                            </div>
                                            <span className="text-xs text-gray-500">2 min ago</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                                <span className="text-sm font-medium">Cafeteria Service</span>
                                            </div>
                                            <span className="text-xs text-gray-500">15 min ago</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                <span className="text-sm font-medium">Library Access</span>
                                            </div>
                                            <span className="text-xs text-gray-500">1 hour ago</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating Elements */}
                            <div className="absolute -top-6 -right-6 bg-white rounded-2xl shadow-lg p-4 border border-gray-200/50 animate-bounce">
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="text-sm font-medium text-gray-700">AI Processing</span>
                                </div>
                            </div>

                            <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-lg p-4 border border-gray-200/50">
                                <div className="flex items-center space-x-2">
                                    <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600" />
                                    <span className="text-sm font-medium text-gray-700">24/7 Support</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 max-w-4xl mx-auto">
                        {stats.map((stat, index) => (
                            <div key={index} className="text-center group">
                                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                                    {stat.number}
                                </div>
                                <div className="text-gray-600 text-sm font-medium">
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            Powerful Features for Modern Complaint Management
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Built with cutting-edge technology to provide the best user experience and fastest resolution times.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((feature, index) => (
                            <div key={index} className="group p-8 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-blue-100">
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
                                    <feature.icon className="h-6 w-6 text-blue-600 group-hover:text-white" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it Works Section */}
            <section id="how-it-works" className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            How It Works
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Get your complaints resolved in three simple steps with our intelligent system.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-white text-xl font-bold">1</span>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-4">Submit Your Complaint</h3>
                            <p className="text-gray-600">
                                Fill out our smart form with your issue details. Our AI automatically categorizes and prioritizes your complaint.
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-white text-xl font-bold">2</span>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-4">Track Progress</h3>
                            <p className="text-gray-600">
                                Monitor your complaint status in real-time with our dashboard. Get instant notifications on any updates.
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-white text-xl font-bold">3</span>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-4">Get Resolution</h3>
                            <p className="text-gray-600">
                                Receive timely resolution with detailed feedback. Rate your experience to help us improve our service.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* AI Collaboration Section with Lottie Animation */}
            <section className="py-20 bg-gradient-to-br from-blue-50 via-white to-purple-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            AI-Powered Collaboration
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Experience seamless human-AI collaboration that transforms how complaints are managed and resolved.
                        </p>
                    </div>

                    <div className="flex justify-center">
                        <div className="relative bg-white/60 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/40 overflow-hidden p-8 max-w-4xl w-full hover:scale-105 transition-transform duration-500">
                            <Lottie
                                animationData={animationData}
                                className="w-full h-96 lg:h-[500px]"
                                loop={true}
                                autoplay={true}
                            />

                            {/* Floating Feature Cards */}
                            <div className="absolute top-8 left-8 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-white/50">
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                                    <span className="text-sm font-medium text-gray-700">Smart Processing</span>
                                </div>
                            </div>

                            <div className="absolute top-8 right-8 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-white/50">
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="text-sm font-medium text-gray-700">Real-time Sync</span>
                                </div>
                            </div>

                            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-white/50">
                                <div className="flex items-center space-x-2">
                                    <ChatBubbleLeftRightIcon className="h-4 w-4 text-purple-600" />
                                    <span className="text-sm font-medium text-gray-700">24/7 AI Assistant</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                        Ready to Transform Your Complaint Experience?
                    </h2>
                    <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
                        Join thousands of users who have already streamlined their complaint management process.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/register"
                            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-200 hover:shadow-xl"
                        >
                            Get Started Free
                        </Link>
                        <button className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-200">
                            Contact Sales
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer with Wavy Background */}
            <footer className="relative">
                <WavyBackground
                    className="flex flex-col items-center justify-center px-4"
                    containerClassName="h-96"
                    colors={["#3b82f6", "#1d4ed8", "#2563eb", "#1e40af", "#60a5fa"]}
                    waveWidth={40}
                    backgroundFill="rgb(248, 250, 252)"
                    speed="slow"
                    blur={6}
                    waveOpacity={0.6}
                >
                    <div className="text-center max-w-4xl mx-auto relative z-10">
                        <h2 className="text-3xl md:text-5xl text-black font-bold mb-6">
                            Ready to Get Started?
                        </h2>
                        <p className="text-lg text-black font-normal mb-8 max-w-2xl mx-auto leading-relaxed">
                            Join thousands of organizations using Complaint Care for smarter complaint management.
                        </p>

                        <div className="flex justify-center">
                            <Link
                                to="/login"
                                className="border-2 border-black/30 text-black hover:bg-black/10 hover:border-black/50 backdrop-blur-sm px-8 py-3 rounded-full text-lg font-semibold transition-all duration-200"
                            >
                                Sign In
                            </Link>
                        </div>
                    </div>
                </WavyBackground>

                {/* Simple Footer */}
                <div className="bg-slate-900 text-white py-8">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col md:flex-row justify-between items-center">
                            <div className="mb-4 md:mb-0">
                                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                    Complaint Care
                                </h3>
                            </div>
                            <p className="text-gray-400 text-sm text-center md:text-right">
                                &copy; 2025 Complaint Care. All rights reserved.
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default Landing;
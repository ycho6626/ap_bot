import Link from 'next/link';
import { Calculator, CheckCircle, Zap, Shield, BookOpen, Users } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl">
                <Calculator className="h-6 w-6 text-white" />
              </div>
              <span className="ml-3 text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">AP Calculus Tutor</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link href="/coach" className="text-gray-600 hover:text-primary-600 transition-colors">
                Coach
              </Link>
              <Link href="/lessons" className="text-gray-600 hover:text-primary-600 transition-colors">
                Lessons
              </Link>
              <Link href="/account" className="text-gray-600 hover:text-primary-600 transition-colors">
                Account
              </Link>
            </nav>
            <div className="flex items-center space-x-3">
              <Link
                href="/coach"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Try Free
              </Link>
              <Link
                href="/account"
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 text-sm font-medium rounded-full mb-6">
            <span className="w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse"></span>
            Trusted by 10,000+ students
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Master AP Calculus
            <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">AB & BC</span>
            <span className="block text-3xl md:text-4xl font-normal text-gray-600 mt-2">with Verified Answers</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-4xl mx-auto leading-relaxed">
            Get instant, verified answers to your AP Calculus AB/BC questions with step-by-step solutions, 
            detailed explanations, and confidence scores you can trust.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/coach"
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
            >
              Start Learning Now
            </Link>
            <Link
              href="/account"
              className="px-8 py-4 border-2 border-gray-300 text-gray-700 text-lg font-semibold rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
            >
              View Pricing
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="card p-6 text-center">
            <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-6 w-6 text-success-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Verified Answers</h3>
            <p className="text-gray-600">
              Every answer is verified by our advanced verification system with confidence scores and trust ratings.
            </p>
          </div>

          <div className="card p-6 text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Zap className="h-6 w-6 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Instant Responses</h3>
            <p className="text-gray-600">
              Get immediate answers to your questions with our fast, AI-powered tutoring system.
            </p>
          </div>

          <div className="card p-6 text-center">
            <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Shield className="h-6 w-6 text-warning-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">High Accuracy</h3>
            <p className="text-gray-600">
              Our system maintains 98.5%+ accuracy on verified answers with comprehensive error checking.
            </p>
          </div>

          <div className="card p-6 text-center">
            <div className="w-12 h-12 bg-error-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-6 w-6 text-error-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Step-by-Step Solutions</h3>
            <p className="text-gray-600">
              Detailed explanations with proper mathematical notation, units, and justification for every step.
            </p>
          </div>

          <div className="card p-6 text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Calculator className="h-6 w-6 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">AB & BC Support</h3>
            <p className="text-gray-600">
              Comprehensive coverage of both AP Calculus AB and BC topics with variant-specific content.
            </p>
          </div>

          <div className="card p-6 text-center">
            <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-success-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Trusted by Students</h3>
            <p className="text-gray-600">
              Join thousands of students who have improved their AP Calculus understanding with our platform.
            </p>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600">
              Choose the plan that works best for your learning needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="card p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
              <p className="text-gray-600 mb-6">Perfect for trying out our platform</p>
              <div className="text-4xl font-bold text-gray-900 mb-6">$0<span className="text-lg text-gray-600">/month</span></div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-success-600 mr-3" />
                  <span className="text-gray-600">5 questions per day</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-success-600 mr-3" />
                  <span className="text-gray-600">Basic explanations</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-success-600 mr-3" />
                  <span className="text-gray-600">Public knowledge base</span>
                </li>
              </ul>
              <Link href="/coach" className="btn btn-outline w-full">
                Get Started
              </Link>
            </div>

            {/* Paid Plan */}
            <div className="card p-8 border-2 border-primary-500 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Pro</h3>
              <p className="text-gray-600 mb-6">For serious AP Calculus students</p>
              <div className="text-4xl font-bold text-gray-900 mb-6">$19<span className="text-lg text-gray-600">/month</span></div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-success-600 mr-3" />
                  <span className="text-gray-600">Unlimited questions</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-success-600 mr-3" />
                  <span className="text-gray-600">Verified answers with trust scores</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-success-600 mr-3" />
                  <span className="text-gray-600">Step-by-step solutions</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-success-600 mr-3" />
                  <span className="text-gray-600">Premium knowledge base</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-success-600 mr-3" />
                  <span className="text-gray-600">AB & BC support</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-success-600 mr-3" />
                  <span className="text-gray-600">Priority support</span>
                </li>
              </ul>
              <Link href="/account" className="btn btn-primary w-full">
                Start Free Trial
              </Link>
            </div>

            {/* Teacher Plan */}
            <div className="card p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Teacher</h3>
              <p className="text-gray-600 mb-6">For educators and institutions</p>
              <div className="text-4xl font-bold text-gray-900 mb-6">$49<span className="text-lg text-gray-600">/month</span></div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-success-600 mr-3" />
                  <span className="text-gray-600">Everything in Pro</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-success-600 mr-3" />
                  <span className="text-gray-600">Private knowledge base</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-success-600 mr-3" />
                  <span className="text-gray-600">Student progress tracking</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-success-600 mr-3" />
                  <span className="text-gray-600">Custom content creation</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-success-600 mr-3" />
                  <span className="text-gray-600">API access</span>
                </li>
              </ul>
              <Link href="/account" className="btn btn-outline w-full">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 bg-primary-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Master AP Calculus?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of students who have improved their understanding with verified answers.
          </p>
          <Link
            href="/coach"
            className="btn bg-white text-primary-600 hover:bg-gray-100 text-lg px-8 py-3"
          >
            Start Learning Now
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Calculator className="h-6 w-6 text-primary-400" />
                <span className="ml-2 text-xl font-bold">AP Calculus Tutor</span>
              </div>
              <p className="text-gray-400">
                Your trusted companion for AP Calculus AB/BC success.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><Link href="/coach" className="text-gray-400 hover:text-white transition-colors">Coach</Link></li>
                <li><Link href="/lessons" className="text-gray-400 hover:text-white transition-colors">Lessons</Link></li>
                <li><Link href="/account" className="text-gray-400 hover:text-white transition-colors">Account</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 AP Calculus Tutor. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Shield, Lock, Eye, FileText } from 'lucide-react'
import SoundWaveLogo from '../components/SoundWaveLogo'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0b0b0f] text-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-[#14141b] border border-white/10 rounded-2xl p-6 sm:p-10 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-8">
          <div className="flex items-center gap-3">
            <SoundWaveLogo size={36} glow />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">SoundWave Privacy Policy</h1>
              <p className="text-xs text-gray-400">Last updated: October 2026</p>
            </div>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-brand hover:underline font-semibold"
          >
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-gray-300">
          <section>
            <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-2">
              <Shield size={18} className="text-brand" /> 1. Information We Collect
            </h2>
            <p>
              When you create an account on SoundWave or authenticate via Google OAuth, we collect your name, email address, and profile picture to provide and personalize your music streaming experience.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-2">
              <Lock size={18} className="text-brand" /> 2. How We Use Information
            </h2>
            <p>
              Your information is strictly used to authenticate your session, save your personalized playlists, maintain your favorites, and securely dispatch email verification codes when registering or resetting credentials.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-2">
              <Eye size={18} className="text-brand" /> 3. Data Protection & Sharing
            </h2>
            <p>
              We do not sell, rent, or trade your personal information to third parties. All authentication credentials are encrypted using industry-standard hashing protocols.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-2">
              <FileText size={18} className="text-brand" /> 4. Contact Us
            </h2>
            <p>
              If you have any questions regarding this Privacy Policy, please reach out to our team at{' '}
              <a href="mailto:malithrajamanthri@gmail.com" className="text-brand hover:underline">
                malithrajamanthri@gmail.com
              </a>.
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} SoundWave Music Platform. All rights reserved.
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Settings, Shield, Bell, Database, Save, Check } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminSettingsTab() {
  const [settings, setSettings] = useState({
    registrationOpen: true,
    maintenanceMode: false,
    defaultBitrate: '320kbps',
    enforce2FAForAdmins: true,
    audioCacheRetentionDays: 30,
    maxUploadSizeMB: 25
  })

  const handleSave = () => {
    toast.success('System settings saved successfully!')
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="p-6 rounded-2xl bg-[#0d0e19] border border-white/5 space-y-6 shadow-2xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Platform & Audio Streaming Configuration
        </h3>

        {/* Setting 1: Registration */}
        <div className="flex items-center justify-between py-3 border-b border-white/5">
          <div>
            <p className="text-xs font-bold text-white">Public User Registrations</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Allow new listeners to sign up via Google OAuth and email/password.
            </p>
          </div>
          <button
            onClick={() => setSettings(s => ({ ...s, registrationOpen: !s.registrationOpen }))}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
              settings.registrationOpen ? 'bg-[#6366f1]' : 'bg-gray-700'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                settings.registrationOpen ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Setting 2: Maintenance Mode */}
        <div className="flex items-center justify-between py-3 border-b border-white/5">
          <div>
            <p className="text-xs font-bold text-white">Maintenance Mode</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Temporarily show a maintenance screen to non-admin visitors.
            </p>
          </div>
          <button
            onClick={() => setSettings(s => ({ ...s, maintenanceMode: !s.maintenanceMode }))}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
              settings.maintenanceMode ? 'bg-amber-500' : 'bg-gray-700'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                settings.maintenanceMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Setting 3: Default Stream Bitrate */}
        <div className="flex items-center justify-between py-3 border-b border-white/5">
          <div>
            <p className="text-xs font-bold text-white">Default Audio Stream Quality</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Target bitrate served to web player clients across networks.
            </p>
          </div>
          <select
            value={settings.defaultBitrate}
            onChange={e => setSettings(s => ({ ...s, defaultBitrate: e.target.value }))}
            className="bg-[#141525] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#6366f1]"
          >
            <option value="128kbps">128 kbps (Data Saver)</option>
            <option value="256kbps">256 kbps (Standard AAC)</option>
            <option value="320kbps">320 kbps (High Fidelity MP3)</option>
            <option value="lossless">FLAC Lossless (Hi-Res Audio)</option>
          </select>
        </div>

        {/* Setting 4: 2FA Enforcement */}
        <div className="flex items-center justify-between py-3 border-b border-white/5">
          <div>
            <p className="text-xs font-bold text-white">Enforce 2FA for Administrators</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Require Google Authenticator code on login for all admin console roles.
            </p>
          </div>
          <button
            onClick={() => setSettings(s => ({ ...s, enforce2FAForAdmins: !s.enforce2FAForAdmins }))}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
              settings.enforce2FAForAdmins ? 'bg-[#6366f1]' : 'bg-gray-700'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                settings.enforce2FAForAdmins ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white text-xs font-bold shadow-lg shadow-indigo-500/25 hover:brightness-110 active:scale-95 transition-all"
          >
            <Save size={14} />
            <span>Save Platform Settings</span>
          </button>
        </div>
      </div>
    </div>
  )
}

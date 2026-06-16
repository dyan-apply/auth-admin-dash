import Link from 'next/link'
import { Shield, Activity, Cloud, Settings, CheckCircle, BookOpen } from 'lucide-react'

interface HeaderProps {
  activeTab?: 'gigya' | 'ping' | 'admin' | 'recon' | 'runbook'
  statusText?: string
  onTabChange?: (tab: 'gigya' | 'ping' | 'admin' | 'recon') => void
}

export default function Header({ activeTab, statusText, onTabChange }: HeaderProps) {
  const defaultStatusText = activeTab === 'gigya' ? 'Gigya Account Management' :
                           activeTab === 'ping' ? 'Ping AIC OIDC Tester' :
                           activeTab === 'admin' ? 'Ping Admin Panel' :
                           activeTab === 'recon' ? 'Data Integrity Validation' :
                           activeTab === 'runbook' ? 'Runbook Generator' :
                           'Auth Admin Dashboard'

  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-500" />
              <h1 className="text-xl font-semibold text-gray-100">Auth Admin Dashboard</h1>
            </div>
            <div className="flex items-center gap-2 ml-11">
              <Activity className="w-3 h-3 text-green-400" />
              <span className="text-xs text-gray-400">
                {statusText || defaultStatusText}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {onTabChange ? (
              <>
                <button
                  onClick={() => onTabChange('gigya')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'gigya'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Gigya
                  </div>
                </button>
                <button
                  onClick={() => onTabChange('ping')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'ping'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4" />
                    Ping AIC
                  </div>
                </button>
                <button
                  onClick={() => onTabChange('admin')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'admin'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Ping Admin
                  </div>
                </button>
                <button
                  onClick={() => onTabChange('recon')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'recon'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Recon Validation
                  </div>
                </button>
                <Link
                  href="/runbook"
                  className="px-4 py-2 text-sm font-medium rounded-md transition-colors bg-purple-600 text-white hover:bg-purple-700"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Runbook
                  </div>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/"
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'gigya'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Gigya
                  </div>
                </Link>
                <Link
                  href="/"
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'ping'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4" />
                    Ping AIC
                  </div>
                </Link>
                <Link
                  href="/"
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'admin'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Ping Admin
                  </div>
                </Link>
                <Link
                  href="/"
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'recon'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Recon Validation
                  </div>
                </Link>
                <Link
                  href="/runbook"
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'runbook'
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Runbook
                  </div>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

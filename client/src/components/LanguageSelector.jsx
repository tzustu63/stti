import React from 'react'
import { ChevronDown } from 'lucide-react'

const LANGUAGES = {
  'zh': '中文',
  'en': 'English',
  'id': 'Bahasa Indonesia',
  'vi': 'Tiếng Việt',
  'th': 'ไทย',
  'pt': 'Português',
  'es': 'Español',
  'ja': '日本語',
  'ko': '한국어'
}

const LanguageSelector = ({ label, value, onChange }) => {
  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {Object.entries(LANGUAGES).map(([code, name]) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-8 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  )
}

export default LanguageSelector

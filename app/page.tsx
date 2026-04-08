'use client'

import { useWizardStore } from '@/store/wizardStore'
import Stage1Research from '@/components/Stage1Research'
import { useState, useEffect } from 'react'

export default function Home() {
  const { projectId, setProject } = useWizardStore()
  const [topic, setTopic] = useState('')
  const [isStarted, setIsStarted] = useState(false)

  useEffect(() => {
    // Create project on mount if needed
    if (!projectId) {
      setProject(Math.random().toString(36), topic)
    }
  }, [])

  const handleStart = () => {
    if (topic.trim()) {
      setProject(Math.random().toString(36), topic)
      setIsStarted(true)
    }
  }

  if (!isStarted) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold mb-2 text-center">Research Wizard</h1>
          <p className="text-gray-600 text-center mb-6">IBL Framework with AI</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Research Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What would you like to research?"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleStart()}
              />
            </div>

            <button
              onClick={handleStart}
              disabled={!topic.trim()}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
            >
              Start Research
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <Stage1Research />
      </div>
    </main>
  )
}

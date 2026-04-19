import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function TelemetryDashboardPage() {
  const session = await auth()
  if (!session?.user) {
    // Only logged in users or special access? We omit redirection for local dev debug
  }

  const interactions = await prisma.projectInteraction.findMany({
    where: {
      OR: [
        { cognitiveFeatures: { not: Prisma.DbNull } },
        { affectiveFeatures: { not: Prisma.DbNull } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 100, // Limiting for initial load, can paginate later
    select: {
      id: true,
      stepId: true,
      stage: true,
      cognitiveFeatures: true,
      affectiveFeatures: true,
      createdAt: true,
      sessionId: true,
    }
  })

  // Basic aggregations
  const totalEnriched = interactions.length
  
  // Flatten features for simple metric display
  const allCognitive = interactions.map(i => i.cognitiveFeatures as Record<string, any>).filter(Boolean)
  const allAffective = interactions.map(i => i.affectiveFeatures as Record<string, any>).filter(Boolean)

  const avgBloomLevel = allCognitive.reduce((acc, curr) => {
    // Assuming bloom_level is returned as numbers or strings 1-6
    const levelMatch = curr?.bloom_level?.toString().match(/(\d)/)
    return acc + (levelMatch ? parseInt(levelMatch[1]) : 0)
  }, 0) / (allCognitive.length || 1)

  const commonSentiments = allAffective.reduce((acc, curr) => {
    const sentiment = curr?.sentiment || 'Neutral'
    acc[sentiment] = (acc[sentiment] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-body">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">IBL Telemetry Observatory</h1>
            <p className="text-slate-500 mt-1">Real-time pedagogical enrichment data</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-blue-50 px-4 py-2 rounded-xl text-center">
              <div className="text-2xl font-bold text-blue-600">{totalEnriched}</div>
              <div className="text-xs font-semibold text-blue-900/60 uppercase tracking-wider">Enriched Steps</div>
            </div>
            <div className="bg-purple-50 px-4 py-2 rounded-xl text-center">
              <div className="text-2xl font-bold text-purple-600">{avgBloomLevel.toFixed(1)}</div>
              <div className="text-xs font-semibold text-purple-900/60 uppercase tracking-wider">Avg Bloom Level</div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">🧠</span>
              Cognitive Trends
            </h2>
            <div className="space-y-4">
               {allCognitive.slice(0, 5).map((cog, idx) => (
                 <div key={idx} className="p-3 bg-slate-50 rounded-xl text-sm font-mono border border-slate-100 shadow-sm relative overflow-hidden group">
                   <div className="flex justify-between items-center mb-1">
                     <span className="font-semibold text-slate-700 capitalize">Level: {cog.bloom_level || 'N/A'}</span>
                     <span className="text-xs px-2 py-0.5 bg-white border border-slate-200 rounded-md">Complex: {cog.complexity || 'Low'}</span>
                   </div>
                   {cog.argumentation && <p className="text-slate-500 text-xs truncate">Arg: {cog.argumentation}</p>}
                 </div>
               ))}
               {allCognitive.length === 0 && <p className="text-slate-400 italic">No cognitive data yet.</p>}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600">❤️</span>
              Affective Distribution
            </h2>
            <div className="space-y-3">
              {Object.entries(commonSentiments).map(([sentiment, count]) => {
                const pct = Math.round((count / (allAffective.length || 1)) * 100)
                return (
                  <div key={sentiment} className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold inline-block uppercase text-pink-600">
                          {sentiment}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold inline-block text-pink-600">
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-pink-100">
                      <div style={{ width: `${pct}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-pink-500 rounded-full transition-all duration-500"></div>
                    </div>
                  </div>
                )
              })}
              {allAffective.length === 0 && <p className="text-slate-400 italic">No affective data yet.</p>}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-4">Recent Enriched Interactions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-slate-500 bg-slate-50/50">
                  <th className="p-3 rounded-tl-xl font-medium">Session ID</th>
                  <th className="p-3 font-medium">Step</th>
                  <th className="p-3 font-medium">Timestamp</th>
                  <th className="p-3 rounded-tr-xl font-medium">Insights JSON</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {interactions.map(interaction => {
                  const hasInsights = interaction.cognitiveFeatures || interaction.affectiveFeatures
                  return (
                    <tr key={interaction.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-mono text-xs text-slate-600">{interaction.sessionId?.substring(0, 8) || 'N/A'}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100/50">
                          {interaction.stepId}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">
                        {new Date(interaction.createdAt).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="p-3">
                        {hasInsights ? (
                           <div className="max-w-xs text-xs font-mono text-slate-500 truncate cursor-help border-l-2 pl-2 border-emerald-400" title={JSON.stringify({ cog: interaction.cognitiveFeatures, aff: interaction.affectiveFeatures })}>
                             {JSON.stringify(interaction.cognitiveFeatures || interaction.affectiveFeatures).substring(0, 40)}...
                           </div>
                        ) : (
                          <span className="text-slate-300 italic text-xs">Processing...</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

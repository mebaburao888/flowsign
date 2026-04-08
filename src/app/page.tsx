'use client'

import { useRouter } from 'next/navigation'
import { useSignIn } from '@clerk/nextjs'

// Demo personas — Clerk users pre-created in dashboard
const PERSONAS = [
  {
    id: 'jordan_standard',
    name: 'Jordan Chen',
    subtitle: 'New Hire — Software Engineer',
    description: 'Standard device path → auto-approval',
    route: '/onboarding/docs',
    avatar: 'JC',
    color: 'bg-blue-500',
    badge: 'New Hire',
    badgeColor: 'bg-blue-100 text-blue-700',
    clerkEmail: 'jordan.standard@example.com',
    employeeId: 'a1000000-0000-0000-0000-000000000001',
  },
  {
    id: 'jordan_exception',
    name: 'Jordan Chen',
    subtitle: 'New Hire — Software Engineer',
    description: 'Non-standard device → approval flow',
    route: '/onboarding/docs?scenario=exception',
    avatar: 'JC',
    color: 'bg-amber-500',
    badge: 'Exception Path',
    badgeColor: 'bg-amber-100 text-amber-700',
    clerkEmail: 'jordan.exception@example.com',
    employeeId: 'a1000000-0000-0000-0000-000000000001',
  },
  {
    id: 'priya',
    name: 'Priya Rajan',
    subtitle: 'IT Admin',
    description: 'Device queue, tickets, approvals',
    route: '/it-admin',
    avatar: 'PR',
    color: 'bg-purple-500',
    badge: 'IT Admin',
    badgeColor: 'bg-purple-100 text-purple-700',
    clerkEmail: 'priya@example.com',
    employeeId: 'a1000000-0000-0000-0000-000000000002',
  },
  {
    id: 'marcus',
    name: 'Marcus Torres',
    subtitle: 'Hiring Manager',
    description: 'Exception approvals, team view',
    route: '/hiring-manager',
    avatar: 'MT',
    color: 'bg-green-500',
    badge: 'Hiring Manager',
    badgeColor: 'bg-green-100 text-green-700',
    clerkEmail: 'marcus@example.com',
    employeeId: 'a1000000-0000-0000-0000-000000000003',
  },
]

export default function HomePage() {
  const router = useRouter()

  const handleSelect = (persona: typeof PERSONAS[0]) => {
    // Store persona context in sessionStorage for demo
    sessionStorage.setItem('flowsign_persona', JSON.stringify({
      employeeId: persona.employeeId,
      name: persona.name,
      role: persona.id,
    }))
    router.push(persona.route)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-12 text-center">
        <div className="flex items-center gap-3 justify-center mb-3">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 10h12M10 4l6 6-6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-white text-2xl font-bold tracking-tight">FlowSign</span>
        </div>
        <p className="text-slate-400 text-sm">Intelligent Employee Onboarding</p>
      </div>

      {/* Persona picker */}
      <div className="w-full max-w-2xl">
        <p className="text-slate-400 text-center text-sm mb-6 uppercase tracking-wider font-medium">
          Select a demo persona
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PERSONAS.map((persona) => (
            <button
              key={persona.id}
              onClick={() => handleSelect(persona)}
              className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl p-6 text-left transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 ${persona.color} rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                  {persona.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-semibold">{persona.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${persona.badgeColor}`}>
                      {persona.badge}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm">{persona.subtitle}</p>
                  <p className="text-slate-500 text-xs mt-1">{persona.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <p className="text-slate-600 text-center text-xs mt-8">
          FlowSign Demo · Powered by OpenAI
        </p>
      </div>
    </div>
  )
}

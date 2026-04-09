// Canonical onboarding tasks — single source of truth for seeding and reset

export const CANONICAL_TASKS = [
  {
    task_type: 'doc_signing',
    title: 'Sign NDA',
    description: 'Review and sign your confidentiality agreement',
    priority: 1,
  },
  {
    task_type: 'device_setup',
    title: 'Laptop setup',
    description: 'Choose your laptop setup and delivery preferences',
    priority: 2,
  },
  {
    task_type: 'payroll_setup',
    title: 'Payroll & benefits enrollment',
    description: 'Complete your payroll and benefits enrollment',
    priority: 3,
  },
  {
    task_type: 'orientation',
    title: 'Orientation & calendar setup',
    description: 'Book your orientation sessions and calendar events',
    priority: 4,
  },
] as const

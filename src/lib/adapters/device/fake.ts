// ─────────────────────────────────────
// Fake Device Adapter
// Replace with Jamf / Apple Business adapter
// ─────────────────────────────────────

import { DeviceAdapter, DeviceStandard } from '../types'
import { supabaseAdmin } from '../../supabase'

// Simulated inventory — swap for real Jamf/ABM API
const INVENTORY: Record<string, { inStock: boolean; procurementDays?: number }> = {
  'MacBook Pro 14" M3 Pro': { inStock: true },
  'MacBook Pro 16" M3 Max': { inStock: false, procurementDays: 7 },
  'MacBook Pro 14" M3':     { inStock: true },
}

export class FakeDeviceAdapter implements DeviceAdapter {
  async getStandardConfig(team: string, role: string): Promise<DeviceStandard> {
    const { data, error } = await supabaseAdmin
      .from('device_standards')
      .select('*')
      .eq('team', team)
      .eq('role', role)
      .single()

    if (error || !data) throw new Error(`No standard config for ${role} on ${team}`)

    return {
      deviceModel: data.device_model,
      deviceSpec: data.device_spec,
      standardApps: data.standard_apps,
    }
  }

  async checkStock(model: string): Promise<{ inStock: boolean; procurementDays?: number }> {
    return INVENTORY[model] ?? { inStock: true }
  }
}

// TODO: JamfDeviceAdapter implements DeviceAdapter
// export class JamfDeviceAdapter implements DeviceAdapter { ... }

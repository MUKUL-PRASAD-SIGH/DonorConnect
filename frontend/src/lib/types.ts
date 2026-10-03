export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
export type Component = 'whole_blood' | 'rbc' | 'platelets' | 'plasma'
export type DonationType = 'whole_blood' | 'platelets' | 'plasma'
export type Priority = 'low' | 'medium' | 'high' | 'critical'
export type AlertStatus = 'active' | 'fulfilled' | 'expired' | 'cancelled'
export type DispatchState = 'dispatching' | 'covered' | 'exhausted' | 'closed'
export type ResponseStatus = 'invited' | 'accepted' | 'standby' | 'declined' | 'arrived' | 'lapsed' | 'withdrawn' | 'stood_down'

export const BLOOD_GROUPS: BloodGroup[] = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']

export const COMPONENT_LABEL: Record<Component, string> = {
  whole_blood: 'Whole blood',
  rbc: 'Red cells',
  platelets: 'Platelets',
  plasma: 'Plasma',
}

export const DONATION_LABEL: Record<DonationType, string> = {
  whole_blood: 'Whole blood',
  platelets: 'Platelets',
  plasma: 'Plasma',
}

export const RARE_PHENOTYPES: Record<string, string> = {
  bombay: 'Bombay (hh)',
  para_bombay: 'Para-Bombay',
  rh_null: 'Rh-null',
  kell_null: 'Kell-null (K0)',
  k_negative: 'Cellano-negative (kk-)',
  jk_null: 'Kidd-null Jk(a-b-)',
  vel_negative: 'Vel-negative',
  lutheran_null: 'Lutheran-null Lu(a-b-)',
}

export interface User {
  id: string
  name: string
  email: string
  role: 'donor' | 'hospital' | 'admin'
  phone: string
  address: string
  location: { type: string; coordinates: [number, number] }
  donorId?: string
  bloodGroup?: BloodGroup
  hospitalId?: string
  hospitalName?: string
  isVerified?: boolean
}

export interface Coverage {
  slots: number
  arrived: number
  held: number
  standby: number
  pending: number
  openSlots: number
  expectedUnits: number
  expectedWithPending: number
}

interface AlertBase {
  publicCode: string
  bloodGroup: BloodGroup
  component: Component
  componentLabel: string
  requiredPhenotype?: string
  requiredPhenotypeLabel?: string
  unitsNeeded: number
  unitsCollected: number
  priority: Priority
  status: AlertStatus
  dispatchState: DispatchState
  shareState: 'open' | 'covered' | 'closed'
  requiredBy: string
  isEmergency: boolean
  isPlanned: boolean
  createdAt: string
  updatedAt: string
  closedAt?: string
}

export interface HospitalResponse {
  donorId: string
  name: string
  phone?: string
  bloodGroup?: BloodGroup
  rareVerified?: boolean
  status: ResponseStatus
  wave: number
  invitedAt: string
  respondedAt?: string
  holdExpiresAt?: string
  arrivedAt?: string
  distanceKm?: number
  etaMinutes?: number
  showProbability?: number
  notes?: string
}

export interface HospitalAlert extends AlertBase {
  _id: string
  patientCondition: string
  additionalNotes?: string
  searchRadius: number
  escalationLevel: number
  escalationLadder: (number | null)[]
  currentRadiusKm: number | null
  coverage: Coverage
  waves: { number: number; sentAt: string; radiusKm: number | null; invited: number }[]
  nextWaveAt: string | null
  responses: HospitalResponse[]
}

export interface HospitalSummary {
  _id: string
  name: string
  verified: boolean
  address?: string
  location?: [number, number]
  emergencyContact?: string
}

export interface DonorAlert extends AlertBase {
  _id: string
  patientCondition: string
  additionalNotes?: string
  hospital: HospitalSummary | null
  openSlots: number
  distanceKm?: number | null
  myResponse: null | {
    status: ResponseStatus
    wave: number
    invitedAt: string
    respondedAt?: string
    holdExpiresAt?: string
    distanceKm?: number
    etaMinutes?: number
    replyCode?: string
  }
}

export interface PublicRequest extends AlertBase {
  compatibleDonorGroups: BloodGroup[]
  openSlots: number
  donorsConfirmed: number
  hospital: HospitalSummary | null
}

export interface Deferral {
  code: string
  label: string
  until: string | null
}

export interface ComponentEligibility {
  type: DonationType
  eligible: boolean
  nextEligibleDate: string | null
  deferrals: Deferral[]
}

export interface Eligibility {
  evaluatedAt: string
  screeningCompleted: boolean
  screeningStale: boolean
  components: Record<DonationType, ComponentEligibility>
  notes: string[]
}

export interface Screening {
  hemoglobin?: number
  tattooOrPiercingOn?: string
  majorSurgeryOn?: string
  illnessRecoveredOn?: string
  antibioticsCompletedOn?: string
  malariaTreatedOn?: string
  childbirthOn?: string
  pregnantOrBreastfeeding?: boolean
  alcoholLast24h?: boolean
  conditions?: string[]
  completedAt?: string
}

export interface DonorProfile {
  id: string
  donorId: string
  name: string
  email: string
  phone: string
  address: string
  bloodGroup: BloodGroup
  dateOfBirth: string
  weight: number
  sex?: 'male' | 'female' | 'other'
  totalDonations: number
  rewardPoints: number
  lastDonationDate?: string
  lastDonations: Partial<Record<DonationType, string>>
  availableForEmergency: boolean
  notificationsEnabled: boolean
  rarePhenotypes: string[]
  rarePhenotypeVerified: boolean
  screening?: Screening
  reliability: { invited: number; accepted: number; arrived: number; lapsed: number }
  eligibility: Eligibility
}

export interface HospitalProfile {
  id: string
  hospitalId: string
  name: string
  email: string
  phone: string
  address: string
  hospitalName: string
  licenseNumber: string
  contactPerson: string
  emergencyContact: string
  isVerified: boolean
  totalAlertsRaised: number
  successfulMatches: number
}

export interface Lot {
  _id: string
  bloodGroup: BloodGroup
  component: Component
  units: number
  collectedAt: string
  expiresAt: string
  source?: string
}

export interface Inventory {
  lots: Lot[]
  totals: { bloodGroup: BloodGroup; component: Component; units: number; earliestExpiry: string }[]
}

export interface ForecastItem {
  bloodGroup: BloodGroup
  component: Component
  availableUnits: number
  avgDailyUse: number
  daysOfCover: number | null
  shortfallDate: string | null
  unitsShortByHorizon: number
  projectedWastage: { lotId: string; units: number; expiresAt: string }[]
  confidence: 'low' | 'medium' | 'high'
  drivers: string[]
  daily: { date: string; demand: number; stock: number }[]
}

export interface ExchangeSuggestion {
  lotId: string
  bloodGroup: BloodGroup
  component: Component
  expiresAt: string
  unitsAtRisk: number
  suggestedUnits: number
  to: {
    hospitalId: string
    name: string
    verified: boolean
    distanceKm: number
    shortfallGroup: BloodGroup
    shortfallDate: string
    unitsShort: number
  }
}

export interface TransferOffer {
  _id: string
  direction: 'incoming' | 'outgoing'
  from: { id: string; name: string; contact: string }
  to: { id: string; name: string; contact: string }
  bloodGroup: BloodGroup
  component: Component
  units: number
  expiresAt: string
  distanceKm?: number
  status: 'offered' | 'accepted' | 'declined' | 'cancelled' | 'completed'
  note?: string
  createdAt: string
}

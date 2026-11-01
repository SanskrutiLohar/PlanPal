export interface BudgetItem {
  item: string;
  pct: number;
  tip: string;
  amount?: number;
}

export interface TimelineItem {
  when: string;
  task: string;
  dueDate?: string;
  completed?: boolean;
}

export interface TimelineTask {
  id: string;
  when: string;
  dueDate?: string;
  task: string;
  description?: string;
  category: 'Venue' | 'Catering' | 'Decor' | 'Logistics' | 'Attire' | 'Rituals' | 'General';
  priority: 'High' | 'Medium' | 'Normal';
  completed: boolean;
}

export interface VendorItem {
  id?: string;
  name: string;
  why: string;
  done: boolean;
  category?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  quotedPrice?: number;
  negotiatedPrice?: number;
  advancePaid?: number;
  remainingPayment?: number;
  status?: 'shortlisted' | 'contacted' | 'negotiating' | 'booked' | 'completed' | 'cancelled';
  paymentDueDate?: string;
  notes?: string;
}

export interface VendorQuote {
  id: string;
  vendorName: string;
  contact: string;
  quotedPrice: number;
  advanceRequiredPct: number;
  deliverables: string;
  pros: string;
  cons: string;
}

export interface VendorComparison {
  id: string;
  category: string;
  quotes: VendorQuote[];
  selectedQuoteId?: string;
}

export interface ExpenseItem {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  paymentMode: 'UPI' | 'Cash' | 'Bank Transfer' | 'Card' | 'Cheque';
  vendorName?: string;
  notes?: string;
  createdAt: string;
}

export interface IdeaItem {
  title: string;
  detail: string;
}

export interface PhotoAnalysis {
  isRelevant: boolean;
  setting: string;
  colors: string;
  style: string;
  spaceNotes: string;
}

export interface ItineraryItem {
  time: string;
  activity: string;
  location: string;
  decorNote: string;
}

export interface VisualPaletteItem {
  name: string;
  hex: string;
}

export interface ColourItem {
  name: string;
  hex: string;
  description: string;
  application: string;
}

export interface SuggestedColourApplications {
  decorations?: string;
  flowers?: string;
  invitations?: string;
  tableSettings?: string;
  otherElements?: string;
}

export interface ColourPalette {
  id?: string;
  name: string;
  description: string;
  colours: ColourItem[];
  suggestedApplications?: SuggestedColourApplications;
}

export interface VisualInspiration {
  themeName: string;
  palette: VisualPaletteItem[];
  stageConcept: string;
  tableSetting: string;
  floralAndLighting: string;
}

export interface EventPlan {
  summary: string;
  budget: BudgetItem[];
  timeline: TimelineItem[];
  vendors: VendorItem[];
  ideas: IdeaItem[];
  photoAnalysis?: PhotoAnalysis | null;
  itinerary: ItineraryItem[];
  photosCount?: number;
  visualInspiration?: VisualInspiration;
  colourPalette?: ColourPalette;
  savedPalettes?: ColourPalette[];
  assumptions?: string[];
  realism?: {
    isUnrealistic: boolean;
    warning?: string;
    reducedPlanOffer?: string;
    recommendedGuestCount?: number;
    minPerGuestBenchmark?: number;
  };
}

export interface ExtractedEventSlots {
  eventType: string | null;
  city: string | null;
  guestCount: number | null;
  budgetINR: number | null;
  date: string | null;
  notes: string | null;
  preferences?: string | null;
  constraints?: string | null;
  themePreference?: string | null;
  assumptions?: string[];
  isReady: boolean;
  missingFields?: string[];
}

export interface DiscoveryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  slotsSnapshot?: ExtractedEventSlots;
  proposedPlan?: EventPlan;
}

export interface UploadedPhoto {
  id: string;
  dataUrl: string;
  name: string;
  sizeKb: number;
}

export interface EventFormData {
  eventType: string | null;
  guestCount: number | null;
  budgetINR: number | null;
  date: string | null;
  city: string | null;
  notes: string | null;
  photos?: UploadedPhoto[];
}

export interface PlanDiffItem {
  type: 'budget' | 'vendor' | 'timeline' | 'itinerary' | 'detail' | 'theme' | 'guestCount' | 'date' | 'city' | 'menu';
  item: string;
  before: string;
  after: string;
  reason?: string;
}

export interface AIProposedChange {
  id: string;
  title: string;
  explanation: string;
  impactSummary: string;
  diff?: PlanDiffItem[];
  updatedPlan?: Partial<EventPlan>;
  updatedFormData?: Partial<EventFormData>;
  applied?: boolean;
}

export interface SavedPlan {
  id: string;
  userId?: string;
  createdAt: string;
  updatedAt?: string;
  title: string;
  formData: EventFormData;
  plan: EventPlan;
  expenses?: ExpenseItem[];
  tasks?: TimelineTask[];
  vendorComparisons?: VendorComparison[];
  colourPalette?: ColourPalette;
  savedPalettes?: ColourPalette[];
}

export interface EventDashboardStats {
  totalBudget: number;
  actualExpenditure: number;
  remainingBudget: number;
  budgetUtilizationPct: number;
  contingencyAllocated: number;
  contingencyRemaining: number;
  totalTasksCount: number;
  completedTasksCount: number;
  pendingTasksCount: number;
  overdueTasksCount: number;
  totalVendorsCount: number;
  bookedVendorsCount: number;
  pendingPaymentsTotal: number;
  overallProgressPct: number;
}

import { EventPlan, EventFormData } from '../types/plan.js';

export function getFallbackPlan(formData: EventFormData): EventPlan {
  const typeLower = (formData.eventType || '').toLowerCase();
  const cityText = formData.city ? ` in ${formData.city}` : '';
  const guestText = formData.guestCount ? ` for ${formData.guestCount} guests` : '';

  if (typeLower.includes('birthday')) {
    return {
      summary: `Birthday celebration${guestText}${cityText} with curated catering, family activities and return gifts.`,
      budget: [
        { item: 'Food and beverages', pct: 40, tip: 'Include child-friendly finger foods alongside regional hot snacks.' },
        { item: 'Venue and basic decor', pct: 25, tip: 'Book a banquet hall with in-house sound to save on transport fees.' },
        { item: 'Cake and desserts', pct: 10, tip: 'Order 100 grams of cake per attendee plus seasonal fresh fruit tarts.' },
        { item: 'Entertainment and host', pct: 10, tip: 'Engage a local anchor for interactive party games and music.' },
        { item: 'Return gifts and favours', pct: 10, tip: 'Choose educational books, wooden puzzles or local potted saplings.' },
        { item: 'Photography and contingency', pct: 5, tip: 'Keep a small cash buffer for last-minute ice, water and battery packs.' },
      ],
      timeline: [
        { when: '4 weeks before', task: 'Finalise venue booking and confirm party menu with the caterer.' },
        { when: '2 weeks before', task: 'Send digital invitations and order customized birthday cake and return gifts.' },
        { when: '1 week before', task: 'Reconfirm guest RSVPs and prepare music playlist and game materials.' },
        { when: '1 day before', task: 'Inspect balloon and floral delivery items, pick up cake advance voucher.' },
        { when: 'Event day morning', task: 'Supervise venue setup, test microphone and arrange return gift counter.' },
        { when: 'Event day evening', task: 'Welcome guests, coordinate cake cutting and settle vendor balances.' },
      ],
      vendors: [
        { name: 'Banquet Venue Coordinator', why: 'Secures hall air conditioning, furniture layout and sound permissions.', done: false },
        { name: 'Party Caterer', why: 'Provides fresh hot food, live chaat counter and service staff.', done: false },
        { name: 'Custom Baker', why: 'Bakes themed cake on schedule with safe delivery packaging.', done: false },
        { name: 'Party Decorator', why: 'Sets up photo backdrop, lighting and welcome board before guests arrive.', done: false },
        { name: 'Event Photographer', why: 'Captures family portraits and candids during cake cutting.', done: false },
      ],
      ideas: [
        {
          title: 'Regional sweet & live counter',
          detail: `Feature authentic local delicacies like fresh jalebi, kulfi or regional sweets tailored to your ${formData.city || 'Nashik'} celebration.`,
        },
        {
          title: 'Power backup & music coordination',
          detail: 'Confirm dedicated power generator backup with the venue to prevent audio cutoffs during evening cake cutting and family games.',
        },
        {
          title: 'Buffet queue flow & hospitality',
          detail: `For ${formData.guestCount || 50} guests, arrange two parallel dinner serving lines to eliminate waiting queues for elders and children.`,
        },
        {
          title: 'Local artisan return gifts',
          detail: 'Replace plastic knickknacks with handcrafted clay toys, seed pencils or local potted saplings.',
        },
      ],
      photoAnalysis: null,
      visualInspiration: {
        themeName: 'Pastel Garden and Warm Amber',
        palette: [
          { name: 'Warm Terracotta', hex: '#A8641A' },
          { name: 'Sand Cream', hex: '#F6F0E6' },
          { name: 'Olive Sage', hex: '#4F6B3A' },
          { name: 'Golden Marigold', hex: '#D48822' },
        ],
        stageConcept: 'Low-height wooden arch garlanded with seasonal eucalyptus, marigolds, and warm amber fairy lights with a personalised calligraphy welcome plaque.',
        tableSetting: 'Beige linen runners on natural wood tables with potted miniature succulents and brass tea-light holders.',
        floralAndLighting: 'Fragrant rajnigandha (tuberose), marigolds and diffused warm yellow canopy lamps hung at varying heights.',
      },
      itinerary: [
        { time: '04:00 PM', activity: 'Decor inspection and sound check', location: 'Main hall', decorNote: 'Themed backdrop and welcome board in position' },
        { time: '05:00 PM', activity: 'Guest arrival and welcome refreshments', location: 'Entrance foyer', decorNote: 'Soft background music and drinks station open' },
        { time: '05:30 PM', activity: 'Interactive party games and music', location: 'Activity play zone', decorNote: 'Open carpeted area with safe balloon arrangements' },
        { time: '06:45 PM', activity: 'Cake cutting ceremony', location: 'Central stage', decorNote: 'Spotlight focused on birthday cake table' },
        { time: '07:15 PM', activity: 'Buffet dinner and live food counter', location: 'Dining area', decorNote: 'Hot food stations arranged for smooth queue flow' },
        { time: '08:30 PM', activity: 'Return gift distribution and farewell', location: 'Exit desk', decorNote: 'Gift counter with personalised thank you cards' },
      ],
    };
  }

  if (typeLower.includes('community')) {
    return {
      summary: `Community gathering${guestText}${cityText} focusing on collective participation, structured scheduling and shared dining.`,
      budget: [
        { item: 'Community feast or catering', pct: 45, tip: 'Buffet-style regional meals keep dining queues swift and warm.' },
        { item: 'Hall rental and permissions', pct: 20, tip: 'Apply early for resident welfare or civic community hall slots.' },
        { item: 'Sound, stage and seating', pct: 15, tip: 'Ensure cordless microphones and sufficient chairs for senior residents.' },
        { item: 'Prizes, mementos and badges', pct: 10, tip: 'Purchase utility mementos such as brass diyas, umbrellas or stainless steel water bottles.' },
        { item: 'Signage and printed schedules', pct: 5, tip: 'Place prominent schedule boards at the entrance and registration desk.' },
        { item: 'First aid and hydration reserve', pct: 5, tip: 'Keep water dispensers, ORS packs and emergency kits accessible.' },
      ],
      timeline: [
        { when: '6 weeks before', task: 'Form volunteer committee and reserve civic or community club grounds.' },
        { when: '4 weeks before', task: 'Publish registration notice and secure quotes for buffet caterer and sound setup.' },
        { when: '2 weeks before', task: 'Close registration entries, order prizes and print banner signage.' },
        { when: '3 days before', task: 'Inspect public address system, power backup and waste collection bins.' },
        { when: 'Event day 07:00', task: 'Open participant check-in counter and stage setup with volunteer team.' },
        { when: 'Event day 18:00', task: 'Conclude felicitation ceremony, oversee hall cleanup and tally accounts.' },
      ],
      vendors: [
        { name: 'Community Hall Manager', why: 'Allocates hall access, restrooms, parking and electrical breaker rooms.', done: false },
        { name: 'Buffet Meal Provider', why: 'Prepares hygienic, large-batch meals with adequate serving staff.', done: false },
        { name: 'AV & Sound Technician', why: 'Runs microphones, monitors acoustic levels and maintains backup amplifier.', done: false },
        { name: 'Trophy & Memento Supplier', why: 'Delivers engraved plaques and participation certificates on time.', done: false },
        { name: 'Waste Management Crew', why: 'Separates food waste and dry packaging to leave the venue spotless.', done: false },
      ],
      ideas: [
        { title: 'Zero single-use plastic', detail: 'Serve water in stainless steel jugs and meals on banana leaves or areca palm plates.' },
        { title: 'Inter-generational contests', detail: 'Pair youth and elders for cultural quizzes, carrom matches or storytelling sessions.' },
        { title: 'Community honour roll', detail: 'Acknowledge long-term neighbourhood volunteers and sanitation champions during announcements.' },
      ],
      photoAnalysis: null,
      visualInspiration: {
        themeName: 'Civic Earth and Brass Accents',
        palette: [
          { name: 'Warm Terracotta', hex: '#A8641A' },
          { name: 'Sand Cream', hex: '#F6F0E6' },
          { name: 'Deep Maroon', hex: '#7A1F2B' },
          { name: 'Leaf Green', hex: '#4F6B3A' },
        ],
        stageConcept: 'Structured wooden dais dressed in cream khadi drapes with traditional brass samai lamps and marigold garlands framing the speaker podium.',
        tableSetting: 'Neat rows of covered banquet tables with stainless steel water carafes, recycled paper program booklets and natural clay pen stands.',
        floralAndLighting: 'Orange and yellow marigold torans along archways, high-CRI white overhead stage floodlights and diffused courtyard pathway luminaires.',
      },
      itinerary: [
        { time: '07:30 AM', activity: 'Volunteer assembly and registration setup', location: 'Registration counter', decorNote: 'Clear directional signage and schedule board placed' },
        { time: '08:30 AM', activity: 'Opening ceremony and sports tournament start', location: 'Main courtyard', decorNote: 'Festive marigold garland arch at entry' },
        { time: '12:30 PM', activity: 'Community shared lunch feast', location: 'Dining hall', decorNote: 'Seated buffet line with regional hot meals' },
        { time: '03:00 PM', activity: 'Final matches and exhibition games', location: 'Activity grounds', decorNote: 'Shaded seating arrangement for elders' },
        { time: '05:30 PM', activity: 'Prize distribution and felicitation', location: 'Central stage', decorNote: 'Trophy display table with flower decoration' },
        { time: '07:00 PM', activity: 'Evening refreshments and hall cleanup', location: 'Courtyard foyer', decorNote: 'Waste segregation bins monitored by volunteers' },
      ],
    };
  }

  // Default to Celebration / Wedding Plan
  return {
    summary: `Celebration gathering${guestText}${cityText} balancing ceremony rituals, hospitality and vendor commitments.`,
    budget: [
      { item: 'Catering and dining', pct: 35, tip: 'Negotiate per-plate rates that include welcome coolers and midnight tea counters.' },
      { item: 'Venue hire and electricity', pct: 25, tip: 'Confirm whether generator diesel backup and room tariffs are bundled in the base contract.' },
      { item: 'Decor, mandap and floral setup', pct: 15, tip: 'Use seasonal marigolds, tuberoses and jasmine to control decoration overhead.' },
      { item: 'Photography and videography', pct: 10, tip: 'Specify delivery timeline for raw video clips, edited cinematic teaser and physical album.' },
      { item: 'Attire, jewellery and styling', pct: 8, tip: 'Complete outfit trials four weeks prior to accommodate alteration rounds.' },
      { item: 'Logistics and emergency buffer', pct: 7, tip: 'Reserve funds for guest cabs, valet tips and unexpected ritual supplies.' },
    ],
    timeline: [
      { when: '6 months before', task: 'Finalise wedding muhurat date and lock venue with token deposit.' },
      { when: '4 months before', task: 'Taste test caterer dishes and shortlist traditional mandap decorator.' },
      { when: '2 months before', task: 'Distribute wedding invitations and book photographer and beauty stylist.' },
      { when: '3 weeks before', task: 'Conduct attire fittings and finalise priest ritual list and samagri items.' },
      { when: '1 week before', task: 'Review vendor arrival times, room allocations and guest transit schedule.' },
      { when: 'Wedding day', task: 'Oversee mandap pooja setup, monitor meal counters and disburse vendor milestone payments.' },
    ],
    vendors: [
      { name: 'Wedding Venue Incharge', why: 'Coordinates mandap access, power backup and bridal dressing suite.', done: false },
      { name: 'Wedding Caterer', why: 'Prepares traditional multi-course feasts and evening reception buffet.', done: false },
      { name: 'Mandap Floral Decorator', why: 'Constructs ceremonial stage, lighting canopy and floral entryway.', done: false },
      { name: 'Candid Photographer', why: 'Documents key ritual milestones, family portraits and candid moments.', done: false },
      { name: 'Pooja Priest (Pandit / Officiant)', why: 'Guides holy vows, havan rituals and auspicious timings.', done: false },
    ],
    ideas: [
      { title: 'Signature regional beverage counter', detail: 'Offer chilled tender coconut, sol kadhi or fresh sugarcane juice as guests arrive.' },
      { title: 'Comfort kits for elders', detail: 'Provide cushioned seating near the mandap, shawls for evening chill and brass walking canes.' },
      { title: 'Digital memory kiosk', detail: 'Set a QR code placard on dining tables so relatives can upload phone photos to a shared family album.' },
    ],
    photoAnalysis: null,
    visualInspiration: {
      themeName: 'Heritage Marigold & Brass Mandap',
      palette: [
        { name: 'Deep Maroon', hex: '#7A1F2B' },
        { name: 'Sand Cream', hex: '#F6F0E6' },
        { name: 'Golden Marigold', hex: '#D48822' },
        { name: 'Warm Terracotta', hex: '#A8641A' },
        { name: 'Olive Green', hex: '#4F6B3A' },
      ],
      stageConcept: 'Four-pillar open mandap draped with unbleached raw silk and dense hanging garlands of fresh marigold and mogra, anchored by antique brass floor urns with floating tea lights.',
      tableSetting: 'Cream runner with brass katori centerpieces, marigold petal rings, and embossed linen menus with ceremony schedule highlights.',
      floralAndLighting: 'Dense fresh mogra, genda phool (marigold), and warm 2700K fairy lights along pillars, with brass floor lamps framing the sacred fire altar.',
    },
    itinerary: [
      { time: '09:00 AM', activity: 'Mandap pooja and havan setup', location: 'Ceremonial mandap', decorNote: 'Fresh jasmine garlands and brass samai lighting at threshold' },
      { time: '10:30 AM', activity: 'Baraat procession and milni welcome', location: 'Main portico', decorNote: 'Rose water sprinkle, traditional dhol and floral shower' },
      { time: '11:30 AM', activity: 'Varmala exchange and sacred pheras', location: 'Central stage', decorNote: 'Floral canopy and velvet seating for parents' },
      { time: '01:30 PM', activity: 'Traditional wedding feast lunch', location: 'Dining pavilion', decorNote: 'Multi-course regional buffet with dessert counter' },
      { time: '04:00 PM', activity: 'Blessings, gifts and vidaai farewell', location: 'Courtyard exit', decorNote: 'Decorated floral doorway for family send-off' },
      { time: '07:30 PM', activity: 'Evening reception and dinner feast', location: 'Banquet ballroom', decorNote: 'Warm ambient lighting, stage backdrop and live music' },
    ],
  };
}

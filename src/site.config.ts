// ============================================================================
// SITE CONFIGURATION
// ============================================================================
// This is the ONLY file you need to edit to customize the template.
// All components read from this config — no hardcoded client data anywhere.
// ============================================================================

export interface SiteConfig {
  // Identity
  name: string;
  tagline: string;
  description: string;
  foundingYear: string;
  founder: string;
  url: string;

  // Schema.org
  schemaType: string;
  priceRange: string;

  // Contact
  phone: string;
  phoneRaw: string;
  whatsapp: string;
  whatsappMessage: string;
  email: string;
  address: {
    street: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
    coords: { lat: number; lng: number };
    mapsEmbed: string;
  };

  // Design
  theme: {
    primary: string;
    primaryLight: string;
    accent: string;
    accentLight: string;
    heroOverlay?: string;  // Auto-darkened from primary if omitted — always safe for white text
    footerBg?: string;     // Auto-darkened from primary if omitted — always safe for white text
    background: string;
    surface: string;
    text: string;
    muted: string;
    displayFont: string;  // Bold heading font (from font-registry.json)
    bodyFont: string;     // Readable body text font (from font-registry.json)
    accentFont?: string;  // Optional 3rd font for badges, stats, pull quotes (from font-registry.json)
  };

  // Navigation
  nav: Array<{ label: string; href: string }>;

  // Trust badges shown on homepage and service pages
  badges: Array<{ icon: string; label: string }>;

  // Services
  services: Array<{
    title: string;
    slug: string;
    description: string;
    shortDescription: string;
    features: string[];
    faqs: Array<{ question: string; answer: string }>;
    // Service subpage content
    heroSubtitle: string;
    longDescription: string;
    whatWeCover: Array<{ title: string; description: string }>;
    whyChooseUs: Array<{ bold: string; text: string }>;
  }>;

  // Homepage
  homepage: {
    title: string;
    metaTitle: string;
    metaDescription: string;
    heroTitle: string;
    heroSubtitle: string;
    heroBadges?: string[];
    whyChooseTitle: string;
    whyChooseSubtitle: string;
    whyChooseCards: Array<{
      icon: string;
      iconSvg?: string; // Path to standalone SVG file (e.g., "/icons/experienced.svg"). Takes priority over icon path data.
      title: string;
      description: string;
    }>;
    faqs: Array<{ question: string; answer: string }>;
    // Service areas displayed on homepage (max 5 major suburbs/areas)
    serviceAreas?: Array<{
      name: string; // e.g. "Northern Suburbs", "Somerset West"
      suburbs?: string; // Optional comma-separated list of suburbs within
    }>;
    serviceAreasTitle?: string; // e.g. "Areas We Serve in Cape Town"
    serviceAreasSubtitle?: string; // e.g. "Professional plumbing across the Cape Peninsula"
    // Gallery / Recent Jobs section
    galleryTitle?: string; // e.g. "Our Recent Work"
    gallerySubtitle?: string; // e.g. "See the quality of our workmanship across Cape Town"
  };

  // About page
  about: {
    metaTitle: string;
    metaDescription: string;
    heroTitle: string;
    heroSubtitle: string;
    heading: string;
    paragraphs: string[];
    badge: string;
    stats: Array<{ value: string; label: string }>;
  };

  // Contact page
  contact: {
    metaTitle: string;
    metaDescription: string;
    heroTitle: string;
    heroSubtitle: string;
    hours: {
      standard: { label: string; days: string; hours: string };
      emergency: { label: string; days: string; hours: string };
    };
    faqs: Array<{ question: string; answer: string }>;
  };

  // Reviews
  reviews: {
    metaTitle: string;
    metaDescription: string;
    averageRating: number;
    totalReviews: number;
    sourceSummary: string;
    googleMapsUrl?: string;
    items: Array<{
      name: string;
      text: string;
      rating: number;
      date?: string;
      service?: string;
      source?: string;
    }>;
  };

  // Services overview page
  servicesPage: {
    metaTitle: string;
    metaDescription: string;
    heroTitle: string;
    heroSubtitle: string;
  };

  // Pre-footer CTA banner (populated by design enhancer)
  ctaBanner?: {
    variant: 'full-bleed-accent' | 'split-image' | 'stats-bar' | 'testimonial-cta' | 'emergency-urgent' | 'map-cta';
    headline?: string;
    subtitle?: string;
  };

  // Legal
  legal: {
    registrations: string[];
    servicesList: string[];
  };
}

// ============================================================================
// TEMPLATE CONFIGURATION — Replace with client data
// ============================================================================
// This file contains placeholder values. Replace them with actual client data
// when building a new website. All components read from this config.
// ============================================================================

export const site: SiteConfig = {
  // Identity — REPLACE WITH CLIENT DATA
  name: "Core Leak Detection",
  tagline: "Professional plumbers in Cape Town",
  description: "Professional plumbers in Cape Town and surrounding areas. Quality workmanship, fair pricing.",
  foundingYear: "2020",
  founder: "Stephan Le Roux",
  url: "https://www.coreleakdetection.co.za",

  // Schema.org — REPLACE WITH APPROPRIATE TYPE
  schemaType: "LocalBusiness",
  priceRange: "$$",

  // Contact — REPLACE WITH CLIENT DATA
  phone: "(079) 540-1802",
  phoneRaw: "0795401802",
  whatsapp: "27795401802",
  whatsappMessage: "Hi, I need your services. Can you help?",
  email: "",
  address: {
    street: "",
    city: "Cape Town",
    region: "Western Cape",
    postalCode: "",
    country: "ZA",
    coords: { lat: -26.2041, lng: 28.0473 },
    mapsEmbed: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3580.0!2d28.0!3d-26.2",
  },

  // Design — REPLACE WITH CLIENT BRAND COLORS/FONTS
  theme: {
    primary: "#b2caf7",
    primaryLight: "#bacff8",
    accent: "#373737",
    accentLight: "#5d5d5d",
    // heroOverlay and footerBg are auto-darkened from primary by generate-theme.mjs
    // Only set these if you want a specific dark tone (must be dark enough for white text)
    heroOverlay: "#172236",
    footerBg: "#172236",
    background: "#FFFFFF",
    surface: "#F9FAFB",
    text: "#111827",
    muted: "#6B7280",
    displayFont: "Archivo",
    bodyFont: "Inter",
    // accentFont is optional — set during uniqueness enhancement (Phase 7.5)
  },

  // Navigation
  nav: [
    { label: "Home", href: "/" },
    { label: "Services", href: "/services/" },
    { label: "About Us", href: "/about-us/" },
    { label: "Contact", href: "/contact/" },
  ],

  // Trust badges — CUSTOMIZE FOR CLIENT
  badges: [
    { icon: '<path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>', label: "Qualified & Licensed" },
    { icon: '<path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>', label: "Fast Response" },
    { icon: '<path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>', label: "Competitive Pricing" },
    { icon: '<path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>', label: "Owner Managed" },
  ],

  // Services — REPLACE WITH CLIENT SERVICES
  services: [
    {
      title: "Residential Leak Detection",
      slug: "residential-leak-detection",
      description: "Hidden leaks in your home waste water, damage structures, and drive up your municipal bill. We use non-invasive detection technology to find the exact source — under floors, behind walls, or beneath slabs — and fix it with minimal disruption.",
      shortDescription: "Precise, non-invasive leak detection for Cape Town homes — walls, floors, slabs, and pipes.",
      features: ["Non-invasive acoustic and thermal detection","Slab, pipe, and wall leak location","Minimal property disruption","2-year workmanship guarantee"],
      faqs: [
      {
            "question": "What areas do you service?",
            "answer": "We service Cape Town's Northern and Southern Suburbs, Somerset West, Strand, Stellenbosch, and the surrounding areas across the Western Cape."
      },
      {
            "question": "How do you detect leaks without breaking walls?",
            "answer": "We use the latest non-invasive leak detection technology — including acoustic listening devices and thermal imaging — to pinpoint leaks with minimal disruption to your property."
      },
      {
            "question": "Do you offer a guarantee on your work?",
            "answer": "Yes. All our plumbing and leak detection work comes with a 2-year workmanship guarantee. We stand behind every job we do."
      },
      {
            "question": "How much does leak detection cost?",
            "answer": "The cost depends on the size of the property, the type of leak, and accessibility. Contact us for a free, no-obligation quote and we'll give you a clear breakdown upfront."
      },
      {
            "question": "Can you handle both residential and commercial jobs?",
            "answer": "Absolutely. We work across residential homes, commercial properties, and industrial sites — including pool leak detection and gas installations."
      },
      {
            "question": "How quickly can you respond to a leak?",
            "answer": "We pride ourselves on fast response times. Contact us on (079) 540-1802 and we'll get someone to you as soon as possible."
      }
    ],
      heroSubtitle: "Accurate residential leak detection across Cape Town — found fast, fixed properly.",
      longDescription: "<p>A hidden water leak in your home can quietly cause thousands of rands in structural damage before you ever spot a damp patch. At Core Leak Detection, we use the latest acoustic listening equipment and thermal imaging technology to pinpoint the exact location of a leak — whether it's in a water supply pipe, under a concrete slab, or behind a tiled bathroom wall — before we lift a single tile or break a single wall.</p><p>Our residential leak detection service covers:</p><ul><li><strong>Slab Leak Detection</strong> — Locating pressurised pipe leaks beneath concrete floors without unnecessary breaking.</li><li><strong>Wall & Ceiling Leaks</strong> — Tracing moisture ingress and pipe failures hidden inside your walls or ceiling cavities.</li><li><strong>Water Supply Line Leaks</strong> — Finding leaks on your main supply line between the meter and your home.</li><li><strong>Bathroom & Kitchen Leaks</strong> — Identifying leaking pipes, connections, and fittings behind fixtures and fittings.</li><li><strong>Drain & Waste Pipe Leaks</strong> — Locating cracks or joint failures in your drainage system.</li></ul><p>Once we've found the leak, we repair it using quality materials and back every repair with our 2-year workmanship guarantee. We serve homeowners across Cape Town's Northern and Southern Suburbs, Somerset West, Strand, Stellenbosch, and surrounding areas.</p>",
      whatWeCover: [
              {
                      "title": "Slab Leak Detection",
                      "description": "We locate pressurised pipe leaks beneath concrete slabs using acoustic technology — minimising the need to break up your floors."
              },
              {
                      "title": "Wall & Ceiling Leaks",
                      "description": "Using thermal imaging and moisture meters, we trace the source of damp patches and hidden pipe failures inside walls and ceilings."
              },
              {
                      "title": "Water Supply Line Leaks",
                      "description": "We detect and repair leaks on the main water supply line between your street meter and your home's internal plumbing."
              },
              {
                      "title": "Bathroom & Kitchen Pipe Leaks",
                      "description": "We find leaking pipes, joints, and connections hidden behind tiles, fixtures, and cabinetry without unnecessary demolition."
              }
      ],
      whyChooseUs: [
              {
                      "bold": "Non-invasive technology",
                      "text": "— we find the leak before we break anything, saving you time and unnecessary repair costs."
              },
              {
                      "bold": "Qualified and licensed",
                      "text": "— all work is carried out by certified plumbers with over 5 years of hands-on experience."
              },
              {
                      "bold": "2-year workmanship guarantee",
                      "text": "— we back every repair we make, giving you real peace of mind."
              },
              {
                      "bold": "Fast response",
                      "text": "— we understand that a leak doesn't wait, and neither do we."
              }
      ],
    },
    {
      title: "Commercial Leak Detection",
      slug: "commercial-leak-detection",
      description: "A water leak on a commercial property means downtime, property damage, and inflated water costs. We work efficiently across retail, office, and hospitality environments to detect and resolve leaks with minimal disruption to your operations.",
      shortDescription: "Fast, accurate leak detection for Cape Town's commercial properties — with minimal business disruption.",
      features: ["Non-invasive detection across large floor plans","After-hours and weekend availability","Suitable for retail, office, and hospitality environments","2-year workmanship guarantee"],
      faqs: [
              {
                      "question": "Can you work outside of business hours to avoid disrupting my operations?",
                      "answer": "Yes. We understand that commercial environments often can't afford downtime during trading hours. Contact us on (079) 540-1802 to discuss scheduling options that work for your business."
              },
              {
                      "question": "How much does commercial leak detection cost?",
                      "answer": "Commercial leak detection is priced based on the size of the property, the complexity of the pipe network, and the nature of the suspected leak. Call us for a free, transparent quote before we start any work."
              },
              {
                      "question": "Our municipal water bill has spiked but we can't see any obvious leak — can you help?",
                      "answer": "Yes, this is one of the most common reasons commercial clients call us. A concealed supply line leak or a slow slab leak can cause significant water loss without any visible signs. We'll carry out a thorough investigation to find the source."
              }
      ],
      heroSubtitle: "Commercial leak detection across Cape Town — accurate, efficient, and business-friendly.",
      longDescription: "<p>Water leaks on commercial properties are costly. Beyond the water bill, a leak left undetected can damage stock, compromise structural integrity, disrupt tenants, and create liability risks. Core Leak Detection works with commercial property owners, property managers, and business owners across Cape Town to find and fix leaks quickly — using non-invasive technology that keeps your operations running.</p><p>Our commercial leak detection service includes:</p><ul><li><strong>Supply Line & Mains Leak Detection</strong> — Identifying high-pressure leaks on your commercial water supply lines, including metered connections.</li><li><strong>Underfloor Leak Detection</strong> — Locating slab and screed leaks beneath commercial flooring without unnecessary demolition.</li><li><strong>Bulk Water Loss Investigation</strong> — Systematic pressure testing and flow analysis to pinpoint where water is being lost on large sites.</li><li><strong>Ablution & Bathroom Block Leaks</strong> — Tracing leaks from high-use bathroom and kitchen facilities common in commercial buildings.</li><li><strong>Pipe Network Assessment</strong> — A full review of your visible and concealed plumbing to identify vulnerabilities before they become emergencies.</li></ul><p>We service commercial properties across Cape Town's Northern and Southern Suburbs, Somerset West, Strand, Stellenbosch, and surrounding areas. All repairs carry our 2-year workmanship guarantee.</p>",
      whatWeCover: [
              {
                      "title": "Supply Line & Mains Leak Detection",
                      "description": "We locate leaks on your commercial water supply and metered connections, helping you cut bulk water losses fast."
              },
              {
                      "title": "Underfloor Leak Detection",
                      "description": "Using pressure testing and acoustic equipment, we find leaks beneath commercial floor slabs and screeds with minimal disruption."
              },
              {
                      "title": "Bulk Water Loss Investigation",
                      "description": "For larger commercial properties, we carry out systematic flow and pressure analysis to identify where significant water losses are occurring."
              },
              {
                      "title": "Ablution & Kitchen Facility Leaks",
                      "description": "We trace and repair leaks in high-use commercial bathroom and kitchen plumbing, reducing ongoing water waste."
              }
      ],
      whyChooseUs: [
              {
                      "bold": "Minimal business disruption",
                      "text": "— our non-invasive approach means we find the problem with the least possible impact on your operations."
              },
              {
                      "bold": "Experienced across property types",
                      "text": "— we've worked in retail centres, office parks, hospitality venues, and multi-unit developments."
              },
              {
                      "bold": "Licensed and qualified",
                      "text": "— all work meets South African plumbing standards and is carried out by certified professionals."
              },
              {
                      "bold": "2-year guarantee",
                      "text": "— every repair is backed by our workmanship guarantee for your peace of mind."
              }
      ],
    },
    {
      title: "Industrial Leak Detection",
      slug: "industrial-leak-detection",
      description: "Industrial plumbing systems run under high pressure across complex pipe networks. We use advanced leak detection methods to identify failures in industrial pipelines, process lines, and water reticulation systems — quickly and accurately.",
      shortDescription: "Advanced leak detection for industrial pipe networks, process lines, and water reticulation systems in Cape Town.",
      features: ["High-pressure pipeline leak detection","Process and reticulation system assessment","Qualified for industrial environments","2-year workmanship guarantee"],
      faqs: [
              {
                      "question": "Can you detect leaks in a system that's still running?",
                      "answer": "In many cases, yes. Our acoustic detection technology can identify leak signatures in pressurised lines without requiring a full system shutdown. We'll assess the situation and advise on the safest, most efficient approach for your facility."
              },
              {
                      "question": "How much does industrial leak detection cost?",
                      "answer": "Industrial projects vary considerably in scope, pipe network complexity, and site access requirements. We provide detailed, transparent quotes after an initial site assessment. Call (079) 540-1802 to arrange a consultation."
              }
      ],
      heroSubtitle: "Industrial-grade leak detection across Cape Town's Western Cape facilities — accurate, compliant, and efficient.",
      longDescription: "<p>Industrial facilities operate under conditions that put significant strain on plumbing infrastructure — high pressure, temperature variation, chemical exposure, and continuous use. When a leak develops in an industrial pipe network, the consequences can include production downtime, water loss, safety risks, and regulatory compliance issues. Core Leak Detection provides professional leak detection services built for these environments.</p><p>Our industrial leak detection services cover:</p><ul><li><strong>High-Pressure Pipeline Leak Detection</strong> — Using acoustic and pressure-based technology to locate leaks in industrial supply and process lines without shutting down the full system.</li><li><strong>Water Reticulation System Assessment</strong> — Identifying losses across large-scale reticulation networks on industrial and manufacturing sites.</li><li><strong>Underground Pipeline Tracing</strong> — Locating and mapping buried pipelines before excavating or repairing subsurface infrastructure.</li><li><strong>Process Line Integrity Checks</strong> — Assessing the condition of process-connected plumbing to prevent unplanned failures.</li><li><strong>Emergency Leak Response</strong> — Fast mobilisation when an industrial leak threatens production or safety.</li></ul><p>We serve industrial clients across Cape Town and the broader Western Cape. All work is carried out by qualified, licensed plumbers and backed by our 2-year workmanship guarantee.</p>",
      whatWeCover: [
              {
                      "title": "High-Pressure Pipeline Leak Detection",
                      "description": "We locate leaks in high-pressure industrial supply and process lines using acoustic and pressure-differential technology."
              },
              {
                      "title": "Water Reticulation System Assessment",
                      "description": "We identify water losses across large industrial reticulation networks, helping facilities cut costs and meet compliance requirements."
              },
              {
                      "title": "Underground Pipeline Tracing",
                      "description": "We locate and map buried pipelines before repair or excavation — reducing guesswork and minimising ground disruption."
              },
              {
                      "title": "Emergency Leak Response",
                      "description": "When a leak threatens your facility's production or safety, we respond fast and get the problem contained and resolved."
              }
      ],
      whyChooseUs: [
              {
                      "bold": "Industrial experience",
                      "text": "— we understand the demands of high-pressure systems and complex pipe networks in industrial environments."
              },
              {
                      "bold": "Advanced detection technology",
                      "text": "— we use the latest equipment to pinpoint leaks accurately without unnecessary system shutdowns."
              },
              {
                      "bold": "Fully qualified and licensed",
                      "text": "— all work meets South African plumbing regulations and industry standards."
              },
              {
                      "bold": "2-year workmanship guarantee",
                      "text": "— we stand behind every repair we carry out on your facility."
              }
      ],
    },
    {
      title: "Pool Leak Detection",
      slug: "pool-leak-detection",
      description: "Losing water in your pool isn't always evaporation. A structural crack or failing fitting can waste thousands of litres a month. We use specialist techniques to find exactly where your pool is leaking — without draining it unnecessarily.",
      shortDescription: "Specialist pool leak detection across Cape Town — find the source without draining your pool.",
      features: ["Pressure testing of return and suction lines","Structural crack and fitting leak detection","Dye testing for precise location","2-year workmanship guarantee"],
      faqs: [
              {
                      "question": "How do I know if my pool is leaking or just losing water to evaporation?",
                      "answer": "A simple bucket test can help. Place a bucket of water on your pool steps, mark both the pool water level and the bucket water level, and compare after 24 hours. If the pool has dropped more than the bucket, you likely have a leak. Call us and we'll investigate properly."
              },
              {
                      "question": "How much does pool leak detection cost?",
                      "answer": "Pool leak detection costs depend on the size of the pool, whether the leak is structural or in the plumbing, and the complexity of the pipe network. Contact us on (079) 540-1802 for a free quote."
              },
              {
                      "question": "Do you need to drain the pool to find the leak?",
                      "answer": "Not always. We use dye testing and underwater inspection techniques that allow us to locate many leaks with the pool still full. We'll only recommend draining if it's genuinely necessary to carry out the repair."
              }
      ],
      heroSubtitle: "Pool leak detection across Cape Town — accurate diagnosis, effective repairs.",
      longDescription: "<p>If your pool is losing more than 5mm of water per day — beyond what evaporation accounts for — you likely have a leak. Left unaddressed, pool leaks waste enormous volumes of water, erode the surrounding soil, compromise your pool's structural integrity, and push up your municipal water costs. Core Leak Detection uses specialist pool leak detection techniques to find the exact source and repair it properly.</p><p>Our pool leak detection service covers:</p><ul><li><strong>Pressure Testing of Plumbing Lines</strong> — Isolating and pressure-testing your pool's return lines, suction lines, and backwash lines to identify pipe failures and joint leaks.</li><li><strong>Structural Leak Detection</strong> — Inspecting pool shells for cracks, coping joint failures, and bond beam leaks using dye testing and visual inspection.</li><li><strong>Fitting & Skimmer Leak Detection</strong> — Checking all pool fittings, skimmer boxes, return jets, and light fittings for water ingress points.</li><li><strong>Equipment Pad Leak Checks</strong> — Assessing pump, filter, and valve connections for leaks at the equipment level.</li><li><strong>Repair & Sealing</strong> — Once located, we repair structural cracks, replace faulty fittings, and reseal plumbing connections to stop the leak at its source.</li></ul><p>We service residential and commercial pools across Cape Town and the Western Cape, including Somerset West, Strand, and Stellenbosch.</p>",
      whatWeCover: [
              {
                      "title": "Pool Plumbing Line Pressure Testing",
                      "description": "We pressure-test your pool's return and suction lines to pinpoint pipe failures and leaking joints without unnecessary excavation."
              },
              {
                      "title": "Structural Crack & Shell Leak Detection",
                      "description": "Using dye testing and close inspection, we locate cracks, bond beam failures, and coping joint leaks in your pool shell."
              },
              {
                      "title": "Fitting & Skimmer Box Leaks",
                      "description": "We check all pool fittings, skimmer boxes, return jets, and underwater light fittings for water ingress — common sources of hidden pool water loss."
              },
              {
                      "title": "Equipment Pad & Pump Connections",
                      "description": "We inspect and repair leaking pump, filter, and valve connections at the equipment pad to stop water loss at the circulation system level."
              }
      ],
      whyChooseUs: [
              {
                      "bold": "Specialist pool leak detection methods",
                      "text": "— we use dye testing, pressure testing, and acoustic equipment to find pool leaks accurately."
              },
              {
                      "bold": "No unnecessary draining",
                      "text": "— our methods allow us to locate most pool leaks without emptying the pool first."
              },
              {
                      "bold": "Detection and repair",
                      "text": "— we don't just find the leak, we fix it. One team, start to finish."
              },
              {
                      "bold": "2-year workmanship guarantee",
                      "text": "— every pool repair we carry out is backed by our guarantee."
              }
      ],
    },
    {
      title: "Geyser Repairs",
      slug: "geyser-repairs",
      description: "A faulty geyser means cold showers, water damage, and rising electricity costs. We diagnose and repair geyser faults quickly — from element and thermostat replacements to pressure valve failures and burst geysers.",
      shortDescription: "Fast geyser repairs across Cape Town — elements, thermostats, pressure valves, and more.",
      features: ["Element and thermostat replacement","Pressure valve and drip tray repairs","Burst geyser assessment and repair","2-year workmanship guarantee"],
      faqs: [
              {
                      "question": "How do I know if my geyser needs to be repaired or replaced?",
                      "answer": "It depends on the age of the unit, the type of fault, and the condition of the tank. If the tank itself has corroded or burst beyond repair, replacement is usually more cost-effective. If it's an element, thermostat, or valve issue, a repair is often the right move. We'll give you an honest assessment — call (079) 540-1802."
              },
              {
                      "question": "How much does a geyser repair cost?",
                      "answer": "The cost varies depending on the fault, the parts required, and the geyser's location on your property. We provide a clear quote before carrying out any work. Contact us for a free assessment."
              },
              {
                      "question": "My geyser pressure valve is dripping constantly — is this dangerous?",
                      "answer": "A dripping T&P or pressure relief valve is a sign that something isn't right — it could be high incoming pressure, an overheating thermostat, or a failing valve. It's worth getting it checked promptly, as it can escalate. Call us and we'll diagnose it quickly."
              }
      ],
      heroSubtitle: "Reliable geyser repairs across Cape Town — diagnosed correctly and fixed properly.",
      longDescription: "<p>Your geyser is one of the hardest-working appliances in your home, and when it fails, you feel it immediately. Whether you're dealing with no hot water, a dripping pressure valve, a leaking tank, or a geyser that's tripping your circuit breaker, Core Leak Detection can diagnose the fault and repair it correctly — fast.</p><p>Our geyser repair service covers:</p><ul><li><strong>Element Replacement</strong> — Replacing failed heating elements that leave you with cold water, without replacing the entire unit when it isn't necessary.</li><li><strong>Thermostat Replacement</strong> — Diagnosing and replacing faulty thermostats causing overheating, no hot water, or excessive electricity consumption.</li><li><strong>Pressure Reducing Valve (PRV) Repair</strong> — Fixing or replacing PRVs that are dripping or failing to regulate incoming water pressure correctly.</li><li><strong>Temperature & Pressure Relief (T&P) Valve Repair</strong> — Addressing T&P valves that are leaking, blocked, or not functioning safely.</li><li><strong>Drip Tray and Overflow Pipe Repairs</strong> — Ensuring your geyser's safety components are correctly installed and draining properly.</li><li><strong>Burst Geyser Assessment</strong> — Assessing tank damage after a geyser burst and advising on repair vs. replacement based on the actual condition of the unit.</li></ul><p>We carry out geyser repairs on all major brands across Cape Town, Somerset West, Strand, Stellenbosch, and surrounding areas. All repair work is backed by our 2-year workmanship guarantee.</p>",
      whatWeCover: [
              {
                      "title": "Element & Thermostat Replacement",
                      "description": "We replace failed heating elements and faulty thermostats to restore hot water without unnecessarily replacing your entire geyser."
              },
              {
                      "title": "Pressure Valve Repairs",
                      "description": "We repair or replace PRVs and T&P valves that are dripping, failing, or creating safety risks in your hot water system."
              },
              {
                      "title": "Burst Geyser Assessment",
                      "description": "After a geyser burst, we assess the extent of the damage and provide honest advice on whether repair or replacement is the right call."
              },
              {
                      "title": "Drip Tray & Overflow Pipe Repairs",
                      "description": "We ensure your geyser's safety drainage components are correctly installed, clear, and draining to the correct point."
              }
      ],
      whyChooseUs: [
              {
                      "bold": "Accurate diagnosis first",
                      "text": "— we identify the actual fault before recommending repairs, so you're not paying for parts you don't need."
              },
              {
                      "bold": "All major brands",
                      "text": "— we repair geysers across all common South African brands and tank sizes."
              },
              {
                      "bold": "Fast response",
                      "text": "— we know a broken geyser can't wait, and we prioritise getting you back to hot water quickly."
              },
              {
                      "bold": "2-year workmanship guarantee",
                      "text": "— every repair is guaranteed so you can have confidence in the work we carry out."
              }
      ],
    },
    {
      title: "Geyser Installations",
      slug: "geyser-installations",
      description: "Replacing an old geyser or upgrading to a more efficient unit? We handle full geyser installations across Cape Town — including standard electrical geysers and heat pump systems — correctly sized, correctly installed, and fully compliant.",
      shortDescription: "Professional geyser installations across Cape Town — compliant, correctly sized, and guaranteed.",
      features: ["Standard and heat pump geyser installations","Full compliance with South African plumbing regulations","Correct sizing advice based on household needs","2-year workmanship guarantee"],
      faqs: [
              {
                      "question": "What size geyser do I need for my home?",
                      "answer": "The right size depends on the number of people in your household, your typical hot water usage patterns, and the size of your property. As a general guide, a 100-litre unit suits 1–2 people, 150 litres for 2–3, and 200 litres for families of 3–5. We'll advise you on the correct size when we assess your installation. Call (079) 540-1802."
              },
              {
                      "question": "How much does a geyser installation cost?",
                      "answer": "Installation costs depend on the type and size of unit, whether it's a straight replacement or a relocation, and the extent of plumbing work required. We provide transparent, itemised quotes before any work starts. Contact us for a free assessment."
              },
              {
                      "question": "Do I need a certificate of compliance after a geyser installation?",
                      "answer": "Yes. In South Africa, any new geyser installation requires a Plumbing Certificate of Compliance (CoC). As licensed plumbers, we issue the necessary compliance documentation with every installation we carry out."
              },
              {
                      "question": "How long does a geyser installation take?",
                      "answer": "A standard replacement geyser installation typically takes between 2 and 4 hours, depending on access and whether any additional plumbing work is required. We'll give you a realistic timeframe when we assess the job."
              }
      ],
      heroSubtitle: "Geyser installations across Cape Town — done right, fully compliant, and backed by a guarantee.",
      longDescription: "<p>A geyser installation isn't just about swapping one tank for another. The right installation depends on the correct sizing for your household or business, proper positioning, appropriate pressure management, compliant safety valve installation, and a correctly fitted drip tray and overflow pipe. Get it wrong and you're looking at premature geyser failure, voided warranties, and potential insurance complications.</p><p>Core Leak Detection handles full geyser installations across Cape Town, ensuring every unit is correctly specified, installed to South African plumbing standards, and ready to run efficiently from day one.</p><p>Our geyser installation service includes:</p><ul><li><strong>Standard Electrical Geyser Installation</strong> — Supply and installation of new electrical geysers, including all plumbing connections, PRV, T&P valve, drip tray, and overflow pipe.</li><li><strong>Heat Pump Geyser Installation</strong> — Installation of heat pump water heaters for clients wanting to reduce electricity consumption without fully switching to solar.</li><li><strong>Geyser Replacement</strong> — Removing your old unit and installing a new one in the same position, with all safety components updated to current standards.</li><li><strong>Geyser Relocation</strong> — Moving a geyser to a new position where space or access requirements have changed.</li><li><strong>Pressure Reducing Valve Installation</strong> — Fitting a PRV on your incoming supply to protect your new geyser from high-pressure damage.</li><li><strong>Drip Tray and Overflow Pipe Installation</strong> — Ensuring all safety drainage components are correctly fitted and draining to a safe external point.</li></ul><p>We install geysers across Cape Town's Northern and Southern Suburbs, Somerset West, Strand, Stellenbosch, and surrounding areas. All installations carry our 2-year workmanship guarantee.</p>",
      whatWeCover: [
              {
                      "title": "Standard Electrical Geyser Installation",
                      "description": "Full installation of your new electrical geyser, including all plumbing connections, pressure valves, drip tray, and overflow pipe — compliant with South African regulations."
              },
              {
                      "title": "Heat Pump Geyser Installation",
                      "description": "We install heat pump water heaters for clients looking to cut electricity costs, handling all plumbing connections and ensuring the system is correctly integrated."
              },
              {
                      "title": "Geyser Replacement",
                      "description": "We remove your old unit and install a correctly sized replacement, updating all safety components to current standards in the process."
              },
              {
                      "title": "Pressure Reducing Valve & Safety Component Fitting",
                      "description": "We fit PRVs, T&P valves, drip trays, and overflow pipes to the required standard — protecting your new geyser and keeping your installation compliant."
              }
      ],
      whyChooseUs: [
              {
                      "bold": "Correct sizing from the start",
                      "text": "— we assess your household or business hot water demand and recommend the right unit, not just the nearest available option."
              },
              {
                      "bold": "Fully compliant installations",
                      "text": "— all our geyser installations meet South African National Standards (SANS) requirements."
              },
              {
                      "bold": "Licensed plumbers",
                      "text": "— geyser installations must be carried out by a licensed plumber. We're qualified to do it correctly."
              },
              {
                      "bold": "2-year workmanship guarantee",
                      "text": "— your installation is guaranteed, giving you complete confidence in the quality of the work."
              }
      ],
    }
  ],

  // Homepage — REPLACE WITH CLIENT CONTENT
  homepage: {
    title: "Home",
    metaTitle: "Core Leak Detection | Plumbers & Leak Detection in Cape Town",
    metaDescription: "Cape Town's trusted leak detection and plumbing specialists. Residential, commercial & industrial. 2-year workmanship guarantee. Call (079) 540-1802 today.",
    heroTitle: "Core Leak Detection — Cape Town's Trusted Leak Detection & Plumbing Specialists", // MUST include company name + city for SEO
    heroSubtitle: "From hidden pipe leaks to geyser installations, we find and fix plumbing problems fast — across Cape Town's Northern and Southern Suburbs, Somerset West, Strand, Stellenbosch, and beyond.",
    heroBadges: ["Years of Experience", "Licensed", "Fast Response"],
    whyChooseTitle: "Why Choose Core Leak Detection",
    whyChooseSubtitle: "Qualified, licensed, and backed by a 2-year workmanship guarantee — we get it right the first time.",
    whyChooseCards: [
      {
        icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
        title: "Experienced",
        description: "Years of hands-on expertise serving residential and commercial customers.",
      },
      {
        icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
        title: "Qualified",
        description: "Fully qualified and licensed. All work meets industry standards.",
      },
      {
        icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
        title: "Responsive",
        description: "Fast response times. We are here when you need us.",
      },
      {
        icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
        title: "Affordable",
        description: "Competitive, transparent pricing. No hidden costs.",
      },
    ],
    faqs: [
      { question: "How quickly can you respond?", answer: "We aim to respond to all enquiries promptly. Contact us today." },
      { question: "What areas do you serve?", answer: "We serve the greater area and surrounding suburbs." },
      { question: "How do I get a quote?", answer: "Call or WhatsApp us with details of the job and we'll provide a quote." },
    ],
    // Service areas — max 5 major areas/suburbs shown on homepage
    serviceAreasTitle: "Areas We Serve",
    serviceAreasSubtitle: "Professional services across your area and surrounding suburbs.",
    serviceAreas: [
      { name: "Area One", suburbs: "Suburb A, Suburb B, Suburb C" },
      { name: "Area Two", suburbs: "Suburb D, Suburb E, Suburb F" },
      { name: "Area Three", suburbs: "Suburb G, Suburb H, Suburb I" },
    ],
    // Gallery / Recent Jobs
    galleryTitle: "Our Recent Work",
    gallerySubtitle: "See the quality of our workmanship.",
  },

  // About page — REPLACE WITH CLIENT CONTENT
  about: {
    metaTitle: "About Core Leak Detection | Leak Detection Cape Town",
    metaDescription: "Meet the team behind Core Leak Detection — Cape Town's qualified leak detection specialists since 2020. Call (079) 540-1802.",
    heroTitle: "About Core Leak Detection",
    heroSubtitle: "Serving Cape Town with quality workmanship since 2020",
    heading: "Our Story",
    paragraphs: [
    "Core Leak Detection was founded in 2020 by Stephan Le Roux with a straightforward goal: give Cape Town homeowners, businesses, and industrial clients a plumbing and leak detection service they can actually rely on. Based in the Western Cape, we cover Cape Town's Northern and Southern Suburbs, Somerset West, Strand, Stellenbosch, and the surrounding areas — handling everything from a stubborn hidden pipe leak to a full geyser installation.",
    "What sets us apart is simple: we treat every job as if it were our own property. We use the latest leak detection technology and methods to find problems accurately and fix them properly — no guesswork, no unnecessary damage. Our work is backed by a 2-year workmanship guarantee, and our team is fully qualified and licensed. Over five years in the trade has given us the experience to handle residential, commercial, industrial, and pool leak detection projects with the same attention to detail every time."
],
    badge: "Est. 2000",
    stats: [
      { value: "10+", label: "Years Experience" },
      { value: "500+", label: "Happy Clients" },
      { value: "Licensed", label: "Qualified Team" },
    ],
  },

  // Contact page — REPLACE WITH CLIENT CONTENT
  contact: {
    metaTitle: "Contact Core Leak Detection | Phone & WhatsApp Cape Town",
    metaDescription: "Get in touch with Core Leak Detection for plumbing and leak detection in Cape Town. Call or WhatsApp (079) 540-1802 for a free quote today.",
    heroTitle: "Contact Core Leak Detection",
    heroSubtitle: "Get in touch for a free quote — call us today",
    hours: {
      standard: { label: "Business Hours", days: "Monday - Friday", hours: "8:00 AM - 5:00 PM" },
      emergency: { label: "Weekend", days: "Saturday", hours: "9:00 AM - 1:00 PM" },
    },
    faqs: [
      { question: "What is the fastest way to reach you?", answer: "Call us directly for the fastest response." },
      { question: "How do I get a quote?", answer: "Call or WhatsApp us and we'll provide a quote based on your needs." },
    ],
  },

  // Reviews — REPLACE WITH CLIENT REVIEWS
  reviews: {
    metaTitle: "Customer Reviews | Core Leak Detection Cape Town",
    metaDescription: "See what Cape Town clients say about Core Leak Detection's plumbing and leak detection services. Trusted, qualified, and guaranteed. Call (079) 540-1802.",
    averageRating: 5,
    totalReviews: 0,
    sourceSummary: "Reviews coming soon",
    items: [],
  },

  // Services overview page
  servicesPage: {
    metaTitle: "Our Services | Core Leak Detection Cape Town",
    metaDescription: "Leak detection, geyser repairs & installations across Cape Town. Residential, commercial & industrial. Call (079) 540-1802.",
    heroTitle: "Our Services",
    heroSubtitle: "Professional services across Cape Town and surrounding areas",
  },

  // Legal
  legal: {
    registrations: ["Licensed and qualified", "Insured"],
    servicesList: [
      "Residential Leak Detection",
      "Commercial Leak Detection",
    ],
  },
};

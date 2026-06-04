import type { Provider } from "./types";
import { HOMEPRO_ID, EVENTLY_ID } from "./tenants";

export interface SeedDoc {
  source: string; // one of: "profile" | "reviews" | "service_notes"
  content: string; // 80-160 words of realistic prose, plain text, no markdown
}
export interface SeedProvider extends Provider {
  docs: SeedDoc[]; // exactly 3 docs: profile, reviews, service_notes
}

export const SEED_PROVIDERS: SeedProvider[] = [
  // ── HomePro providers (8) ────────────────────────────────────────────────────

  {
    id: "aaaa0001-0000-4000-8000-000000000001",
    tenant_id: HOMEPRO_ID,
    name: "Rapid Flow Plumbing",
    blurb: "Licensed master plumber serving Central and South Austin since 2009. Burst pipes, slab leaks, and full repiping.",
    services: ["plumbing"],
    price_tier: 2,
    service_areas: ["austin_central", "austin_south"],
    available_emergency: true,
    response_time_hours: 2,
    rating: 4.8,
    years_experience: 15,
    docs: [
      {
        source: "profile",
        content: "Rapid Flow Plumbing is a licensed master plumbing company based in Austin, Texas, with 15 years of residential and light-commercial experience. We specialize exclusively in plumbing: burst-pipe repair, slab leak detection, water heater replacement, and whole-house repiping. Our primary service zones are Austin Central and Austin South. We offer 24/7 emergency callouts with a two-hour guaranteed response window for active leaks and water-damage situations. All technicians hold a Texas master plumber license and carry full liability insurance. Flat-rate pricing falls in the mid-range band, and we provide written estimates before any work begins.",
      },
      {
        source: "reviews",
        content: "\"Rapid Flow showed up at 1 a.m. when our water main burst. Fixed and cleaned up in under three hours. Worth every penny.\" — Sarah M., Travis Heights. \"I called four plumbers on a Sunday. Rapid Flow was the only one who picked up and actually came out. True emergency service.\" — James K., Bouldin Creek. \"Honest pricing, no upsells. They found the slab leak with acoustic equipment instead of just jackhammering blindly. Saved us thousands.\" — Priya N., South Congress. Average response time across our last 200 emergency jobs: 1 hour 47 minutes.",
      },
      {
        source: "service_notes",
        content: "Rapid Flow handles emergency plumbing only — we do not take scheduled handyman or electrical work. For after-hours emergency calls, the dispatcher answers within 15 minutes. Slab-leak detection uses electronic amplification and thermal imaging, minimizing concrete removal. Water heater installs are same-day when parts are in stock. We stock Rheem and Bradford White units on the truck. Pricing tier 2: typical residential repair runs $150-$450; full repipes quoted per linear foot. Payment accepted by card, check, or financing through GreenSky. We do not subcontract; every tech is a W-2 employee.",
      },
    ],
  },

  {
    id: "aaaa0002-0000-4000-8000-000000000002",
    tenant_id: HOMEPRO_ID,
    name: "Volt Masters Electric",
    blurb: "Full-service electrical contractor in North Austin. Panel upgrades, EV chargers, and code-compliance work.",
    services: ["electrical"],
    price_tier: 3,
    service_areas: ["austin_north", "round_rock"],
    available_emergency: true,
    response_time_hours: 3,
    rating: 4.7,
    years_experience: 12,
    docs: [
      {
        source: "profile",
        content: "Volt Masters Electric is a TECL-licensed electrical contractor operating in North Austin and Round Rock with 12 years in the trade. We focus exclusively on electrical work: residential panel upgrades, EV charger installation, whole-house rewiring, and code-compliance inspections. We maintain 24/7 emergency availability for situations involving exposed wiring, tripped breakers that will not reset, or power loss after storm damage. Our pricing sits in the premium-mid band, reflecting master-electrician labor rather than journeyman crews. All permits are pulled in-house; we coordinate inspections directly with the city. Response time for emergency calls averages three hours.",
      },
      {
        source: "reviews",
        content: "\"Panel upgrade done in a single day. The inspector passed it on the first visit.\" — Derek O., Pflugerville. \"Called them on a Saturday night when my kitchen lost power before a big dinner party. They diagnosed a double-tapped breaker and fixed it within the hour.\" — Megan T., Domain area. \"Volt Masters installed our Tesla Wall Connector and handled all the permit paperwork. Straightforward, fast, and no surprise charges.\" — Carlos V., Round Rock. \"Very professional crew. They labeled every circuit in the panel, which the previous electrician had never done.\" — Linda H., North Lamar.",
      },
      {
        source: "service_notes",
        content: "Volt Masters does not perform plumbing, HVAC, or handyman services. Emergency call-out fee applies after 8 p.m. and on weekends; fee is waived if the repair total exceeds $500. EV charger installs require a load-calculation worksheet completed before scheduling. We stock Level 2 chargers from ChargePoint and Leviton; customer-supplied units are also accepted. Panel upgrades from 100A to 200A or 400A are our most common service. Permit fees passed through at cost. We operate in North Austin zip codes and Round Rock; requests outside these zones are referred to partner shops.",
      },
    ],
  },

  {
    id: "aaaa0003-0000-4000-8000-000000000003",
    tenant_id: HOMEPRO_ID,
    name: "CoolBreeze HVAC",
    blurb: "NATE-certified HVAC specialists covering all Austin zones. AC tune-ups, full system replacements, and duct sealing.",
    services: ["hvac"],
    price_tier: 2,
    service_areas: ["austin_central", "austin_north", "austin_south"],
    available_emergency: true,
    response_time_hours: 4,
    rating: 4.6,
    years_experience: 10,
    docs: [
      {
        source: "profile",
        content: "CoolBreeze HVAC is a NATE-certified heating and cooling contractor serving Central, North, and South Austin for a decade. We handle everything in the HVAC category: seasonal tune-ups, refrigerant recharges, compressor and coil replacements, and full Carrier or Trane system installations. Emergency same-day service is available year-round; during peak summer months we guarantee a four-hour response window for no-cool calls. Our pricing is mid-range: we compete on transparency, publishing our flat-rate menu online. Financing is available through Synchrony for system replacements above $3,000.",
      },
      {
        source: "reviews",
        content: "\"Our AC died on a 103-degree July afternoon. CoolBreeze had a tech at our door in under four hours. He had the part on the truck and we were cool again by evening.\" — Tamara W., Hyde Park. \"Annual tune-up caught a failing capacitor before it became an emergency. Honest and thorough.\" — Bill S., Allandale. \"Replaced a 15-year-old unit with a Carrier two-stage. Quieter, lower electric bill, and the install crew was immaculate.\" — Ana R., South Lamar. \"Best HVAC company I have tried in Austin. They actually explain what they find.\" — Kevin D., Windsor Park.",
      },
      {
        source: "service_notes",
        content: "CoolBreeze covers HVAC only — no plumbing or electrical panel work, though we coordinate with licensed electricians for dedicated circuit installs. Emergency call priority during June through September: same-day dispatch guaranteed for systems under warranty; next-day for out-of-warranty. Duct sealing with Aeroseal is offered as an add-on for homes with duct leakage above 15 percent. We do not service window units or mini-splits older than 2010. Maintenance agreements available at $149 per year, covering two tune-ups and priority scheduling. Service area encompasses all Austin Central, North, and South zip codes; Round Rock requests handled case-by-case.",
      },
    ],
  },

  {
    id: "aaaa0004-0000-4000-8000-000000000004",
    tenant_id: HOMEPRO_ID,
    name: "Apex Roofing Solutions",
    blurb: "Storm-damage and full-replacement roofing contractor in North Austin and Round Rock. Insurance claims welcome.",
    services: ["roofing"],
    price_tier: 3,
    service_areas: ["austin_north", "round_rock"],
    available_emergency: false,
    response_time_hours: 48,
    rating: 4.5,
    years_experience: 18,
    docs: [
      {
        source: "profile",
        content: "Apex Roofing Solutions has operated in the Austin metro for 18 years, concentrating on North Austin and Round Rock residential roofing. Our core business is asphalt-shingle replacement after hail or wind events, though we also handle metal roof installs, flat-roof TPO membranes, and skylight replacements. We work directly with all major insurance carriers and assign a dedicated project coordinator to every claim. We do not offer same-day or emergency tarping; our typical scheduling lead time is 48 hours for inspection and one to two weeks for full replacement depending on material availability. Pricing is in the premium-mid tier, reflecting premium CertainTeed shingles and a ten-year workmanship warranty.",
      },
      {
        source: "reviews",
        content: "\"Apex handled my entire State Farm claim start to finish. They documented the damage, submitted the supplement, and I paid only my deductible.\" — Robert J., Brushy Creek. \"The crew showed up exactly when scheduled, finished in one day, and left the yard cleaner than they found it.\" — Susan P., Pflugerville. \"I got three quotes; Apex was not the cheapest but the warranty and GAF Master Elite certification made it an easy choice.\" — Tom B., Cedar Park. \"Had a minor leak on a Tuesday. They came out Thursday, found a flashing issue from the original builder, and patched it same visit.\" — Maria L., North Austin.",
      },
      {
        source: "service_notes",
        content: "Apex Roofing does not offer 24/7 emergency response or after-hours callouts. Temporary tarping for active leaks can be arranged through our partner service at additional cost. We schedule free inspections Monday through Friday, 8 a.m. to 5 p.m. Full replacements require a signed contract and material deposit. We are a GAF Master Elite certified installer, which allows us to offer the enhanced Golden Pledge warranty. We do not perform HVAC, plumbing, or electrical work. Service territory: North Austin and Round Rock; inquiries from other zones referred to trusted partners. Payment by check, ACH, or card; financing via GreenSky.",
      },
    ],
  },

  {
    id: "aaaa0005-0000-4000-8000-000000000005",
    tenant_id: HOMEPRO_ID,
    name: "FixIt Felix Handyman",
    blurb: "Affordable handyman for South Austin and Central. Drywall, fixtures, furniture assembly, and minor repairs.",
    services: ["handyman"],
    price_tier: 1,
    service_areas: ["austin_south", "austin_central"],
    available_emergency: false,
    response_time_hours: 24,
    rating: 4.4,
    years_experience: 8,
    docs: [
      {
        source: "profile",
        content: "FixIt Felix Handyman is a solo-operator home-repair service covering South Austin and Central Austin neighborhoods. With eight years of experience, Felix handles the wide range of tasks that fall between licensed trades: drywall patching, interior door hanging, tile grouting, light fixture and ceiling fan swaps, furniture assembly, weatherstripping, and minor carpentry. Pricing is budget-friendly, typically $65-$95 per hour with no trip charge within his service area. He does not hold a master plumber or electrician license, so he refers those jobs to partner contractors. Scheduling is next-day for most jobs; same-day occasionally available. No after-hours emergency service.",
      },
      {
        source: "reviews",
        content: "\"Felix patched three drywall holes and repainted the wall. You cannot tell anything was ever there.\" — Chloe M., Zilker. \"Super affordable and honest. He told me the ceiling fan wiring needed a licensed electrician and did not try to do it himself. That kind of integrity is rare.\" — Frank B., Bouldin. \"Assembled four IKEA pieces and hung a gallery wall in two hours. Fast, clean, friendly.\" — Yuki T., South Congress. \"My go-to for everything the big contractors will not bother with. Small jobs done right, no attitude.\" — Renee A., Travis Heights. Felix responds to texts within the hour during business hours.",
      },
      {
        source: "service_notes",
        content: "FixIt Felix is not a licensed electrician or plumber and will not perform work that requires a trade license. He does not offer emergency or after-hours service; his hours are 8 a.m. to 6 p.m. Monday through Saturday. Minimum booking is two hours. Jobs requiring permits are referred out. He carries general liability insurance; jobs are not bonded. Accepts Venmo, Zelle, cash, or card with a 3 percent processing fee. Service area: South Austin zip codes 78704, 78745, 78748 and Central Austin 78701, 78703. Travel beyond these areas not available. Typical response: quoted and scheduled within 24 hours of first contact.",
      },
    ],
  },

  {
    id: "aaaa0006-0000-4000-8000-000000000006",
    tenant_id: HOMEPRO_ID,
    name: "AllTrades Austin",
    blurb: "Multi-trade contractor handling plumbing, electrical, and HVAC for North and Central Austin. One call for all three.",
    services: ["plumbing", "electrical", "hvac"],
    price_tier: 3,
    service_areas: ["austin_north", "austin_central"],
    available_emergency: true,
    response_time_hours: 6,
    rating: 4.3,
    years_experience: 20,
    docs: [
      {
        source: "profile",
        content: "AllTrades Austin is a 20-year-old multi-trade contractor staffing licensed plumbers, electricians, and HVAC technicians under one roof. The convenience proposition is clear: one dispatcher, one invoice, and a single point of accountability for jobs that touch multiple systems, such as a kitchen remodel requiring rough-in plumbing, new circuits, and ductwork relocation. Coverage spans North Austin and Central Austin. Emergency service is available 24/7 across all three trades; response time averages six hours given coordination overhead. Pricing is in the upper-mid tier. Project managers oversee every multi-trade job, so coordination does not fall on the homeowner.",
      },
      {
        source: "reviews",
        content: "\"AllTrades handled our whole-house renovation — plumbing, electrical, and HVAC in one pull. Having one contact person for three trades saved enormous headaches.\" — Greg N., Tarrytown. \"They showed up at 3 a.m. when our AC and a circuit both failed after a lightning strike. Two techs, different trades, same truck. Problem solved by morning.\" — Diane P., Hyde Park. \"A bit pricier than hiring each trade separately, but for a complex job the coordination premium is worth it.\" — Lena M., Mueller. \"Responsive dispatcher, professional crews. I will absolutely call them first for any future multi-system work.\" — Patrick H., Windsor Park.",
      },
      {
        source: "service_notes",
        content: "AllTrades Austin staffs TECL-licensed electricians, Texas master plumbers, and NATE-certified HVAC technicians. Emergency dispatch is available around the clock; after-hours surcharge applies. For single-trade jobs, solo-trade specialist firms may offer lower rates. AllTrades is best suited for coordinated multi-system projects. We pull all permits in-house and schedule city inspections. Roofing and general handyman tasks are outside our scope. Payment by card, check, or ACH; financing available for projects over $5,000. Service territory: North Austin and Central Austin only; South Austin and Round Rock handled on a case-by-case basis.",
      },
    ],
  },

  {
    id: "aaaa0007-0000-4000-8000-000000000007",
    tenant_id: HOMEPRO_ID,
    name: "Round Rock Roof & Handyman",
    blurb: "Budget roofing repairs and handyman work in Round Rock and North Austin. No job too small.",
    services: ["roofing", "handyman"],
    price_tier: 1,
    service_areas: ["round_rock", "austin_north"],
    available_emergency: false,
    response_time_hours: 72,
    rating: 4.0,
    years_experience: 6,
    docs: [
      {
        source: "profile",
        content: "Round Rock Roof and Handyman is a small owner-operator business serving Round Rock and North Austin suburbs for six years. The focus is affordable roofing repair — missing shingles, minor leak patches, ridge-cap replacement — alongside general handyman tasks like fence repair, gutter cleaning, caulking, and minor carpentry. This is not a large commercial roofing crew; jobs are scoped for single-story residential homes. Pricing is budget-tier: roofing patch labor starts at $150 flat, handyman at $55 per hour. Lead time is typically 72 hours. No emergency or after-hours service is offered. Owner-operated means direct communication with the person doing the work.",
      },
      {
        source: "reviews",
        content: "\"Lost six shingles in a hailstorm and needed them replaced before the next rain. They came out in three days and charged a fair price.\" — Harold W., Round Rock. \"Not fancy, but reliable and honest. He told me the roof had two good years left and gave me a fair patch price instead of pushing a full replacement.\" — Cindy T., Georgetown area. \"Great handyman for small jobs. Fixed my fence gate and rehung a door that would not close. Very reasonable rate.\" — Marcus F., Pflugerville. One reviewer noted response is slower during peak roofing season (May-September); plan ahead.",
      },
      {
        source: "service_notes",
        content: "Round Rock Roof and Handyman does not perform licensed electrical, plumbing, or HVAC work. No 24/7 emergency service; after-hours calls are not answered. Best suited for non-urgent repairs where budget is the primary driver. Roofing work limited to single-story residential; no commercial or multi-story. Handyman scope: anything not requiring a trade license or building permit. Insurance claims are not coordinated; customers handle claims independently. Service territory: Round Rock and North Austin suburbs within a 15-mile radius of Round Rock. Payment by cash or check only; card payments not accepted. Typical scheduling: 72 hours, longer in storm season.",
      },
    ],
  },

  {
    id: "aaaa0008-0000-4000-8000-000000000008",
    tenant_id: HOMEPRO_ID,
    name: "Elite Comfort Systems",
    blurb: "Premium HVAC and electrical services for South Austin and Round Rock. Energy audits and smart-home integration.",
    services: ["hvac", "electrical"],
    price_tier: 4,
    service_areas: ["austin_south", "round_rock"],
    available_emergency: false,
    response_time_hours: 24,
    rating: 4.9,
    years_experience: 22,
    docs: [
      {
        source: "profile",
        content: "Elite Comfort Systems is a premium HVAC and electrical contractor with 22 years of experience, serving South Austin and Round Rock. We position ourselves at the top of the market: Mitsubishi Diamond Contractor certification for mini-split systems, whole-home energy audits with blower-door testing, and smart-thermostat and lighting-control integration using Lutron and Ecobee platforms. We do not offer emergency or same-day service; our clients book two to four weeks out. All work is performed by senior technicians with 10-plus years of field experience. Pricing is premium-tier, reflecting higher parts quality, longer warranties, and comprehensive post-install support.",
      },
      {
        source: "reviews",
        content: "\"Elite designed and installed a whole-home mini-split system. Perfectly sized, whisper quiet, and our electricity bill dropped 30 percent.\" — Allison B., Barton Hills. \"They found $800 per year in energy waste during the audit and fixed it in a single visit. The audit fee paid for itself in five months.\" — George M., South Austin. \"The most thorough electrical inspection I have ever had. Every circuit labeled, arc-fault breakers added throughout, and a whole-home surge protector installed.\" — Irene S., Round Rock. \"Not cheap, but these are craftsmen, not just technicians. Worth the premium for a forever home.\" — David L., Oak Hill.",
      },
      {
        source: "service_notes",
        content: "Elite Comfort Systems does not offer emergency callouts or after-hours service. Scheduling requires a two-to-four-week lead time; exceptions rare. Plumbing and roofing are outside our scope. Energy audit package ($350) includes blower-door test, thermal imaging, and a written report with prioritized recommendations. All HVAC installs include a two-year labor warranty on top of manufacturer parts warranty. Electrical work includes arc-fault and ground-fault upgrades to current NEC code. Smart-home integration available for Ecobee, Nest, Lutron, and Leviton platforms. Service territory: South Austin and Round Rock; Central and North Austin available for energy-audit projects only. Payment by card or ACH.",
      },
    ],
  },

  // ── Evently providers (8) ────────────────────────────────────────────────────

  {
    id: "bbbb0001-0000-4000-8000-000000000001",
    tenant_id: EVENTLY_ID,
    name: "Harvest Table Catering",
    blurb: "Farm-to-table wedding and corporate catering for Austin Central and Hill Country venues. Fully staffed service.",
    services: ["catering"],
    price_tier: 3,
    service_areas: ["austin_central", "hill_country"],
    available_emergency: false,
    response_time_hours: 48,
    rating: 4.8,
    years_experience: 11,
    docs: [
      {
        source: "profile",
        content: "Harvest Table Catering specializes in farm-to-table menus for weddings, rehearsal dinners, and corporate events in Austin Central and across the Texas Hill Country. We source produce from local farms within 100 miles and partner with two Austin-area ranches for beef and pork. Our service model is fully staffed: uniformed servers, a lead chef on-site, and full setup and teardown. Minimum guest count is 40; maximum is 250. We do not cater last-minute or same-week events; planning calls are required at least three weeks in advance. Pricing is premium-mid, reflecting ingredient quality and full-service labor.",
      },
      {
        source: "reviews",
        content: "\"Every guest told us the food was the best wedding meal they had ever had. The lamb chops and roasted beet salad were extraordinary.\" — Jessica and Ryan T., married at Contigo Ranch. \"Harvest Table coordinated perfectly with our venue and did not need hand-holding. Professional from tasting to breakdown.\" — Lauren K., corporate event planner. \"The seasonal menu they designed around our October wedding was stunning. Guests are still talking about the apple-cider brined pork tenderloin.\" — Amber D., Hill Country wedding. \"They arrived early, set up beautifully, and cleared the tables without disrupting dancing. Seamless.\" — Nadia C., Austin Central venue.",
      },
      {
        source: "service_notes",
        content: "Harvest Table does not offer last-minute catering; three-week minimum lead time is required. We do not provide bar service or alcohol; we can coordinate with licensed bartenders on request. Tastings are offered to booked clients only ($75 per couple, credited to the final invoice). Menu customization for dietary restrictions (vegan, gluten-free, kosher-style) is available with advance notice. We do not serve Hill Country venues beyond a 45-minute drive from Fredericksburg. Rental items (linens, china, specialty furniture) are available through our preferred rental partner. Payment: 30 percent deposit at signing, balance 14 days before the event. No emergency bookings.",
      },
    ],
  },

  {
    id: "bbbb0002-0000-4000-8000-000000000002",
    tenant_id: EVENTLY_ID,
    name: "Shutter & Soul Photography",
    blurb: "Documentary wedding and portrait photography in Austin Central and Round Rock. 10-hour coverage, cinematic edits.",
    services: ["photography"],
    price_tier: 3,
    service_areas: ["austin_central", "round_rock"],
    available_emergency: false,
    response_time_hours: 24,
    rating: 4.9,
    years_experience: 9,
    docs: [
      {
        source: "profile",
        content: "Shutter and Soul Photography is a two-photographer studio in Austin focused exclusively on wedding and portrait documentation. The lead photographer brings nine years of experience shooting in Central Austin venues and the Round Rock suburbs. Our style is candid documentary with cinematic post-processing: true-to-life color, natural light, minimal posing. Standard packages include 10 hours of coverage, two photographers, and a 500-image gallery delivered within six weeks. We book a maximum of 25 weddings per year to protect quality. Pricing is upper-mid. We do not handle last-minute weekend bookings; most dates fill eight to twelve months in advance.",
      },
      {
        source: "reviews",
        content: "\"Our photos captured emotions I did not even know were happening in the moment. Looking at them still makes me cry.\" — Emma and Chris W., Round Rock wedding. \"They were invisible all day but somehow captured every hug, tear, and laugh. That is a skill.\" — Pamela O., Austin Central wedding. \"Six weeks felt long but the gallery was worth every day of waiting. 600 images, all gallery-worthy.\" — Tyrone M., portrait client. \"Professional, easy to communicate with, and they scouted the venue beforehand so they knew every lighting situation.\" — Sandra L., Hyde Park engagement session.",
      },
      {
        source: "service_notes",
        content: "Shutter and Soul does not offer last-minute or same-week bookings for weddings. Portrait sessions may be available with one to two weeks notice depending on calendar. We do not shoot video; for videography we can recommend trusted colleagues. Engagement sessions are included in wedding packages at no extra charge. Raw files are not delivered; only edited gallery images. Second photographer is always included in wedding packages. We travel to Hill Country for an additional travel fee; availability limited. Payment plan available: 25 percent deposit, 50 percent six months before the date, 25 percent one week before. No emergency availability.",
      },
    ],
  },

  {
    id: "bbbb0003-0000-4000-8000-000000000003",
    tenant_id: EVENTLY_ID,
    name: "The Longhorn Loft",
    blurb: "Industrial-chic downtown event venue in Austin Central. Seats 50-300, full AV, in-house catering optional.",
    services: ["venue"],
    price_tier: 3,
    service_areas: ["austin_central"],
    available_emergency: false,
    response_time_hours: 48,
    rating: 4.6,
    years_experience: 7,
    docs: [
      {
        source: "profile",
        content: "The Longhorn Loft is a 6,000-square-foot industrial-chic event venue in downtown Austin, located two blocks from the Convention Center. Exposed brick, Douglas fir beams, and floor-to-ceiling windows define the aesthetic. Capacity ranges from 50 for an intimate seated dinner to 300 for a cocktail reception. The venue includes a full built-in AV package (two large-format projectors, surround sound, wireless microphone system) and a commercial warming kitchen. In-house catering through a preferred caterer is optional; outside licensed caterers are welcome. Minimum booking is four hours on weekends. Pricing is premium-mid. Not available for emergency or same-week bookings.",
      },
      {
        source: "reviews",
        content: "\"The space photographs beautifully. Our corporate launch event looked like a magazine shoot.\" — Marcus R., tech startup. \"Perfect downtown location. Guests could walk from their hotels. The sound system was concert-quality.\" — Brianna T., gala organizer. \"The event coordinator on staff anticipated every need. I felt completely taken care of from load-in to close.\" — Olivia H., nonprofit fundraiser. \"The exposed brick and Edison bulbs gave our anniversary party exactly the warm, urban feel we wanted. Guests raved about the space.\" — Aaron and Melanie D., anniversary event.",
      },
      {
        source: "service_notes",
        content: "The Longhorn Loft requires a minimum 30-day booking lead time for weekend events; weekday availability sometimes shorter. We do not host events with amplified outdoor sound after 10 p.m. due to city ordinance. Outside alcohol is not permitted; all bar service must use our licensed bar staff. Decor is permitted with restrictions: no open flame, no confetti, no fog machines. Load-in begins two hours before the event start. We provide tables and chairs; specialty rentals coordinated through preferred vendors. Parking: 200-space garage adjacent to building at discounted rate for guests. No emergency bookings accepted. Payment: 50 percent deposit, balance 30 days before event.",
      },
    ],
  },

  {
    id: "bbbb0004-0000-4000-8000-000000000004",
    tenant_id: EVENTLY_ID,
    name: "Wildflower Floral Studio",
    blurb: "Romantic, garden-style wedding florals for Hill Country and Austin. Seasonal blooms, arch arrangements, full decor.",
    services: ["floral"],
    price_tier: 2,
    service_areas: ["hill_country", "austin_central"],
    available_emergency: true,
    response_time_hours: 12,
    rating: 4.7,
    years_experience: 8,
    docs: [
      {
        source: "profile",
        content: "Wildflower Floral Studio creates romantic, garden-inspired wedding florals for events in the Texas Hill Country and Austin Central. Lead designer Maya Reyes has eight years of experience specializing in seasonal, locally sourced blooms: bluebonnets in spring, sunflowers in summer, dahlias in fall. Full-service packages include bridal bouquet, bridesmaid bouquets, boutonnieres, ceremony arch installation, and reception centerpieces. Pricing is mid-range, offering custom design without the luxury-tier markup of downtown studios. We hold limited availability for last-minute requests — if a florist cancels close to the event date, contact us and we will do our best to accommodate within 12 hours.",
      },
      {
        source: "reviews",
        content: "\"Maya created the most breathtaking arch I have ever seen at a wedding. Guests stopped to photograph it all evening.\" — Claire and Ben S., Dripping Springs wedding. \"We had a florist cancellation two weeks before our wedding. Wildflower stepped in and exceeded what the original florist had promised.\" — Jordan M., Austin wedding. \"The centerpieces used herbs from our garden mixed with ranunculus. Completely personal and exactly our style.\" — Priya and Arun N., Hill Country wedding. \"Reasonable pricing for the quality. The bouquet held up beautifully for a 10-hour outdoor event in July heat.\" — Kristin W., Austin Central.",
      },
      {
        source: "service_notes",
        content: "Wildflower Floral Studio handles florals only; no catering, photography, or DJ services. For emergency last-minute requests, contact by phone (not email); we maintain limited flower inventory for rapid response within 12 hours, though full arch and ceremony packages cannot be completed last-minute. We source from the Austin Flower Market and direct from two Hill Country farms; availability depends on season. We deliver and set up; no client pickup. Travel to Hill Country venues included up to 60 miles from Fredericksburg. Austin Central delivery included; North Austin available for a small travel surcharge. Proposals sent within 24 hours of consultation. Deposit 40 percent; balance due one week before the event.",
      },
    ],
  },

  {
    id: "bbbb0005-0000-4000-8000-000000000005",
    tenant_id: EVENTLY_ID,
    name: "Bass Drop Entertainment",
    blurb: "High-energy DJ and sound production for Austin events. Weddings, corporate parties, and last-minute bookings welcome.",
    services: ["dj_music"],
    price_tier: 2,
    service_areas: ["austin_central", "austin_north", "round_rock"],
    available_emergency: true,
    response_time_hours: 6,
    rating: 4.5,
    years_experience: 10,
    docs: [
      {
        source: "profile",
        content: "Bass Drop Entertainment is a DJ and sound-production company serving Austin Central, North Austin, and Round Rock for a decade. DJ Marcus and his team specialize in weddings, corporate events, and private parties. We are known for reading the room and keeping dance floors packed from first song to last call. Our rig includes a full professional PA system rated for up to 400 guests, intelligent LED wash lighting, and a wireless microphone setup for ceremony and toasts. We offer genuine last-minute and emergency availability — if another DJ cancels on you, call us. Average emergency response is six hours. Pricing is mid-range.",
      },
      {
        source: "reviews",
        content: "\"Our wedding DJ cancelled four days before the event. Bass Drop came through with 48 hours notice and absolutely crushed it. The dance floor was never empty.\" — Hailey and Marcus J., Round Rock wedding. \"Every request was honored and the transitions were seamless. Guests thought we had hired a club DJ.\" — Aaron P., corporate holiday party. \"Great sound quality and the lighting transformed our plain banquet room into something magical.\" — Veronica S., nonprofit gala. \"DJ Marcus learned our must-play list and our do-not-play list. He remembered every detail without prompting.\" — Sophie and Liam D., Austin Central wedding.",
      },
      {
        source: "service_notes",
        content: "Bass Drop Entertainment offers emergency and last-minute bookings as a core service; we maintain open calendar slots specifically for short-notice requests. Emergency availability means we can confirm and commit within six hours for events the same day or next day. Standard bookings preferred with two-plus weeks notice for full planning. We do not provide live bands or string quartets; DJ and electronic music production only. Ceremony audio (processional, recessional, reader microphones) included in wedding packages. Sound system self-contained; no venue AV required. Service territory: Austin Central, North Austin, and Round Rock; Hill Country available for an additional travel fee. Payment by card, Venmo, or check.",
      },
    ],
  },

  {
    id: "bbbb0006-0000-4000-8000-000000000006",
    tenant_id: EVENTLY_ID,
    name: "Sage & Linen Events",
    blurb: "Full-service event company offering catering and floral design for Hill Country weddings. Boutique, all-inclusive packages.",
    services: ["catering", "floral"],
    price_tier: 4,
    service_areas: ["hill_country", "austin_north"],
    available_emergency: false,
    response_time_hours: 72,
    rating: 4.8,
    years_experience: 14,
    docs: [
      {
        source: "profile",
        content: "Sage and Linen Events is a boutique wedding company offering combined catering and floral design as a single, seamlessly coordinated package for Hill Country and North Austin venues. Founded 14 years ago by chef Elaine Torres and florist Greta Vance, the company is built on the idea that food and flowers should share a visual and seasonal language. A spring wedding might feature radish-top garnishes echoed in the ceremony greenery; a fall event might tie persimmon in both the menu and the centerpieces. Maximum of 20 weddings per year. Pricing is premium-tier; minimum contract is $15,000. No emergency or last-minute bookings accepted.",
      },
      {
        source: "reviews",
        content: "\"The cohesion between the food and flowers was something we had never seen at a wedding before. It felt like a Michelin-starred restaurant and a botanical garden had a child.\" — Fiona and James O., Stonewall ranch wedding. \"Worth every dollar. Elaine and Greta run the tightest ship in the Hill Country wedding industry.\" — Stephanie K., event coordinator. \"They thought of details we had not considered: matching the floral palette to the dish garnishes, coordinating the cake flowers with the centerpieces. Truly elevated.\" — Mia and Thomas B., Fredericksburg wedding. \"Exceptional. We are still receiving compliments a year later.\" — Rachel P., North Austin estate wedding.",
      },
      {
        source: "service_notes",
        content: "Sage and Linen accepts only 20 events per year to maintain quality. Minimum spend is $15,000 combining catering and floral. We do not offer catering-only or florals-only contracts; both services are required. No emergency or same-month bookings; planning process requires a minimum of four months. Tastings and floral mock-up sessions are included in the planning process. Staffing includes a lead chef, two sous chefs, four servers, and the lead floral designer for day-of setup. We operate primarily in the Hill Country (Dripping Springs to Fredericksburg corridor) and North Austin estates. Travel outside this zone not available. Payment schedule: 25 percent at contract signing, 50 percent 60 days before, 25 percent one week before.",
      },
    ],
  },

  {
    id: "bbbb0007-0000-4000-8000-000000000007",
    tenant_id: EVENTLY_ID,
    name: "Panorama Portrait & Events",
    blurb: "Photography and venue scouting for North Austin and Round Rock events. Flexible packages from micro-weddings to 200 guests.",
    services: ["photography", "venue"],
    price_tier: 2,
    service_areas: ["austin_north", "round_rock"],
    available_emergency: true,
    response_time_hours: 8,
    rating: 4.4,
    years_experience: 6,
    docs: [
      {
        source: "profile",
        content: "Panorama Portrait and Events is a North Austin photography studio that also operates a 3,000-square-foot event space in Round Rock. The dual offering is designed for couples and event planners who want photography and venue from one vendor. The studio space features a neutral palette, natural north-facing light, and a private garden courtyard suitable for ceremonies up to 100 guests. Photography packages cover micro-weddings, elopements, and events up to 200 guests. Pricing is mid-range. The team maintains last-minute availability for photography and short-notice venue rentals when the calendar allows; typical emergency response within eight hours for confirmations.",
      },
      {
        source: "reviews",
        content: "\"We booked both the venue and the photographer and it was the easiest vendor decision we made. One contract, one deposit, one less thing to worry about.\" — Kim and Eric V., Round Rock micro-wedding. \"The garden courtyard was perfect for our 40-person rehearsal dinner. Intimate, beautiful, and less expensive than downtown venues.\" — Lisa N., Round Rock. \"Our original photographer had a family emergency the week of the wedding. Panorama stepped in and delivered beautiful work on 72 hours notice.\" — Brittany S., North Austin. \"Not the flashiest studio in Austin, but reliable, communicative, and priced fairly for what you get.\" — Dan W., North Austin corporate headshots.",
      },
      {
        source: "service_notes",
        content: "Panorama offers genuine last-minute availability for both photography and venue, with confirmation possible within eight hours for short-notice events when calendar slots are open. Venue capacity: 30 seated indoor dinner, 100 garden ceremony, 200 standing reception. Catering and bar service are not provided by Panorama; licensed outside vendors welcome. Photography packages start at four hours and scale to full-day coverage. Raw files not included; edited gallery delivered in four weeks. Second photographer available as add-on. Venue rental includes basic AV (two speakers, wireless mic, HDMI projector). Service territory: North Austin and Round Rock; travel to Hill Country not available. Deposit 35 percent; balance two weeks before event.",
      },
    ],
  },

  {
    id: "bbbb0008-0000-4000-8000-000000000008",
    tenant_id: EVENTLY_ID,
    name: "Fiesta Sounds & Eats",
    blurb: "Budget-friendly DJ and catering combo for Round Rock parties and community events. Quick booking, no minimums.",
    services: ["dj_music", "catering"],
    price_tier: 1,
    service_areas: ["round_rock", "austin_north"],
    available_emergency: true,
    response_time_hours: 4,
    rating: 4.1,
    years_experience: 5,
    docs: [
      {
        source: "profile",
        content: "Fiesta Sounds and Eats is a budget-friendly DJ and catering duo serving Round Rock and North Austin for five years. The business was started by cousins Ricardo (DJ) and Lucia (catering) to serve the community events, quinceanas, birthday parties, and casual receptions that premium vendors price out of reach. No minimum headcount or spend; they have done backyard parties for 20 guests and community center events for 150. Catering focuses on Tex-Mex buffet style: tacos, enchiladas, rice, beans, and seasonal specials. DJ Ricardo brings a high-energy set and MC service. Emergency bookings are a specialty; they often confirm within four hours.",
      },
      {
        source: "reviews",
        content: "\"They showed up on 24-hour notice when my daughter's quinceana caterer bailed. The food was delicious and the DJ kept the party going until midnight.\" — Rosa M., Round Rock. \"Nobody in Austin could beat their price for a 50-person birthday party with DJ and food. Simple, fun, delicious.\" — Jose L., Pflugerville. \"Don't expect fine dining or a nightclub rig — expect great Tex-Mex and a DJ who knows how to hype a crowd. Exactly what we needed.\" — Tiffany W., North Austin. \"Ricardo remembered every song request and Lucia made the best guacamole I have eaten in Texas. Honest, hardworking folks.\" — Ernesto V., Round Rock community event.",
      },
      {
        source: "service_notes",
        content: "Fiesta Sounds and Eats specializes in emergency and last-minute bookings; four-hour confirmation is typical for availability checks. No minimum guest count or spend; packages scale from small backyard parties to 150-person events. Catering is Tex-Mex buffet style only; plated or fine-dining service not offered. DJ rig is appropriate for indoor events up to 200 guests; outdoor events in large open spaces may require rented line-array speakers at additional cost. Service territory: Round Rock and North Austin; Central Austin events considered case-by-case. Payment by cash, Venmo, or Zelle; no card processing. Deposit 20 percent at booking; balance on day of event. Pricing tier 1: most full-event packages under $2,000.",
      },
    ],
  },
];

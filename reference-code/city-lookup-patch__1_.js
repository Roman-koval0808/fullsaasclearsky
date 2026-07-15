/**
 * CITY LOOKUP TABLE EXPANSION — Session 11
 * ClearSky Software
 *
 * Replace the existing marketDemandLookup object in BENCHMARKS
 * inside lib/clearsky-engine.js with this expanded version.
 *
 * Rules applied:
 * — 100km / 1-hour radius rule: smaller communities within range
 *   of a city inherit that city's tier
 * — Tier reflects trades-specific demand: captive local market,
 *   competitive density, economic activity
 * — Keys are lowercase, spaces replaced with underscores
 * — Multiple spellings/common variants included per city
 *
 * Tier definitions:
 *   booming  — 1.15x  Resource boom, major development, fast-growing suburb
 *   strong   — 1.10x  Small/mid market, captive demand, low competition
 *   neutral  — 1.00x  Stable mid-size market, average competitor density
 *   slow     — 0.90x  Flat economy, higher competition, softer spending
 *   depressed — 0.75x Severe contraction, major employer left, long decline
 */

// ─── PASTE THIS OBJECT INTO BENCHMARKS IN clearsky-engine.js ─────────────────

marketDemandLookup: {

  // ── ONTARIO — NORTHERN ──────────────────────────────────────────────────────
  // Small captive markets, low competitor density, resource/mining base

  'timmins':                'strong',   // ClearSky home market. Documented anchor.
  'timmins on':             'strong',
  'south porcupine':        'strong',   // Within Timmins CMA
  'porcupine':              'strong',
  'schumacher':             'strong',
  'mountjoy':               'strong',

  'sudbury':                'neutral',  // Larger market, more competition
  'greater sudbury':        'neutral',
  'greater sudbury on':     'neutral',
  'nickel belt':            'strong',   // Surrounding communities
  'chelmsford':             'strong',
  'azilda':                 'strong',
  'val caron':              'strong',
  'hanmer':                 'strong',
  'capreol':                'strong',

  'sault ste marie':        'neutral',
  'sault ste. marie':       'neutral',
  'sault ste marie on':     'neutral',
  'the sault':              'neutral',

  'thunder bay':            'neutral',
  'thunder bay on':         'neutral',
  'port arthur':            'neutral',  // Historic district, same market
  'fort william':           'neutral',

  'north bay':              'neutral',
  'north bay on':           'neutral',
  'callander':              'strong',   // Within 1hr of North Bay
  'powassan':               'strong',
  'trout creek':            'strong',

  'kirkland lake':          'strong',
  'kirkland lake on':       'strong',
  'englehart':              'strong',   // Within 1hr of Kirkland Lake
  'temiskaming shores':     'strong',
  'new liskeard':           'strong',
  'haileybury':             'strong',
  'cobalt':                 'strong',

  'elliot lake':            'slow',     // Significant economic contraction
  'elliot lake on':         'slow',

  'kapuskasing':            'strong',
  'hearst':                 'strong',
  'cochrane':               'strong',   // Within Cochrane District
  'smooth rock falls':      'strong',
  'iroquois falls':         'strong',
  'matheson':               'strong',

  'wawa':                   'strong',
  'white river':            'strong',
  'hornepayne':             'strong',
  'marathon':               'strong',
  'terrace bay':            'strong',
  'schreiber':              'strong',

  'dryden':                 'strong',
  'kenora':                 'strong',
  'sioux lookout':          'strong',
  'red lake':               'booming',  // Active mining, strong demand
  'pickle lake':            'strong',
  'fort frances':           'strong',
  'atikokan':               'strong',

  // ── ONTARIO — NORTHEASTERN CORRIDOR ────────────────────────────────────────

  'parry sound':            'strong',
  'huntsville':             'neutral',  // Larger resort/cottage market
  'bracebridge':            'neutral',
  'gravenhurst':            'neutral',
  'midland':                'neutral',
  'penetanguishene':        'neutral',
  'orillia':                'neutral',
  'collingwood':            'neutral',
  'owen sound':             'neutral',
  'meaford':                'strong',

  // ── ONTARIO — EASTERN ───────────────────────────────────────────────────────

  'ottawa':                 'neutral',  // Large market, competitive
  'kanata':                 'neutral',
  'nepean':                 'neutral',
  'barrhaven':              'neutral',
  'gloucester':             'neutral',
  'orleans':                'neutral',
  'gatineau':               'neutral',  // Quebec side — same market

  'kingston':               'neutral',
  'kingston on':            'neutral',
  'napanee':                'strong',
  'belleville':             'neutral',
  'trenton':                'neutral',
  'cobourg':                'neutral',
  'port hope':              'neutral',
  'peterborough':           'neutral',
  'lindsay':                'strong',
  'bancroft':               'strong',
  'pembroke':               'strong',
  'renfrew':                'strong',
  'cornwall':               'neutral',
  'brockville':             'neutral',
  'smiths falls':           'strong',
  'perth':                  'strong',
  'carleton place':         'neutral',  // Ottawa commuter belt

  // ── ONTARIO — SOUTHWESTERN ──────────────────────────────────────────────────

  'toronto':                'slow',     // Saturated, very high competition
  'mississauga':            'slow',
  'brampton':               'slow',
  'markham':                'slow',
  'vaughan':                'slow',
  'richmond hill':          'slow',
  'oakville':               'neutral',
  'burlington':             'neutral',
  'hamilton':               'neutral',
  'st. catharines':         'neutral',
  'st catharines':          'neutral',
  'niagara falls':          'neutral',
  'welland':                'neutral',
  'fort erie':              'neutral',
  'kitchener':              'neutral',
  'waterloo':               'neutral',
  'cambridge':              'neutral',
  'guelph':                 'neutral',
  'london':                 'neutral',
  'woodstock':              'strong',
  'brantford':              'neutral',
  'simcoe':                 'strong',
  'tillsonburg':            'strong',
  'st. thomas':             'neutral',
  'st thomas':              'neutral',
  'sarnia':                 'neutral',
  'windsor':                'neutral',
  'leamington':             'strong',
  'chatham':                'neutral',
  'stratford':              'neutral',
  'listowel':               'strong',
  'orangeville':            'neutral',
  'barrie':                 'neutral',
  'innisfil':               'neutral',
  'newmarket':              'neutral',
  'aurora':                 'neutral',
  'ajax':                   'slow',
  'whitby':                 'slow',
  'oshawa':                 'neutral',
  'pickering':              'slow',

  // ── QUÉBEC ──────────────────────────────────────────────────────────────────

  'montreal':               'slow',     // Very high competition
  'laval':                  'slow',
  'longueuil':              'slow',
  'quebec city':            'neutral',
  'québec':                 'neutral',
  'saguenay':               'strong',
  'chicoutimi':             'strong',   // Within Saguenay CMA
  'jonquière':              'strong',
  'jonquiere':              'strong',
  'sherbrooke':             'neutral',
  'trois-rivières':         'neutral',
  'trois-rivieres':         'neutral',
  'drummondville':          'neutral',
  'granby':                 'neutral',
  'saint-jean-sur-richelieu': 'neutral',
  'saint jean sur richelieu': 'neutral',
  'rouyn-noranda':          'strong',   // Mining market, captive demand
  'rouyn noranda':          'strong',
  'val-d\'or':              'strong',   // Active mining
  'val d\'or':              'strong',
  'amos':                   'strong',
  'baie-comeau':            'strong',
  'sept-îles':              'strong',   // Resource market
  'sept iles':              'strong',
  'alma':                   'strong',
  'victoriaville':          'neutral',
  'shawinigan':             'neutral',
  'thetford mines':         'slow',     // Historical economic decline
  'rimouski':               'strong',
  'rivière-du-loup':        'strong',
  'riviere du loup':        'strong',
  'matane':                 'strong',

  // ── ALBERTA ─────────────────────────────────────────────────────────────────

  'calgary':                'neutral',
  'edmonton':               'neutral',
  'red deer':               'neutral',
  'lethbridge':             'neutral',
  'medicine hat':           'strong',
  'grande prairie':         'booming',  // Active resource / oilfield demand
  'fort mcmurray':          'booming',  // Peak resource market
  'wood buffalo':           'booming',
  'lloydminster':           'strong',   // Straddles SK/AB border
  'camrose':                'strong',
  'wetaskiwin':             'strong',
  'lacombe':                'strong',
  'ponoka':                 'strong',
  'sylvan lake':            'strong',
  'rocky mountain house':   'strong',
  'drumheller':             'strong',
  'brooks':                 'strong',
  'airdrie':                'neutral',  // Calgary commuter — competitive
  'cochrane':               'neutral',  // Calgary commuter
  'okotoks':                'neutral',
  'spruce grove':           'neutral',  // Edmonton commuter
  'st. albert':             'neutral',
  'st albert':              'neutral',
  'sherwood park':          'neutral',
  'leduc':                  'neutral',
  'fort saskatchewan':      'neutral',
  'high level':             'strong',
  'peace river':            'strong',
  'slave lake':             'strong',
  'hinton':                 'strong',
  'jasper':                 'strong',
  'edson':                  'strong',
  'whitecourt':             'strong',
  'drayton valley':         'strong',

  // ── BRITISH COLUMBIA ────────────────────────────────────────────────────────

  'vancouver':              'slow',     // Very high competition, high cost market
  'surrey':                 'slow',
  'burnaby':                'slow',
  'richmond':               'slow',
  'coquitlam':              'slow',
  'langley':                'neutral',
  'abbotsford':             'neutral',
  'chilliwack':             'neutral',
  'mission':                'neutral',
  'victoria':               'neutral',
  'saanich':                'neutral',
  'kelowna':                'neutral',
  'west kelowna':           'neutral',
  'penticton':              'strong',
  'kamloops':               'neutral',
  'prince george':          'strong',   // Northern BC, captive market
  'quesnel':                'strong',
  'williams lake':          'strong',
  'fort st. john':          'booming',  // Peace Region energy sector
  'fort st john':           'booming',
  'dawson creek':           'strong',
  'terrace':                'strong',
  'kitimat':                'booming',  // LNG development
  'prince rupert':          'strong',
  'cranbrook':              'strong',
  'trail':                  'strong',
  'nelson':                 'strong',
  'castlegar':              'strong',
  'nanaimo':                'neutral',
  'courtenay':              'neutral',
  'campbell river':         'strong',
  'port alberni':           'strong',
  'powell river':           'strong',
  'squamish':               'neutral',
  'whistler':               'neutral',
  'vernon':                 'neutral',
  'salmon arm':             'strong',

  // ── SASKATCHEWAN ────────────────────────────────────────────────────────────

  'saskatoon':              'neutral',
  'regina':                 'neutral',
  'prince albert':          'strong',
  'moose jaw':              'strong',
  'swift current':          'strong',
  'yorkton':                'strong',
  'north battleford':       'strong',
  'battleford':             'strong',
  'estevan':                'strong',   // Oil/energy market
  'weyburn':                'strong',
  'humboldt':               'strong',
  'melfort':                'strong',
  'meadow lake':            'strong',
  'la ronge':               'strong',

  // ── MANITOBA ────────────────────────────────────────────────────────────────

  'winnipeg':               'neutral',
  'brandon':                'strong',
  'thompson':               'strong',   // Northern resource market
  'flin flon':              'strong',
  'the pas':                'strong',
  'selkirk':                'neutral',
  'steinbach':              'neutral',
  'portage la prairie':     'strong',
  'morden':                 'strong',
  'winkler':                'strong',
  'dauphin':                'strong',

  // ── ATLANTIC CANADA ─────────────────────────────────────────────────────────

  'halifax':                'neutral',
  'dartmouth':              'neutral',
  'bedford':                'neutral',
  'truro':                  'strong',
  'new glasgow':            'strong',
  'sydney':                 'strong',   // Cape Breton, captive market
  'glace bay':              'strong',
  'amherst':                'strong',
  'bridgewater':            'strong',
  'yarmouth':               'strong',
  'kentville':              'strong',
  'antigonish':             'strong',

  'moncton':                'neutral',
  'saint john':             'neutral',
  'fredericton':            'neutral',
  'miramichi':              'strong',
  'bathurst':               'strong',
  'edmundston':             'strong',
  'campbellton':            'strong',
  'sussex':                 'strong',

  'st. john\'s':            'neutral',
  'st johns':               'neutral',
  "st. john's":             'neutral',
  'corner brook':           'strong',
  'gander':                 'strong',
  'grand falls-windsor':    'strong',
  'grand falls windsor':    'strong',
  'labrador city':          'booming',  // Iron ore / resource
  'wabush':                 'booming',
  'happy valley-goose bay': 'strong',
  'happy valley goose bay': 'strong',
  'stephenville':           'strong',

  'charlottetown':          'neutral',
  'summerside':             'strong',

  // ── TERRITORIES ─────────────────────────────────────────────────────────────

  'whitehorse':             'strong',
  'yellowknife':            'booming',  // Diamond mining, government, high demand
  'iqaluit':                'booming',  // Extreme captive market, very high demand

},

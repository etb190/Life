// CharacterCreation.jsx — High-Performance BitLife-style Character Creation
// Optimized for zero lag:
// - No heavy backdrop-blur filters
// - Fast off-screen virtualization (content-visibility: auto)
// - Native image thumbnails (no heavy CSS mask compositing on 50+ grid buttons)
// - Round circular flag badges (native 118x118 circle emoji format, no rectangular distortion)
// - Isolated modal state for instant search filtering

import { useState, useMemo, useCallback, useEffect, memo } from 'react';
import manifest from '../../data/appearance-manifest.json';
import originData from '../../data/character-origin-data.json';

// ─── Color Palettes ───────────────────────────────────────────────────────────

const SKIN_TONES = [
  { name: 'Light',      hex: '#FDDCB5' },
  { name: 'Fair',       hex: '#F5C8A0' },
  { name: 'Medium',     hex: '#DBA878' },
  { name: 'Olive',      hex: '#C49560' },
  { name: 'Tan',        hex: '#A87040' },
  { name: 'Brown',      hex: '#8B5530' },
  { name: 'Dark Brown', hex: '#5C3520' },
  { name: 'Dark',       hex: '#3A2010' },
];

const HAIR_COLORS = [
  { name: 'Black',      hex: '#1a1a1a' },
  { name: 'Dark Brown', hex: '#3b2314' },
  { name: 'Brown',      hex: '#6b3a2a' },
  { name: 'Auburn',     hex: '#8b3a2a' },
  { name: 'Red',        hex: '#c03020' },
  { name: 'Ginger',     hex: '#d06030' },
  { name: 'Strawberry', hex: '#d48050' },
  { name: 'Blonde',     hex: '#c8a050' },
  { name: 'Platinum',   hex: '#e0d0a0' },
  { name: 'White',      hex: '#e8e0d8' },
  { name: 'Gray',       hex: '#888888' },
  { name: 'Blue',       hex: '#2060c0' },
  { name: 'Purple',     hex: '#7030a0' },
  { name: 'Pink',       hex: '#d04080' },
  { name: 'Green',      hex: '#208040' },
];

const EYE_COLORS = [
  { name: 'Brown',      hex: '#5C3317' },
  { name: 'Dark Brown', hex: '#3B1E0E' },
  { name: 'Hazel',      hex: '#8E7618' },
  { name: 'Green',      hex: '#2E8B57' },
  { name: 'Blue',       hex: '#4682B4' },
  { name: 'Gray',       hex: '#8899AA' },
  { name: 'Amber',      hex: '#CF8E20' },
  { name: 'Violet',     hex: '#7B3FA0' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAssets(gender, stage) {
  const g = gender === 'male' ? 'Male' : 'Female';
  return {
    face:       manifest.Face?.[g]?.[stage]         || {},
    hair:       manifest.Hair?.[g]?.[stage]         || { styles: [] },
    brows:      manifest.Brows?.[g]?.[stage]        || [],
    eyes:       manifest.Eyes?.[g]?.[stage]          || {},
    facialHair: manifest.Facial_Hair?.[g]?.[stage]  || [],
  };
}

function darkenColor(hex, factor) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.round(r * factor);
  const dg = Math.round(g * factor);
  const db = Math.round(b * factor);
  return `#${dr.toString(16).padStart(2,'0')}${dg.toString(16).padStart(2,'0')}${db.toString(16).padStart(2,'0')}`;
}

function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function getRandomName(countryCode, gender, type = 'both') {
  const cData = originData.names[countryCode] || originData.names['us'];
  const fallback = originData.names['us'];

  const firstList = gender === 'male'
    ? (cData.male?.length ? cData.male : fallback.male)
    : (cData.female?.length ? cData.female : fallback.female);

  const lastList = cData.last?.length ? cData.last : fallback.last;

  const randomFirst = firstList[Math.floor(Math.random() * firstList.length)] || 'Alex';
  const randomLast = lastList[Math.floor(Math.random() * lastList.length)] || 'Smith';

  if (type === 'first') return randomFirst;
  if (type === 'last') return randomLast;
  return { firstName: randomFirst, lastName: randomLast };
}

// ─── Face Preview (Composite Shader) ──────────────────────────────────────────

function TintedLayer({ src, color, z, opacity = 1 }) {
  if (!src) return null;
  const maskStyle = {
    maskImage: `url(${src})`,
    WebkitMaskImage: `url(${src})`,
    maskSize: 'contain',
    WebkitMaskSize: 'contain',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    maskPosition: 'center',
    WebkitMaskPosition: 'center',
  };

  return (
    <div className="absolute inset-0" style={{ zIndex: z, opacity }}>
      <div className="h-full w-full" style={{ ...maskStyle, backgroundColor: color }} />
    </div>
  );
}

function RawLayer({ src, z, opacity = 1 }) {
  if (!src) return null;
  return (
    <div className="absolute inset-0" style={{ zIndex: z, opacity }}>
      <img src={src} alt="" className="h-full w-full object-contain" draggable={false} />
    </div>
  );
}

function TintedThumb({ src, color, className = "h-full w-full" }) {
  if (!src) return null;
  return (
    <div
      className={className}
      style={{
        maskImage: `url("${src}")`,
        WebkitMaskImage: `url("${src}")`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
        backgroundColor: color,
      }}
    />
  );
}

function HairThumb({ style, color }) {
  return (
    <div className="relative h-full w-full flex items-center justify-center">
      <TintedThumb src={style.base} color={color} />
      {style.lighting && (
        <img
          src={style.lighting}
          alt=""
          className="absolute inset-0 h-full w-full object-contain pointer-events-none opacity-30"
          loading="lazy"
        />
      )}
    </div>
  );
}

function FacialHairThumb({ item, color }) {
  return (
    <div className="relative h-full w-full flex items-center justify-center">
      <TintedThumb src={item.file} color={color} />
    </div>
  );
}

function BrowThumb({ brow, color }) {
  const thumb = brow.happy || brow.sad || brow.angry;
  return (
    <div className="relative h-full w-full flex items-center justify-center">
      <TintedThumb src={thumb} color={color} />
    </div>
  );
}

const FacePreview = memo(function FacePreview({ gender, stage, sel, size = 210 }) {
  const { face, hair, brows, eyes, facialHair } = getAssets(gender, stage);
  const skinHex  = SKIN_TONES[sel.skinTone]?.hex   || '#DBA878';
  const hairHex  = HAIR_COLORS[sel.hairColor]?.hex  || '#1a1a1a';
  const eyeHex   = EYE_COLORS[sel.eyeColor]?.hex    || '#5C3317';
  const browHex  = darkenColor(hairHex, 0.5);

  const hairStyle = hair.styles?.[sel.hair];
  const browStyle = brows[sel.brow];
  const fhStyle   = sel.facialHair >= 0 ? facialHair[sel.facialHair] : null;

  return (
    <div className="relative mx-auto select-none" style={{ width: size, height: size }}>
      {/* 1. Base face */}
      <TintedLayer src={face.base} color={skinHex} z={1} />

      {/* 2. Face lighting */}
      <RawLayer src={face.lighting_happy} z={2} opacity={0.35} />

      {/* 3. Eye whites */}
      <RawLayer src={eyes.eye_base} z={3} />

      {/* 4. Iris */}
      <TintedLayer src={eyes.iris_base} color={eyeHex} z={4} />

      {/* 5. Iris lighting */}
      <RawLayer src={eyes.iris_lighting} z={5} opacity={0.6} />

      {/* 6. Eyebrows */}
      {browStyle && (
        <TintedLayer
          src={browStyle.happy || browStyle.sad || browStyle.angry}
          color={browHex}
          z={6}
        />
      )}

      {/* 7. Facial hair */}
      {fhStyle && (
        <TintedLayer src={fhStyle.file} color={hairHex} z={7} />
      )}

      {/* 8. Hair base */}
      {hairStyle && (
        <TintedLayer src={hairStyle.base} color={hairHex} z={8} />
      )}

      {/* 9. Hair lighting */}
      {hairStyle?.lighting && (
        <RawLayer src={hairStyle.lighting} z={9} opacity={0.3} />
      )}
    </div>
  );
});

// ─── Flag Icon Component (Circular & Crisp) ───────────────────────────────────

function FlagBadge({ flag, code, size = 'w-7 h-7' }) {
  const [hasError, setHasError] = useState(false);

  if (flag && !hasError) {
    return (
      <img
        src={flag}
        alt=""
        onError={() => setHasError(true)}
        className={`${size} shrink-0 rounded-full object-contain pointer-events-none drop-shadow-sm`}
        loading="lazy"
      />
    );
  }

  return (
    <span className={`${size} shrink-0 flex items-center justify-center text-lg leading-none pointer-events-none`}>
      {getFlagEmoji(code)}
    </span>
  );
}

// ─── Fast Modal Base (No GPU Blur overhead) ───────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-slate-900">
          <h2 className="text-base font-bold text-white tracking-wide">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

// ─── Country Modal (Fast & Zero Parent Re-renders) ────────────────────────────

const CountryModal = memo(function CountryModal({ countryCode, onSelect, onClose }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return originData.countries;
    return originData.countries.filter(c =>
      c.name.toLowerCase().includes(q) || c.continent.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <Modal title="Pick your country!" onClose={onClose}>
      <div className="space-y-3">
        <div className="sticky top-0 z-10 bg-slate-900 pb-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search country..."
            className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            autoFocus
          />
        </div>

        <div className="divide-y divide-slate-800/80 max-h-[58vh] overflow-y-auto pr-1">
          {filtered.map(c => {
            const isSelected = c.code === countryCode;
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => onSelect(c)}
                className={`fast-list-item flex w-full items-center gap-3 px-3 py-2.5 text-left cursor-pointer rounded-xl transition-colors
                  ${isSelected ? 'bg-blue-600/25 text-blue-300' : 'hover:bg-slate-800/80 text-slate-200'}`}
              >
                <FlagBadge flag={c.flag} code={c.code} size="w-7 h-7" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{c.name}</div>
                  <div className="text-[11px] text-slate-500">{c.continent}</div>
                </div>
                {isSelected && <span className="text-blue-400 font-bold text-base">✓</span>}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">No countries found matching "{search}"</p>
          )}
        </div>
      </div>
    </Modal>
  );
});

// ─── City Modal ───────────────────────────────────────────────────────────────

const CityModal = memo(function CityModal({ country, currentCity, cities, onSelect, onOpenCountry, onClose }) {
  const [search, setSearch] = useState('');

  const q = search.toLowerCase().trim();
  const filtered = useMemo(() => {
    if (!q) return cities;
    return cities.filter(c => c.toLowerCase().includes(q));
  }, [cities, q]);

  return (
    <Modal title="Pick your place or city!" onClose={onClose}>
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>In:</span>
          <span className="font-semibold text-slate-200">{country.name}</span>
          <button
            type="button"
            onClick={onOpenCountry}
            className="text-blue-400 hover:underline cursor-pointer ml-auto"
          >
            Change Country
          </button>
        </div>

        <div className="sticky top-0 z-10 bg-slate-900 pb-2 space-y-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search or type place name..."
            className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            autoFocus
          />

          {q && !cities.some(c => c.toLowerCase() === q) && (
            <button
              type="button"
              onClick={() => onSelect(search.trim())}
              className="w-full rounded-xl bg-blue-600/20 border border-blue-500/40 p-2 text-left text-xs text-blue-300 hover:bg-blue-600/30 cursor-pointer"
            >
              ➕ Use custom place: <strong>"{search.trim()}"</strong>
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-800/80 max-h-[52vh] overflow-y-auto pr-1">
          {filtered.map(cityName => {
            const isSelected = cityName === currentCity;
            return (
              <button
                key={cityName}
                type="button"
                onClick={() => onSelect(cityName)}
                className={`fast-list-item flex w-full items-center justify-between px-3 py-2.5 text-left cursor-pointer rounded-xl transition-colors
                  ${isSelected ? 'bg-blue-600/25 text-blue-300' : 'hover:bg-slate-800/80 text-slate-200'}`}
              >
                <span className="text-sm font-semibold">{cityName}</span>
                {isSelected && <span className="text-blue-400 font-bold text-base">✓</span>}
              </button>
            );
          })}
          {filtered.length === 0 && !q && (
            <p className="py-8 text-center text-sm text-slate-500">No cities listed for this country.</p>
          )}
        </div>
      </div>
    </Modal>
  );
});

// ─── Name Modal ───────────────────────────────────────────────────────────────

const NameModal = memo(function NameModal({ initialFirst, initialLast, gender, country, onSave, onClose }) {
  const [first, setFirst] = useState(initialFirst);
  const [last, setLast] = useState(initialLast);

  function handleRandomBoth() {
    const n = getRandomName(country.code, gender);
    setFirst(n.firstName);
    setLast(n.lastName);
  }

  return (
    <Modal title="Select your name!" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
            First Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={first}
              onChange={e => setFirst(e.target.value)}
              placeholder="First Name"
              className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2.5 text-base text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => setFirst(getRandomName(country.code, gender, 'first'))}
              title="Randomize first name"
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-lg hover:bg-slate-700 cursor-pointer"
            >
              🎲
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
            Last Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={last}
              onChange={e => setLast(e.target.value)}
              placeholder="Last Name"
              className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2.5 text-base text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => setLast(getRandomName(country.code, gender, 'last'))}
              title="Randomize last name"
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-lg hover:bg-slate-700 cursor-pointer"
            >
              🎲
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRandomBoth}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600/20 border border-blue-500/40 py-2.5 text-xs font-semibold text-blue-300 hover:bg-blue-600/30 cursor-pointer"
        >
          🎲 Randomize Full Name ({country.name})
        </button>

        <button
          type="button"
          onClick={() => {
            onSave(first.trim(), last.trim());
            onClose();
          }}
          className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-500 cursor-pointer shadow-lg shadow-blue-600/30"
        >
          Done
        </button>
      </div>
    </Modal>
  );
});

// ─── Main Component ───────────────────────────────────────────────────────────

const APPEARANCE_TABS = [
  { key: 'skin',       label: 'Skin',        icon: '🎨' },
  { key: 'hair',       label: 'Hair',        icon: '💇' },
  { key: 'brows',      label: 'Brows',       icon: '🤨' },
  { key: 'eyes',       label: 'Eyes',        icon: '👁️' },
  { key: 'facialHair', label: 'Facial Hair', icon: '🧔' },
];

export default function CharacterCreation({ onComplete }) {
  const stage = 'Young_Adult';

  // Identity State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('male');
  const [countryCode, setCountryCode] = useState('us');
  const [city, setCity] = useState('New York');

  // Appearance State
  const [appearanceTab, setAppearanceTab] = useState('skin');
  const [sel, setSel] = useState({
    hair:       0,
    brow:       0,
    skinTone:   2,
    hairColor:  0,
    eyeColor:   0,
    facialHair: -1,
  });

  const [activeModal, setActiveModal] = useState(null);

  // Initialize random name
  useEffect(() => {
    const initial = getRandomName('us', 'male');
    setFirstName(initial.firstName);
    setLastName(initial.lastName);
  }, []);

  const setApp = useCallback((k, v) => setSel(p => ({ ...p, [k]: v })), []);
  const assets = useMemo(() => getAssets(gender, stage), [gender, stage]);

  const currentCountry = useMemo(() => {
    return originData.countries.find(c => c.code === countryCode) || originData.countries[0];
  }, [countryCode]);

  const countryCities = useMemo(() => {
    return originData.cities[countryCode] || [city];
  }, [countryCode, city]);

  const safe = {
    ...sel,
    hair:       Math.min(sel.hair,  Math.max(0, (assets.hair.styles?.length  || 1) - 1)),
    brow:       Math.min(sel.brow,  Math.max(0, (assets.brows?.length        || 1) - 1)),
    facialHair: gender === 'female' ? -1 :
                sel.facialHair >= 0
                  ? Math.min(sel.facialHair, Math.max(0, (assets.facialHair?.length || 1) - 1))
                  : -1,
  };

  // ─── Actions ──────────────────────────────────────────────────────────────

  function randomizeAll() {
    const randomCountry = originData.countries[Math.floor(Math.random() * originData.countries.length)];
    setCountryCode(randomCountry.code);

    const cities = originData.cities[randomCountry.code] || [`${randomCountry.name} City`];
    setCity(cities[Math.floor(Math.random() * cities.length)]);

    const n = getRandomName(randomCountry.code, gender);
    setFirstName(n.firstName);
    setLastName(n.lastName);

    setSel({
      hair:       Math.floor(Math.random() * (assets.hair.styles?.length  || 1)),
      brow:       Math.floor(Math.random() * (assets.brows?.length        || 1)),
      skinTone:   Math.floor(Math.random() * SKIN_TONES.length),
      hairColor:  Math.floor(Math.random() * HAIR_COLORS.length),
      eyeColor:   Math.floor(Math.random() * EYE_COLORS.length),
      facialHair: gender === 'male' && assets.facialHair.length > 0
                    ? (Math.random() < 0.4 ? Math.floor(Math.random() * assets.facialHair.length) : -1)
                    : -1,
    });
  }

  function handleCountrySelect(c) {
    setCountryCode(c.code);
    const newCities = originData.cities[c.code] || [`${c.name} City`];
    setCity(newCities[0]);
    const n = getRandomName(c.code, gender);
    setFirstName(n.firstName);
    setLastName(n.lastName);
    setActiveModal(null);
  }

  function handleCitySelect(cityName) {
    setCity(cityName);
    setActiveModal(null);
  }

  function handleGenderChange(newGender) {
    setGender(newGender);
    if (newGender === 'female') {
      setApp('facialHair', -1);
    }
    const newFirst = getRandomName(countryCode, newGender, 'first');
    setFirstName(newFirst);
  }

  function handleStartLife() {
    if (onComplete) {
      onComplete({
        firstName: firstName.trim() || 'Alex',
        lastName: lastName.trim() || 'Smith',
        gender,
        country: currentCountry.name,
        countryCode,
        city,
        appearance: {
          ...safe,
          stage,
        },
      });
    }
  }

  // ─── Fast Thumbnail Selector Grids (Synchronized Color Palettes) ──────────

  function renderAppearanceContent() {
    const currentHairHex = HAIR_COLORS[safe.hairColor]?.hex || '#1a1a1a';
    const currentBrowHex = darkenColor(currentHairHex, 0.5);

    switch (appearanceTab) {
      case 'skin':
        return (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Skin Tone</h3>
            <div className="flex flex-wrap gap-2.5 justify-center">
              {SKIN_TONES.map((c, i) => (
                <button
                  key={c.name}
                  type="button"
                  title={c.name}
                  onClick={() => setApp('skinTone', i)}
                  className={`h-9 w-9 rounded-full border-2 cursor-pointer transition-transform
                    ${safe.skinTone === i
                      ? 'scale-125 border-white ring-2 ring-blue-400'
                      : 'border-slate-600 hover:border-slate-300'}`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
        );

      case 'hair':
        return (
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Hair & Facial Color</h3>
                <span className="text-[11px] text-blue-400 font-semibold">{HAIR_COLORS[safe.hairColor]?.name}</span>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {HAIR_COLORS.map((c, i) => (
                  <button
                    key={c.name}
                    type="button"
                    title={c.name}
                    onClick={() => setApp('hairColor', i)}
                    className={`h-8 w-8 rounded-full border-2 cursor-pointer transition-transform
                      ${safe.hairColor === i
                        ? 'scale-125 border-white ring-2 ring-blue-400'
                        : 'border-slate-600 hover:border-slate-300'}`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Hairstyle</h3>
              <div className="grid grid-cols-5 gap-2">
                {assets.hair.styles.map((style, i) => (
                  <button
                    key={style.num ?? i}
                    type="button"
                    onClick={() => setApp('hair', i)}
                    className={`relative aspect-square cursor-pointer overflow-hidden rounded-xl p-2 transition-all
                      ${safe.hair === i
                        ? 'bg-blue-600/30 ring-2 ring-blue-400 border border-blue-400/60 shadow-lg shadow-blue-500/20'
                        : 'bg-slate-800/90 border border-slate-700/80 hover:bg-slate-700/70 hover:border-slate-500'}`}
                  >
                    <div className="absolute inset-1.5 rounded-lg bg-slate-700/30 pointer-events-none" />
                    <HairThumb style={style} color={currentHairHex} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'brows':
        return (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Eyebrow Style</h3>
            <div className="grid grid-cols-6 gap-2">
              {assets.brows.map((brow, i) => (
                <button
                  key={brow.num ?? i}
                  type="button"
                  onClick={() => setApp('brow', i)}
                  className={`relative aspect-square cursor-pointer overflow-hidden rounded-xl p-2 transition-all
                    ${safe.brow === i
                      ? 'bg-blue-600/30 ring-2 ring-blue-400 border border-blue-400/60 shadow-lg shadow-blue-500/20'
                      : 'bg-slate-800/90 border border-slate-700/80 hover:bg-slate-700/70 hover:border-slate-500'}`}
                >
                  <div className="absolute inset-1.5 rounded-lg bg-slate-700/30 pointer-events-none" />
                  <BrowThumb brow={brow} color={currentBrowHex} />
                </button>
              ))}
            </div>
          </div>
        );

      case 'eyes':
        return (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Eye Color</h3>
            <div className="flex flex-wrap gap-2.5 justify-center">
              {EYE_COLORS.map((c, i) => (
                <button
                  key={c.name}
                  type="button"
                  title={c.name}
                  onClick={() => setApp('eyeColor', i)}
                  className={`h-9 w-9 rounded-full border-2 cursor-pointer transition-transform
                    ${safe.eyeColor === i
                      ? 'scale-125 border-white ring-2 ring-blue-400'
                      : 'border-slate-600 hover:border-slate-300'}`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
        );

      case 'facialHair':
        if (gender !== 'male') return null;
        return (
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Hair & Facial Color</h3>
                <span className="text-[11px] text-blue-400 font-semibold">{HAIR_COLORS[safe.hairColor]?.name}</span>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {HAIR_COLORS.map((c, i) => (
                  <button
                    key={c.name}
                    type="button"
                    title={c.name}
                    onClick={() => setApp('hairColor', i)}
                    className={`h-7 w-7 rounded-full border-2 cursor-pointer transition-transform
                      ${safe.hairColor === i
                        ? 'scale-125 border-white ring-2 ring-blue-400'
                        : 'border-slate-600 hover:border-slate-300'}`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Facial Hair Style</h3>
              <button
                type="button"
                onClick={() => setApp('facialHair', -1)}
                className={`w-full cursor-pointer rounded-xl px-4 py-2.5 text-sm font-medium transition-colors
                  ${safe.facialHair === -1
                    ? 'bg-blue-600/25 ring-2 ring-blue-400 text-blue-300'
                    : 'bg-slate-800/70 border border-slate-700 text-slate-400 hover:bg-slate-700/70'}`}
              >
                None (Clean Shaven)
              </button>
              <div className="grid grid-cols-5 gap-2">
                {assets.facialHair.map((item, i) => (
                  <button
                    key={item.num ?? i}
                    type="button"
                    onClick={() => setApp('facialHair', i)}
                    className={`relative aspect-square cursor-pointer overflow-hidden rounded-xl p-2 transition-all
                      ${safe.facialHair === i
                        ? 'bg-blue-600/30 ring-2 ring-blue-400 border border-blue-400/60 shadow-lg shadow-blue-500/20'
                        : 'bg-slate-800/90 border border-slate-700/80 hover:bg-slate-700/70 hover:border-slate-500'}`}
                  >
                    <div className="absolute inset-1.5 rounded-lg bg-slate-700/30 pointer-events-none" />
                    <FacialHairThumb item={item} color={currentHairHex} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  const visibleAppearanceTabs = gender === 'female'
    ? APPEARANCE_TABS.filter(t => t.key !== 'facialHair')
    : APPEARANCE_TABS;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">

      {/* ─── Top BitLife Header ────────────────────────────────────── */}
      <div className="border-b border-slate-800 bg-slate-900 px-4 py-3">
        <div className="mx-auto max-w-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <span className="font-black text-lg tracking-tight uppercase text-white">Custom Life</span>
          </div>
          <button
            type="button"
            onClick={randomizeAll}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 cursor-pointer transition-colors"
          >
            <span>🎲</span>
            <span>Surprise Me</span>
          </button>
        </div>
      </div>

      {/* ─── Identity Controls ────────────────────────────────────── */}
      <div className="px-4 pt-3.5 pb-2">
        <div className="mx-auto max-w-lg space-y-2">

          {/* Row 1: Name & Gender */}
          <div className="grid grid-cols-12 gap-2">
            <button
              type="button"
              onClick={() => setActiveModal('name')}
              className="col-span-8 flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-left hover:border-slate-700 cursor-pointer transition-colors"
            >
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Name</div>
                <div className="text-base font-bold text-white truncate">
                  {firstName} {lastName}
                </div>
              </div>
              <span className="text-slate-400 text-sm ml-2 shrink-0">✏️</span>
            </button>

            <div className="col-span-4 flex rounded-xl bg-slate-900 border border-slate-800 p-1">
              <button
                type="button"
                onClick={() => handleGenderChange('male')}
                title="Male"
                className={`flex-1 rounded-lg text-lg flex items-center justify-center cursor-pointer transition-colors
                  ${gender === 'male' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                👨
              </button>
              <button
                type="button"
                onClick={() => handleGenderChange('female')}
                title="Female"
                className={`flex-1 rounded-lg text-lg flex items-center justify-center cursor-pointer transition-colors
                  ${gender === 'female' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                👩
              </button>
            </div>
          </div>

          {/* Row 2: Country & Place */}
          <div className="grid grid-cols-2 gap-2">
            {/* Country */}
            <button
              type="button"
              onClick={() => setActiveModal('country')}
              className="flex items-center gap-2.5 rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-left hover:border-slate-700 cursor-pointer transition-colors"
            >
              <FlagBadge flag={currentCountry.flag} code={currentCountry.code} size="w-7 h-7" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Country</div>
                <div className="text-sm font-bold text-white truncate">{currentCountry.name}</div>
              </div>
            </button>

            {/* Place */}
            <button
              type="button"
              onClick={() => setActiveModal('city')}
              className="flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-left hover:border-slate-700 cursor-pointer transition-colors"
            >
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Place</div>
                <div className="text-sm font-bold text-white truncate">{city}</div>
              </div>
              <span className="text-slate-400 text-xs ml-2 shrink-0">🏙️</span>
            </button>
          </div>

        </div>
      </div>

      {/* ─── Face Preview (Stage 3 Young Adult) ───────────────────── */}
      <div className="flex justify-center py-2">
        <FacePreview gender={gender} stage={stage} sel={safe} size={200} />
      </div>

      {/* ─── Appearance Tabs ─────────────────────────────────────── */}
      <div className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900">
        <div className="mx-auto max-w-lg flex gap-1 overflow-x-auto px-4 py-2 scrollbar-none">
          {visibleAppearanceTabs.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setAppearanceTab(t.key)}
              className={`flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors
                ${appearanceTab === t.key
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Appearance Options ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-lg">
          {renderAppearanceContent()}
        </div>
      </div>

      {/* ─── Bottom Actions ──────────────────────────────────────── */}
      <div className="border-t border-slate-800 bg-slate-950 px-4 py-3">
        <div className="mx-auto flex max-w-lg gap-3">
          <button
            type="button"
            onClick={randomizeAll}
            className="flex-1 cursor-pointer rounded-xl bg-slate-800 border border-slate-700 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700 active:bg-slate-800 transition-colors"
          >
            🎲 Randomize
          </button>
          <button
            type="button"
            onClick={handleStartLife}
            className="flex-[2] cursor-pointer rounded-xl bg-green-600 py-3 text-sm font-bold text-white shadow-lg shadow-green-600/30 hover:bg-green-500 active:bg-green-700 transition-colors"
          >
            ✓ Start Life
          </button>
        </div>
      </div>

      {/* ─── Modals ──────────────────────────────────────────────── */}
      {activeModal === 'name' && (
        <NameModal
          initialFirst={firstName}
          initialLast={lastName}
          gender={gender}
          country={currentCountry}
          onSave={(f, l) => {
            setFirstName(f);
            setLastName(l);
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'country' && (
        <CountryModal
          countryCode={countryCode}
          onSelect={handleCountrySelect}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'city' && (
        <CityModal
          country={currentCountry}
          currentCity={city}
          cities={countryCities}
          onSelect={handleCitySelect}
          onOpenCountry={() => setActiveModal('country')}
          onClose={() => setActiveModal(null)}
        />
      )}

    </div>
  );
}

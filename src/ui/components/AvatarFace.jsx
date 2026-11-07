// AvatarFace.jsx — Reusable composite face avatar for Character Creation and Game Screen
import { memo } from 'react';
import manifest from '../../data/appearance-manifest.json';

export const SKIN_TONES = [
  { name: 'Light',      hex: '#FDDCB5' },
  { name: 'Fair',       hex: '#F5C8A0' },
  { name: 'Medium',     hex: '#DBA878' },
  { name: 'Olive',      hex: '#C49560' },
  { name: 'Tan',        hex: '#A87040' },
  { name: 'Brown',      hex: '#8B5530' },
  { name: 'Dark Brown', hex: '#5C3520' },
  { name: 'Dark',       hex: '#3A2010' },
];

export const HAIR_COLORS = [
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

export const EYE_COLORS = [
  { name: 'Brown',      hex: '#5C3317' },
  { name: 'Dark Brown', hex: '#3B1E0E' },
  { name: 'Hazel',      hex: '#8E7618' },
  { name: 'Green',      hex: '#2E8B57' },
  { name: 'Blue',       hex: '#4682B4' },
  { name: 'Gray',       hex: '#8899AA' },
  { name: 'Amber',      hex: '#CF8E20' },
  { name: 'Violet',     hex: '#7B3FA0' },
];

export function darkenColor(hex, factor) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.round(r * factor);
  const dg = Math.round(g * factor);
  const db = Math.round(b * factor);
  return `#${dr.toString(16).padStart(2,'0')}${dg.toString(16).padStart(2,'0')}${db.toString(16).padStart(2,'0')}`;
}

export function getAssets(gender, stage) {
  const g = gender === 'male' ? 'Male' : 'Female';
  return {
    face:       manifest.Face?.[g]?.[stage]         || {},
    hair:       manifest.Hair?.[g]?.[stage]         || { styles: [] },
    brows:      manifest.Brows?.[g]?.[stage]        || [],
    eyes:       manifest.Eyes?.[g]?.[stage]          || {},
    facialHair: manifest.Facial_Hair?.[g]?.[stage]  || [],
  };
}

export function TintedLayer({ src, color, z, opacity = 1 }) {
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

export function RawLayer({ src, z, opacity = 1 }) {
  if (!src) return null;
  return (
    <div className="absolute inset-0" style={{ zIndex: z, opacity }}>
      <img src={src} alt="" className="h-full w-full object-contain" draggable={false} />
    </div>
  );
}

export function TintedThumb({ src, color, className = "h-full w-full" }) {
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

export function getStageFromAge(age) {
  if (age <= 2) return 'Baby';          // Ages 0 - 2 (Stage 0: Infant/Baby)
  if (age <= 11) return 'Child';        // Ages 3 - 11 (Stage 1: Child)
  if (age <= 20) return 'Teen';         // Ages 12 - 20 (Stage 2: Teen)
  if (age <= 44) return 'Young_Adult';  // Ages 21 - 44 (Stage 3: Young Adult)
  if (age <= 64) return 'Adult';        // Ages 45 - 64 (Stage 4: Adult/Middle Age)
  return 'Elder';                       // Ages 65+ (Stage 5: Elder/Senior)
}

export const FacePreview = memo(function FacePreview({ gender, stage, sel, size = 210 }) {
  const currentStage = stage || sel?.stage || getStageFromAge(sel?.age ?? 25);
  const assets = getAssets(gender, currentStage);
  const { face, hair, brows, eyes, facialHair } = assets;

  const skinHex  = SKIN_TONES[sel?.skinTone]?.hex   || '#DBA878';
  const hairHex  = HAIR_COLORS[sel?.hairColor]?.hex  || '#1a1a1a';
  const eyeHex   = EYE_COLORS[sel?.eyeColor]?.hex    || '#5C3317';
  const browHex  = darkenColor(hairHex, 0.5);

  const safeHair = Math.min(sel?.hair ?? 0, Math.max(0, (hair.styles?.length || 1) - 1));
  const safeBrow = Math.min(sel?.brow ?? 0, Math.max(0, (brows?.length || 1) - 1));

  // Facial hair only exists for adult males (Stage 3, 4, 5)
  const isAdultMale = gender === 'male' && ['Young_Adult', 'Adult', 'Elder'].includes(currentStage);
  const safeFH   = isAdultMale ? (sel?.facialHair ?? -1) : -1;

  const hairStyle = hair.styles?.[safeHair];
  const browStyle = brows[safeBrow];
  const fhStyle   = safeFH >= 0 ? facialHair[safeFH] : null;

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


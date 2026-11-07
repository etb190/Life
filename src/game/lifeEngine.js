// lifeEngine.js — Authentic BitLife Life Initialization & NPC Engine
// Imports real data extracted from Version_1.7_Official.apk:
// - 187 authentic birth circumstances
// - 150 authentic parent careers
// - 139 compliments, 205 insults, 345 conversations, 191 sibling arguments
// - 85 pet breeds and names
// - Full parent, sibling, pet generation with hereditary appearances and stats

import birthData from '../data/birth-data.json';
import originData from '../data/character-origin-data.json';
import manifest from '../data/appearance-manifest.json';
import educationData from '../data/education-data.json';
import schoolData from '../data/school-activities-data.json';
import jobsData from '../data/jobs-data.json';
import specialJobsData from '../data/special-jobs-data.json';
import scenariosData from '../data/scenarios-data.json';
import mindBodyData from '../data/mind-body-data.json';
import crimeData from '../data/crime-data.json';
import crimeMinigamesData from '../data/crime-minigames-data.json';
import carsData from '../data/cars-data.json';
export { mindBodyData, crimeData, crimeMinigamesData, carsData };

// ─── Astrological Signs ────────────────────────────────────────────────────────

const ZODIAC_SIGNS = [
  { sign: 'Capricorn',   start: [12, 22], end: [1, 19] },
  { sign: 'Aquarius',    start: [1, 20],  end: [2, 18] },
  { sign: 'Pisces',      start: [2, 19],  end: [3, 20] },
  { sign: 'Aries',       start: [3, 21],  end: [4, 19] },
  { sign: 'Taurus',      start: [4, 20],  end: [5, 20] },
  { sign: 'Gemini',      start: [5, 21],  end: [6, 20] },
  { sign: 'Cancer',      start: [6, 21],  end: [7, 22] },
  { sign: 'Leo',         start: [7, 23],  end: [8, 22] },
  { sign: 'Virgo',       start: [8, 23],  end: [9, 22] },
  { sign: 'Libra',       start: [9, 23],  end: [10, 22] },
  { sign: 'Scorpio',     start: [10, 23], end: [11, 21] },
  { sign: 'Sagittarius', start: [11, 22], end: [12, 21] },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getRandomBirthday() {
  const month = Math.floor(Math.random() * 12) + 1; // 1-12
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  const day = Math.floor(Math.random() * daysInMonth) + 1;

  let zodiac = 'Aries';
  for (const z of ZODIAC_SIGNS) {
    const [sm, sd] = z.start;
    const [em, ed] = z.end;
    if (sm === 12 && em === 1) {
      if ((month === 12 && day >= sd) || (month === 1 && day <= ed)) {
        zodiac = z.sign;
        break;
      }
    } else if ((month === sm && day >= sd) || (month === em && day <= ed)) {
      zodiac = z.sign;
      break;
    }
  }

  return {
    formatted: `${MONTH_NAMES[month - 1]} ${day}`,
    month,
    day,
    zodiac,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFromList(list) {
  if (!list || list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

function getRandomName(countryCode, gender, type = 'both') {
  const cData = originData.names[countryCode] || originData.names['us'] || {};
  const fallback = originData.names['us'] || { male: ['Alex'], female: ['Sarah'], last: ['Smith'] };

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

function getWeightedCircumstance() {
  const list = birthData.birthCircumstances;
  if (!list || list.length === 0) {
    return {
      text: 'I was conceived on a romantic weekend getaway.',
      siblingText: '',
      fatherTypes: ['Married'],
      minMotherAge: 20,
      maxMotherAge: 38,
    };
  }

  const totalWeight = list.reduce((sum, item) => sum + (item.weight || 1), 0);
  let r = Math.random() * totalWeight;
  for (const item of list) {
    r -= (item.weight || 1);
    if (r <= 0) return item;
  }
  return list[0];
}

function getRandomCareer() {
  const list = birthData.careers;
  if (!list || list.length === 0) {
    return { name: 'Accountant', salary: 45000 };
  }
  return getRandomFromList(list);
}

// ─── Stage and NPC Appearance Generator ───────────────────────────────────────

export function getStageFromAge(age) {
  if (age <= 2) return 'Baby';          // Ages 0 - 2 (Stage 0: Infant/Baby)
  if (age <= 11) return 'Child';        // Ages 3 - 11 (Stage 1: Child)
  if (age <= 20) return 'Teen';         // Ages 12 - 20 (Stage 2: Teen)
  if (age <= 44) return 'Young_Adult';  // Ages 21 - 44 (Stage 3: Young Adult)
  if (age <= 64) return 'Adult';        // Ages 45 - 64 (Stage 4: Adult/Middle Age)
  return 'Elder';                       // Ages 65+ (Stage 5: Elder/Senior)
}

export function generateNpcAppearance(gender, age, familyContext = {}) {
  const stage = getStageFromAge(age);
  const g = gender === 'male' ? 'Male' : 'Female';

  const hairAssets = manifest.Hair?.[g]?.[stage]?.styles || [];
  const browAssets = manifest.Brows?.[g]?.[stage] || [];
  const fhAssets   = manifest.Facial_Hair?.[g]?.[stage] || [];

  // Hereditary skin tone: blend with family
  const baseSkin = familyContext.skinTone ?? 2;
  const skinTone = Math.max(0, Math.min(7, baseSkin + getRandomInt(-1, 1)));

  // Natural hair colors: 0 (Black), 1 (Dark Brown), 2 (Brown), 3 (Auburn), 4 (Red), 7 (Blonde)
  const naturalHairColors = [0, 0, 1, 1, 2, 2, 3, 4, 7];
  let hairColor = familyContext.hairColor ?? getRandomFromList(naturalHairColors);
  if (age >= 60) {
    hairColor = Math.random() < 0.6 ? 10 : (Math.random() < 0.3 ? 9 : hairColor); // Gray or White
  } else if (age >= 45) {
    hairColor = Math.random() < 0.35 ? 10 : hairColor;
  }

  // Eye color: 0 (Brown), 1 (Dark Brown), 2 (Hazel), 3 (Green), 4 (Blue)
  const eyeColor = familyContext.eyeColor ?? getRandomFromList([0, 0, 1, 2, 3, 4]);

  const hair = hairAssets.length > 0 ? getRandomInt(0, hairAssets.length - 1) : 0;
  const brow = browAssets.length > 0 ? getRandomInt(0, browAssets.length - 1) : 0;

  let facialHair = -1;
  if (gender === 'male' && ['Young_Adult', 'Adult', 'Elder'].includes(stage) && fhAssets.length > 0) {
    if (Math.random() < 0.45) {
      facialHair = getRandomInt(0, fhAssets.length - 1);
    }
  }

  return {
    gender,
    stage,
    skinTone,
    hairColor,
    eyeColor,
    hair,
    brow,
    facialHair,
  };
}

// ─── Life Generator ───────────────────────────────────────────────────────────

export function generateNewLife(customData = {}) {
  const countryCode = customData.countryCode || 'us';
  const country = customData.country || 'United States';
  const city = customData.city || 'New York';
  const gender = customData.gender || 'male';
  const firstName = customData.firstName?.trim() || 'Alex';
  const lastName = customData.lastName?.trim() || 'Smith';

  const birthday = getRandomBirthday();
  const circumstance = getWeightedCircumstance();

  // 1. Mother Generation
  const minMotherAge = Math.max(24, circumstance.minMotherAge || 26);
  const maxMotherAge = Math.min(50, circumstance.maxMotherAge || 44);
  const motherAge = getRandomInt(minMotherAge, maxMotherAge);
  const motherFirstName = getRandomName(countryCode, 'female', 'first');
  const motherCareer = getRandomCareer();

  const motherAppearance = generateNpcAppearance('female', motherAge, {
    skinTone: customData.appearance?.skinTone ?? 2,
    hairColor: customData.appearance?.hairColor ?? 0,
    eyeColor: customData.appearance?.eyeColor ?? 0,
  });

  const mother = {
    id: 'mother',
    type: 'mother',
    relation: 'Mother',
    firstName: motherFirstName,
    lastName: lastName,
    fullName: `${motherFirstName} ${lastName}`,
    gender: 'female',
    age: motherAge,
    occupation: motherCareer.name,
    salary: motherCareer.salary,
    appearance: motherAppearance,
    relationship: getRandomInt(80, 100),
    generosity: getRandomInt(30, 95),
    craziness: getRandomInt(5, 60),
    religiousness: getRandomInt(10, 80),
    smarts: getRandomInt(30, 90),
    looks: getRandomInt(30, 90),
    alive: true,
  };

  // 2. Father Generation
  const hasFather = !circumstance.fatherTypes.includes('Unknown') || Math.random() < 0.85;
  let father = null;

  if (hasFather) {
    const fatherAge = Math.max(18, motherAge + getRandomInt(-2, 4));
    const fatherFirstName = getRandomName(countryCode, 'male', 'first');
    const fatherCareer = getRandomCareer();

    const isMarried = circumstance.fatherTypes.includes('Married') ||
      (!circumstance.fatherTypes.includes('Fling') && Math.random() < 0.75);

    const fatherAppearance = generateNpcAppearance('male', fatherAge, {
      skinTone: customData.appearance?.skinTone ?? 2,
      hairColor: customData.appearance?.hairColor ?? 0,
      eyeColor: customData.appearance?.eyeColor ?? 0,
    });

    father = {
      id: 'father',
      type: 'father',
      relation: 'Father',
      firstName: fatherFirstName,
      lastName: lastName,
      fullName: `${fatherFirstName} ${lastName}`,
      gender: 'male',
      age: fatherAge,
      occupation: fatherCareer.name,
      salary: fatherCareer.salary,
      relationshipStatus: isMarried ? 'Married to Mother' : 'Unmarried',
      appearance: fatherAppearance,
      relationship: getRandomInt(75, 100),
      generosity: getRandomInt(30, 95),
      craziness: getRandomInt(5, 60),
      religiousness: getRandomInt(10, 80),
      smarts: getRandomInt(30, 90),
      looks: getRandomInt(30, 90),
      alive: true,
    };
  }

  // 3. Older Siblings Generation
  const siblings = [];
  const maxPossibleSiblingAge = motherAge - 17;

  if (maxPossibleSiblingAge >= 1) {
    let numSiblings = 0;
    const roll = Math.random();
    if (roll < 0.40) numSiblings = 0;
    else if (roll < 0.75) numSiblings = 1;
    else if (roll < 0.93) numSiblings = 2;
    else numSiblings = 3;

    for (let i = 0; i < numSiblings; i++) {
      const sGender = Math.random() < 0.5 ? 'male' : 'female';
      const sFirst = getRandomName(countryCode, sGender, 'first');
      const sAge = getRandomInt(1, maxPossibleSiblingAge);

      const siblingAppearance = generateNpcAppearance(sGender, sAge, {
        skinTone: Math.random() < 0.5 ? motherAppearance.skinTone : (father?.appearance?.skinTone ?? motherAppearance.skinTone),
        hairColor: Math.random() < 0.5 ? motherAppearance.hairColor : (father?.appearance?.hairColor ?? motherAppearance.hairColor),
        eyeColor: Math.random() < 0.5 ? motherAppearance.eyeColor : (father?.appearance?.eyeColor ?? motherAppearance.eyeColor),
      });

      siblings.push({
        id: `sibling_${i + 1}`,
        type: 'sibling',
        relation: sGender === 'male' ? 'Older Brother' : 'Older Sister',
        firstName: sFirst,
        lastName: lastName,
        fullName: `${sFirst} ${lastName}`,
        gender: sGender,
        age: sAge,
        appearance: siblingAppearance,
        relationship: getRandomInt(60, 95),
        petulance: getRandomInt(15, 85),
        craziness: getRandomInt(10, 70),
        smarts: getRandomInt(30, 90),
        looks: getRandomInt(30, 90),
        alive: true,
      });
    }

    // Sort siblings oldest to youngest
    siblings.sort((a, b) => b.age - a.age);
  }

  // 4. Optional Family Pet
  let pet = null;
  if (Math.random() < 0.25 && birthData.petBreeds?.length > 0) {
    const breedInfo = getRandomFromList(birthData.petBreeds);
    const petName = getRandomFromList(birthData.petNames) || 'Buddy';
    pet = {
      id: 'family_pet',
      type: 'pet',
      animal: breedInfo.animal,
      breed: breedInfo.breed,
      name: petName,
      age: getRandomInt(1, 4),
      relationship: getRandomInt(80, 100),
      alive: true,
    };
  }

  // 5. Initial Life Log Entries (Age 0)
  const initialLog = [];

  // Birth announcements
  initialLog.push({
    id: 'entry_name',
    age: 0,
    icon: '👶',
    text: `My name is ${firstName} ${lastName}.`,
    category: 'identity',
  });

  initialLog.push({
    id: 'entry_place',
    age: 0,
    icon: '📍',
    text: `I was born a ${gender === 'male' ? 'boy' : 'girl'} in ${city}, ${country}.`,
    category: 'birth',
  });

  initialLog.push({
    id: 'entry_circumstance',
    age: 0,
    icon: '🛌',
    text: circumstance.text,
    category: 'birth',
  });

  initialLog.push({
    id: 'entry_birthday',
    age: 0,
    icon: '🎂',
    text: `My birthday is ${birthday.formatted}. I am a ${birthday.zodiac}.`,
    category: 'birth',
  });

  if (father) {
    initialLog.push({
      id: 'entry_father',
      age: 0,
      icon: '👨',
      text: `My father is ${father.fullName}, a ${father.occupation} (age ${father.age}).`,
      category: 'family',
    });
  } else {
    initialLog.push({
      id: 'entry_father_none',
      age: 0,
      icon: '❓',
      text: 'My father is unknown.',
      category: 'family',
    });
  }

  initialLog.push({
    id: 'entry_mother',
    age: 0,
    icon: '👩',
    text: `My mother is ${mother.fullName}, a ${mother.occupation} (age ${mother.age}).`,
    category: 'family',
  });

  for (const sib of siblings) {
    initialLog.push({
      id: `entry_sibling_${sib.id}`,
      age: 0,
      icon: sib.gender === 'male' ? '👦' : '👧',
      text: `I have an ${sib.relation.toLowerCase()} named ${sib.fullName} (age ${sib.age}).`,
      category: 'family',
    });
  }

  if (pet) {
    initialLog.push({
      id: 'entry_pet',
      age: 0,
      icon: pet.animal === 'Dog' ? '🐶' : '🐱',
      text: `We have a family ${pet.animal.toLowerCase()} (${pet.breed}) named ${pet.name}.`,
      category: 'pet',
    });
  }

  // Return Full Game State Object
  return {
    hero: {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      gender,
      country,
      countryCode,
      city,
      age: 0,
      stage: 'Baby',
      birthday,
      occupation: 'Infant',
      bankBalance: 0,
      netWorth: 0,
      cars: [],
      licenses: {},
      alive: true,
      appearance: {
        ...(customData.appearance || {
          gender,
          hair: 0,
          brow: 0,
          skinTone: 2,
          hairColor: 0,
          eyeColor: 0,
          facialHair: -1,
        }),
        stage: 'Baby',
      },
      stats: {
        happiness: getRandomInt(85, 100),
        health: getRandomInt(90, 100),
        smarts: getRandomInt(40, 95),
        looks: getRandomInt(40, 95),
      },
      education: {
        currentSchool: null,
        degrees: [],
        highestCompleted: 'None',
        undergraduateMajor: null,
        currentMajor: null,
        activities: [],
        clique: null,
        studentLoanDebt: 0,
        troublePoints: 0,
      },
      job: null,
      partTimeJob: null,
      jobListings: [],
      partTimeListings: [],
      pension: 0,
      prison: null,
    },
    relationships: {
      mother,
      father,
      siblings,
      pet,
    },
    lifeLog: initialLog,
  };
}

// ─── NPC Interactions ─────────────────────────────────────────────────────────

export function interactWithNPC(npc, action, heroState) {
  const result = {
    message: '',
    relationshipChange: 0,
    happinessChange: 0,
    smartsChange: 0,
    healthChange: 0,
    moneyChange: 0,
    logEntry: null,
  };

  switch (action) {
    case 'spend_time': {
      const verb = npc.type === 'pet' ? 'played with' : 'spent time with';
      result.relationshipChange = getRandomInt(5, 12);
      result.happinessChange = getRandomInt(4, 10);
      result.message = `You ${verb} your ${npc.relation?.toLowerCase() || npc.animal?.toLowerCase() || 'family member'}, ${npc.name || npc.firstName}.`;
      result.logEntry = {
        age: heroState.hero.age,
        icon: '⏳',
        text: result.message,
        category: 'social',
      };
      break;
    }

    case 'conversation': {
      const convList = birthData.conversations || [];
      const topic = getRandomFromList(convList)?.topic || 'the meaning of life';
      result.relationshipChange = getRandomInt(3, 8);
      result.smartsChange = getRandomInt(1, 3);
      result.happinessChange = getRandomInt(2, 6);
      result.message = `You and your ${npc.relation?.toLowerCase()}, ${npc.firstName}, had a conversation about ${topic}.`;
      result.logEntry = {
        age: heroState.hero.age,
        icon: '💬',
        text: result.message,
        category: 'social',
      };
      break;
    }

    case 'compliment': {
      const compList = birthData.compliments || [];
      const comp = getRandomFromList(compList) || 'a brilliant mind';
      result.relationshipChange = getRandomInt(6, 15);
      result.happinessChange = getRandomInt(3, 8);
      result.message = `You complimented your ${npc.relation?.toLowerCase()}, ${npc.firstName}, telling them that they are ${comp}.`;
      result.logEntry = {
        age: heroState.hero.age,
        icon: '💖',
        text: result.message,
        category: 'social',
      };
      break;
    }

    case 'insult': {
      const insList = birthData.insults || [];
      const ins = getRandomFromList(insList) || 'a fool';
      result.relationshipChange = -getRandomInt(12, 25);
      result.happinessChange = -getRandomInt(5, 10);
      result.message = `You insulted your ${npc.relation?.toLowerCase()}, ${npc.firstName}, calling them ${ins}.`;
      result.logEntry = {
        age: heroState.hero.age,
        icon: '🤬',
        text: result.message,
        category: 'social',
      };
      break;
    }

    case 'ask_money': {
      if (npc.type !== 'mother' && npc.type !== 'father') {
        result.message = 'They do not have money to give you.';
        break;
      }
      const generosity = npc.generosity || 50;
      const willGive = Math.random() * 100 < (generosity + 10);
      if (willGive) {
        const amount = heroState.hero.age <= 5 ? getRandomInt(5, 20) : getRandomInt(20, 100);
        result.moneyChange = amount;
        result.relationshipChange = getRandomInt(2, 5);
        result.happinessChange = getRandomInt(5, 12);
        result.message = `Your ${npc.relation?.toLowerCase()}, ${npc.firstName}, happily gave you $${amount}!`;
        result.logEntry = {
          age: heroState.hero.age,
          icon: '💵',
          text: result.message,
          category: 'financial',
        };
      } else {
        result.relationshipChange = -getRandomInt(2, 6);
        result.happinessChange = -getRandomInt(3, 8);
        result.message = `Your ${npc.relation?.toLowerCase()}, ${npc.firstName}, refused to give you any money.`;
        result.logEntry = {
          age: heroState.hero.age,
          icon: '❌',
          text: `My ${npc.relation?.toLowerCase()} refused to give me money.`,
          category: 'financial',
        };
      }
      break;
    }

    default:
      result.message = 'No action performed.';
  }

  return result;
}

// ─── BitLife Authentic Education System ───────────────────────────────────────

const FAMOUS_MUSICIANS = [
  'Drake',
  'Taylor Swift',
  'Billie Eilish',
  'Post Malone',
  'Ed Sheeran',
  'Ariana Grande',
  'Eminem',
  'Beyoncé',
  'Justin Bieber',
  'Kendrick Lamar',
];

export function resolveScenarioText(template, { teacher, classmate, principal } = {}) {
  let text = template;
  if (teacher) {
    text = text.replace(/<teacher-possessive>/gi, `${teacher.fullName}'s`);
    text = text.replace(/<teacher>/gi, teacher.fullName);
  }
  if (classmate) {
    text = text.replace(/<classmate-possessive>/gi, `${classmate.fullName}'s`);
    text = text.replace(/<classmate>/gi, classmate.fullName);
  }
  if (principal) {
    text = text.replace(/<principal-possessive>/gi, `${principal.fullName}'s`);
    text = text.replace(/<principal>/gi, principal.fullName);
  }
  const musician = getRandomFromList(FAMOUS_MUSICIANS);
  const indefiniteMusician = /^[AEIOU]/i.test(musician) ? `an ${musician}` : `a ${musician}`;
  text = text.replace(/<musician-indefinite>/gi, indefiniteMusician);
  text = text.replace(/<musician>/gi, musician);

  // Replace choices <a/b/c>
  text = text.replace(/<([^>]+)>/g, (_, choices) => {
    const parts = choices.split('/');
    return parts[Math.floor(Math.random() * parts.length)];
  });
  return text;
}

function generateSchoolPrincipal(city, countryCode, isCollege = false) {
  const gender = Math.random() < 0.5 ? 'male' : 'female';
  const age = getRandomInt(45, 65);
  const firstName = getRandomName(countryCode, gender, 'first');
  const lastName = getRandomName(countryCode, gender, 'last');
  return {
    id: 'principal_main',
    role: isCollege ? 'Dean' : 'Principal',
    firstName,
    lastName,
    fullName: `${isCollege ? 'Dean' : 'Principal'} ${lastName}`,
    gender,
    age,
    appearance: generateNpcAppearance(gender, age),
    relationship: getRandomInt(45, 65),
    strictness: getRandomInt(35, 85),
  };
}

function generateSchoolTeachers(schoolType, countryCode) {
  const subjects = {
    Elementary: ['Homeroom', 'Art', 'Music', 'Physical Education'],
    Middle: ['Mathematics', 'English', 'Science', 'History', 'Physical Education'],
    High: ['Mathematics', 'English Literature', 'Biology', 'World History', 'Physical Education'],
    University: ['Computer Science', 'Philosophy', 'Economics', 'Psychology', 'Statistics'],
    Community: ['Communications', 'English Composition', 'Algebra', 'Sociology'],
    Medical: ['Human Anatomy', 'Pathology', 'Pharmacology', 'Clinical Surgery'],
    Law: ['Constitutional Law', 'Contracts', 'Torts', 'Criminal Law'],
    Business: ['Corporate Finance', 'Strategic Marketing', 'Accounting', 'Management'],
    Dental: ['Oral Anatomy', 'Periodontics', 'Orthodontics', 'Dental Surgery'],
    Pharmacy: ['Medicinal Chemistry', 'Pharmaceutics', 'Toxicology', 'Clinical Therapeutics'],
    Veterinary: ['Veterinary Anatomy', 'Animal Physiology', 'Veterinary Pathology', 'Clinical Medicine'],
    Nursing: ['Fundamentals of Nursing', 'Pharmacology in Nursing', 'Pediatric Care', 'Health Assessment'],
    Graduate: ['Advanced Research Methods', 'Thesis Seminar', 'Data Analysis', 'Theory & Practice'],
  }[schoolType] || ['General Studies', 'Theory', 'Practicum'];

  return subjects.map((subj, idx) => {
    const gender = Math.random() < 0.5 ? 'male' : 'female';
    const age = getRandomInt(26, 62);
    const firstName = getRandomName(countryCode, gender, 'first');
    const lastName = getRandomName(countryCode, gender, 'last');
    const prefix = gender === 'male' ? 'Mr.' : 'Ms.';
    const title = ['University', 'Medical', 'Law', 'Business', 'Dental', 'Pharmacy', 'Veterinary', 'Nursing', 'Graduate'].includes(schoolType)
      ? `Prof. ${lastName}`
      : `${prefix} ${lastName}`;

    return {
      id: `teacher_${idx + 1}`,
      role: 'Teacher',
      subject: subj,
      firstName,
      lastName,
      fullName: title,
      gender,
      age,
      appearance: generateNpcAppearance(gender, age),
      relationship: getRandomInt(40, 75),
      strictness: getRandomInt(25, 80),
    };
  });
}

function generateSchoolClassmates(heroAge, countryCode, count = 6) {
  const classmates = [];
  for (let i = 0; i < count; i++) {
    const gender = Math.random() < 0.5 ? 'male' : 'female';
    const age = Math.max(5, heroAge + getRandomInt(-1, 1));
    const firstName = getRandomName(countryCode, gender, 'first');
    const lastName = getRandomName(countryCode, gender, 'last');

    classmates.push({
      id: `classmate_${i + 1}`,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      gender,
      age,
      appearance: generateNpcAppearance(gender, age),
      relationship: getRandomInt(35, 75),
      popularity: getRandomInt(20, 95),
      smarts: getRandomInt(30, 95),
      looks: getRandomInt(30, 95),
    });
  }
  return classmates;
}

export function generateSchool(type, heroAge, city, countryCode, major = null, funding = null, heroGender = 'male') {
  const isCollege = ['University', 'Community', 'Medical', 'Law', 'Business', 'Dental', 'Pharmacy', 'Veterinary', 'Nursing', 'Graduate'].includes(type);

  let schoolName = '';
  let totalYears = 4;
  let tuition = 0;

  if (type === 'Elementary') {
    const prefixes = [city, 'Lincoln', 'Oakridge', 'Sunnydale', 'Pinecrest', 'Meadowbrook'];
    schoolName = `${getRandomFromList(prefixes)} Elementary School`;
    totalYears = 5;
    tuition = 0;
  } else if (type === 'Middle') {
    const prefixes = [city, 'West Valley', 'Horizon', 'Crestview', 'Roosevelt'];
    schoolName = `${getRandomFromList(prefixes)} Middle School`;
    totalYears = 3;
    tuition = 0;
  } else if (type === 'High') {
    const prefixes = [city, 'Central', 'Northwood', 'St. Jude', 'Valley View', 'Westlake'];
    schoolName = `${getRandomFromList(prefixes)} High School`;
    totalYears = 4;
    tuition = 0;
  } else if (type === 'University') {
    const names = [`University of ${city}`, `${city} State University`, `${city} Institute of Technology`, `Metropolitan University`];
    schoolName = getRandomFromList(names);
    totalYears = 4;
    tuition = 15000;
  } else if (type === 'Community') {
    schoolName = `${city} Community College`;
    totalYears = 2;
    tuition = 3000;
  } else {
    const collegeInfo = educationData.colleges.find(c => c.school === type);
    schoolName = `${city} School of ${type}`;
    totalYears = collegeInfo?.years || 3;
    tuition = collegeInfo?.tuition || 30000;
  }

  // Pick school activities straight from the APK table (a16_school-activities):
  // stage flags + gender + country gates, weighted by commonness (1 rare … 5 ubiquitous).
  const apkActs = schoolData.activities;
  let stageFilter = null;
  let pickCount = 6;
  if (type === 'Elementary') {
    stageFilter = a => a.middleSchool && !a.requiresTryouts;
    pickCount = 4;
  } else if (type === 'Middle') {
    stageFilter = a => a.middleSchool;
    pickCount = 6;
  } else if (type === 'High') {
    stageFilter = a => a.highSchool;
    pickCount = 10;
  } else if (isCollege) {
    stageFilter = a => a.college;
    pickCount = 10;
  }
  let availableActivities = [];
  if (stageFilter) {
    const pool = apkActs.filter(a =>
      stageFilter(a)
      && (a.gender === 'both' || a.gender === heroGender)
      && (a.countries.includes('all') || a.countries.includes(countryCode))
    );
    // weighted sample without replacement, weight = commonness
    const workPool = pool.slice();
    while (workPool.length && availableActivities.length < pickCount) {
      const total = workPool.reduce((s, a) => s + a.commonness, 0);
      let roll = Math.random() * total;
      let idx = 0;
      for (let i = 0; i < workPool.length; i++) {
        roll -= workPool[i].commonness;
        if (roll <= 0) { idx = i; break; }
      }
      availableActivities.push(workPool.splice(idx, 1)[0]);
    }
  }

  // Cliques are active in Middle and High School (full APK clique table)
  const availableCliques = (type === 'Middle' || type === 'High') ? schoolData.cliques : [];

  return {
    type,
    name: schoolName,
    major: major || null,
    funding: funding || 'Free',
    tuition,
    totalYears,
    yearsAttended: 0,
    performance: getRandomInt(65, 85),
    principal: generateSchoolPrincipal(city, countryCode, isCollege),
    teachers: generateSchoolTeachers(type, countryCode),
    classmates: generateSchoolClassmates(heroAge, countryCode, 6),
    availableActivities,
    availableCliques,
  };
}

// ─── Education Actions ────────────────────────────────────────────────────────

export function studyHarder(state) {
  const currentSchool = state.hero.education?.currentSchool;
  if (!currentSchool) return { state, message: 'You are not currently enrolled in school.' };

  const boost = getRandomInt(10, 18);
  const newPerf = Math.min(100, currentSchool.performance + boost);
  const newSmarts = Math.min(100, state.hero.stats.smarts + getRandomInt(1, 2));

  const updatedSchool = { ...currentSchool, performance: newPerf };
  const message = `You studied hard for your classes at ${currentSchool.name}. Your performance improved to ${newPerf}%!`;

  const logEntry = {
    age: state.hero.age,
    icon: '📖',
    text: `I studied harder at ${currentSchool.name}.`,
    category: 'education',
  };

  return {
    state: {
      ...state,
      hero: {
        ...state.hero,
        stats: { ...state.hero.stats, smarts: newSmarts },
        education: {
          ...state.hero.education,
          currentSchool: updatedSchool,
        },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message,
  };
}

export function dropOutOfSchool(state) {
  const currentSchool = state.hero.education?.currentSchool;
  if (!currentSchool) return { state, message: 'You are not enrolled in school.' };

  if (state.hero.age < 16 && currentSchool.type === 'High') {
    return { state, message: 'You must be at least 16 years old to drop out of High School.' };
  }

  const schoolName = currentSchool.name;
  const isHigh = currentSchool.type === 'High';
  const newOcc = isHigh ? 'High School Dropout' : 'College Dropout';

  const logEntry = {
    age: state.hero.age,
    icon: '🚪',
    text: `I dropped out of ${schoolName}!`,
    category: 'education',
  };

  return {
    state: {
      ...state,
      hero: {
        ...state.hero,
        occupation: newOcc,
        education: {
          ...state.hero.education,
          currentSchool: null,
          clique: null,
          activities: [],
          activityRoles: {},
          activityRecords: {},
          schoolWeeklyHours: 0,
        },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `You dropped out of ${schoolName}!`,
  };
}

// ── School activities (full APK logic from a16_school-activities) ─────────────

export const findSchoolActivity = (name) => schoolData.activities.find(a => a.name === name);

// Reasons an activity is locked. Returns null when joinable.
export function activityGateReason(state, act) {
  const hero = state.hero;
  const school = hero.education?.currentSchool;
  const stats = normalizeExtendedStats(hero).stats;
  if (!act) return 'Not offered here.';
  const hasCountry = act.countries.includes('all') || act.countries.includes(hero.countryCode);
  const hasGender = act.gender === 'both' || act.gender === (hero.gender || 'male');
  if (!hasCountry || !hasGender) {
    return act.countries.includes('all')
      ? `Not offered to your gender at this school (${act.gender}).`
      : `Not offered in your country (needs ${act.countries.join(', ').toUpperCase()}).`;
  }
  if ((act.minGrades || 0) > (school?.performance ?? 100)) {
    return `Needs ${act.minGrades}% grades (yours: ${Math.round(school?.performance ?? 0)}%).`;
  }
  const statGates = [
    [(act.minHealth || 0) > stats.health, `Needs ${act.minHealth}%+ health`],
    [(act.minSmarts || 0) > stats.smarts, `Needs ${act.minSmarts}%+ smarts`],
    [(act.minAthleticism || 0) > stats.athleticism, `Needs ${act.minAthleticism}%+ athleticism`],
    [(act.minLooks || 0) > stats.looks, `Needs ${act.minLooks}%+ looks`],
    [(act.minPopularity || 0) > stats.popularity, `Needs ${act.minPopularity}%+ popularity`],
  ];
  for (const [fails, why] of statGates) if (fails) return why + '.';
  return null;
}

// Tryout relevance by activity kind — APK flags decide which stat carries you.
function tryoutScoreFor(state, act) {
  const stats = normalizeExtendedStats(state.hero).stats;
  if (act.flags.sports || act.kind.startsWith('Athletics')) {
    return stats.athleticism * 0.55 + stats.health * 0.3 + stats.popularity * 0.15;
  }
  if (act.flags.acting) return stats.looks * 0.6 + stats.smarts * 0.4;
  if (act.flags.band || act.flags.arts) return stats.smarts * 0.5 + stats.looks * 0.5;
  if (act.flags.gaming || act.flags.weeb) return stats.smarts * 0.7 + stats.happiness * 0.3;
  return stats.smarts * 0.7 + stats.looks * 0.3;
}

// Lazy migration: athleticism + popularity are real APK stats; give existing saves them.
export function normalizeExtendedStats(hero) {
  const s = hero.stats || {};
  if (s.athleticism === undefined || s.popularity === undefined) {
    const age = hero.age || 0;
    return {
      ...hero,
      stats: {
        ...s,
        athleticism: s.athleticism !== undefined ? s.athleticism
          : Math.max(5, Math.min(60, 20 + age * 2)),
        popularity: s.popularity !== undefined ? s.popularity
          : 40,
      },
    };
  }
  return hero;
}

export function joinSchoolActivity(state, activityName) {
  const hero = normalizeExtendedStats(state.hero);
  state = { ...state, hero };
  const currentSchool = hero.education?.currentSchool;
  if (!currentSchool) return { state, message: 'You are not enrolled in school.' };

  const act = findSchoolActivity(activityName)
    // Older saves may still hold legacy activity rows (old education-data keys).
    || (() => {
      const legacy = currentSchool.availableActivities.find(a => a.name === activityName);
      if (!legacy) return null;
      return {
        name: legacy.name || activityName,
        kind: legacy.type || 'Hobby',
        gender: 'both',
        countries: ['all'],
        weeklyHours: legacy.weeklyHours || 4,
        flags: {
          sports: !!legacy.sports, nerd: !!legacy.nerd, band: !!legacy.band,
          arts: !!legacy.arts, acting: !!legacy.acting, gaming: false, weeb: false,
        },
        minHealth: 0, minSmarts: legacy.minSmarts || 0, minAthleticism: legacy.minAthleticism || 0,
        minLooks: 0, minPopularity: 0, minGrades: legacy.minGrades || 0,
        popularityScoreMale: 0, popularityScoreFemale: 0,
        requiresTryouts: false,
        leaderTitle: 'President',
        otherOfficers: ['Vice-President', 'Secretary', 'Treasurer'],
        referenceNoun: 'club',
        trackPerformance: false,
        commonness: 1,
      };
    })();
  if (!act) return { state, message: 'Activity not found.' };

  // Not offered by this school? (stage flags already selected at enrollment)
  if (!currentSchool.availableActivities?.some(a => a.name === activityName)) {
    return { state, message: `The ${currentSchool.type} school doesn't have a ${activityName} this year.` };
  }

  if ((hero.education.activities || []).includes(activityName)) {
    return { state, message: `You are already in the ${activityName}.` };
  }

  const locked = activityGateReason(state, act);
  if (locked) {
    return { state, message: `${activityName}: ${locked}` };
  }

  // Requires tryouts? Roll your relevant stats. APK marks tryout clubs explicitly.
  if (act.requiresTryouts) {
    const score = tryoutScoreFor(state, act);
    const odds = Math.max(0.12, Math.min(0.92, 0.42 + (score - 50) * 0.008));
    if (Math.random() >= odds) {
      const logEntry = {
        age: hero.age,
        icon: '❌',
        text: `I showed up to ${activityName} tryouts but didn't make the cut.`,
        category: 'education',
      };
      return {
        state: {
          ...state,
          hero: { ...hero, stats: { ...hero.stats, happiness: Math.max(0, hero.stats.happiness - 4), athleticism: Math.min(100, hero.stats.athleticism + 1) } },
          lifeLog: [logEntry, ...state.lifeLog],
        },
        message: `You tried out for ${activityName}… and got cut. (Happiness −4 | a little experience gained)`,
        statDeltas: { happiness: -4 },
      };
    }
  }

  const isTeam = act.trackPerformance || act.kind === 'Athletics Team';
  const currentActs = hero.education.activities || [];

  const logEntry = {
    age: hero.age,
    icon: act.flags.sports ? '⚽' : act.flags.band ? '🎺' : act.kind === 'Athletics Team' ? '🏈' : '🎭',
    text: act.requiresTryouts
      ? `I made the cut at the ${activityName} tryouts!${isTeam ? ' Season record: 0W – 0L' : ''}`
      : `I joined the ${activityName} at ${currentSchool.name}.`,
    category: 'education',
  };

  const nextRoles = { ...(hero.education.activityRoles || {}) };
  nextRoles[activityName] = 'Member';
  const nextRecords = isTeam ? { ...(hero.education.activityRecords || {}), [activityName]: '0W – 0L' } : (hero.education.activityRecords || {});
  const hoursDelta = act.weeklyHours || 4;

  return {
    state: {
      ...state,
      hero: {
        ...hero,
        stats: {
          ...hero.stats,
          happiness: Math.min(100, hero.stats.happiness + 5),
          athleticism: act.flags.sports ? Math.min(100, hero.stats.athleticism + 2) : hero.stats.athleticism,
        },
        education: {
          ...hero.education,
          activities: [...currentActs, activityName],
          activityRoles: nextRoles,
          activityRecords: nextRecords,
          schoolWeeklyHours: (hero.education.schoolWeeklyHours || 0) + hoursDelta,
        },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: act.requiresTryouts
      ? `Tryouts passed! Welcome to the ${activityName}! (Happiness +5${act.flags.sports ? ' | Athleticism +2' : ''})`
      : `You successfully joined the ${activityName}! (~${hoursDelta} hrs/week) (Happiness +5)`,
    statDeltas: { happiness: 5 },
  };
}

export function leaveSchoolActivity(state, activityName) {
  const hero = state.hero;
  const currentActs = hero.education?.activities || [];
  const act = findSchoolActivity(activityName);
  const wasRole = (hero.education.activityRoles || {})[activityName];

  if (!currentActs.includes(activityName)) {
    return { state, message: `You are not in the ${activityName}.` };
  }

  const nextActs = currentActs.filter(a => a !== activityName);
  const nextRoles = { ...(hero.education.activityRoles || {}) };
  delete nextRoles[activityName];
  const nextRecords = { ...(hero.education.activityRecords || {}) };
  delete nextRecords[activityName];

  const logEntry = {
    age: hero.age,
    icon: '👋',
    text: wasRole && act && wasRole === act.leaderTitle
      ? `I stepped down as ${wasRole} of the ${activityName}.`
      : `I quit the ${activityName}.`,
    category: 'education',
  };

  return {
    state: {
      ...state,
      hero: {
        ...hero,
        education: {
          ...hero.education,
          activities: nextActs,
          activityRoles: nextRoles,
          activityRecords: nextRecords,
          schoolWeeklyHours: Math.max(0, (hero.education.schoolWeeklyHours || 0) - (act?.weeklyHours || 4)),
        },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `You quit the ${activityName}.`,
  };
}

// ── Officer elections (APK Leader Title / Other Officers) ────────────────────
// Every club/team has a leadership (President, Captain, Drum Major…) and a
// lower officer bench (VP, Co-Captain…). Elections lean on popularity.
export function runForSchoolOffice(state, activityName, raceLeader = true) {
  const hero = state.hero;
  const school = hero.education?.currentSchool;
  if (!school) return { state, message: 'You are not enrolled in school.' };
  const act = findSchoolActivity(activityName);
  if (!act) return { state, message: 'Activity not found.' };

  const roles = { ...(hero.education.activityRoles || {}) };
  const role = roles[activityName];
  if (!role) return { state, message: `You need to join the ${activityName} first.` };
  if (role === act.leaderTitle) {
    return { state, message: `You are already the ${act.leaderTitle} of the ${activityName}!` };
  }

  const stats = normalizeExtendedStats(hero).stats;
  // Non-leaders can wind up with a bench office (VP etc.) if they don't take the crown.
  const medalOffice = raceLeader && role === 'Member' && act.otherOfficers.length > 0 && Math.random() < 0.4;
  const office = (medalOffice ? act.otherOfficers[0] : raceLeader ? act.leaderTitle : act.otherOfficers[0])
    || act.leaderTitle;
  const odds = Math.max(0.2, Math.min(0.8, 0.3 + stats.popularity / 250 + stats.happiness / 400));
  if (Math.random() < odds) {
    roles[activityName] = office;
    return {
      state: {
        ...state,
        hero: {
          ...hero,
          stats: { ...normalizeExtendedStats(hero).stats, popularity: Math.min(100, stats.popularity + 3) },
          education: { ...hero.education, activityRoles: roles },
        },
        lifeLog: [{
          age: hero.age,
          icon: '🏅',
          text: `I was elected ${office} of the ${activityName}!`,
          category: 'education',
        }, ...state.lifeLog],
      },
      message: `You're now ${office} of the ${activityName}! (Popularity +3)`,
      statDeltas: { happiness: 4 },
    };
  }
  return {
    state: {
      ...state,
      hero: { ...hero, stats: { ...hero.stats, happiness: Math.max(0, hero.stats.happiness - 3) } },
      lifeLog: [{
        age: hero.age,
        icon: '🗳️',
        text: `I lost the election for ${act.leaderTitle} of the ${activityName}.`,
        category: 'education',
      }, ...state.lifeLog],
    },
    message: `You lost the race for ${act.leaderTitle} of the ${activityName}. (Happiness −3)`,
    statDeltas: { happiness: -3 },
  };
}

export function joinSchoolClique(state, cliqueName) {
  const state2 = state; // alias for readability
  const hero = normalizeExtendedStats(state2.hero);
  const currentSchool = hero.education?.currentSchool;
  if (!currentSchool) return { state, message: 'You are not enrolled in school.' };

  const clique = schoolData.cliques.find(c => c.name === cliqueName)
    || educationData.cliques.find(c => c.name === cliqueName
      && Object.assign(c, { maxGrades: 100, maxSmarts: 100, maxLooks: 100, maxPopularity: 100, maxHappiness: 100, gender: 'both' }));
  if (!clique) return { state, message: 'Clique not found.' };

  const stats = normalizeExtendedStats(hero).stats;
  const grades = currentSchool.performance || 0;
  const acts = (hero.education.activities || []).map(nm => findSchoolActivity(nm));
  const hasFlag = flag => acts.some(a => a?.flags?.[flag]);
  const isSkater = acts.some(a => a?.name === 'Skateboarding Club');
  const trouble = (hero.education.troublePoints || 0) >= 2;

  const checks = [];
  if (clique.gender !== 'both' && clique.gender !== (hero.gender || 'male')) checks.push(`only ${clique.gender}s`);
  if ((clique.minAthleticism || 0) > stats.athleticism) checks.push(`athleticism ${clique.minAthleticism}+ (yours ${stats.athleticism})`);
  if ((clique.minGrades || 0) > grades) checks.push(`grades ${clique.minGrades}+`);
  if ((clique.maxGrades || 100) < grades) checks.push(`grades under ${clique.maxGrades}`);
  if ((clique.minSmarts || 0) > stats.smarts) checks.push(`smarts ${clique.minSmarts}+`);
  if ((clique.maxSmarts || 100) < stats.smarts) checks.push(`smarts under ${clique.maxSmarts}`);
  if ((clique.minLooks || 0) > stats.looks) checks.push(`looks ${clique.minLooks}+`);
  if ((clique.maxLooks || 100) < stats.looks) checks.push(`looks under ${clique.maxLooks}`);
  if ((clique.minPopularity || 0) > stats.popularity) checks.push(`popularity ${clique.minPopularity}+`);
  if ((clique.maxPopularity || 100) < stats.popularity) checks.push(`popularity under ${clique.maxPopularity}`);
  if ((clique.maxHappiness || 100) < stats.happiness) checks.push(`happiness under ${clique.maxHappiness}`);
  if (clique.requiresNerdActivity && !hasFlag('nerd')) checks.push('a nerd activity');
  if (clique.requiresSportsActivity && !hasFlag('sports')) checks.push('a sports team');
  if (clique.requiresBandActivity && !hasFlag('band')) checks.push('a band');
  if (clique.requiresActingActivity && !hasFlag('acting')) checks.push('an acting activity');
  if (clique.requiresArtsActivity && !hasFlag('arts')) checks.push('an arts activity');
  if (clique.requiresGamingActivity && !hasFlag('gaming')) checks.push('a gaming activity');
  if (clique.requiresWeebActivity && !hasFlag('weeb')) checks.push('a weeb activity');
  if (clique.requiresSkateboarding && !isSkater) checks.push('the Skateboarding Club');
  if (clique.requiresTrouble && !trouble) checks.push('a track record of trouble');
  if (clique.requiresNoActivities && acts.filter(Boolean).length > 0) checks.push('no activities at all');
  // Boolean-only legacy cliques from older saves: fall back on the old stat checks
  if (!clique.maxGrades && clique.maxGrades !== 100 && (clique.minSmarts || clique.minLooks || clique.minGrades)) {
    if (stats.smarts < (clique.minSmarts || 0)) checks.push(`smarts ${clique.minSmarts}+ (you: ${stats.smarts})`);
    if (stats.looks < (clique.minLooks || 0)) checks.push(`looks ${clique.minLooks}+`);
    if (grades < (clique.minGrades || 0)) checks.push(`grades ${clique.minGrades}+`);
    if (clique.requiresTrouble && !trouble) checks.push('a track record of trouble');
  }

  if (checks.length === 0) {
    const nextHappy = Math.min(100, stats.happiness + 10);
    const popGain = clique.popularityScore || (clique.popularity > 60 ? 3 : 1);
    const logEntry = {
      age: hero.age,
      icon: '👥',
      text: `I was accepted into the ${cliqueName} clique!`,
      category: 'education',
    };
    return {
      state: {
        ...state2,
        hero: {
          ...hero,
          stats: { ...stats, happiness: nextHappy, popularity: Math.min(100, stats.popularity + popGain) },
          education: {
            ...hero.education,
            clique: cliqueName,
          },
        },
        lifeLog: [logEntry, ...state.lifeLog],
      },
      message: `The ${cliqueName} welcomed you into their clique! (+Popularity ${popGain})`,
      statDeltas: { happiness: 10 },
    };
  }
  const nextHappy = Math.max(0, stats.happiness - 6);
  const logEntry = {
    age: hero.age,
    icon: '😒',
    text: `The ${cliqueName} clique rejected me.`,
    category: 'education',
  };
  return {
    state: {
      ...state2,
      hero: {
        ...hero,
        stats: { ...stats, happiness: nextHappy },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `The ${cliqueName} rejected you — need ${checks.slice(0, 2).join(' & ')}.`,
  };
}

export function interactWithTeacher(teacherId, action, state) {
  const currentSchool = state.hero.education?.currentSchool;
  if (!currentSchool) return { state, message: 'You are not enrolled in school.' };

  const isPrincipal = currentSchool.principal?.id === teacherId;
  const teacher = isPrincipal
    ? currentSchool.principal
    : currentSchool.teachers?.find(t => t.id === teacherId);

  if (!teacher) return { state, message: 'Teacher not found.' };

  let message = '';
  let relChange = 0;
  let perfChange = 0;
  let troubleAdd = 0;
  let logText = '';
  let logIcon = '👩‍🏫';

  if (action === 'suck_up') {
    const rawTemplate = getRandomFromList(educationData.teacherSuckups) || 'You complimented <teacher>.';
    message = resolveScenarioText(rawTemplate, { teacher });
    relChange = getRandomInt(12, 22);
    perfChange = getRandomInt(4, 8);
    logText = message;
    logIcon = '🍎';
  } else if (action === 'disrespect') {
    const rawTemplate = getRandomFromList(educationData.teacherDisrespects) || 'You disrespected <teacher>.';
    message = resolveScenarioText(rawTemplate, { teacher });
    relChange = -getRandomInt(25, 45);
    troubleAdd = 1;
    perfChange = -getRandomInt(3, 8);

    // Chance of being sent to Principal
    if (Math.random() < 0.45 && !isPrincipal) {
      const warnRaw = getRandomFromList(educationData.principalWarnings) || '<principal> disciplined you.';
      const principalMsg = resolveScenarioText(warnRaw, { principal: currentSchool.principal });
      message += ` You were sent to the Principal's office! ${principalMsg}`;
    }
    logText = message;
    logIcon = '🤬';
  } else if (action === 'ask_help') {
    if (teacher.relationship >= 45) {
      perfChange = getRandomInt(8, 15);
      relChange = getRandomInt(3, 8);
      message = `${teacher.fullName} was glad to help you and answered all of your questions.`;
    } else {
      message = `${teacher.fullName} brushed you off and told you to read the textbook.`;
    }
    logText = message;
    logIcon = '🙋';
  }

  // Update teacher relationship
  let updatedPrincipal = currentSchool.principal;
  let updatedTeachers = currentSchool.teachers;

  if (isPrincipal) {
    updatedPrincipal = {
      ...currentSchool.principal,
      relationship: Math.max(0, Math.min(100, currentSchool.principal.relationship + relChange)),
    };
  } else {
    updatedTeachers = currentSchool.teachers.map(t => {
      if (t.id === teacherId) {
        return {
          ...t,
          relationship: Math.max(0, Math.min(100, t.relationship + relChange)),
        };
      }
      return t;
    });
  }

  const nextPerf = Math.max(0, Math.min(100, currentSchool.performance + perfChange));
  const nextTrouble = (state.hero.education.troublePoints || 0) + troubleAdd;

  const logEntry = {
    age: state.hero.age,
    icon: logIcon,
    text: logText,
    category: 'education',
  };

  return {
    state: {
      ...state,
      hero: {
        ...state.hero,
        education: {
          ...state.hero.education,
          troublePoints: nextTrouble,
          currentSchool: {
            ...currentSchool,
            performance: nextPerf,
            principal: updatedPrincipal,
            teachers: updatedTeachers,
          },
        },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message,
  };
}

export function interactWithClassmate(classmateId, action, state) {
  const currentSchool = state.hero.education?.currentSchool;
  if (!currentSchool) return { state, message: 'You are not enrolled in school.' };

  const classmate = currentSchool.classmates?.find(c => c.id === classmateId);
  if (!classmate) return { state, message: 'Classmate not found.' };

  let message = '';
  let relChange = 0;
  let happyChange = 0;
  let logText = '';
  let logIcon = '🎒';

  if (action === 'befriend') {
    relChange = getRandomInt(12, 24);
    happyChange = getRandomInt(4, 9);
    message = `You spent quality time with ${classmate.fullName} and laughed together.`;
    logText = `I hung out with my classmate ${classmate.fullName}.`;
    logIcon = '💬';
  } else if (action === 'flirt') {
    if (state.hero.age < 12) {
      return { state, message: 'You are too young to flirt!' };
    }
    const success = classmate.relationship >= 50 || state.hero.stats.looks >= 60;
    if (success) {
      relChange = getRandomInt(14, 25);
      happyChange = getRandomInt(8, 15);
      message = `You flirted with ${classmate.fullName}, and they smiled and blushed!`;
      logText = `I flirted with ${classmate.fullName}.`;
      logIcon = '💘';
    } else {
      relChange = -getRandomInt(8, 16);
      happyChange = -getRandomInt(4, 8);
      message = `You flirted with ${classmate.fullName}, but they gave you an awkward look and walked away.`;
      logText = `I flirted with ${classmate.fullName}, but was rejected.`;
      logIcon = '💔';
    }
  } else if (action === 'prank') {
    const rawTemplate = getRandomFromList(educationData.classmatePranks) || 'You pulled a prank on <classmate>.';
    const prankText = resolveScenarioText(rawTemplate, { classmate });
    const laughs = Math.random() < 0.5;

    if (laughs) {
      relChange = getRandomInt(8, 18);
      happyChange = getRandomInt(6, 12);
      message = `${prankText} They found it hilarious and laughed out loud!`;
    } else {
      relChange = -getRandomInt(20, 35);
      happyChange = -getRandomInt(5, 10);
      message = `${prankText} They were furious and threatened to report you!`;
    }
    logText = message;
    logIcon = '🤪';
  }

  const updatedClassmates = currentSchool.classmates.map(c => {
    if (c.id === classmateId) {
      return {
        ...c,
        relationship: Math.max(0, Math.min(100, c.relationship + relChange)),
      };
    }
    return c;
  });

  const nextHappy = Math.max(0, Math.min(100, state.hero.stats.happiness + happyChange));

  const logEntry = {
    age: state.hero.age,
    icon: logIcon,
    text: logText,
    category: 'education',
  };

  return {
    state: {
      ...state,
      hero: {
        ...state.hero,
        stats: { ...state.hero.stats, happiness: nextHappy },
        education: {
          ...state.hero.education,
          currentSchool: {
            ...currentSchool,
            classmates: updatedClassmates,
          },
        },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message,
  };
}

export function applyToHigherEducation(state, schoolType, major, fundingSource) {
  if (state.hero.age < 18) {
    return { state, message: 'You must be at least 18 years old to attend higher education.' };
  }

  if (state.hero.education?.currentSchool) {
    return { state, message: 'You are already enrolled in school. Drop out first.' };
  }

  const collegeInfo = educationData.colleges.find(c => c.school === schoolType);
  if (!collegeInfo) return { state, message: 'Unknown school type.' };

  // Prerequisite check for Graduate / Professional schools
  if (schoolType !== 'Undergraduate' && schoolType !== 'Community') {
    const hasUndergrad = state.hero.education?.undergraduateMajor;
    if (!hasUndergrad) {
      return { state, message: `You need a University Bachelor's Degree before applying to ${schoolType} School!` };
    }
    if (collegeInfo.prerequisites?.length > 0 && !collegeInfo.prerequisites.includes(hasUndergrad)) {
      return {
        state,
        message: `${schoolType} School requires a Bachelor's Degree in: ${collegeInfo.prerequisites.join(', ')}. Your degree is in ${hasUndergrad}.`,
      };
    }
  }

  // Funding evaluation
  const annualTuition = collegeInfo.tuition || 15000;
  let finalFunding = fundingSource;
  let tuitionDeduction = 0;

  if (fundingSource === 'Scholarship') {
    if (state.hero.stats.smarts < 75) {
      return { state, message: 'Your scholarship application was rejected because your Smarts are below 75%!' };
    }
  } else if (fundingSource === 'Parents') {
    const momAgrees = state.relationships.mother?.alive && state.relationships.mother.relationship >= 65 && state.relationships.mother.generosity >= 35;
    const dadAgrees = state.relationships.father?.alive && state.relationships.father.relationship >= 65 && state.relationships.father.generosity >= 35;
    if (!momAgrees && !dadAgrees) {
      return { state, message: 'Your parents refused to pay for your college tuition!' };
    }
  } else if (fundingSource === 'Cash') {
    if (state.hero.bankBalance < annualTuition) {
      return { state, message: `You do not have enough money in your bank account ($${state.hero.bankBalance}) to pay the annual tuition ($${annualTuition}).` };
    }
    tuitionDeduction = annualTuition;
  }

  const newSchool = generateSchool(schoolType, state.hero.age, state.hero.city, state.hero.countryCode, major, finalFunding, state.hero.gender);
  const newOccupation = `${schoolType} Student`;

  const logEntry = {
    age: state.hero.age,
    icon: '🏛️',
    text: `I was accepted into ${newSchool.name} to study ${major || schoolType}! (Funding: ${finalFunding})`,
    category: 'education',
  };

  return {
    state: {
      ...state,
      hero: {
        ...state.hero,
        occupation: newOccupation,
        bankBalance: state.hero.bankBalance - tuitionDeduction,
        education: {
          ...state.hero.education,
          currentMajor: major,
          currentSchool: newSchool,
        },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `Congratulations! You were accepted into ${newSchool.name}!`,
  };
}

// ─── BitLife Authentic Job & Career System ───────────────────────────────────

export function generateCompanyName(companyType, city) {
  const prefix = getRandomFromList(jobsData.companyPrefixes) || 'Apex';
  const suffix = getRandomFromList(jobsData.companySuffixes) || 'Technologies';

  if (companyType === 'Hospital') return `${city} Memorial Hospital`;
  if (companyType === 'School District' || companyType === 'Public School') return `${city} Public Schools`;
  if (companyType === 'Police Department') return `${city} Police Department`;
  if (companyType === 'Fire Department') return `${city} Fire & Rescue`;
  if (companyType === 'University District' || companyType === 'University') return `${city} State University`;
  if (companyType === 'Bank' || companyType === 'Banking Corporation') return `${prefix} National Bank`;
  if (companyType === 'Airline') return `${prefix} Airlines`;
  if (companyType === 'Law Firm') return `${prefix} & Partners Law`;
  if (companyType === 'App Developer' || companyType === 'Software') return `${prefix} Interactive`;
  if (companyType === 'Film Studio') return `${prefix} Pictures`;
  if (companyType === 'Publisher') return `${prefix} Publishing House`;
  if (companyType === 'Restaurant') return `${prefix} Bistro`;
  if (companyType === 'Farm') return `${prefix} Family Farms`;

  return `${prefix} ${suffix}`;
}

export function generateJobSupervisor(companyType, countryCode) {
  const gender = Math.random() < 0.5 ? 'male' : 'female';
  const age = getRandomInt(36, 64);
  const firstName = getRandomName(countryCode, gender, 'first');
  const lastName = getRandomName(countryCode, gender, 'last');

  return {
    id: 'supervisor_main',
    role: 'Supervisor',
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    gender,
    age,
    appearance: generateNpcAppearance(gender, age),
    relationship: getRandomInt(50, 75),
    strictness: getRandomInt(25, 80),
    professionalism: getRandomInt(35, 85),
  };
}

export function generateCoworkers(count, countryCode) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const gender = Math.random() < 0.5 ? 'male' : 'female';
    const age = getRandomInt(21, 58);
    const firstName = getRandomName(countryCode, gender, 'first');
    const lastName = getRandomName(countryCode, gender, 'last');

    list.push({
      id: `coworker_${i + 1}`,
      role: 'Coworker',
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      gender,
      age,
      appearance: generateNpcAppearance(gender, age),
      relationship: getRandomInt(40, 75),
      craziness: getRandomInt(10, 70),
    });
  }
  return list;
}

export function generateJobListings(hero) {
  const standard = jobsData.careers.filter(c => !c.isHoliday);
  const shuffled = [...standard].sort(() => 0.5 - Math.random()).slice(0, 14);

  return shuffled.map((c, i) => {
    const company = generateCompanyName(c.companyType, hero.city);
    const salaryVariance = getRandomInt(-5, 5) / 100;
    const salary = Math.round(c.startingSalary * (1 + salaryVariance));
    const initialTitle = (c.seniorityTrack && c.seniorityTrack.length > 0) ? c.seniorityTrack[0] : c.name;

    return {
      id: `listing_${i}_${Date.now()}`,
      career: c,
      title: initialTitle,
      companyName: company,
      companyType: c.companyType,
      salary,
      education: c.education,
      major: c.major,
      minAge: c.minAge,
      minSmarts: c.minSmarts,
      minLooks: c.minLooks,
    };
  });
}

export function generatePartTimeListings(hero) {
  const shuffled = [...jobsData.partTimeJobs].sort(() => 0.5 - Math.random()).slice(0, 8);

  return shuffled.map((j, i) => {
    const company = generateCompanyName(j.companyType, hero.city);
    const hourlyRate = getRandomInt(j.minHourlyRate, j.maxHourlyRate || j.minHourlyRate + 5);
    const weeklyHours = getRandomInt(j.minHours, j.maxHours);
    const annualEarnings = hourlyRate * weeklyHours * 52;

    return {
      id: `pt_listing_${i}_${Date.now()}`,
      job: j,
      title: j.name,
      companyName: company,
      companyType: j.companyType,
      hourlyRate,
      weeklyHours,
      annualEarnings,
      minAge: j.minAge,
      mustBeStudent: j.mustBeStudent,
    };
  });
}

export function applyForJob(state, listing) {
  const hero = state.hero;

  if (hero.age < listing.minAge) {
    return {
      qualified: false,
      message: `You must be at least ${listing.minAge} years old to apply for this position.`,
    };
  }

  const reqEdu = listing.education;
  const degrees = hero.education?.degrees || [];
  const degreeNames = degrees.map(d => d.name);
  const undergradMajor = hero.education?.undergraduateMajor;

  if (reqEdu === 'High School') {
    const hasHS = degreeNames.some(d => d.includes('High School')) || degrees.length > 0;
    if (!hasHS) {
      return {
        qualified: false,
        message: 'This job requires a High School Diploma.',
      };
    }
  } else if (reqEdu === 'Community College') {
    const hasCollege = degreeNames.some(d => d.includes('Associate') || d.includes('Bachelor') || d.includes('Degree'));
    if (!hasCollege) {
      return {
        qualified: false,
        message: 'This job requires an Associate Degree or higher.',
      };
    }
  } else if (reqEdu === 'Undergraduate') {
    const hasBachelors = degreeNames.some(d => d.includes("Bachelor's"));
    if (!hasBachelors) {
      return {
        qualified: false,
        message: 'This job requires a University Bachelor\'s Degree.',
      };
    }
    if (listing.major && listing.major.length > 0) {
      const matchesMajor = listing.major.some(m => undergradMajor && undergradMajor.toLowerCase().includes(m.toLowerCase()));
      if (!matchesMajor) {
        return {
          qualified: false,
          message: `This position requires a degree in: ${listing.major.join(', ')}. Your degree is in ${undergradMajor || 'another field'}.`,
        };
      }
    }
  } else if (reqEdu === 'Graduate') {
    const hasGrad = degreeNames.some(d => d.includes("Master's") || d.includes("Doctor") || d.includes("Ph.D."));
    if (!hasGrad) {
      return {
        qualified: false,
        message: 'This job requires a Graduate / Master\'s Degree.',
      };
    }
  } else if (reqEdu === 'Medical') {
    const hasMed = degreeNames.some(d => d.includes("Medicine") || d.includes("M.D."));
    if (!hasMed) {
      return {
        qualified: false,
        message: 'This medical position requires graduation from Medical School (M.D.).',
      };
    }
  } else if (reqEdu === 'Law') {
    const hasLaw = degreeNames.some(d => d.includes("Juris Doctor") || d.includes("J.D."));
    if (!hasLaw) {
      return {
        qualified: false,
        message: 'This legal position requires a Law School Degree (J.D.).',
      };
    }
  } else if (reqEdu === 'Dental') {
    const hasDental = degreeNames.some(d => d.includes("Dental") || d.includes("D.D.S."));
    if (!hasDental) {
      return {
        qualified: false,
        message: 'This position requires a Dental School Degree (D.D.S.).',
      };
    }
  } else if (reqEdu === 'Pharmacy') {
    const hasPharm = degreeNames.some(d => d.includes("Pharmacy") || d.includes("Pharm.D."));
    if (!hasPharm) {
      return {
        qualified: false,
        message: 'This position requires a Pharmacy School Degree (Pharm.D.).',
      };
    }
  } else if (reqEdu === 'Veterinary') {
    const hasVet = degreeNames.some(d => d.includes("Veterinary") || d.includes("D.V.M."));
    if (!hasVet) {
      return {
        qualified: false,
        message: 'This position requires a Veterinary School Degree (D.V.M.).',
      };
    }
  } else if (reqEdu === 'Nursing') {
    const hasNurse = degreeNames.some(d => d.includes("Nursing") || d.includes("BSN"));
    if (!hasNurse) {
      return {
        qualified: false,
        message: 'This position requires a Nursing Degree (BSN).',
      };
    }
  }

  if (hero.stats.smarts < (listing.minSmarts || 0)) {
    return {
      qualified: false,
      message: 'The employer determined that your qualifications do not meet their technical criteria.',
    };
  }

  const interviewQuestion = getRandomFromList(jobsData.interviewQuestions);

  return {
    qualified: true,
    interviewQuestion,
  };
}

export function answerJobInterview(state, listing, choiceIndex, interviewQuestion) {
  const choice = interviewQuestion.choices[choiceIndex];
  const choiceScore = choice?.score || 3;
  const hero = state.hero;

  const passed = choiceScore >= 3 && (hero.stats.smarts + getRandomInt(-10, 10)) >= 25;

  if (!passed) {
    const logEntry = {
      age: hero.age,
      icon: '❌',
      text: `I interviewed for the ${listing.title} position at ${listing.companyName}, but they did not offer me the job.`,
      category: 'career',
    };
    return {
      hired: false,
      state: {
        ...state,
        hero: {
          ...hero,
          stats: {
            ...hero.stats,
            happiness: Math.max(0, hero.stats.happiness - 4),
          },
        },
        lifeLog: [logEntry, ...state.lifeLog],
      },
      message: `The interviewer thanked you for your time, but decided to pursue other candidates.`,
    };
  }

  const supervisor = generateJobSupervisor(listing.companyType, hero.countryCode);
  const coworkers = generateCoworkers(getRandomInt(3, 5), hero.countryCode);

  const newJob = {
    id: `job_${Date.now()}`,
    title: listing.title,
    careerName: listing.career.name,
    companyName: listing.companyName,
    companyType: listing.companyType,
    salary: listing.salary,
    performance: getRandomInt(65, 80),
    stress: (listing.career.stressScore || 1) * 12,
    hoursPerWeek: 40,
    yearsAtCompany: 0,
    seniorityTrack: listing.career.seniorityTrack || [],
    trackIndex: 0,
    salaryCap: listing.career.salaryCap || listing.salary * 3,
    supervisor,
    coworkers,
  };

  const logEntry = {
    age: hero.age,
    icon: '💼',
    text: `I began working as a ${listing.title} at ${listing.companyName} with a starting salary of $${listing.salary.toLocaleString()}/yr!`,
    category: 'career',
  };

  return {
    hired: true,
    state: {
      ...state,
      hero: {
        ...hero,
        occupation: listing.title,
        job: newJob,
        stats: {
          ...hero.stats,
          happiness: Math.min(100, hero.stats.happiness + 15),
        },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `Congratulations! You were hired as a ${listing.title} at ${listing.companyName}! Starting salary: $${listing.salary.toLocaleString()}/yr.`,
  };
}

export function applyForPartTimeJob(state, listing) {
  const hero = state.hero;
  if (hero.age < listing.minAge) {
    return {
      success: false,
      message: `You must be at least ${listing.minAge} years old to work this part-time job.`,
    };
  }
  if (listing.mustBeStudent && !hero.education?.currentSchool) {
    return {
      success: false,
      message: 'This part-time job is only available for active students.',
    };
  }

  const newPt = {
    id: `pt_${Date.now()}`,
    title: listing.title,
    companyName: listing.companyName,
    companyType: listing.companyType,
    hourlyRate: listing.hourlyRate,
    weeklyHours: listing.weeklyHours,
    annualEarnings: listing.annualEarnings,
  };

  const logEntry = {
    age: hero.age,
    icon: '⏱️',
    text: `I started a part-time job as a ${listing.title} at ${listing.companyName} ($${listing.hourlyRate}/hr, ${listing.weeklyHours} hrs/week).`,
    category: 'career',
  };

  return {
    success: true,
    state: {
      ...state,
      hero: {
        ...hero,
        partTimeJob: newPt,
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `You started working part-time as a ${listing.title} at ${listing.companyName}!`,
  };
}

export function workHarderAtJob(state) {
  const job = state.hero.job;
  if (!job) return { state, message: 'You do not have a full-time job.' };

  const perfBoost = getRandomInt(12, 18);
  const newPerf = Math.min(100, job.performance + perfBoost);
  const newStress = Math.min(100, (job.stress || 20) + getRandomInt(3, 6));

  const logEntry = {
    age: state.hero.age,
    icon: '💼',
    text: `I put in extra hours and worked harder at ${job.companyName}.`,
    category: 'career',
  };

  return {
    state: {
      ...state,
      hero: {
        ...state.hero,
        job: {
          ...job,
          performance: newPerf,
          stress: newStress,
        },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `You worked harder! Your job performance is now ${newPerf}%.`,
  };
}

export function askForRaise(state) {
  const job = state.hero.job;
  if (!job) return { state, message: 'You do not have a full-time job.' };

  const earnsRaise = job.performance >= 65 && (job.supervisor?.relationship || 50) >= 45;

  if (earnsRaise) {
    const raisePct = getRandomInt(5, 11) / 100;
    const newSalary = Math.min(job.salaryCap || 500000, Math.round(job.salary * (1 + raisePct)));
    const logEntry = {
      age: state.hero.age,
      icon: '💵',
      text: `My supervisor gave me a raise at ${job.companyName}! My salary is now $${newSalary.toLocaleString()}/yr.`,
      category: 'financial',
    };
    return {
      state: {
        ...state,
        hero: {
          ...state.hero,
          job: { ...job, salary: newSalary },
          stats: { ...state.hero.stats, happiness: Math.min(100, state.hero.stats.happiness + 8) },
        },
        lifeLog: [logEntry, ...state.lifeLog],
      },
      message: `Your supervisor approved your raise! Your new salary is $${newSalary.toLocaleString()}/yr.`,
    };
  } else {
    const logEntry = {
      age: state.hero.age,
      icon: '❌',
      text: `My supervisor denied my request for a raise at ${job.companyName}.`,
      category: 'career',
    };
    return {
      state: {
        ...state,
        hero: {
          ...state.hero,
          stats: { ...state.hero.stats, happiness: Math.max(0, state.hero.stats.happiness - 5) },
          job: {
            ...job,
            supervisor: {
              ...job.supervisor,
              relationship: Math.max(0, (job.supervisor?.relationship || 50) - 5),
            },
          },
        },
        lifeLog: [logEntry, ...state.lifeLog],
      },
      message: `Your supervisor denied your request for a raise. "Work harder and we will re-evaluate next year."`,
    };
  }
}

export function askForPromotion(state) {
  const job = state.hero.job;
  if (!job) return { state, message: 'You do not have a full-time job.' };

  const track = job.seniorityTrack || [];
  const nextIdx = (job.trackIndex || 0) + 1;

  if (nextIdx >= track.length || track.length === 0) {
    return { state, message: 'You have reached the highest position on this career track!' };
  }

  const getsPromo = job.performance >= 75 && (job.yearsAtCompany >= 1 || Math.random() < 0.65);

  if (getsPromo) {
    const newTitle = track[nextIdx];
    const newSalary = Math.round(job.salary * 1.20);
    const logEntry = {
      age: state.hero.age,
      icon: '🏆',
      text: `I was promoted to ${newTitle} at ${job.companyName}! My salary was increased to $${newSalary.toLocaleString()}/yr.`,
      category: 'career',
    };
    return {
      state: {
        ...state,
        hero: {
          ...state.hero,
          occupation: newTitle,
          job: {
            ...job,
            title: newTitle,
            trackIndex: nextIdx,
            salary: newSalary,
            performance: 65,
          },
          stats: { ...state.hero.stats, happiness: Math.min(100, state.hero.stats.happiness + 18) },
        },
        lifeLog: [logEntry, ...state.lifeLog],
      },
      message: `Congratulations! You were promoted to ${newTitle}! Your salary increased to $${newSalary.toLocaleString()}/yr.`,
    };
  } else {
    const logEntry = {
      age: state.hero.age,
      icon: '❌',
      text: `My supervisor rejected my request for a promotion at ${job.companyName}.`,
      category: 'career',
    };
    return {
      state: {
        ...state,
        hero: {
          ...state.hero,
          stats: { ...state.hero.stats, happiness: Math.max(0, state.hero.stats.happiness - 5) },
        },
        lifeLog: [logEntry, ...state.lifeLog],
      },
      message: `Your supervisor rejected your request: "You need more proven experience before moving up."`,
    };
  }
}

export function interactWithSupervisor(action, state) {
  const job = state.hero.job;
  if (!job || !job.supervisor) return { state, message: 'You do not have a supervisor.' };

  const supervisor = job.supervisor;
  let message = '';
  let relChange = 0;
  let happyChange = 0;
  let perfChange = 0;
  let logText = '';
  let logIcon = '👨‍💼';

  if (action === 'compliment') {
    relChange = getRandomInt(10, 20);
    happyChange = getRandomInt(3, 7);
    perfChange = getRandomInt(2, 5);
    message = `You complimented your supervisor, ${supervisor.fullName}, telling them that their leadership is inspiring.`;
    logText = `I complimented my supervisor, ${supervisor.fullName}.`;
    logIcon = '💖';
  } else if (action === 'conversation') {
    relChange = getRandomInt(4, 10);
    happyChange = getRandomInt(2, 5);
    message = `You had an enjoyable conversation with ${supervisor.fullName} about the company vision.`;
    logText = `I had a conversation with my supervisor, ${supervisor.fullName}.`;
    logIcon = '💬';
  } else if (action === 'spend_time') {
    relChange = getRandomInt(8, 16);
    happyChange = getRandomInt(4, 8);
    message = `You grabbed lunch with ${supervisor.fullName} and had a productive discussion.`;
    logText = `I spent time with my supervisor, ${supervisor.fullName}.`;
    logIcon = '☕';
  } else if (action === 'insult') {
    relChange = -getRandomInt(25, 45);
    happyChange = -getRandomInt(5, 10);
    perfChange = -getRandomInt(10, 20);
    message = `You insulted ${supervisor.fullName}! They were furious and wrote you up.`;
    logText = `I insulted my supervisor, ${supervisor.fullName}.`;
    logIcon = '🤬';
  }

  const updatedSup = {
    ...supervisor,
    relationship: Math.max(0, Math.min(100, supervisor.relationship + relChange)),
  };

  const updatedPerf = Math.max(0, Math.min(100, job.performance + perfChange));
  const updatedHappy = Math.max(0, Math.min(100, state.hero.stats.happiness + happyChange));

  const logEntry = {
    age: state.hero.age,
    icon: logIcon,
    text: logText,
    category: 'career',
  };

  return {
    state: {
      ...state,
      hero: {
        ...state.hero,
        stats: { ...state.hero.stats, happiness: updatedHappy },
        job: {
          ...job,
          performance: updatedPerf,
          supervisor: updatedSup,
        },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message,
  };
}

export function interactWithCoworker(coworkerId, action, state) {
  const job = state.hero.job;
  if (!job || !job.coworkers) return { state, message: 'You do not have any coworkers.' };

  const coworker = job.coworkers.find(c => c.id === coworkerId);
  if (!coworker) return { state, message: 'Coworker not found.' };

  let message = '';
  let relChange = 0;
  let happyChange = 0;
  let logText = '';
  let logIcon = '👥';

  if (action === 'spend_time') {
    relChange = getRandomInt(10, 20);
    happyChange = getRandomInt(4, 8);
    message = `You hung out with your coworker ${coworker.fullName} after work and had fun.`;
    logText = `I hung out with my coworker ${coworker.fullName}.`;
    logIcon = '🍻';
  } else if (action === 'conversation') {
    relChange = getRandomInt(5, 12);
    happyChange = getRandomInt(2, 6);
    message = `You and ${coworker.fullName} chatted by the water cooler about weekend plans.`;
    logText = `I chatted with my coworker ${coworker.fullName}.`;
    logIcon = '💬';
  } else if (action === 'compliment') {
    relChange = getRandomInt(8, 16);
    happyChange = getRandomInt(3, 7);
    message = `You complimented ${coworker.fullName} on their great work. They appreciated it!`;
    logText = `I complimented my coworker ${coworker.fullName}.`;
    logIcon = '💖';
  } else if (action === 'flirt') {
    const rawTemplate = getRandomFromList(jobsData.coworkerHookups) || 'You asked <coworker> to hook up.';
    const hookupText = rawTemplate.replace(/<coworker>/gi, coworker.fullName).replace(/<[^>]+>/g, (m, c) => c.split('/')[0]);

    if (coworker.relationship >= 50 || state.hero.stats.looks >= 65) {
      relChange = getRandomInt(15, 25);
      happyChange = getRandomInt(10, 18);
      message = `${hookupText} They smiled, locked eyes with you, and agreed!`;
      logText = `I hooked up with my coworker ${coworker.fullName}.`;
      logIcon = '💘';
    } else {
      relChange = -getRandomInt(15, 25);
      happyChange = -getRandomInt(5, 10);
      message = `${hookupText} They gave you an uncomfortable look and walked away.`;
      logText = `I tried to hook up with my coworker ${coworker.fullName}, but was rejected.`;
      logIcon = '💔';
    }
  } else if (action === 'prank') {
    const rawPrank = getRandomFromList(jobsData.coworkerPranks) || 'You pranked <coworker>.';
    const prankText = rawPrank.replace(/<coworker>/gi, coworker.fullName);
    const amused = Math.random() < 0.5;

    if (amused) {
      relChange = getRandomInt(8, 16);
      happyChange = getRandomInt(5, 10);
      message = `${prankText} They burst into laughter and called you a legend!`;
    } else {
      relChange = -getRandomInt(18, 30);
      happyChange = -getRandomInt(4, 8);
      message = `${prankText} They were infuriated and threatened to report you to HR!`;
    }
    logText = `I pulled a prank on ${coworker.fullName}.`;
    logIcon = '🤪';
  } else if (action === 'rumor') {
    const rawRumor = getRandomFromList(jobsData.coworkerRumors) || '<coworker> is up to no good.';
    const rumorText = rawRumor.replace(/<coworker>/gi, coworker.fullName);
    relChange = -getRandomInt(12, 22);
    message = `You spread a rumor that ${rumorText}! Word spread quickly through the office.`;
    logText = `I spread a rumor about my coworker ${coworker.fullName}.`;
    logIcon = '🤫';
  }

  const updatedCoworkers = job.coworkers.map(c => {
    if (c.id === coworkerId) {
      return { ...c, relationship: Math.max(0, Math.min(100, c.relationship + relChange)) };
    }
    return c;
  });

  const logEntry = {
    age: state.hero.age,
    icon: logIcon,
    text: logText,
    category: 'career',
  };

  return {
    state: {
      ...state,
      hero: {
        ...state.hero,
        stats: { ...state.hero.stats, happiness: Math.max(0, Math.min(100, state.hero.stats.happiness + happyChange)) },
        job: { ...job, coworkers: updatedCoworkers },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message,
  };
}

export function resignFromJob(state, isPartTime = false) {
  if (isPartTime) {
    const pt = state.hero.partTimeJob;
    if (!pt) return { state, message: 'You do not have a part-time job.' };

    const logEntry = {
      age: state.hero.age,
      icon: '🚪',
      text: `I resigned from my part-time job as a ${pt.title} at ${pt.companyName}.`,
      category: 'career',
    };

    return {
      state: {
        ...state,
        hero: {
          ...state.hero,
          partTimeJob: null,
        },
        lifeLog: [logEntry, ...state.lifeLog],
      },
      message: `You resigned from your part-time job at ${pt.companyName}.`,
    };
  }

  const job = state.hero.job;
  if (!job) return { state, message: 'You do not have a full-time job.' };

  const logEntry = {
    age: state.hero.age,
    icon: '🚪',
    text: `I resigned from my job as a ${job.title} at ${job.companyName}.`,
    category: 'career',
  };

  return {
    state: {
      ...state,
      hero: {
        ...state.hero,
        occupation: state.hero.education?.currentSchool ? state.hero.occupation : 'Unemployed',
        job: null,
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `You resigned from your position at ${job.companyName}.`,
  };
}

export function retireFromJob(state) {
  const job = state.hero.job;
  if (!job) return { state, message: 'You do not have a full-time career to retire from.' };

  if (state.hero.age < 62) {
    return { state, message: 'You must be at least 62 years old to retire and collect a pension.' };
  }

  const pension = Math.round(job.salary * Math.min(0.70, Math.max(0.20, (job.yearsAtCompany || 1) * 0.025)));

  const logEntry = {
    age: state.hero.age,
    icon: '🌴',
    text: `I retired from my career at ${job.companyName} at age ${state.hero.age} with an annual pension of $${pension.toLocaleString()}/yr!`,
    category: 'career',
  };

  return {
    state: {
      ...state,
      hero: {
        ...state.hero,
        occupation: 'Retired',
        job: null,
        pension,
        stats: {
          ...state.hero.stats,
          happiness: Math.min(100, state.hero.stats.happiness + 20),
        },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `Happy retirement! You retired with an annual pension of $${pension.toLocaleString()}/yr!`,
  };
}

// ─── Special Careers Engine ──────────────────────────────────────────────────


// ── Politician Lobbyist Meeting (Bribes) ────────────────────────────────────
export function politicianMeetLobbyist(state) {
  const sc = state.hero.specialCareer;
  if (!sc || sc.type !== 'politician') return { state, message: 'You are not in political office.' };
  const data = specialJobsData.politician;
  const bribes = data.bribes || [];
  if (bribes.length === 0) return { state, message: 'No lobbyists approached you this quarter.' };
  const bribe = bribes[getRandomInt(0, bribes.length - 1)];
  const amount = getRandomInt(bribe.minAmount, bribe.maxAmount);
  const scenario = bribe.scenario.replace('amount', `$${amount.toLocaleString()}`);

  const acceptBribe = Math.random() < 0.45;
  if (acceptBribe) {
    const leakChance = 0.20;
    if (Math.random() < leakChance) {
      const newStanding = Math.max(0, sc.standing - 25);
      const logEntry = {
        age: state.hero.age,
        icon: '🚨',
        text: `CORRUPTION INQUIRY: A special interest approached me: "${scenario}". I accepted the cash, but investigative reporters exposed the deal!`,
        category: 'crime',
      };
      return {
        state: {
          ...state,
          hero: {
            ...state.hero,
            bankBalance: state.hero.bankBalance + amount,
            specialCareer: { ...sc, standing: newStanding },
          },
          lifeLog: [logEntry, ...state.lifeLog],
        },
        message: `Scandal exposed! You pocketed $${amount.toLocaleString()} but reporters leaked the bribe (-25% approval)!`,
      };
    }
    const logEntry = {
      age: state.hero.age,
      icon: '💼',
      text: `SPECIAL INTEREST: A lobbyist approached me with an offer: "${scenario}". I quietly agreed and collected the funds.`,
      category: 'career',
    };
    return {
      state: {
        ...state,
        hero: {
          ...state.hero,
          bankBalance: state.hero.bankBalance + amount,
          specialCareer: { ...sc, standing: Math.max(0, sc.standing - 2) },
        },
        lifeLog: [logEntry, ...state.lifeLog],
      },
      message: `Discreet agreement! You accepted a $${amount.toLocaleString()} campaign contribution.`,
    };
  } else {
    const newStanding = Math.min(100, sc.standing + 5);
    const logEntry = {
      age: state.hero.age,
      icon: '⚖️',
      text: `ETHICS STAND: A special interest attempted to bribe me: "${scenario}". I firmly rejected the payoff!`,
      category: 'career',
    };
    return {
      state: {
        ...state,
        hero: {
          ...state.hero,
          specialCareer: { ...sc, standing: newStanding },
        },
        lifeLog: [logEntry, ...state.lifeLog],
      },
      message: `Integrity intact! You rejected the corrupt offer (+5% approval).`,
    };
  }
}

// ── Politician Spread Rumor ──────────────────────────────────────────────────
export function politicianSpreadRumor(state) {
  const sc = state.hero.specialCareer;
  if (!sc || sc.type !== 'politician') return { state, message: 'You are not in political office.' };
  const data = specialJobsData.politician;
  const rumors = data.rumors || [];
  if (rumors.length === 0) return { state, message: 'No rumors available.' };
  const rumor = rumors[getRandomInt(0, rumors.length - 1)];
  const backfireChance = 0.25;
  const backfired = Math.random() < backfireChance;

  if (backfired) {
    const newStanding = Math.max(0, (sc.standing || 0) - 8);
    const logEntry = {
      age: state.hero.age,
      icon: '📰',
      text: `SCANDAL: I tried to leak a rumor that my political opponent ${rumor}, but journalists traced the smear campaign back to me! Approval dropped to ${newStanding}%.`,
      category: 'career',
    };
    return {
      state: {
        ...state,
        hero: { ...state.hero, specialCareer: { ...sc, standing: newStanding } },
        lifeLog: [logEntry, ...state.lifeLog],
      },
      message: `Smear backfired! The press uncovered your rumor campaign (-8% approval).`,
    };
  }

  const newStanding = Math.min(100, (sc.standing || 0) + 6);
  const newFame = Math.min(100, (sc.fame || 0) + 3);
  const logEntry = {
    age: state.hero.age,
    icon: '🗣️',
    text: `OPPO RESEARCH: The press ran a viral story claiming my political opponent ${rumor}! My approval rating rose to ${newStanding}%.`,
    category: 'career',
  };
  return {
    state: {
      ...state,
      hero: { ...state.hero, specialCareer: { ...sc, standing: newStanding, fame: newFame } },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `Rumor leaked! The story damaged your opponent's credibility (+6% approval).`,
  };
}

export function leaveSpecialCareer(state) {
  const sc = state.hero.specialCareer;
  if (!sc) return { state, message: 'You are not in a special career.' };

  const logEntry = {
    age: state.hero.age,
    icon: '🚪',
    text: `I walked away from my career as ${sc.title} (${sc.organization || sc.type}).`,
    category: 'career',
  };

  return {
    state: {
      ...state,
      hero: {
        ...state.hero,
        occupation: 'Unemployed',
        specialCareer: null,
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `You left your career as ${sc.title}.`,
  };
}

// 1. Politician
export function startPoliticianCareer(state, { officeId, partyName, campaignBudget }) {
  const hero = state.hero;
  const office = specialJobsData.politician.offices.find(o => o.id === officeId);
  if (!office) return { success: false, message: 'Invalid political office selected.' };

  if (hero.age < office.minAge) {
    return { success: false, message: `You must be at least ${office.minAge} years old to run for ${office.title}.` };
  }
  if (hero.stats.smarts < (office.minSmarts || 0)) {
    return { success: false, message: `You need at least ${office.minSmarts} Smarts to run for ${office.title}.` };
  }
  if (hero.bankBalance < campaignBudget) {
    return { success: false, message: `You cannot afford the $${campaignBudget.toLocaleString()} campaign budget.` };
  }
  if (campaignBudget < office.campaignCost * 0.5) {
    return { success: false, message: `Your campaign budget is too low to mount a serious bid for ${office.title} (minimum recommended: $${(office.campaignCost * 0.5).toLocaleString()}).` };
  }

  const budgetRatio = campaignBudget / office.campaignCost;
  const party = specialJobsData.politician.parties.find(p => p.name === partyName);
  const partyBonus = party ? (party.appeal / 25) : 0;
  const winOdds = Math.min(0.92, Math.max(0.15, (budgetRatio * 0.40) + ((hero.stats.smarts + hero.stats.looks) / 250) + partyBonus));
  const won = Math.random() < winOdds;

  const nextBankBalance = hero.bankBalance - campaignBudget;

  if (!won) {
    const logEntry = {
      age: hero.age,
      icon: '🗳️',
      text: `I ran for ${office.title} under the ${partyName} party and invested $${campaignBudget.toLocaleString()} into the campaign, but lost at the polls!`,
      category: 'career',
    };
    return {
      success: false,
      state: {
        ...state,
        hero: {
          ...hero,
          bankBalance: nextBankBalance,
          stats: { ...hero.stats, happiness: Math.max(0, hero.stats.happiness - 15) },
        },
        lifeLog: [logEntry, ...state.lifeLog],
      },
      message: `You ran a passionate campaign for ${office.title}, but your opponent won the majority vote.`,
    };
  }

  const newSpecialCareer = {
    type: 'politician',
    title: office.title,
    officeId: office.id,
    level: office.level,
    organization: `${partyName} Party`,
    salary: office.salary,
    standing: getRandomInt(55, 75), // Approval rating
    fame: office.id === 'president' ? 90 : (office.id === 'governor' ? 60 : (office.id === 'mayor' ? 35 : 15)),
    termYears: office.termYears,
    yearsInTerm: 0,
    lawsPassed: [],
    yearsActive: 0,
  };

  const logEntry = {
    age: hero.age,
    icon: '🏛️',
    text: `LANDSLIDE VICTORY! I was elected as ${office.title} representing the ${partyName} Party with a starting salary of $${office.salary.toLocaleString()}/yr!`,
    category: 'career',
  };

  return {
    success: true,
    state: {
      ...state,
      hero: {
        ...hero,
        occupation: office.title,
        bankBalance: nextBankBalance,
        job: null, // Leaves standard job for political office
        specialCareer: newSpecialCareer,
        stats: {
          ...hero.stats,
          happiness: Math.min(100, hero.stats.happiness + 25),
        },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `Congratulations! You were elected as ${office.title}! Your constituents are counting on you.`,
  };
}

export function politicianCampaignSpeech(state) {
  const sc = state.hero.specialCareer;
  if (!sc || sc.type !== 'politician') return { state, message: 'You are not in political office.' };

  const success = (state.hero.stats.smarts + getRandomInt(-20, 25)) >= 45;
  const delta = success ? getRandomInt(4, 9) : -getRandomInt(3, 7);
  const newStanding = Math.max(5, Math.min(100, sc.standing + delta));

  const logEntry = {
    age: state.hero.age,
    icon: '🎤',
    text: success
      ? `I delivered an inspiring public rally speech that resonated with voters. My approval rating climbed to ${newStanding}%!`
      : `I misspoke during a televised press conference and faced scrutiny from journalists. My approval rating fell to ${newStanding}%.`,
    category: 'career',
  };

  return {
    state: {
      ...state,
      hero: {
        ...state.hero,
        specialCareer: { ...sc, standing: newStanding },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: success
      ? `Rally success! Your speech rallied your supporters (+${delta}% approval).`
      : `Press gaffe! The media criticized your remarks (${delta}% approval).`,
  };
}

export function politicianPassLaw(state, lawId) {
  const sc = state.hero.specialCareer;
  if (!sc || sc.type !== 'politician') return { state, message: 'You are not in political office.' };

  const law = specialJobsData.politician.laws.find(l => l.id === lawId) || specialJobsData.politician.laws[0];
  const delta = law.approvalImpact || 2;
  const newStanding = Math.max(5, Math.min(100, sc.standing + delta));

  const logEntry = {
    age: state.hero.age,
    icon: '📜',
    text: `As ${sc.title}, I officially signed legislation into law: "${law.law}". Public approval is now at ${newStanding}%.`,
    category: 'career',
  };

  return {
    state: {
      ...state,
      hero: {
        ...state.hero,
        specialCareer: {
          ...sc,
          standing: newStanding,
          lawsPassed: [...(sc.lawsPassed || []), law.law],
        },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `You signed the bill into law! Public approval shifted by ${delta >= 0 ? '+' : ''}${delta}%.`,
  };
}

// ─── Justice System: Prison ──────────────────────────────────────────────────

// Sentences the hero to prison. Losing your career is part of the punishment.
export function arrestHero(state, { charge, sentence } = {}) {
  const hero = state.hero;
  if (!hero.alive) return { state, message: 'You are deceased.' };
  if (hero.prison) return { state, message: 'You are already serving a prison sentence.' };

  const years = Math.max(1, Math.round(sentence || 1));

  const logEntry = {
    age: hero.age,
    icon: '🚓',
    text: `CONVICTED: I was sentenced to ${years} year${years === 1 ? '' : 's'} in prison for ${charge}.`,
    category: 'crime',
  };

  return {
    state: {
      ...state,
      hero: {
        ...hero,
        job: null,
        partTimeJob: null,
        specialCareer: null,
        occupation: 'Prisoner',
        prison: { charge, sentence: years, yearsServed: 0 },
        stats: { ...hero.stats, happiness: Math.max(0, hero.stats.happiness - 25) },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `BUSTED! Arrested for ${charge} — sentenced to ${years} year${years === 1 ? '' : 's'} in prison.`,
  };
}

// ─── Crime: Commit a Crime ───────────────────────────────────────────────────

// Attempts the selected crime. Success nets loot; getting caught goes to prison
// via arrestHero, using the crime's seriousness score to compute the sentence.
export function commitCrime(state, crimeName) {
  const hero = state.hero;
  if (!hero.alive) return { error: 'age_restricted', message: 'You are deceased.' };
  if (hero.prison) return { error: 'age_restricted', message: 'You are already serving a prison sentence.' };

  const crime = crimeData.crimes.find(c => c.name === crimeName) || crimeData.crimes[0];
  const tier = crimeData.tiers.find(t => t.name === crime.tier) || crimeData.tiers[0];

  if (hero.age < (tier.minAge || 12)) {
    return {
      error: 'age_restricted',
      message: `You are too young to commit ${crime.name} (Requires Age ${tier.minAge}+).`,
    };
  }

  const seriousness = crime.seriousness || 3;
  const smartsEdge = (hero.stats.smarts - 50) / 200; // -0.25 to +0.25
  const successOdds = Math.min(0.92, Math.max(0.12, 0.88 - seriousness * 0.12 + smartsEdge));

  // Success: net loot based on tier payout range, scaled by smarts
  if (Math.random() < successOdds) {
    const loot = Math.round(
      getRandomInt(tier.payoutMin, tier.payoutMax) * (0.75 + (hero.stats.smarts / 100) * 0.5)
    );
    const happyGain = 5 + seriousness * 2;
    const newHappy = Math.min(100, hero.stats.happiness + happyGain);
    const logEntry = {
      age: hero.age,
      icon: '🦹',
      text: `CRIME PAYS: I committed ${crime.name.toLowerCase()} and got away with $${loot.toLocaleString()}.`,
      category: 'crime',
    };
    return {
      state: {
        ...state,
        hero: {
          ...hero,
          bankBalance: hero.bankBalance + loot,
          stats: { ...hero.stats, happiness: newHappy },
        },
        lifeLog: [logEntry, ...state.lifeLog],
      },
      message: `You committed ${crime.name.toLowerCase()} and got away with $${loot.toLocaleString()}!`,
      statDeltas: { happiness: happyGain },
    };
  }

  // Failed — roll to see if we get caught (arrest logic)
  const arrestChance = Math.min(0.85, 0.25 + seriousness * 0.12 - smartsEdge);
  if (Math.random() < arrestChance) {
    const sentence = 1 + Math.round(seriousness * 1.1) + getRandomInt(0, 2);
    return arrestHero(state, { charge: crime.name.toLowerCase(), sentence });
  }

  // Escaped empty-handed
  const logEntry = {
    age: hero.age,
    icon: '😰',
    text: `CLOSE CALL: I tried committing ${crime.name.toLowerCase()} but bailed at the last second and slipped away empty-handed.`,
    category: 'crime',
  };
  return {
    state: {
      ...state,
      hero: { ...hero, stats: { ...hero.stats, happiness: Math.max(0, hero.stats.happiness - 4) } },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `You bailed on ${crime.name.toLowerCase()} at the last second and got away empty-handed.`,
    statDeltas: { happiness: -4 },
  };
}

// ─── Death ───────────────────────────────────────────────────────────────────

// Kills the hero and writes an obituary into the Life Log. The GameScreen
// watches hero.alive and shows the Game Over screen when this happens.
export function killHero(state, cause) {
  const hero = state.hero;
  const logEntry = {
    age: hero.age,
    icon: '🪦',
    text: `${hero.fullName} passed away at the age of ${hero.age}. Cause of death: ${cause}.`,
    category: 'identity',
  };
  return {
    state: {
      ...state,
      hero: {
        ...hero,
        alive: false,
        deathCause: cause,
        occupation: 'Deceased',
        prison: null,
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `${hero.fullName} passed away at the age of ${hero.age}.`,
  };
}

// Old-age / frailty mortality roll for a given upcoming age. Returns a cause
// of death string, or null if the hero survives the year.
function rollNaturalDeath(upcomingAge, health) {
  if (health <= 0) return 'complete organ failure';
  let chance = 0;
  if (upcomingAge >= 60) chance += Math.pow(upcomingAge - 58, 2) / 900;
  if (upcomingAge >= 30 && health < 60) chance += ((60 - health) / 100) * 0.08;
  if (Math.random() < Math.min(0.85, chance)) {
    return health < 35 ? 'health complications' : 'old age';
  }
  return null;
}

// 2. Mafia / Mobster
export function joinMafia(state, mobName) {
  const hero = state.hero;
  if (hero.age < 18) return { success: false, message: 'You must be at least 18 years old to join an organized crime syndicate.' };
  if (hero.prison) return { success: false, message: 'You cannot join the Family from behind bars.' };

  const mob = specialJobsData.mafia.mobs.find(m => m.name.toLowerCase() === mobName.toLowerCase()) || specialJobsData.mafia.mobs[0];

  // APK join methods: roll against the chosen approach's success score.
  // A clean record (no crimes committed) risks the classic "nose too clean" rejection.
  const minigames = crimeMinigamesData.mafia || {};
  const joinMethods = minigames.joinMethods || [];
  const method = joinMethods.length ? getRandomFromList(joinMethods) : null;
  const methodOdds = method ? 0.20 + (method.successScore || 2) * 0.13 : 0.6;
  const cleanRecord = !state.hero.prison && (hero.crimesCommitted || 0) === 0;

  if (Math.random() >= methodOdds) {
    const rejections = minigames.joinRejections || [];
    const rejection = rejections.length ? getRandomFromList(rejections) : 'The Family turned you away.';
    return {
      success: false,
      message: rejection.replace(/\.$/, '') + (cleanRecord && Math.random() < 0.5 ? ' (Build a criminal record first!)' : ''),
    };
  }

  // The Family gives you a street nickname from the APK nickname table
  const nicknames = minigames.nicknames || [];
  const nickname = nicknames.length ? getRandomFromList(nicknames) : null;

  const newSpecialCareer = {
    type: 'mafia',
    title: mob.ranks[0] || 'Associate',
    organization: mob.name,
    mobData: mob,
    rankIndex: 0,
    salary: 35000,
    standing: 50 + ((mob.notoriety || 1) * 2), // Respect (notoriety boost)
    notoriety: 30, // Street Fear
    crimesCommitted: 0,
    yearsActive: 0,
    nickname,
    joinMethod: method ? method.method : null,
  };

  const logEntry = {
    age: hero.age,
    icon: '🕶️',
    text: `I officially pledged loyalty and became an ${newSpecialCareer.title} in the ${mob.name}!` +
      (method ? ` I got made by ${method.method.toLowerCase()}.` : '') +
      (nickname ? ` The crew now calls me "${nickname}".` : ''),
    category: 'crime',
  };

  return {
    success: true,
    state: {
      ...state,
      hero: {
        ...hero,
        occupation: `${mob.ranks[0]} (${mob.name})`,
        job: null,
        specialCareer: newSpecialCareer,
        stats: { ...hero.stats, happiness: Math.min(100, hero.stats.happiness + 10) },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `You were inducted into the ${mob.name} as an ${mob.ranks[0]}! Prove your loyalty.` +
      (nickname ? ` Your crew nickname: "${nickname}".` : ''),
  };
}

// ─── Mafia Minigames (from APK a16_mafia-* tables) ───────────────────────────

// Scare tactics: intimidate a target without a body count. Effectiveness vs getCaught.
export function mafiaScare(state, methodIndex) {
  const sc = state.hero.specialCareer;
  if (!sc || sc.type !== 'mafia') return { state, message: 'You are not in the mafia.' };

  const methods = (crimeMinigamesData.mafia || {}).scareMethods || [];
  const method = methods[methodIndex] || methods[getRandomInt(0, Math.max(0, methods.length - 1))];
  if (!method) return { state, message: 'No scare methods available.' };

  const successOdds = 0.30 + (method.effectiveness || 3) * 0.10;
  if (Math.random() < successOdds) {
    const loot = Math.round(getRandomInt(1000, 15000) * ((method.effectiveness || 3) / 3));
    const logEntry = {
      age: state.hero.age,
      icon: '😱',
      text: `I ${method.method.toLowerCase()} and scared the target into paying up $${loot.toLocaleString()} in tribute!`,
      category: 'crime',
    };
    return {
      state: {
        ...state,
        hero: {
          ...state.hero,
          bankBalance: state.hero.bankBalance + loot,
          specialCareer: {
            ...sc,
            standing: Math.min(100, sc.standing + 5),
            notoriety: Math.min(100, (sc.notoriety || 30) + 6),
          },
        },
        lifeLog: [logEntry, ...state.lifeLog],
      },
      message: `Your ${method.method.toLowerCase()} scared them straight! Collected $${loot.toLocaleString()}.`,
    };
  }

  // Failed scare — the target calls the cops
  if (Math.random() < (method.getCaught || 2) / 10) {
    return arrestHero(state, { charge: 'criminal intimidation', sentence: getRandomInt(1, 4) });
  }
  const logEntry = {
    age: state.hero.age,
    icon: '😤',
    text: `I tried to scare a target by ${method.method.toLowerCase()} but they refused to budge and the Family heard about it.`,
    category: 'crime',
  };
  return {
    state: {
      ...state,
      hero: {
        ...state.hero,
        specialCareer: { ...sc, standing: Math.max(0, sc.standing - 8) },
        stats: { ...state.hero.stats, happiness: Math.max(0, state.hero.stats.happiness - 6) },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: 'Your intimidation failed and the target reported it to the Family. Respect dropped.',
  };
}

// Temptation events: skimming from the Family. Dishonorable choice = money now,
// risk of getting whacked later. Honorable = loyalty, standing boost.
export function mafiaTemptation(state, temptationIndex, take) {
  const sc = state.hero.specialCareer;
  if (!sc || sc.type !== 'mafia') return { state, message: 'You are not in the mafia.' };

  const temptations = (crimeMinigamesData.mafia || {}).temptations || [];
  const t = temptations[temptationIndex] || temptations[getRandomInt(0, Math.max(0, temptations.length - 1))];
  if (!t) return { state, message: 'No opportunity presented itself.' };

  const amount = getRandomInt(t.minAmount || 1000, t.maxAmount || 50000);

  if (take) {
    // Dishonorable: pocket the cash, roll the dice
    const caught = Math.random() < 0.10 + ((t.getCaught || 2) / 10) * 0.35;
    if (caught) {
      // The Don found out — you sleep with the fishes, or beg for mercy
      if (Math.random() < 0.4) {
        const res = killHero(state, `a mafia execution for stealing from the ${sc.organization}`);
        return { ...res, message: `The Don discovered you skimmed $${amount.toLocaleString()}. You were found in the trunk of a car.` };
      }
      return arrestHero(state, { charge: 'embezzlement from a criminal organization', sentence: getRandomInt(3, 10) });
    }
    const logEntry = {
      age: state.hero.age,
      icon: '🤫',
      text: `I skimmed $${amount.toLocaleString()} from the Family ${String(t.scenario || '').toLowerCase()} and nobody noticed... yet.`,
      category: 'crime',
    };
    return {
      state: {
        ...state,
        hero: {
          ...state.hero,
          bankBalance: state.hero.bankBalance + amount,
          specialCareer: { ...sc, standing: Math.max(0, sc.standing - 12), skimmed: (sc.skimmed || 0) + amount },
        },
        lifeLog: [logEntry, ...state.lifeLog],
      },
      message: `You pocketed $${amount.toLocaleString()} from the Family! But your standing took a hit.`,
    };
  }

  // Honorable: hand it over, gain trust
  const logEntry = {
    age: state.hero.age,
    icon: '🤝',
    text: `I found extra money during a job and turned it over to the Don. He respects my loyalty.`,
    category: 'crime',
  };
  return {
    state: {
      ...state,
      hero: {
        ...state.hero,
        specialCareer: { ...sc, standing: Math.min(100, sc.standing + 15) },
        stats: { ...state.hero.stats, happiness: Math.min(100, state.hero.stats.happiness + 4) },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `The Don was impressed by your honesty. Respect gained!`,
  };
}

export function mafiaPushCrime(state, crimeIndex) {
  const sc = state.hero.specialCareer;
  if (!sc || sc.type !== 'mafia') return { state, message: 'You are not in the mafia.' };

  const crime = specialJobsData.mafia.crimes[crimeIndex] || specialJobsData.mafia.crimes[0];
  const successOdds = Math.max(0.35, 0.85 - (crime.risk * 0.12));
  const succeeded = Math.random() < successOdds;

  if (!succeeded) {
    // Getting made by the cops — riskier jobs mean higher arrest odds
    const arrestChance = 0.15 + crime.risk * 0.09;
    if (Math.random() < arrestChance) {
      const sentence = 1 + Math.round(crime.risk * 1.5) + getRandomInt(0, 3);
      return arrestHero(state, {
        charge: `the failed job to ${crime.snippet}`,
        sentence,
      });
    }

    const penaltyStanding = Math.max(5, sc.standing - 15);
    const logEntry = {
      age: state.hero.age,
      icon: '🚨',
      text: `I botched the job to ${crime.snippet}! I barely escaped the police, and the Family was furious with my failure.`,
      category: 'crime',
    };
    return {
      state: {
        ...state,
        hero: {
          ...state.hero,
          specialCareer: { ...sc, standing: penaltyStanding },
          stats: { ...state.hero.stats, happiness: Math.max(0, state.hero.stats.happiness - 10) },
        },
        lifeLog: [logEntry, ...state.lifeLog],
      },
      message: `Job botched! You failed to ${crime.snippet} and lost Family respect.`,
    };
  }

  const loot = (crime.seriousness * getRandomInt(2000, 6000));
  const cut = Math.round(loot * 0.35); // 35% hero cut, 65% goes to Don
  const newStanding = Math.min(100, sc.standing + (crime.seriousness * 3));
  const newNotoriety = Math.min(100, sc.notoriety + (crime.seriousness * 4));

  // Check promotion
  let nextRankIdx = sc.rankIndex;
  let nextTitle = sc.title;
  let nextSalary = sc.salary;
  if (newStanding >= 80 && nextRankIdx < sc.mobData.ranks.length - 1) {
    nextRankIdx += 1;
    nextTitle = sc.mobData.ranks[nextRankIdx];
    nextSalary = sc.salary + 50000;
  }

  const logEntry = {
    age: state.hero.age,
    icon: '💰',
    text: `On orders from the Family, I ${crime.past}. We brought in $${loot.toLocaleString()} and my cut was $${cut.toLocaleString()}!`,
    category: 'crime',
  };

  const logs = [logEntry];
  if (nextRankIdx > sc.rankIndex) {
    logs.unshift({
      age: state.hero.age,
      icon: '👑',
      text: `The Don was impressed by my hustle and made me a ${nextTitle} in the ${sc.organization}!`,
      category: 'career',
    });
  }

  return {
    state: {
      ...state,
      hero: {
        ...state.hero,
        occupation: `${nextTitle} (${sc.organization})`,
        bankBalance: state.hero.bankBalance + cut,
        specialCareer: {
          ...sc,
          rankIndex: nextRankIdx,
          title: nextTitle,
          salary: nextSalary,
          standing: newStanding,
          notoriety: newNotoriety,
          crimesCommitted: (sc.crimesCommitted || 0) + 1,
        },
      },
      lifeLog: [...logs, ...state.lifeLog],
    },
    message: `Mission accomplished! Earned $${cut.toLocaleString()} cut.${nextRankIdx > sc.rankIndex ? ` Promoted to ${nextTitle}!` : ''}`,
  };
}

export function mafiaExtort(state, businessIndex) {
  const sc = state.hero.specialCareer;
  if (!sc || sc.type !== 'mafia') return { state, message: 'You are not in the mafia.' };

  const target = specialJobsData.mafia.extortions[businessIndex] || specialJobsData.mafia.extortions[0];
  const payout = target.moneyScore * getRandomInt(3000, 7000);
  const cut = Math.round(payout * 0.4);

  // The victim might rat you out to the cops
  if (Math.random() < 0.07) {
    return arrestHero(state, {
      charge: `the extortion of a local ${target.business}`,
      sentence: getRandomInt(1, 4),
    });
  }

  const logEntry = {
    age: state.hero.age,
    icon: '💵',
    text: `I shook down the ${target.target} of a local ${target.business} for protection money, extracting $${payout.toLocaleString()}! My cut was $${cut.toLocaleString()}.`,
    category: 'crime',
  };

  return {
    state: {
      ...state,
      hero: {
        ...state.hero,
        bankBalance: state.hero.bankBalance + cut,
        specialCareer: {
          ...sc,
          standing: Math.min(100, sc.standing + 4),
          notoriety: Math.min(100, sc.notoriety + 3),
        },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `Extortion collected! The ${target.business} paid up $${payout.toLocaleString()}. You pocketed $${cut.toLocaleString()}.`,
  };
}

export function mafiaWhack(state, methodIndex) {
  const sc = state.hero.specialCareer;
  if (!sc || sc.type !== 'mafia') return { state, message: 'You are not in the mafia.' };

  const exec = specialJobsData.mafia.executions[methodIndex] || specialJobsData.mafia.executions[0];
  const desc = exec.description ? exec.description.replace(/<[^>]+>/g, 'the traitor') : `I carried out a hit using the ${exec.method} method!`;

  // Murder carries real consequences: arrest, or the rival family's reprisal
  const fateRoll = Math.random();
  if (fateRoll < 0.07) {
    const res = killHero(state, `retaliation from a ${sc.organization} rival family`);
    return {
      ...res,
      message: `WHACKED FIRST! You never made it home from the hit — rival retaliation ended your life.`,
    };
  }
  if (fateRoll < 0.20) {
    return arrestHero(state, {
      charge: 'the murder of a rival crew member',
      sentence: getRandomInt(12, 30),
    });
  }

  const logEntry = {
    age: state.hero.age,
    icon: '💀',
    text: `CONTRACT EXECUTED: ${desc} The target sleeps with the fishes.`,
    category: 'crime',
  };

  return {
    state: {
      ...state,
      hero: {
        ...state.hero,
        specialCareer: {
          ...sc,
          standing: Math.min(100, sc.standing + 12),
          notoriety: Math.min(100, sc.notoriety + 15),
        },
        stats: {
          ...state.hero.stats,
          happiness: Math.max(0, state.hero.stats.happiness - 5),
        },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `Whack executed cleanly using ${exec.method}! Your notoriety skyrocketed.`,
  };
}

// ─── Vehicles: Cars, Dealership, Licenses, Theft (APK a16_car-* tables) ──────

const CAR_FOLDERS = {
  'coupe': 'coupe', 'suv': 'suv', 'convertible': 'convertible', 'minivan': 'minivan',
  'truck': 'truck', 'hearse': 'hearse', '4x4': '4x4', 'hatchback': 'hatchback',
  'sedan': 'sedan', 'wagon': 'wagon', 'exotic': 'exotic', 'stock car': 'sedan', 'formula': 'exotic',
};
const CAR_COLORS = ['beige', 'black', 'blue', 'brown', 'cream', 'gold', 'gray', 'green',
  'olive', 'orange', 'pink', 'purple', 'red', 'seafoam', 'silver', 'tan', 'turquoise', 'white', 'yellow'];

// Deterministic color for a car so its sprite doesn't change between renders
function carColorFor(keyStr) {
  let h = 0;
  for (let i = 0; i < String(keyStr).length; i++) h = (h * 31 + String(keyStr).charCodeAt(i)) >>> 0;
  return CAR_COLORS[h % CAR_COLORS.length];
}

// APK race-vehicle sprites (a16_carRaceVehicle-<Make>-<Model>) dumped to /cars/race/
const RACE_SPRITES = [
  'Alfa-Romeo-C44', 'Aston-Martin-AMR24', 'BMW-M4-XL', 'BMW-Sauber', 'Chevrolet-Camaro-BLF1',
  'Chevrolet-SS', 'Dodge-Charger-M4X', 'Ferrari-SF-24', 'Ford-Fusion-BBL', 'Ford-Mustang-GT',
  'Honda-RBPTH002', 'McLaren-MCL36', 'Mercedes-AMG', 'Nissan-Maxima-ZUM', 'Police',
  'Toyota-Camry-XXL', 'Toyota-VF-24',
];

function raceSpriteFor(make, model) {
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const target = `${norm(make)}-${norm(model)}`;
  const hit = RACE_SPRITES.find(s => norm(s.replace(/-/g, ' ')) === norm(target.replace(/-/g, ' ')));
  return hit ? `/cars/race/carRaceVehicle-${hit}.png` : '/cars/emoji/race-car.png';
}

export function carSprite(type, keyStr) {
  const low = String(type || '').toLowerCase();
  if (low === 'stock car' || low === 'formula') return '/cars/emoji/race-car.png';
  let folder = CAR_FOLDERS[low] || 'sedan';
  let color = carColorFor(keyStr);
  // The APK asset itself is misspelled "seafom" in the coupe & hatchback sets
  if (color === 'seafoam' && (folder === 'coupe' || folder === 'hatchback')) color = 'seafom';
  return `/cars/emoji/emoji-${folder}-${color}.png`;
}

// Render-time sprite for an owned/stock car object — picks the real APK body per type,
// and the matching make/model race car sprite for Stock Car & Formula types.
export function carSpriteFor(car) {
  if (!car) return '/cars/emoji/emoji-sedan-blue.png';
  const low = String(car.type || '').toLowerCase();
  if (low === 'stock car' || low === 'formula') {
    return raceSpriteFor(car.make, car.model);
  }
  return carSprite(car.type, String(car.make || '') + String(car.model || '') + String(car.id != null ? car.id : ''));
}

// Roll a dealership floor: 8 cars. Race-dealer-only models (Formula cars) are
// excluded; every other available model can show up with used-age & condition.
export function refreshCarDealership(state) {
  const hero = state.hero;
  if (!hero.alive) return { state, message: 'You are deceased.' };
  const pool = (carsData.carModels || []).filter(c => !c.raceDealershipOnly && !c.unavailable);
  const stock = [];
  const used = new Set();
  while (stock.length < 8 && used.size < pool.length) {
    const idx = getRandomInt(0, pool.length - 1);
    if (used.has(idx)) continue;
    used.add(idx);
    const base = pool[idx];
    // some cars are used: roll ownership years that dent price & condition
    const usedYears = base.cost > 500000 ? 0 : (Math.random() < 0.45 ? getRandomInt(1, 12) : 0);
    const value = Math.round(base.cost * Math.pow(0.9, usedYears * base.depreciation) / 10) * 10;
    const condition = Math.max(20, 100 - usedYears * getRandomInt(3, 7));
    stock.push({
      id: `${base.make}-${base.model}-${idx}`,
      make: base.make, model: base.model, type: base.type,
      sticker: base.cost, price: value, new: usedYears === 0, usedYears,
      condition, depreciation: base.depreciation, reliability: base.reliability,
      longevity: base.longevity, cool: base.cool, easeOfTheft: base.easeOfTheft,
      racingClass: base.racingClass, luxuryOnly: base.luxuryOnly,
      sprite: carSpriteFor(base),   // real APK body sprite (computed at render too)
    });
  }
  return { state: { ...state, carDealerStock: stock }, stock };
}

// Buy a car from the dealership stock. High-cost cars may trigger the spouse /
// parent "irresponsible purchase" objection from a16_spouse-vehicle-reactions.
export function buyCar(state, stockIndex) {
  const hero = state.hero;
  if (!hero.alive) return { error: 'age_restricted', message: 'You are deceased.' };
  const stock = state.carDealerStock || [];
  const car = stock[stockIndex];
  if (!car) return { state, message: 'That car is no longer in stock.' };
  if (hero.age < 16) return { error: 'age_restricted', message: 'You must be 16 to negotiate at a dealership.' };
  if (hero.bankBalance < car.price) {
    return { error: 'insufficient_funds', message: `You need $${car.price.toLocaleString()} for the ${car.make} ${car.model}.` };
  }

  // Spouse / family reactions for big spends
  const reactions = carsData.spouseVehicleReactions || [];
  let extraLog = null;
  const familyCat = ['lover', 'parents'].find(cat => (state.relationships?.[cat] || []).length > 0);
  if (car.price > 200000 && familyCat === 'lover') {
    const r = reactions[getRandomInt(0, Math.max(0, reactions.length - 1))];
    if (r && Math.random() < 0.4) {
      if (r.rejection) {
        return { state, message: `Your partner stopped the sale before papers were signed: "${r.scenario || 'They say it is an irresponsible decision.'}"` };
      }
      extraLog = r.scenario;
    }
  }

  const ownedCar = {
    ...car,
    ownedSince: hero.age,
    stolen: false,
    color: carColorFor(car.id),
  };
  const logs = [{
    age: hero.age,
    icon: '🚗',
    text: `I bought a ${car.new ? 'brand-new' : 'used'} ${car.make} ${car.model} for $${car.price.toLocaleString()}.`,
    category: 'assets',
  }];
  if (extraLog) logs.push({ age: hero.age, icon: '💬', text: `${extraLog} (About the new car...)`, category: 'family' });

  return {
    success: true,
    state: {
      ...state,
      hero: {
        ...hero,
        bankBalance: hero.bankBalance - car.price,
        cars: [...(hero.cars || []), ownedCar],
        stats: { ...hero.stats, happiness: Math.min(100, hero.stats.happiness + 8) },
      },
      lifeLog: [...logs, ...state.lifeLog],
    },
    message: `You rolled off the lot in a ${car.new ? 'brand-new' : 'used'} ${car.make} ${car.model}! (-$${car.price.toLocaleString()})`,
    statDeltas: { happiness: 8 },
  };
}

// Sell a car at its depreciated street value.
export function sellCar(state, carIndex) {
  const hero = state.hero;
  const cars = hero.cars || [];
  const car = cars[carIndex];
  if (!car) return { state, message: 'That car is not in your garage.' };
  const years = Math.max(0, hero.age - (car.ownedSince || hero.age));
  const factor = Math.max(0.12, Math.pow(0.92, years * (car.depreciation || 2)) * (car.condition || 100) / 100);
  let value = Math.round(car.price * factor);
  if (car.stolen) value = Math.round(value * 0.3); // chop-shop rate
  const logs = [{
    age: hero.age,
    icon: '💵',
    text: car.stolen
      ? `I dumped the stolen ${car.make} ${car.model} at a chop shop for $${value.toLocaleString()}.`
      : `I sold my ${car.make} ${car.model} for $${value.toLocaleString()}.`,
    category: 'assets',
  }];
  return {
    success: true,
    state: {
      ...state,
      hero: {
        ...hero,
        bankBalance: hero.bankBalance + value,
        cars: cars.filter((_, i) => i !== carIndex),
      },
      lifeLog: [...logs, ...state.lifeLog],
    },
    message: `Sold the ${car.make} ${car.model} for $${value.toLocaleString()}${car.stolen ? ' (chop-shop rate)' : ''}.`,
  };
}

// ─── Driver's License Test (APK a16_license-car-questions + roadSign sprites) ─

// Deals a 5-question quiz for the chosen license kind. Car quizzes use the
// road-sign images (public/cars/license/roadSign{Sign}.png).
export function getLicenseQuiz(state, kind = 'car') {
  const hero = state.hero;
  if (!hero.alive) return { error: 'age_restricted', message: 'You are deceased.' };
  if (hero.prison) return { error: 'age_restricted', message: 'No license tests behind bars.' };
  const table = ((carsData.licenseQuestions || {})[kind]) || [];
  if (!table.length) return { state, message: 'No test available.' };
  const n = Math.min(5, table.length);
  const picked = [];
  const used = new Set();
  while (picked.length < n) {
    const i = getRandomInt(0, table.length - 1);
    if (used.has(i)) continue;
    used.add(i);
    const q = table[i];
    // shuffle: correct + funny + decoy
    const opts = [
      { text: q.correct || '', correct: true },
      { text: q.funny || '', correct: false },
      { text: q.decoy || '', correct: false },
    ].filter(o => o.text).sort(() => Math.random() - 0.5);
    picked.push({ index: i + 1, prompt: q.question || q.correct, options: opts });
  }
  return { quiz: { kind, questions: picked } };
}

const LICENSE_TIERS = ['bronze', 'silver', 'gold', 'platinum'];

export function submitLicenseTest(state, kind, correctCount) {
  const hero = state.hero;
  if (!hero || !hero.alive) return { error: 'age_restricted', message: 'You are deceased.' };
  const minAge = kind === 'car' ? 16 : 18;
  if (hero.age < minAge) return { error: 'age_restricted', message: `You must be ${minAge} to take the ${kind} license test.` };
  const passed = correctCount >= 4;
  if (!passed) {
    return {
      state: {
        ...state,
        lifeLog: [{ age: hero.age, icon: '📜', text: `I failed the ${kind} license test (${correctCount}/5). The examiner shook her head.`, category: 'education' }, ...state.lifeLog],
      },
      message: `Failed! ${correctCount}/5 correct. You can retake the test.`,
    };
  }
  const tierIdx = correctCount >= 5 ? (Math.random() < 0.3 ? 3 : 2) : (Math.random() < 0.5 ? 0 : 1);
  const tier = LICENSE_TIERS[tierIdx];
  return {
    success: true,
    state: {
      ...state,
      hero: {
        ...hero,
        licenses: { ...(hero.licenses || {}), [kind]: { tier, year: hero.age } },
      },
      lifeLog: [{ age: hero.age, icon: '🪪', text: `I PASSED the ${kind} license test with ${correctCount}/5 and earned a ${tier} ${kind} license!`, category: 'education' }, ...state.lifeLog],
    },
    message: `License earned! ${correctCount}/5 — you got the ${tier.toUpperCase()} ${kind} license 🪪`,
  };
}

// ─── Crime: Car Theft Minigame (Grand Theft Auto / Carjacking) ───────────────

// 8 cars parked in a lot. EaseOfTheft (1 hard - 5 easy) drives success odds.
export function getCarTheftTargets(state) {
  const pool = (carsData.carModels || []).filter(c => !c.unavailable);
  const targets = [];
  const used = new Set();
  while (targets.length < 8 && used.size < pool.length) {
    const i = getRandomInt(0, pool.length - 1);
    if (used.has(i)) continue;
    used.add(i);
    const c = pool[i];
    targets.push({
      make: c.make, model: c.model, type: c.type,
      easeOfTheft: c.easeOfTheft, value: c.cost, cool: c.cool,
      sprite: carSprite(c.type, c.make + c.model),
    });
  }
  return targets;
}

export function stealCar(state, targetIndex, targetList) {
  const hero = state.hero;
  if (!hero.alive) return { error: 'age_restricted', message: 'You are deceased.' };
  if (hero.prison) return { error: 'age_restricted', message: 'You are already serving a prison sentence.' };
  if (hero.age < 14) return { error: 'age_restricted', message: 'You are too young to reach the pedals.' };

  const list = targetList || getCarTheftTargets(state);
  const car = list[targetIndex] || list[0];
  if (!car) return { state, message: 'No cars to steal.' };

  const smartsEdge = (hero.stats.smarts - 50) / 250;
  const successOdds = Math.min(0.9, Math.max(0.1, 0.12 + car.easeOfTheft * 0.16 + smartsEdge));
  const succeeded = Math.random() < successOdds;

  const carObj = {
    make: car.make, model: car.model, type: car.type,
    price: Math.round(car.value * 0.9), new: false,
    condition: getRandomInt(60, 100),
    depreciation: 2, reliability: 3, longevity: 3, cool: car.cool,
    easeOfTheft: car.easeOfTheft, sprite: car.sprite,
    ownedSince: hero.age, stolen: true,
  };

  if (succeeded) {
    // Hot-wiring victory; small chance a cop spots you in traffic on the way home
    const spotted = Math.random() < 0.18;
    if (spotted) {
      return arrestHero(state, { charge: `grand theft auto (stealing a ${car.make} ${car.model})`, sentence: getRandomInt(2, 7) });
    }
    const logs = [{
      age: hero.age,
      icon: '🚗💨',
      text: `GTA SUCCESS: I boosted a ${car.make} ${car.model} and made it home unseen.`,
      category: 'crime',
    }];
    return {
      state: {
        ...state,
        hero: {
          ...hero,
          cars: [...(hero.cars || []), carObj],
          stats: { ...hero.stats, happiness: Math.min(100, hero.stats.happiness + 10) },
        },
        lifeLog: [...logs, ...state.lifeLog],
      },
      message: `You boosted a ${car.make} ${car.model}! It is parked in your garage (do not drive it past cops).`,
      statDeltas: { happiness: 10 },
    };
  }

  // Failed: alarm, fleeing on foot, or busted
  const roll = Math.random();
  if (roll < 0.55) {
    return arrestHero(state, { charge: `attempted grand theft auto of a ${car.make} ${car.model}`, sentence: getRandomInt(1, 5) });
  }
  if (roll < 0.7) {
    return {
      state: {
        ...state,
        hero: { ...hero, stats: { ...hero.stats, health: Math.max(0, hero.stats.health - 15), happiness: Math.max(0, hero.stats.happiness - 12) } },
        lifeLog: [{ age: hero.age, icon: '🐕', text: `I tried jumping into a ${car.make} ${car.model} — the Doberman in the passenger seat bit my arm and I ran.`, category: 'crime' }, ...state.lifeLog],
      },
      message: 'A defense system beat you: the guard dog in the car tore into your arm and you fled!',
      statDeltas: { health: -15, happiness: -12 },
    };
  }
  return {
    state: {
      ...state,
      hero: { ...hero, stats: { ...hero.stats, happiness: Math.max(0, hero.stats.happiness - 8) } },
      lifeLog: [{ age: hero.age, icon: '🚨', text: `The ${car.make} ${car.model}'s alarm went off mid-hot-wire and I bolted empty-handed.`, category: 'crime' }, ...state.lifeLog],
    },
    message: 'The alarm went off! You bolted before the owner came out with a bat.',
    statDeltas: { happiness: -8 },
  };
}

// ─── Crime: Burglary Minigame (Breaking And Entering) ────────────────────────

const BURGLARY_TIMES = [
  { name: 'Dusk (7 PM)', risk: 2, loot: 0.8 },
  { name: 'Midnight', risk: 3, loot: 1.0 },
  { name: '3 AM', risk: 4, loot: 1.3 },
];
const BURGLARY_ENTRIES = [
  { name: 'Pick the back-door lock', skill: 0.16 },
  { name: 'Through the unlocked window', skill: 0.30 },
  { name: 'Smash a side window (loud)', skill: 0.10, loud: true },
];

// APK Simon/NumberLink quadrant palette (red / gold / green / blue)
const NUMBERLINK_PAIR_COLORS = ['#e63946', '#e6b800', '#2f9e44', '#2f6de0'];

// Build a solvable NumberLink board by construction: we carve disjoint random
// paths and only expose their endpoints, so a full solution always exists.
export function generateNumberLinkPuzzle(gridSize = 5, pairCount = 4) {
  const key = (r, c) => r * gridSize + c;
  for (let attempt = 0; attempt < 120; attempt++) {
    const used = new Set();
    const pairs = [];
    let failed = false;
    while (pairs.length < pairCount && !failed) {
      const free = [];
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          if (!used.has(key(r, c))) free.push([r, c]);
        }
      }
      if (free.length < 3 * (pairCount - pairs.length)) { failed = true; break; }
      const [r0, c0] = free[Math.floor(Math.random() * free.length)];
      const path = [[r0, c0]];
      used.add(key(r0, c0));
      const maxLength = 6;
      while (path.length < maxLength) {
        const [hr, hc] = path[path.length - 1];
        const nbs = [[hr - 1, hc], [hr + 1, hc], [hr, hc - 1], [hr, hc + 1]]
          .filter(([nr, nc]) => nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize && !used.has(key(nr, nc)));
        if (!nbs.length) break;
        const [nr, nc] = nbs[Math.floor(Math.random() * nbs.length)];
        path.push([nr, nc]);
        used.add(key(nr, nc));
      }
      if (path.length < 3) {
        for (const [r, c] of path) used.delete(key(r, c));
        continue;
      }
      pairs.push({
        id: pairs.length,
        ends: [path[0], path[path.length - 1]],
        solution: path,
        color: NUMBERLINK_PAIR_COLORS[pairs.length % NUMBERLINK_PAIR_COLORS.length],
      });
    }
    if (!failed && pairs.length === pairCount) {
      return {
        gridSize, pairCount,
        pairs: pairs.map(p => ({ id: p.id, ends: p.ends, color: p.color })),
        solution: pairs.map(p => p.solution),
      };
    }
  }
  // Deterministic fallback: row-snake layout, always solvable
  const pairs = [];
  for (let i = 0; i < pairCount; i++) {
    const r = i;
    const row = [];
    for (let c = 0; c < gridSize; c++) row.push([r, c]);
    pairs.push({ id: i, ends: [[r, 0], [r, gridSize - 1]], solution: row, color: NUMBERLINK_PAIR_COLORS[i % NUMBERLINK_PAIR_COLORS.length] });
  }
  return { gridSize, pairCount, pairs: pairs.map(p => ({ id: p.id, ends: p.ends, color: p.color })), solution: pairs.map(p => p.solution) };
}

// Validate the player's traced wires: every pair wired terminal-to-terminal via
// orthogonally-adjacent cells, no revisits, no overlapping wires.
export function checkBurglaryPuzzle(puzzle, paths) {
  const key = (r, c) => r * puzzle.gridSize + c;
  const problems = [];
  const seenOf = path => {
    const set = new Set();
    for (const [r, c] of path) {
      if (set.has(key(r, c))) return true;
      set.add(key(r, c));
    }
    return false;
  };
  for (const pair of puzzle.pairs) {
    const line = (paths || []).find(p => p.pairId === pair.id && Array.isArray(p.cells) && p.cells.length);
    if (!line || line.cells.length < 2) {
      problems.push(`Circuit ${pair.id + 1} is not wired.`);
      continue;
    }
    const cells = line.cells;
    const a = key(...pair.ends[0]);
    const b = key(...pair.ends[1]);
    const s = key(...cells[0]);
    const e = key(...cells[cells.length - 1]);
    if (!((s === a && e === b) || (s === b && e === a))) {
      problems.push(`Circuit ${pair.id + 1} does not land on both terminals.`);
      continue;
    }
    let adjOk = true;
    for (let i = 1; i < cells.length; i++) {
      const d = Math.abs(cells[i][0] - cells[i - 1][0]) + Math.abs(cells[i][1] - cells[i - 1][1]);
      if (d !== 1) { adjOk = false; break; }
    }
    if (!adjOk) {
      problems.push(`Circuit ${pair.id + 1} jumps between non-adjacent cells.`);
      continue;
    }
    if (seenOf(cells)) {
      problems.push(`Circuit ${pair.id + 1} loops back on itself.`);
      continue;
    }
  }
  // Overlap across different wires
  const owner = new Map();
  for (const line of (paths || [])) {
    if (!line.cells || line.cells.length < 2) continue;
    for (const [r, c] of line.cells) {
      const k = key(r, c);
      if (owner.has(k) && owner.get(k) !== line.pairId) {
        problems.push('Wires overlap — the panel sparked.');
        break;
      }
      owner.set(k, line.pairId);
    }
  }
  return { solved: problems.length === 0, problems };
}

// Break In: case the joint (time + entry) and generate the alarm-circuit puzzle.
export function commitBurglary(state, timeIndex, entryIndex) {
  const hero = state.hero;
  if (!hero.alive) return { error: 'age_restricted', message: 'You are deceased.' };
  if (hero.prison) return { error: 'age_restricted', message: 'You are already serving a prison sentence.' };
  if (hero.age < 14) return { error: 'age_restricted', message: 'You are too small to climb through the window.' };

  const time = BURGLARY_TIMES[timeIndex] || BURGLARY_TIMES[1];
  const entry = BURGLARY_ENTRIES[entryIndex] || BURGLARY_ENTRIES[0];
  const houseValueClass = getRandomInt(1, 3); // 1 trailer … 3 mansion
  const timeLimit = Math.max(35, 62 - time.risk * 4 - (entry.loud ? 15 : 0));
  const puzzle = { ...generateNumberLinkPuzzle(5, 4), timeLimit };

  const runState = {
    ...state,
    burglaryRun: {
      timeName: time.name, entryName: entry.name, time: timeIndex, entry: entryIndex,
      houseValueClass, timeLimit,
    },
  };
  return {
    phase: 'puzzle',
    state: runState,
    puzzle,
    message: 'You are inside. Strip the panel and bypass the alarm — wire every circuit before the clock hits zero.',
  };
}

// Finalize the burglary based on how well the alarm bypass went.
export function resolveBurglaryPuzzle(state, outcome) {
  const hero = state.hero;
  const run = state.burglaryRun || { timeName: 'Midnight', entryName: 'Pick the back-door lock', houseValueClass: 2, time: 1, entry: 0 };
  const timeRaw = BURGLARY_TIMES[run.time] || BURGLARY_TIMES[1];
  const entry = BURGLARY_ENTRIES[run.entry] || BURGLARY_ENTRIES[0];
  const smartsEdge = (hero.stats.smarts - 50) / 250;
  const cleanState = { ...state, burglaryRun: undefined };

  if (!outcome || !outcome.solved) {
    // Alarm tripped or the clock ran out.
    const roll = Math.random();
    if (roll < 0.5) {
      return arrestHero(cleanState, { charge: `breaking and entering during a burglary attempt (alarm tripped)`, sentence: getRandomInt(1, 4) });
    }
    if (roll < 0.7) {
      return {
        state: {
          ...cleanState,
          hero: { ...hero, stats: { ...hero.stats, health: Math.max(0, hero.stats.health - 20), happiness: Math.max(0, hero.stats.happiness - 10) } },
          lifeLog: [{ age: hero.age, icon: '🦮', text: `A guard dog caught me mid-burglary as the alarm wailed, mauled me, and I only just got over the fence.`, category: 'crime' }, ...cleanState.lifeLog],
        },
        message: 'FAIL! The alarm wailed — a guard dog mauled you mid-burglary and you barely made the fence!',
        statDeltas: { health: -20, happiness: -10 },
      };
    }
    return {
      state: {
        ...cleanState,
        hero: { ...hero, stats: { ...hero.stats, happiness: Math.max(0, hero.stats.happiness - 8) } },
        lifeLog: [{ age: hero.age, icon: '🚨', text: `I bailed out of the burglary when the alarm panel lit up like a christmas tree.`, category: 'crime' }, ...cleanState.lifeLog],
      },
      message: 'FAIL! The bypass stayed open and the alarm shrieked — you bolted empty-handed.',
      statDeltas: { happiness: -8 },
    };
  }

  // Bypass clean: loot scales with how much clock was left on the meter.
  const timeLeftFrac = Math.max(0, Math.min(1, outcome.timeLeftFrac != null ? outcome.timeLeftFrac : 0.5));
  const baseLoot = [500, 3000, 12000][run.houseValueClass - 1] || 3000;
  const loot = Math.round(getRandomInt(200, baseLoot) * timeRaw.loot * (1 + 0.45 * timeLeftFrac));
  const caughtChance = Math.min(0.6, 0.08 + timeRaw.risk * 0.05 + (entry.loud ? 0.15 : 0) - smartsEdge)
    * (timeLeftFrac > 0.5 ? 0.35 : 0.85);
  if (Math.random() < caughtChance) {
    return arrestHero(cleanState, { charge: `burglary (caught slipping out the back)`, sentence: getRandomInt(2, 6) });
  }
  const logs = [{
    age: hero.age,
    icon: '🏠',
    text: `BURGLARY: I slipped in ${run.timeName.toLowerCase()} via ${run.entryName.toLowerCase()}, re-wired the alarm panel clean with ${Math.round(timeLeftFrac * 100)}% of the clock left, and lifted $${loot.toLocaleString()}.`,
    category: 'crime',
  }];
  return {
    state: {
      ...cleanState,
      hero: {
        ...hero,
        bankBalance: hero.bankBalance + loot,
        stats: { ...hero.stats, happiness: Math.min(100, hero.stats.happiness + 10) },
      },
      lifeLog: [...logs, ...cleanState.lifeLog],
    },
    message: `Bypass clean — ${Math.round(timeLeftFrac * 100)}% of the clock left. You got away with $${loot.toLocaleString()}.`,
    statDeltas: { happiness: +10 },
  };
}

// ─── Driving: random incidents (APK a16_racing-drive-* tables) ───────────────

// 55% chance an incident happens on any drive. Returns {incident} for a modal,
// or a calm-log result for a quiet cruise.
export function startCarDriveEvent(state, carIndex) {
  const hero = state.hero;
  const cars = hero.cars || [];
  const car = cars[carIndex];
  if (!car) return { state, message: 'Pick a car in your garage first.' };
  const licenses = hero.licenses || {};
  if (!licenses.car && car.type !== 'Stock Car' && car.type !== 'Formula') {
    return { error: 'no_license', message: 'You need a car license to drive. Take the license test first!' };
  }

  const incidents = (carsData.driveIncidents || []).filter(i =>
    (i.minAge == null || hero.age >= i.minAge) && (i.maxAge == null || hero.age <= i.maxAge));
  if (Math.random() > 0.55 || !incidents.length) {
    const calmLogs = [{
      age: hero.age,
      icon: '🛣️',
      text: `I took the ${car.make} ${car.model} out for a peaceful cruise around town.`,
      category: 'activities',
    }];
    return {
      state: {
        ...state,
        hero: { ...hero, stats: { ...hero.stats, happiness: Math.min(100, hero.stats.happiness + 5) } },
        lifeLog: [...calmLogs, ...state.lifeLog],
      },
      message: `Peaceful cruise in the ${car.make} ${car.model}. Nothing eventful — just vibes.`,
      statDeltas: { happiness: 5 },
    };
  }
  const incident = incidents[getRandomInt(0, incidents.length - 1)];
  return { incident: { ...incident, carIndex }, carName: `${car.make} ${car.model}` };
}

// Resolve the player's choice in a drive incident using the APK Risk/Fault scores.
export function resolveCarDriveChoice(state, incident, choiceIndex) {
  const hero = state.hero;
  const choice = (incident?.choices || [])[choiceIndex];
  if (!choice) return { state, message: 'The moment passed.' };
  const cars = hero.cars || [];
  const car = cars[incident.carIndex];
  const carName = car ? `${car.make} ${car.model}` : 'your car';

  // Risk: chance of a crash; Fault: chance of police citation
  const risk = (choice.risk || 0) / 10;
  const fault = (choice.fault || 0) / 10;

  if (Math.random() < risk * 0.8) {
    const dmg = getRandomInt(8, 45);
    const condition = Math.max(10, (car?.condition || 100) - getRandomInt(15, 60));
    const newCars = [...cars];
    if (car) newCars[incident.carIndex] = { ...car, condition };
    // Very bad crash can be fatal
    if (dmg > 40 && hero.stats.health < 25 && Math.random() < 0.5) {
      const res = killHero(state, `a car crash while driving ${choice.narrative || choice.text}`);
      return { ...res, message: `The crash was fatal. You were ${choice.text.toLowerCase()} and it went very wrong.` };
    }
    const logs = [{
      age: hero.age,
      icon: '💥',
      text: `${choice.narrative || choice.text} It ended in a crash! The ${carName}'s condition dropped and I was hurt.`,
      category: 'activities',
    }];
    return {
      state: {
        ...state,
        hero: {
          ...hero,
          cars: newCars,
          stats: { ...hero.stats, health: Math.max(0, hero.stats.health - dmg), happiness: Math.max(0, hero.stats.happiness - 10) },
        },
        lifeLog: [...logs, ...state.lifeLog],
      },
      message: `CRASH! ${choice.narrative || choice.text} — Cost you ${dmg}% health. Car condition now ${condition}%.`,
      statDeltas: { health: -dmg, happiness: -10 },
    };
  }

  if (Math.random() < fault * 0.7) {
    const fine = Math.round(getRandomInt(80, 600) / 10) * 10;
    const pull = (carsData.policePullOvers || [])[getRandomInt(0, Math.max(0, (carsData.policePullOvers || []).length - 1))];
    const text = pull ? (pull.feedback || 'The officer wrote you a ticket.') : 'The officer wrote you a ticket.';
    if (hero.bankBalance < fine) {
      return arrestHero(state, { charge: `traffic violations with unpaid fines`, sentence: getRandomInt(0, 1) });
    }
    const logs = [{
      age: hero.age,
      icon: '🚓',
      text: `I was pulled over after ${String(choice.text).toLowerCase()}. ${text} Fine: $${fine.toLocaleString()}.`,
      category: 'activities',
    }];
    return {
      state: {
        ...state,
        hero: {
          ...hero,
          bankBalance: hero.bankBalance - fine,
          stats: { ...hero.stats, happiness: Math.max(0, hero.stats.happiness - 6) },
        },
        lifeLog: [...logs, ...state.lifeLog],
      },
      message: `Busted by traffic police — "${String(text).slice(0, 80)}" Fine: $${fine.toLocaleString()}.`,
      statDeltas: { happiness: -6 },
    };
  }

  // Clean resolution: positive narrative + small happiness
  const logs = [{
    age: hero.age,
    icon: '🛣️',
    text: `${choice.narrative || choice.text} and got away with it.`,
    category: 'activities',
  }];
  return {
    state: {
      ...state,
      hero: { ...hero, stats: { ...hero.stats, happiness: Math.min(100, hero.stats.happiness + 4) } },
      lifeLog: [...logs, ...state.lifeLog],
    },
    message: `${choice.narrative || choice.text} Nothing went wrong this time.`,
    statDeltas: { happiness: 4 },
  };
}

// ─── Crime: Murder Minigame ──────────────────────────────────────────────────

// Pick a victim from the hero's relationships (or a stranger), then resolve the
// attempt with the APK murder method table (effectiveness / retaliation / getCaught).
export function commitMurder(state, methodIndex, targetName = null) {
  const hero = state.hero;
  if (!hero.alive) return { error: 'age_restricted', message: 'You are deceased.' };
  if (hero.prison) return { error: 'age_restricted', message: 'You are already serving a prison sentence.' };
  if (hero.age < 14) return { error: 'age_restricted', message: 'You are too young to even think about murder.' };

  const methods = crimeMinigamesData.murderMethods || [];
  const method = methods[methodIndex] || methods[0];
  if (!method) return { state, message: 'No murder methods available.' };

  // Pick target: a named relationship if requested, otherwise a random victim
  let victim = targetName || 'a random person';
  let victimNpc = null;
  const rels = state.relationships || {};
  const candidates = [];
  Object.keys(rels).forEach(cat => {
    const list = rels[cat];
    if (Array.isArray(list)) list.forEach(n => { if (n && n.name && n.alive !== false) candidates.push({ cat, npc: n }); });
  });
  if (candidates.length > 0) {
    const pick = candidates[getRandomInt(0, candidates.length - 1)];
    victimNpc = pick.npc;
    victim = pick.npc.name;
  }

  const eff = (method.effectiveness || 2) / 5;          // 0.2 - 1.0
  const smartsEdge = (hero.stats.smarts - 50) / 200;
  const successOdds = Math.min(0.95, Math.max(0.10, 0.25 + eff * 0.55 + smartsEdge));
  const succeeded = Math.random() < successOdds;

  // Retaliation: the victim fights back and can kill the hero instead
  const retaliationChance = ((method.retaliation || 2) / 5) * (succeeded ? 0.05 : 0.25);
  if (Math.random() < retaliationChance) {
    const res = killHero(state, `a botched murder attempt against ${victim} (they fought back)`);
    return { ...res, message: `${victim} turned the tables on you — you didn't survive the attempt.` };
  }

  if (succeeded) {
    // Get caught likelihood drives the arrest roll after a clean kill
    const caughtChance = Math.min(0.85, ((method.getCaught || 2) / 5) * 0.55 + 0.05 - smartsEdge);
    if (Math.random() < caughtChance) {
      const sentence = 15 + Math.round((method.getCaught || 3) * 4) + getRandomInt(0, 10);
      return arrestHero(state, { charge: `the 1st degree murder of ${victim}`, sentence });
    }
    const logEntry = {
      age: hero.age,
      icon: '🔪',
      text: `I murdered ${victim} using the ${method.method.toLowerCase()} method and got away with it!`,
      category: 'crime',
    };
    return {
      state: {
        ...state,
        hero: {
          ...hero,
          stats: { ...hero.stats, happiness: Math.min(100, hero.stats.happiness + 12), health: hero.stats.health },
        },
        lifeLog: [logEntry, ...state.lifeLog],
      },
      message: `${victim} is dead. The ${method.method.toLowerCase()} worked perfectly and nobody suspects a thing.`,
      statDeltas: { happiness: 12 },
    };
  }

  // Failed attempt — victim survived
  const logEntry = {
    age: hero.age,
    icon: '😰',
    text: `I tried to murder ${victim} using the ${method.method.toLowerCase()} method, but they survived and I fled the scene.`,
    category: 'crime',
  };
  const caughtChance = Math.min(0.9, ((method.getCaught || 2) / 5) * 0.45 + 0.15 - smartsEdge);
  if (Math.random() < caughtChance) {
    const sentence = 8 + Math.round((method.getCaught || 3) * 3) + getRandomInt(0, 8);
    return arrestHero(state, { charge: `the attempted murder of ${victim}`, sentence });
  }
  return {
    state: {
      ...state,
      hero: { ...hero, stats: { ...hero.stats, happiness: Math.max(0, hero.stats.happiness - 10) } },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `Your murder attempt on ${victim} failed! They survived and you barely escaped.`,
    statDeltas: { happiness: -10 },
  };
}

// ─── Crime: Bank Robbery Minigame ────────────────────────────────────────────

// Weapon -> disguise -> getaway. Combined effectiveness score (1-5 each) drives
// the heist success odds and the size of the haul.
export function commitBankRobbery(state, { weaponIndex = 0, disguiseIndex = 0, getawayIndex = 0 }) {
  const hero = state.hero;
  if (!hero.alive) return { error: 'age_restricted', message: 'You are deceased.' };
  if (hero.prison) return { error: 'age_restricted', message: 'You are already serving a prison sentence.' };
  if (hero.age < 18) return { error: 'age_restricted', message: 'You must be at least 18 to rob a bank.' };

  const br = crimeMinigamesData.bankRobbery || { weapons: [], disguises: [], getaways: [] };
  const weapon = br.weapons[weaponIndex] || br.weapons[0];
  const disguise = br.disguises[disguiseIndex] || br.disguises[0];
  const getaway = br.getaways[getawayIndex] || br.getaways[0];
  if (!weapon || !disguise || !getaway) return { state, message: 'Heist data missing.' };

  const combined = ((weapon.effectiveness || 2) + (disguise.effectiveness || 2) + (getaway.effectiveness || 2)) / 3;
  const smartsEdge = (hero.stats.smarts - 50) / 250;
  const successOdds = Math.min(0.92, Math.max(0.08, 0.20 + combined * 0.14 + smartsEdge));
  const succeeded = Math.random() < successOdds;

  if (succeeded) {
    const haul = Math.round(
      getRandomInt(25000, 250000) * (0.5 + combined / 10) * (0.75 + (hero.stats.smarts / 100) * 0.5)
    );
    // Post-heist escape roll: a bad getaway can still get you busted
    const escapeChance = Math.min(0.95, 0.35 + (getaway.effectiveness || 2) * 0.12);
    if (Math.random() > escapeChance) {
      const sentence = 10 + getRandomInt(0, 20);
      return arrestHero(state, { charge: 'armed bank robbery', sentence });
    }
    const logEntry = {
      age: hero.age,
      icon: '🏦',
      text: `HEIST COMPLETE: Robbed a bank dressed ${disguise.desc}, armed with a ${weapon.name.toLowerCase()}, and escaped ${getaway.desc} with $${haul.toLocaleString()}!`,
      category: 'crime',
    };
    return {
      state: {
        ...state,
        hero: {
          ...hero,
          bankBalance: hero.bankBalance + haul,
          stats: { ...hero.stats, happiness: Math.min(100, hero.stats.happiness + 15) },
        },
        lifeLog: [logEntry, ...state.lifeLog],
      },
      message: `JACKPOT! The heist netted $${haul.toLocaleString()} and the ${getaway.name} escape was flawless!`,
      statDeltas: { happiness: 15 },
    };
  }

  // Failed heist — mostly arrest, occasionally a narrow escape
  if (Math.random() < 0.8) {
    const sentence = 8 + getRandomInt(2, 18);
    return arrestHero(state, { charge: 'attempted bank robbery', sentence });
  }
  const logEntry = {
    age: hero.age,
    icon: '🚨',
    text: `I tried robbing a bank ${disguise.desc} with a ${weapon.name.toLowerCase()}, but the alarm tripped and I fled empty-handed.`,
    category: 'crime',
  };
  return {
    state: {
      ...state,
      hero: { ...hero, stats: { ...hero.stats, happiness: Math.max(0, hero.stats.happiness - 15) } },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: 'The bank alarm tripped! You fled the scene empty-handed with police swarming outside.',
    statDeltas: { happiness: -15 },
  };
}

// ─── Crime: Hire a Hitman ────────────────────────────────────────────────────

// Pays a professional from the APK hitman roster. Fee scales with hitman tier;
// a traced contract can land YOU in prison for murder-for-hire.
export function hireHitman(state, hitmanIndex) {
  const hero = state.hero;
  if (!hero.alive) return { error: 'age_restricted', message: 'You are deceased.' };
  if (hero.prison) return { error: 'age_restricted', message: 'You are already serving a prison sentence.' };
  if (hero.age < 18) return { error: 'age_restricted', message: 'You must be at least 18 to hire a hitman.' };

  const hitmen = crimeMinigamesData.hitmen || [];
  const hitman = hitmen[hitmanIndex] || hitmen[getRandomInt(0, Math.max(0, hitmen.length - 1))];
  if (!hitman) return { state, message: 'No hitmen available.' };

  // Fee tiers: $25k - $150k depending on the hitman's skill roll
  const skill = getRandomInt(1, 5);
  const fee = 25000 * skill;
  if (hero.bankBalance < fee) {
    return { error: 'insufficient_funds', message: `You need $${fee.toLocaleString()} to hire ${hitman.name}.` };
  }

  // Target selection mirrors commitMurder
  let victim = 'your target';
  let victimNpc = null;
  const rels = state.relationships || {};
  const candidates = [];
  Object.keys(rels).forEach(cat => {
    const list = rels[cat];
    if (Array.isArray(list)) list.forEach(n => { if (n && n.name && n.alive !== false) candidates.push(n); });
  });
  if (candidates.length > 0) {
    victimNpc = candidates[getRandomInt(0, candidates.length - 1)];
    victim = victimNpc.name;
  }

  const logs = [{
    age: hero.age,
    icon: '🧎',
    text: `I hired ${hitman.name} for $${fee.toLocaleString()} to take out ${victim}.`,
    category: 'crime',
  }];

  let newState = {
    ...state,
    hero: { ...hero, bankBalance: hero.bankBalance - fee },
    lifeLog: [...logs, ...state.lifeLog],
  };

  if (Math.random() < 0.35 + skill * 0.10) {
    // Contract fulfilled
    logs.push({
      age: hero.age,
      icon: '💀',
      text: `${hitman.name} got the job done. ${victim} was found dead this morning. Nobody knows it was me.`,
      category: 'crime',
    });
    newState = {
      ...newState,
      hero: {
        ...newState.hero,
        stats: { ...newState.hero.stats, happiness: Math.min(100, newState.hero.stats.happiness + 10) },
      },
      lifeLog: [...logs, ...newState.lifeLog],
    };
    return { state: newState, message: `${hitman.name} completed the hit on ${victim}. Your secret is safe.`, statDeltas: { happiness: 10 } };
  }

  // Traced back — you're the one on trial
  if (Math.random() < 0.45) {
    const sentence = 12 + getRandomInt(0, 15);
    return arrestHero(newState, { charge: `hiring ${hitman.name} to murder ${victim}`, sentence });
  }

  logs.push({
    age: hero.age,
    icon: '😤',
    text: `${hitman.name} took my money and botched the job on ${victim}. Never trusting a hitman again.`,
    category: 'crime',
  });
  newState = {
    ...newState,
    hero: { ...newState.hero, stats: { ...newState.hero.stats, happiness: Math.max(0, newState.hero.stats.happiness - 8) } },
    lifeLog: [...logs, ...newState.lifeLog],
  };
  return { state: newState, message: `${hitman.name} botched the hit on ${victim} and vanished with your money!`, statDeltas: { happiness: -8 } };
}

// ─── Crime: Social Media Hack ────────────────────────────────────────────────

// Pulls a scenario from the APK a16_social-media-hacks table. Success steals
// followers/leaks info for cash; failure can expose YOU instead.
export function hackSocialMedia(state) {
  const hero = state.hero;
  if (!hero.alive) return { error: 'age_restricted', message: 'You are deceased.' };
  if (hero.prison) return { error: 'age_restricted', message: 'You are already serving a prison sentence.' };
  if (hero.age < 13) return { error: 'age_restricted', message: 'You are too young to pull off a hack like this.' };

  const hacks = crimeMinigamesData.socialMediaHacks || [];
  const hack = hacks[getRandomInt(0, Math.max(0, hacks.length - 1))];
  const smartsEdge = (hero.stats.smarts - 50) / 200;
  const successOdds = Math.min(0.85, Math.max(0.2, 0.45 + smartsEdge));
  const succeeded = Math.random() < successOdds;

  if (succeeded) {
    const loot = getRandomInt(500, 12000);
    const logEntry = {
      age: hero.age,
      icon: '💻',
      text: `HACKED: ${hack.scenario || 'I hacked a social media account'} — walked away with $${loot.toLocaleString()}.`,
      category: 'crime',
    };
    return {
      state: {
        ...state,
        hero: {
          ...hero,
          bankBalance: hero.bankBalance + loot,
          stats: { ...hero.stats, happiness: Math.min(100, hero.stats.happiness + 6) },
        },
        lifeLog: [logEntry, ...state.lifeLog],
      },
      message: `Hack successful! You extorted $${loot.toLocaleString()} from the account owner.`,
      statDeltas: { happiness: 6 },
    };
  }

  // Caught in the act — cybercrime charges
  if (Math.random() < 0.5) {
    const sentence = 1 + getRandomInt(0, 3);
    return arrestHero(state, { charge: 'unauthorized computer access (hacking)', sentence });
  }
  const logEntry = {
    age: hero.age,
    icon: '😵',
    text: `I tried hacking a social media account but locked myself out and left a digital trail.`,
    category: 'crime',
  };
  return {
    state: {
      ...state,
      hero: { ...hero, stats: { ...hero.stats, happiness: Math.max(0, hero.stats.happiness - 5) } },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: 'The hack failed and you left a digital trail. Someone knows it was you.',
    statDeltas: { happiness: -5 },
  };
}

// ─── Crime: Spy Agency (Secret Agent Career) ─────────────────────────────────

export function startSpyAgency(state, frontType) {
  const hero = state.hero;
  if (hero.age < 18) return { success: false, message: 'You must be at least 18 to run a spy agency.' };

  const spy = crimeMinigamesData.secretAgent || {};
  const fronts = spy.agencyFronts || [];
  const front = fronts.find(f => f.type === frontType) || fronts.find(f => f.starter) || fronts[0] || { type: 'florist' };
  const agencyNames = spy.agencyNames || ['Double-O Anonymous'];
  const orgName = getRandomFromList(agencyNames);

  const newSpecialCareer = {
    type: 'spy',
    title: 'Handler',
    organization: orgName,
    frontType: front.type,
    frontCapacity: front.maxAgents || 4,
    cover: 50,
    agentCount: 1,
    missionsDone: 0,
    salary: 45000,
    standing: 50,
    yearsActive: 0,
  };

  const logEntry = {
    age: hero.age,
    icon: '🕵️',
    text: `I founded a spy agency called "${orgName}", hidden behind a ${front.type} storefront!`,
    category: 'career',
  };

  return {
    success: true,
    state: {
      ...state,
      hero: {
        ...hero,
        occupation: `Spy Handler (${orgName})`,
        job: null,
        specialCareer: newSpecialCareer,
        stats: { ...hero.stats, happiness: Math.min(100, hero.stats.happiness + 8) },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `Your spy agency "${orgName}" is operational behind the ${front.type} front!`,
  };
}

// Spy missions: stealth | hacking | assassination | honeypot — each uses its own
// APK data table and returns money, cover shifts, and agent losses.
export function spyRunMission(state, missionType) {
  const sc = state.hero.specialCareer;
  const hero = state.hero;
  if (!sc || sc.type !== 'spy') return { state, message: 'You are not running a spy agency.' };

  const spy = crimeMinigamesData.secretAgent || {};
  const missionNames = spy.missionAdjectives || ['Secret'];
  const missionNouns = spy.missionNouns || ['Operation'];
  const codeName = `${getRandomFromList(missionNames)} ${getRandomFromList(missionNouns)}`;

  const smartsEdge = (hero.stats.smarts - 50) / 250;
  let baseOdds = 0.5;
  let payout = 0;
  let flavor = '';
  let icon = '🕵️';

  if (missionType === 'assassination') {
    const methods = spy.assassinationMethods || [];
    const method = methods[getRandomInt(0, Math.max(0, methods.length - 1))] || { method: 'a staged accident', effectiveness: 3 };
    baseOdds = 0.25 + (method.effectiveness || 3) * 0.09 + smartsEdge;
    payout = getRandomInt(50000, 300000);
    flavor = `The target was eliminated via ${String(method.method).toLowerCase()}`;
    icon = '🎯';
  } else if (missionType === 'hacking') {
    const drives = spy.hackDriveNames || [];
    const drive = drives.length ? getRandomFromList(drives) : 'the mainframe';
    baseOdds = 0.4 + smartsEdge;
    payout = getRandomInt(20000, 150000);
    flavor = `We breached the drive "${drive}" and extracted classified files`;
    icon = '💾';
  } else if (missionType === 'stealth') {
    baseOdds = 0.45 + smartsEdge;
    payout = getRandomInt(30000, 200000);
    flavor = 'Our agent slipped past the guards and retrieved the intel';
    icon = '🥷';
  } else {
    // honeypot
    baseOdds = 0.55 + smartsEdge;
    payout = getRandomInt(25000, 180000);
    flavor = 'The honeypot seduced the target right out of their secrets';
    icon = '💋';
  }

  const succeeded = Math.random() < Math.min(0.95, baseOdds);

  if (succeeded) {
    const newCover = Math.min(100, (sc.cover || 50) + getRandomInt(2, 6));
    const logEntry = {
      age: hero.age,
      icon,
      text: `MISSION "${codeName}" COMPLETE: ${flavor}. The client paid $${payout.toLocaleString()}.`,
      category: 'crime',
    };
    return {
      state: {
        ...state,
        hero: {
          ...hero,
          bankBalance: hero.bankBalance + payout,
          specialCareer: { ...sc, cover: newCover, missionsDone: (sc.missionsDone || 0) + 1, standing: Math.min(100, (sc.standing || 50) + 3) },
        },
        lifeLog: [logEntry, ...state.lifeLog],
      },
      message: `Mission "${codeName}" succeeded! Earned $${payout.toLocaleString()}.`,
    };
  }

  // Mission failed: cover loss, maybe an agent captured, occasionally you get burned
  const coverLoss = getRandomInt(8, 25);
  const newCover = Math.max(0, (sc.cover || 50) - coverLoss);
  const logs = [{
    age: hero.age,
    icon: '🚨',
    text: `MISSION "${codeName}" FAILED: ${flavor.replace(/^Our agent|^We/, 'The plan fell apart — we tried to ')} and the target got away.`,
    category: 'crime',
  }];
  let newHero = { ...hero, specialCareer: { ...sc, cover: newCover } };

  if (Math.random() < 0.25) {
    logs.unshift({
      age: hero.age,
      icon: '⛓️',
      text: `One of my agents was captured during "${codeName}". The agency is down a operative.`,
      category: 'crime',
    });
    newHero = { ...newHero, specialCareer: { ...newHero.specialCareer, agentCount: Math.max(0, (sc.agentCount || 1) - 1) } };
  }
  if (newCover <= 0 && Math.random() < 0.4) {
    // Your cover is completely blown — arrest
    return arrestHero({ ...state, hero: newHero }, { charge: 'operating an unlicensed spy agency', sentence: getRandomInt(2, 8) });
  }
  return {
    state: {
      ...state,
      hero: newHero,
      lifeLog: [...logs, ...state.lifeLog],
    },
    message: `Mission "${codeName}" failed! Cover dropped ${coverLoss} points.`,
  };
}

// 3. Musician
export function startMusicCareer(state, { genre, role, isBand, instrumentName }) {
  const hero = state.hero;
  if (hero.age < 16) return { success: false, message: 'You must be at least 16 to sign a record contract.' };

  const bandNames = [
    'The Velvet Frequency', 'Electric Eclipse', 'Neon Dynasty', 'Iron Horizon',
    'Midnight Echoes', 'Subtle Chaos', 'Siren Anthem', 'Cosmic Rebels'
  ];
  const chosenBandName = getRandomFromList(bandNames);
  const genreData = (specialJobsData.musician.genres || []).find(g => g.genre === genre);
  const singerTitle = genreData?.singerTitle || 'Solo Artist';
  const labels = specialJobsData.musician.recordLabels || [];
  const genreLabels = labels.filter(l => l.genre === genre);
  const matchedLabel = genreLabels.length > 0 ? getRandomFromList(genreLabels) : (labels.length > 0 ? getRandomFromList(labels) : null);
  const recordLabelName = matchedLabel?.name || 'Indie Sound Records';

  const orgName = isBand ? chosenBandName : `${hero.fullName} (signed to ${recordLabelName})`;

  const newSpecialCareer = {
    type: 'musician',
    title: isBand ? `Lead ${role || 'Guitarist'}` : singerTitle,
    famousTitle: genreData?.famousTitle || 'Rock Legend',
    genre: genre || 'Pop',
    recordLabel: recordLabelName,
    organization: orgName,
    isBand: !!isBand,
    instrument: instrumentName || 'Guitar',
    salary: 55000,
    fame: 25,
    standing: 60, // Band chemistry / Fan loyalty
    albumsReleased: 0,
    yearsActive: 0,
  };

  const logEntry = {
    age: hero.age,
    icon: '🎸',
    text: `I launched my professional music career as a ${newSpecialCareer.title} playing ${genre} in ${orgName}!`,
    category: 'career',
  };

  return {
    success: true,
    state: {
      ...state,
      hero: {
        ...hero,
        occupation: `${newSpecialCareer.title} (${orgName})`,
        job: null,
        specialCareer: newSpecialCareer,
        stats: { ...hero.stats, happiness: Math.min(100, hero.stats.happiness + 20) },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `You signed with a record label! Your music career has begun.`,
  };
}

export function musicReleaseAlbum(state, { albumType }) {
  const sc = state.hero.specialCareer;
  if (!sc || sc.type !== 'musician') return { state, message: 'You are not in a music career.' };

  const albumTitles = [
    'Genesis', 'Midnight Tears', 'Resonance', 'Afterglow', 'Echoes of Eternity',
    'Neon Dreams', 'Visions of Tomorrow', 'Unapologetic', 'Reckless Rhythm'
  ];
  const title = getRandomFromList(albumTitles);
  const fameFactor = (sc.fame || 25) / 100;
  const copiesSold = Math.round(15000 + (fameFactor * 1500000) + getRandomInt(5000, 50000));
  const royalties = Math.round(copiesSold * 0.85);

  let cert = 'Standard';
  if (copiesSold >= 1000000) cert = '💎 Diamond';
  else if (copiesSold >= 500000) cert = '💿 Platinum';
  else if (copiesSold >= 100000) cert = '📀 Gold';

  const newFame = Math.min(100, (sc.fame || 25) + getRandomInt(5, 12));

  const logEntry = {
    age: state.hero.age,
    icon: '💿',
    text: `I dropped a brand-new ${albumType || 'Studio Album'} titled "${title}"! It achieved ${cert} status (${copiesSold.toLocaleString()} sales), earning $${royalties.toLocaleString()} in royalties!`,
    category: 'career',
  };

  return {
    state: {
      ...state,
      hero: {
        ...state.hero,
        bankBalance: state.hero.bankBalance + royalties,
        specialCareer: {
          ...sc,
          fame: newFame,
          albumsReleased: (sc.albumsReleased || 0) + 1,
        },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `Album released! "${title}" sold ${copiesSold.toLocaleString()} copies (${cert})! Royalties: $${royalties.toLocaleString()}.`,
  };
}

export function musicGoOnTour(state) {
  const sc = state.hero.specialCareer;
  if (!sc || sc.type !== 'musician') return { state, message: 'You are not in a music career.' };

  const tourGross = Math.round((sc.fame || 25) * getRandomInt(3000, 9000));
  const newFame = Math.min(100, (sc.fame || 25) + getRandomInt(4, 8));

  const logEntry = {
    age: state.hero.age,
    icon: '🎤',
    text: `I completed a sold-out concert tour across 15 major cities, grossing $${tourGross.toLocaleString()} in ticket & merch sales!`,
    category: 'career',
  };

  return {
    state: {
      ...state,
      hero: {
        ...state.hero,
        bankBalance: state.hero.bankBalance + tourGross,
        specialCareer: { ...sc, fame: newFame },
        stats: {
          ...state.hero.stats,
          happiness: Math.min(100, state.hero.stats.happiness + 15),
          health: Math.max(0, state.hero.stats.health - 4), // Tour exhaustion
        },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `Tour was a monumental success! Grossed $${tourGross.toLocaleString()}!`,
  };
}

// 4. Actor
export function startActorCareer(state, { roleType }) {
  const hero = state.hero;
  if (hero.age < 18) return { success: false, message: 'You must be at least 18 years old to join the Screen Actors Guild.' };

  const extraRolesList = specialJobsData.actor.extraRoles || [];
  const randomExtra = extraRolesList.length > 0 ? getRandomFromList(extraRolesList)?.role : 'Pedestrian';
  const title = roleType === 'Supporting' ? 'Supporting Actor' : `Movie Extra (${randomExtra})`;
  const salary = roleType === 'Supporting' ? 75000 : 35000;

  const newSpecialCareer = {
    type: 'actor',
    title,
    organization: 'Hollywood Talent Network',
    salary,
    fame: roleType === 'Supporting' ? 30 : 10,
    standing: 50,
    filmsMade: 0,
    yearsActive: 0,
  };

  const logEntry = {
    age: hero.age,
    icon: '🎬',
    text: `I signed with a talent agent and embarked on my Hollywood acting journey as a ${title}!`,
    category: 'career',
  };

  return {
    success: true,
    state: {
      ...state,
      hero: {
        ...hero,
        occupation: title,
        job: null,
        specialCareer: newSpecialCareer,
        stats: { ...hero.stats, happiness: Math.min(100, hero.stats.happiness + 15) },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `You landed an agent and started acting as a ${title}!`,
  };
}

export function actorAudition(state, { genre }) {
  const sc = state.hero.specialCareer;
  if (!sc || sc.type !== 'actor') return { state, message: 'You are not in an acting career.' };

  const films = specialJobsData.actor.films;
  const filmTitle = getRandomFromList(films) || 'Sunset Boulevard';
  const hero = state.hero;

  const passed = (hero.stats.looks + hero.stats.smarts + getRandomInt(-15, 20)) >= 85;

  if (!passed) {
    const logEntry = {
      age: hero.age,
      icon: '❌',
      text: `I auditioned for a lead role in the upcoming ${genre || 'Action'} film "${filmTitle}", but the director chose someone else.`,
      category: 'career',
    };
    return {
      state: {
        ...state,
        hero: {
          ...hero,
          stats: { ...hero.stats, happiness: Math.max(0, hero.stats.happiness - 5) },
        },
        lifeLog: [logEntry, ...state.lifeLog],
      },
      message: `The casting director went in another direction. Keep auditioning!`,
    };
  }

  const genreData = (specialJobsData.actor.genres || []).find(g => g.genre === genre);
  const budgetMult = (genreData?.budget || 3) / 3;
  const roleSalary = Math.round((150000 + ((sc.fame || 20) * 15000)) * budgetMult);
  const newFame = Math.min(100, (sc.fame || 20) + getRandomInt(8, 16));

  const logEntry = {
    age: hero.age,
    icon: '🌟',
    text: `I landed the Lead Role in "${filmTitle}" (${genre || 'Blockbuster'})! The movie was a box-office sensation, paying me $${roleSalary.toLocaleString()}!`,
    category: 'career',
  };

  return {
    state: {
      ...state,
      hero: {
        ...hero,
        occupation: `Lead Actor ("${filmTitle}")`,
        bankBalance: hero.bankBalance + roleSalary,
        specialCareer: {
          ...sc,
          title: 'Lead Movie Star',
          salary: Math.max(sc.salary, roleSalary),
          fame: newFame,
          filmsMade: (sc.filmsMade || 0) + 1,
        },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `You were cast as the Lead in "${filmTitle}"! Earned $${roleSalary.toLocaleString()} and gained big Hollywood fame!`,
  };
}

// 5. Athlete (Pro Sports)
export function startAthleteCareer(state, { sport, position }) {
  const hero = state.hero;
  if (hero.age < 18 || hero.age > 28) {
    return { success: false, message: 'Pro athletes must be between 18 and 28 years old to enter the draft.' };
  }
  if (hero.stats.health < 60) {
    return { success: false, message: 'Your health and fitness are too low to clear the pro medical physical.' };
  }

  const sportsKey = (sport || 'football').toLowerCase();
  const sportData = (specialJobsData.athlete.sports || []).find(s => s.sport.toLowerCase() === sportsKey) || {};
  const teams = specialJobsData.athlete.teams[sportsKey] || [
    'New York Empire', 'Los Angeles Titans', 'Chicago Blaze', 'Miami Surge', 'London Knights'
  ];
  const team = getRandomFromList(teams);
  const salary = getRandomInt(sportData.minSalary || 650000, sportData.maxSalary || 3500000);

  const newSpecialCareer = {
    type: 'athlete',
    sport: (sport ? (sport.charAt(0).toUpperCase() + sport.slice(1)) : 'Football'),
    title: `${position || 'Athlete'}`,
    organization: team,
    salary,
    fame: 40,
    standing: 70, // Athletic condition & coach satisfaction
    contractYears: 4,
    championships: 0,
    yearsActive: 0,
  };

  const logEntry = {
    age: hero.age,
    icon: '🏆',
    text: `DRAFTED! I was selected by the ${team} as their new ${position || 'Athlete'}! I signed a 4-year, $${(salary * 4).toLocaleString()} pro contract!`,
    category: 'career',
  };

  return {
    success: true,
    state: {
      ...state,
      hero: {
        ...hero,
        occupation: `${position} (${team})`,
        job: null,
        specialCareer: newSpecialCareer,
        stats: { ...hero.stats, happiness: Math.min(100, hero.stats.happiness + 30) },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `Welcome to the big leagues! You signed with the ${team} for $${salary.toLocaleString()}/yr!`,
  };
}

export function athletePractice(state) {
  const sc = state.hero.specialCareer;
  if (!sc || sc.type !== 'athlete') return { state, message: 'You are not in a professional sports career.' };

  const newStanding = Math.min(100, sc.standing + getRandomInt(5, 10));

  const logEntry = {
    age: state.hero.age,
    icon: '🏋️',
    text: `I spent extra hours running conditioning drills and film study. The coaching staff commended my work ethic!`,
    category: 'career',
  };

  return {
    state: {
      ...state,
      hero: {
        ...state.hero,
        specialCareer: { ...sc, standing: newStanding },
        stats: {
          ...state.hero.stats,
          health: Math.min(100, state.hero.stats.health + 3),
        },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `Practice went great! Your athletic performance increased (+${newStanding - sc.standing}%).`,
  };
}

// 6. Model
export function startModelCareer(state) {
  const hero = state.hero;
  if (hero.age < 18) return { success: false, message: 'You must be at least 18 years old to sign a modeling contract.' };
  if (hero.stats.looks < 60) return { success: false, message: 'Modeling scouts deemed that your looks do not fit their current editorial roster (Looks 60+ required).' };

  const agencies = specialJobsData.model.agencies;
  const agency = getRandomFromList(agencies);
  const firstRank = specialJobsData.model.ranks[0] || { title: 'Body Part Model', minSalary: 65000 };

  const newSpecialCareer = {
    type: 'model',
    title: firstRank.title,
    organization: agency,
    rankIndex: 0,
    salary: firstRank.minSalary || 65000,
    fame: 15,
    standing: 65,
    gigsCompleted: 0,
    yearsActive: 0,
  };

  const logEntry = {
    age: hero.age,
    icon: '👠',
    text: `I was scouted and signed by ${agency} as a ${firstRank.title} with a starting salary of $${newSpecialCareer.salary.toLocaleString()}/yr!`,
    category: 'career',
  };

  return {
    success: true,
    state: {
      ...state,
      hero: {
        ...hero,
        occupation: `${firstRank.title} (${agency})`,
        job: null,
        specialCareer: newSpecialCareer,
        stats: { ...hero.stats, happiness: Math.min(100, hero.stats.happiness + 20) },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `Signed! ${agency} signed you as a ${firstRank.title}!`,
  };
}

export function modelDoGig(state, gigIndex) {
  const sc = state.hero.specialCareer;
  if (!sc || sc.type !== 'model') return { state, message: 'You are not in a modeling career.' };

  const gig = specialJobsData.model.gigs[gigIndex] || specialJobsData.model.gigs[0];
  const payout = getRandomInt(12000, 45000);
  const newStanding = Math.min(100, sc.standing + 5);
  const newGigs = (sc.gigsCompleted || 0) + 1;

  // Check promotion along ranks
  let nextRankIdx = sc.rankIndex;
  let nextTitle = sc.title;
  let nextSalary = sc.salary;
  const rankDefs = specialJobsData.model.ranks;
  if (nextRankIdx + 1 < rankDefs.length && newGigs >= (rankDefs[nextRankIdx + 1].jobsToPromo || 8) && state.hero.stats.looks >= (rankDefs[nextRankIdx + 1].minLooks || 0)) {
    nextRankIdx += 1;
    nextTitle = rankDefs[nextRankIdx].title;
    nextSalary = rankDefs[nextRankIdx].minSalary;
  }

  const logEntry = {
    age: state.hero.age,
    icon: '📸',
    text: `I booked and completed a high-profile ${gig.name} photoshoot, earning $${payout.toLocaleString()}!`,
    category: 'career',
  };

  const logs = [logEntry];
  if (nextRankIdx > sc.rankIndex) {
    logs.unshift({
      age: state.hero.age,
      icon: '✨',
      text: `PROMOTED! The agency elevated my status to ${nextTitle} ($${nextSalary.toLocaleString()}/yr)!`,
      category: 'career',
    });
  }

  return {
    state: {
      ...state,
      hero: {
        ...state.hero,
        occupation: `${nextTitle} (${sc.organization})`,
        bankBalance: state.hero.bankBalance + payout,
        specialCareer: {
          ...sc,
          rankIndex: nextRankIdx,
          title: nextTitle,
          salary: nextSalary,
          standing: newStanding,
          gigsCompleted: newGigs,
          fame: Math.min(100, (sc.fame || 15) + 4),
        },
      },
      lifeLog: [...logs, ...state.lifeLog],
    },
    message: `Photoshoot booked! You received $${payout.toLocaleString()}.${nextRankIdx > sc.rankIndex ? ` Promoted to ${nextTitle}!` : ''}`,
  };
}

// 7. Astronaut
export function applySpaceAcademy(state, answerIndex, questionIndex) {
  const hero = state.hero;
  if (hero.age < 21) return { success: false, message: 'You must be at least 21 years old to apply to the Space Academy.' };
  if (hero.stats.smarts < 60) return { success: false, message: 'Space Agency requires Smarts of 60+ to enter the aerospace program.' };

  const qIdx = (questionIndex != null && questionIndex >= 0) ? questionIndex : getRandomInt(0, specialJobsData.astronaut.trainingQuestions.length - 1);
  const q = specialJobsData.astronaut.trainingQuestions[qIdx];
  const allChoices = [q.correct, ...(q.wrong || [])];
  const chosen = allChoices[answerIndex];

  if (chosen !== q.correct) {
    const logEntry = {
      age: hero.age,
      icon: '❌',
      text: `I sat for the Space Agency Astronaut Entrance Exam, but failed the technical physics section.`,
      category: 'career',
    };
    return {
      success: false,
      state: {
        ...state,
        hero: {
          ...hero,
          stats: { ...hero.stats, happiness: Math.max(0, hero.stats.happiness - 8) },
        },
        lifeLog: [logEntry, ...state.lifeLog],
      },
      message: `Exam failed! You answered incorrectly. Better study up on your astrophysics.`,
    };
  }

  const firstRank = specialJobsData.astronaut.ranks[0] || { rank: 'Cadet', minSalary: 65000 };

  const newSpecialCareer = {
    type: 'astronaut',
    title: firstRank.rank,
    organization: 'National Space Agency',
    rankIndex: 0,
    salary: firstRank.minSalary || 65000,
    standing: 70, // Flight readiness
    fame: 20,
    missionsCompleted: 0,
    yearsActive: 0,
  };

  const logEntry = {
    age: hero.age,
    icon: '🚀',
    text: `PASSED! I aced the astronaut qualification exam and was commissioned as a ${firstRank.rank} in the Space Agency ($${firstRank.minSalary.toLocaleString()}/yr)!`,
    category: 'career',
  };

  return {
    success: true,
    state: {
      ...state,
      hero: {
        ...hero,
        occupation: `${firstRank.rank} (Space Agency)`,
        job: null,
        specialCareer: newSpecialCareer,
        stats: { ...hero.stats, happiness: Math.min(100, hero.stats.happiness + 25) },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `Welcome to the Astronaut Corps, Cadet! You're going to space.`,
  };
}

export function launchSpaceMission(state, missionIndex) {
  const sc = state.hero.specialCareer;
  if (!sc || sc.type !== 'astronaut') return { state, message: 'You are not in the astronaut program.' };

  const mission = specialJobsData.astronaut.lunarMissions[missionIndex] || specialJobsData.astronaut.lunarMissions[0];
  const missionDesc = mission.snippet ? mission.snippet.replace(/<[^>]+>/g, 'the Moon') : 'conducted a research spacewalk';
  const danger = mission.danger || 1;
  const failed = Math.random() < (danger * 0.05);

  if (failed) {
    const logEntry = {
      age: state.hero.age,
      icon: '⚠️',
      text: `MISSION ABORT: An anomaly occurred during EVA while attempting to ${missionDesc}. The mission was safely aborted.`,
      category: 'career',
    };
    return {
      state: {
        ...state,
        hero: {
          ...state.hero,
          stats: { ...state.hero.stats, health: Math.max(10, state.hero.stats.health - (danger * 3)) },
          specialCareer: { ...sc, standing: Math.max(0, sc.standing - 5) },
        },
        lifeLog: [logEntry, ...state.lifeLog],
      },
      message: `Critical anomaly! Mission aborted due to hazard conditions (Danger: ${danger}/5).`,
    };
  }

  const newMissions = (sc.missionsCompleted || 0) + 1;
  const newStanding = Math.min(100, sc.standing + 8);
  const newFame = Math.min(100, (sc.fame || 20) + 10);

  // Check promotion against APK requirements (minSmarts, minHealth, salary range)
  let nextRankIdx = sc.rankIndex;
  let nextTitle = sc.title;
  let nextSalary = sc.salary;
  const rankDefs = specialJobsData.astronaut.ranks;
  if (nextRankIdx + 1 < rankDefs.length && newMissions >= (rankDefs[nextRankIdx + 1].missionsToPromo || 3)) {
    const candidate = rankDefs[nextRankIdx + 1];
    if (state.hero.stats.smarts >= (candidate.minSmarts || 0) && state.hero.stats.health >= (candidate.minHealth || 0)) {
      nextRankIdx += 1;
      nextTitle = candidate.rank;
      nextSalary = getRandomInt(candidate.minSalary, candidate.maxSalary || candidate.minSalary);
    }
  }

  const logEntry = {
    age: state.hero.age,
    icon: '👨‍🚀',
    text: `MISSION SUCCESS: Aboard the spacecraft, I ${missionDesc}. Ground control confirmed all objectives were accomplished!`,
    category: 'career',
  };

  const logs = [logEntry];
  if (nextRankIdx > sc.rankIndex) {
    logs.unshift({
      age: state.hero.age,
      icon: '⭐',
      text: `COMMENDATION: Space Agency promoted me to ${nextTitle} ($${nextSalary.toLocaleString()}/yr) for outstanding spaceflight service!`,
      category: 'career',
    });
  }

  return {
    state: {
      ...state,
      hero: {
        ...state.hero,
        occupation: `${nextTitle} (Space Agency)`,
        specialCareer: {
          ...sc,
          rankIndex: nextRankIdx,
          title: nextTitle,
          salary: nextSalary,
          standing: newStanding,
          fame: newFame,
          missionsCompleted: newMissions,
        },
      },
      lifeLog: [...logs, ...state.lifeLog],
    },
    message: `Mission completed successfully!${nextRankIdx > sc.rankIndex ? ` Promoted to ${nextTitle}!` : ''}`,
  };
}

// 8. Street Hustler
export function startStreetHustle(state, { hustleType, strategyOrAct }) {
  const hero = state.hero;
  if (hero.age < 15) return { success: false, message: 'You must be at least 15 to hustle on the streets.' };

  const newSpecialCareer = {
    type: 'hustler',
    title: hustleType || 'Street Performer',
    hustleType: hustleType || 'Street Performer',
    organization: 'The Streets',
    strategy: strategyOrAct || 'Breakdancing',
    salary: 0, // Hustlers earn immediate daily/annual street cash
    standing: 50, // Hustle skill
    fame: 5,
    streetCashEarned: 0,
    yearsActive: 0,
  };

  const logEntry = {
    age: hero.age,
    icon: '🪙',
    text: `I took to the downtown streets as a ${newSpecialCareer.title}, making a living through ${newSpecialCareer.strategy}!`,
    category: 'career',
  };

  return {
    success: true,
    state: {
      ...state,
      hero: {
        ...hero,
        occupation: `${newSpecialCareer.title} (Street Hustler)`,
        job: null,
        specialCareer: newSpecialCareer,
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `You hit the streets! Use your hustle to make money.`,
  };
}

export function streetHustleAction(state) {
  const sc = state.hero.specialCareer;
  if (!sc || sc.type !== 'hustler') return { state, message: 'No hustle career.' };

  const hustleData = specialJobsData.hustler;
  const hustleType = sc.hustleType || sc.title;
  let loot = getRandomInt(150, 950);
  let actionDesc = 'worked the sidewalks';

  if (hustleType === 'Street Performer' || hustleType === 'Busker') {
    const acts = hustleData.performActs || [];
    if (acts.length > 0) {
      const act = acts[getRandomInt(0, acts.length - 1)];
      const diffMult = Math.max(0.5, 1 + ((act.difficulty || 3) - 3) * 0.15);
      loot = Math.round(getRandomInt(100, 600) * ((act.moneyScore || 2) / 2) * diffMult);
      actionDesc = `performed ${act.name}`;
    }
  } else if (hustleType === 'Scam Artist') {
    const scams = hustleData.scams || [];
    if (scams.length > 0) {
      const scam = scams[getRandomInt(0, scams.length - 1)];
      loot = getRandomInt(500, 3500);
      actionDesc = `ran the ${scam.name} scam`;
      if (Math.random() < 0.20) {
        // Getting caught by the mark: mostly a fine, sometimes a cell
        if (Math.random() < 0.35) {
          return arrestHero(state, {
            charge: `running a ${scam.name.replace(/ scam$/i, '')} scam`,
            sentence: getRandomInt(1, 3),
          });
        }
        const fine = getRandomInt(200, 2000);
        return {
          state: {
            ...state,
            hero: { ...state.hero, bankBalance: Math.max(0, state.hero.bankBalance - fine),
              specialCareer: { ...sc, standing: Math.max(0, (sc.standing || 0) - 10) } },
          },
          message: `Your ${scam.name.replace(/ scam$/i, '')} scam backfired! You got caught and fined $${fine.toLocaleString()}.`,
        };
      }
    }
  } else if (hustleType === 'Panhandler') {
    const strats = hustleData.panhandleStrategies || [];
    if (strats.length > 0) {
      const strat = strats[getRandomInt(0, strats.length - 1)];
      actionDesc = `panhandled using the "${strat}" strategy`;
      loot = getRandomInt(50, 400);
    }
  }

  const newStanding = Math.min(100, (sc.standing || 0) + getRandomInt(1, 4));

  return {
    state: {
      ...state,
      hero: {
        ...state.hero,
        bankBalance: state.hero.bankBalance + loot,
        specialCareer: { ...sc, standing: newStanding },
      },
    },
    message: `You ${actionDesc} and earned $${loot.toLocaleString()}!`,
  };
}

// ─── Hustler Minigames (from APK a16_hustler-* tables) ───────────────────────

// Busking: pick music type, instrument, and attire — each affects the crowd.
// Best instruments & high-attention attire earn serious street money.
export function hustlerBusk(state, { musicIndex = 0, instrument = null, attireIndex = null } = {}) {
  const sc = state.hero.specialCareer;
  if (!sc || sc.type !== 'hustler') return { state, message: 'You need a street hustle career first.' };

  const mg = crimeMinigamesData.hustler || {};
  const musicTypes = mg.buskMusicTypes || [];
  const attires = mg.attire || [];
  const music = musicTypes[musicIndex] || musicTypes[getRandomInt(0, Math.max(0, musicTypes.length - 1))] || { type: 'peaceful', successScore: 2 };
  const attire = attires[attireIndex] || attires[getRandomInt(0, Math.max(0, attires.length - 1))] || { name: 'street clothes', attention: 2 };

  // Instrument choice: best instruments boost the music type's success score
  const instrumentName = instrument || (music.bestInstruments && music.bestInstruments.length ? getRandomFromList(music.bestInstruments) : getRandomFromList(music.possibleInstruments || ['guitar']));
  const isBest = (music.bestInstruments || []).includes(instrumentName);
  const musicScore = (music.successScore || 2) + (isBest ? 1.5 : 0);
  const totalScore = musicScore + (attire.attention || 2) / 2;

  const baseTake = getRandomInt(40, 400);
  const loot = Math.round(baseTake * (0.6 + totalScore / 4));

  const logs = [{
    age: state.hero.age,
    icon: '🎻',
    text: `I hit the street in my ${attire.name} and played ${instrumentName} — ${music.type} music.`,
    category: 'crime',
  }];
  let hero = { ...state.hero };

  // Positive crowd moments
  if (totalScore >= 4.5 && Math.random() < 0.5) {
    const bonus = Math.round(loot * 0.5);
    logs.push({
      age: state.hero.age,
      icon: '🎉',
      text: `A huge crowd formed around my ${instrumentName}! Someone threw an extra $${bonus.toLocaleString()} in my case.`,
      category: 'crime',
    });
    hero = { ...hero, bankBalance: hero.bankBalance + loot + bonus };
    return {
      state: { ...state, hero, lifeLog: [...logs, ...state.lifeLog] },
      message: `The crowd went wild! You earned $${(loot + bonus).toLocaleString()} busking.`,
    };
  }

  // Negative scenarios: hecklers, drunk lunge, cops
  if (Math.random() < 0.12) {
    logs.push({
      age: state.hero.age,
      icon: '😠',
      text: `An inebriated stranger lunged at my ${instrumentName} mid-performance. I packed up early with only $${loot.toLocaleString()}.`,
      category: 'crime',
    });
    hero = { ...hero, bankBalance: hero.bankBalance + loot, specialCareer: { ...sc, standing: Math.max(0, sc.standing - 2) } };
    return {
      state: { ...state, hero, lifeLog: [...logs, ...state.lifeLog] },
      message: `A drunk tried to grab your ${instrumentName}! You packed up early with $${loot.toLocaleString()}.`,
    };
  }
  if (Math.random() < 0.08) {
    return arrestHero({ ...state, hero, lifeLog: [...logs, ...state.lifeLog] }, {
      charge: 'disturbing the peace (busking without a permit)',
      sentence: getRandomInt(0, 1),
    });
  }

  logs.push({
    age: state.hero.age,
    icon: '💰',
    text: `Busking went well — collected $${loot.toLocaleString()} in tips.`,
    category: 'crime',
  });
  hero = {
    ...hero,
    bankBalance: hero.bankBalance + loot,
    specialCareer: { ...sc, standing: Math.min(100, sc.standing + 2), busksDone: (sc.busksDone || 0) + 1 },
  };
  return {
    state: { ...state, hero, lifeLog: [...logs, ...state.lifeLog] },
    message: `You busked ${music.type} music on ${instrumentName} and collected $${loot.toLocaleString()}!`,
  };
}

// Scam artist minigame: run a specific con from the APK scam table.
export function hustlerRunScam(state, scamIndex) {
  const sc = state.hero.specialCareer;
  if (!sc || sc.type !== 'hustler') return { state, message: 'You need a street hustle career first.' };

  const scams = (crimeMinigamesData.hustler || {}).scamTypes || specialJobsData.hustler.scams || [];
  const scam = scams[scamIndex] || scams[getRandomInt(0, Math.max(0, scams.length - 1))];
  if (!scam) return { state, message: 'No scams available.' };

  const difficulty = scam.difficulty || scam.difficultyScore || 3;
  const smartsEdge = (state.hero.stats.smarts - 50) / 250;
  const successOdds = Math.max(0.15, 0.85 - difficulty * 0.12 + smartsEdge);

  if (Math.random() < successOdds) {
    const loot = Math.round(getRandomInt(200, 4000) * ((scam.money || scam.moneyScore || 2) / 2));
    const logEntry = {
      age: state.hero.age,
      icon: '🎭',
      text: `I ran the ${scam.name || 'street scam'} on a fresh mark and walked away $${loot.toLocaleString()} richer!`,
      category: 'crime',
    };
    return {
      state: {
        ...state,
        hero: {
          ...state.hero,
          bankBalance: state.hero.bankBalance + loot,
          specialCareer: { ...sc, standing: Math.min(100, sc.standing + 4) },
        },
        lifeLog: [logEntry, ...state.lifeLog],
      },
      message: `The ${scam.name || 'scam'} worked like a charm! Scored $${loot.toLocaleString()}.`,
    };
  }

  // The mark got wise — confrontation or police
  if (Math.random() < 0.3) {
    return arrestHero(state, {
      charge: `running a ${String(scam.name || 'fake goods').toLowerCase()} con`,
      sentence: getRandomInt(1, 3),
    });
  }
  const logEntry = {
    age: state.hero.age,
    icon: '😤',
    text: `My ${scam.name || 'scam'} fell apart when the mark got suspicious. I ran before things got ugly.`,
    category: 'crime',
  };
  return {
    state: {
      ...state,
      hero: {
        ...state.hero,
        specialCareer: { ...sc, standing: Math.max(0, sc.standing - 5) },
        stats: { ...state.hero.stats, happiness: Math.max(0, state.hero.stats.happiness - 5) },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: 'The mark got wise and you had to run. Hustle skill took a hit.',
  };
}

// 9. Dealer / Cartel
export function startDealerCareer(state, cartelName) {
  const hero = state.hero;
  if (hero.age < 16) return { success: false, message: 'You must be at least 16 to run with a cartel.' };

  const cartels = specialJobsData.dealer.cartels;
  const cartel = cartelName || getRandomFromList(cartels) || 'Varicose Vixens';

  const newSpecialCareer = {
    type: 'dealer',
    title: 'Corner Boy',
    organization: cartel,
    rankIndex: 0,
    salary: 25000,
    standing: 50, // Cartel respect
    turfHeat: 10,
    dealsDone: 0,
    yearsActive: 0,
  };

  const logEntry = {
    age: hero.age,
    icon: '💊',
    text: `I started pushing product for the ${cartel} cartel as a Corner Boy!`,
    category: 'crime',
  };

  return {
    success: true,
    state: {
      ...state,
      hero: {
        ...hero,
        occupation: `Corner Boy (${cartel})`,
        job: null,
        specialCareer: newSpecialCareer,
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `You hooked up with the ${cartel}! Watch out for rival runners and police.`,
  };
}

export function dealerSellDrug(state, drugName) {
  const sc = state.hero.specialCareer;
  if (!sc || sc.type !== 'dealer') return { state, message: 'You are not in a drug cartel.' };

  const drug = specialJobsData.dealer.drugs.find(d => d.name === drugName) || specialJobsData.dealer.drugs[0];

  // Undercover buys happen — hotter turf means bigger bust odds
  const bustChance = 0.06 + ((sc.turfHeat || 0) / 100) * 0.3;
  if (Math.random() < bustChance) {
    return arrestHero(state, {
      charge: `the distribution of ${drug.name}`,
      sentence: getRandomInt(2, 6) + Math.round((sc.rankIndex || 0) / 2),
    });
  }

  const demandMult = 0.6 + ((drug.baseDemand || 3) / 5) * 0.8;
  const addictBonus = 1 + ((drug.addictiveness || 0) / 10);
  const loot = Math.round(drug.streetValue * (0.5 + Math.random() * 1.5) * demandMult * addictBonus);

  const dealerRanks = specialJobsData.dealer.ranks || ['Corner Boy', 'Runner', 'Distributor', 'Underboss', 'Kingpin'];
  const curRank = sc.rank || 'Corner Boy';
  let curRankIdx = dealerRanks.indexOf(curRank);
  if (curRankIdx < 0) curRankIdx = 0;

  // Cut rates scale with rank from APK (Corner Boy: 35% up to Kingpin: 90%)
  const cutRates = [0.35, 0.45, 0.60, 0.75, 0.90];
  const cutRate = cutRates[curRankIdx] || 0.45;
  const cut = Math.round(loot * cutRate);

  const newStanding = Math.min(100, sc.standing + 4);
  const newDeals = (sc.dealsDone || 0) + 1;

  // Check rank promotions across the 5 APK ranks
  const promoThresholds = [
    { rank: 'Runner', deals: 5, standing: 20 },
    { rank: 'Distributor', deals: 15, standing: 45 },
    { rank: 'Underboss', deals: 35, standing: 70 },
    { rank: 'Kingpin', deals: 60, standing: 90 },
  ];
  let nextRank = curRank;
  let nextRankIdx = curRankIdx;
  const nextTarget = promoThresholds[curRankIdx];
  let promoLog = null;
  if (nextTarget && newDeals >= nextTarget.deals && newStanding >= nextTarget.standing) {
    nextRank = nextTarget.rank;
    nextRankIdx = curRankIdx + 1;
    promoLog = {
      age: state.hero.age,
      icon: '👑',
      text: `CARTEL PROMOTION: The cartel promoted me to ${nextRank}! My cut of drug sales increased to ${Math.round(cutRates[nextRankIdx] * 100)}%!`,
      category: 'crime',
    };
  }

  const logEntry = {
    age: state.hero.age,
    icon: '💰',
    text: `As a ${nextRank}, I moved a package of ${drug.name} on the corner, generating $${loot.toLocaleString()}! My ${Math.round(cutRate * 100)}% cut was $${cut.toLocaleString()}.`,
    category: 'crime',
  };

  const logs = promoLog ? [promoLog, logEntry] : [logEntry];

  return {
    state: {
      ...state,
      hero: {
        ...state.hero,
        occupation: `${nextRank} (${sc.cartel || 'Cartel'})`,
        bankBalance: state.hero.bankBalance + cut,
        specialCareer: {
          ...sc,
          rank: nextRank,
          rankIndex: nextRankIdx,
          standing: newStanding,
          dealsDone: newDeals,
        },
      },
      lifeLog: [...logs, ...state.lifeLog],
    },
    message: promoLog ? `PROMOTED to ${nextRank}! You moved ${drug.name} and took home $${cut.toLocaleString()}.` : `Product moved! You earned $${cut.toLocaleString()} cut (${Math.round(cutRate * 100)}%).`,
  };
}

// ─── Dealer Minigames (from APK a16_dealer-* tables) ─────────────────────────

// Drug run: pick a package type and a drop-off location. Riskier drops pay
// better; fragile packaging can bust the product in transit.
export function dealerDrugRun(state, { packageIndex = 0, dropOffIndex = 0 } = {}) {
  const sc = state.hero.specialCareer;
  if (!sc || sc.type !== 'dealer') return { state, message: 'You are not in a drug cartel.' };
  if (state.hero.prison) return { error: 'age_restricted', message: 'You are behind bars.' };

  const mg = crimeMinigamesData.dealer || {};
  const packages = mg.packageTypes || [];
  const drops = mg.dropOffLocations || [];
  const pkg = packages[packageIndex] || { name: 'plastic bag', breakChance: 1 };
  const drop = drops[dropOffIndex] || { name: 'a quiet street corner', risk: 2 };

  // Product breaks in transit based on packaging fragility
  let lostProduct = false;
  if (Math.random() < ((pkg.breakChance || 1) / 10)) {
    lostProduct = true;
  }

  const logs = [{
    age: state.hero.age,
    icon: '📦',
    text: `The cartel sent me on a drug run — I carried the product in ${pkg.name} to ${drop.name}.`,
    category: 'crime',
  }];
  let hero = { ...state.hero };

  if (lostProduct) {
    logs.push({
      age: state.hero.age,
      icon: '💔',
      text: `The ${pkg.name} broke open in transit and I lost the entire package. The cartel is NOT happy.`,
      category: 'crime',
    });
    hero = {
      ...hero,
      specialCareer: { ...sc, standing: Math.max(0, sc.standing - 10) },
      stats: { ...hero.stats, happiness: Math.max(0, hero.stats.happiness - 8) },
    };
    return {
      state: { ...state, hero, lifeLog: [...logs, ...state.lifeLog] },
      message: `Your ${pkg.name} broke and the whole package was lost! The cartel cut your respect.`,
    };
  }

  // Police interdiction scales with the drop-off's risk score and turf heat
  const bustChance = 0.04 + ((drop.risk || 2) / 5) * 0.25 + ((sc.turfHeat || 0) / 100) * 0.2;
  if (Math.random() < bustChance) {
    return arrestHero({ ...state, hero, lifeLog: [...logs, ...state.lifeLog] }, {
      charge: `drug trafficking near ${drop.name}`,
      sentence: getRandomInt(3, 9) + Math.round((sc.rankIndex || 0) / 2),
    });
  }

  // Riskier drops pay way better
  const basePay = getRandomInt(4000, 22000);
  const riskMult = 0.8 + ((drop.risk || 2) / 5) * 1.6;
  const loot = Math.round(basePay * riskMult);
  const cutRates = [0.35, 0.45, 0.60, 0.75, 0.90];
  const dealerRanks = specialJobsData.dealer.ranks || ['Corner Boy', 'Runner', 'Distributor', 'Underboss', 'Kingpin'];
  const curRankIdx = Math.max(0, dealerRanks.indexOf(sc.rank || 'Corner Boy'));
  const cut = Math.round(loot * (cutRates[curRankIdx] || 0.45));

  logs.push({
    age: state.hero.age,
    icon: '💰',
    text: `Run complete! Delivered the package to ${drop.name} and generated $${loot.toLocaleString()}. My cut: $${cut.toLocaleString()}.`,
    category: 'crime',
  });

  const newHeat = Math.min(100, (sc.turfHeat || 0) + ((drop.risk || 2)) - 1);
  return {
    state: {
      ...state,
      hero: {
        ...hero,
        bankBalance: hero.bankBalance + cut,
        specialCareer: {
          ...sc,
          standing: Math.min(100, sc.standing + 6),
          turfHeat: Math.max(0, newHeat),
          runsDone: (sc.runsDone || 0) + 1,
        },
      },
      lifeLog: [...logs, ...state.lifeLog],
    },
    message: `Drug run complete! Delivered to ${drop.name} for a $${cut.toLocaleString()} cut.`,
  };
}

// Cut drugs: stretch product with fillers. Bigger cuts = more product but
// angrier customers and higher police attention.
export function dealerCutDrugs(state, aggressiveness = 2) {
  const sc = state.hero.specialCareer;
  if (!sc || sc.type !== 'dealer') return { state, message: 'You are not in a drug cartel.' };

  const mg = crimeMinigamesData.dealer || {};
  const cutNames = mg.cutDrugNames || [];
  const cutName = cutNames.length ? getRandomFromList(cutNames).name : 'a mystery filler';

  const yield_ = 1 + aggressiveness * 0.35; // more product
  const extra = Math.round(getRandomInt(2000, 12000) * (aggressiveness / 2) * yield_);
  const heat = Math.min(100, (sc.turfHeat || 0) + aggressiveness * 3);
  const standing = Math.max(0, sc.standing - aggressiveness * 2); // regulars notice the burn

  const logEntry = {
    age: state.hero.age,
    icon: '🧪',
    text: `I stretched our product with ${cutName} — doubled the inventory but the corner clients started complaining about the burn.`,
    category: 'crime',
  };
  return {
    state: {
      ...state,
      hero: {
        ...state.hero,
        bankBalance: state.hero.bankBalance + extra,
        specialCareer: { ...sc, turfHeat: heat, standing },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `Cut the product with ${cutName}! Extra $${extra.toLocaleString()} in sales, but turf heat is rising.`,
  };
}

// 10. Startup Business / CEO
export function startStartupBusiness(state, industryName, investment) {
  const hero = state.hero;
  if (hero.age < 18) return { success: false, message: 'You must be at least 18 to incorporate a business.' };
  const industryInfo = specialJobsData.business.industries.find(i => i.industry === industryName);
  const minLaunchCost = industryInfo?.launchCost || 10000;
  if (investment < minLaunchCost) return { success: false, message: `${industryName} requires at least $${minLaunchCost.toLocaleString()} to launch.` };
  if (hero.bankBalance < investment) return { success: false, message: `You need at least $${investment.toLocaleString()} to capitalize this business.` };

  const industry = specialJobsData.business.industries.find(i => i.industry === industryName) || specialJobsData.business.industries[0];

  const newSpecialCareer = {
    type: 'business',
    title: 'Chief Executive Officer',
    organization: `${hero.lastName} ${industry.industry} Co.`,
    industry: industry.industry,
    salary: 80000,
    valuation: investment * 2,
    capital: investment,
    standing: 65,
    yearsActive: 0,
  };

  const logEntry = {
    age: hero.age,
    icon: '🏢',
    text: `I incorporated ${newSpecialCareer.organization} with $${investment.toLocaleString()} in initial seed capital as Founder & CEO!`,
    category: 'career',
  };

  return {
    success: true,
    state: {
      ...state,
      hero: {
        ...hero,
        occupation: `CEO (${newSpecialCareer.organization})`,
        bankBalance: hero.bankBalance - investment,
        job: null,
        specialCareer: newSpecialCareer,
        stats: { ...hero.stats, happiness: Math.min(100, hero.stats.happiness + 25) },
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: `Company founded! You are now CEO of ${newSpecialCareer.organization}!`,
  };
}

// ─── Age Up Engine ────────────────────────────────────────────────────────────


// ─── Annual Random Scenarios (BitLife APK) ───────────────────────────────────

function resolveScenarioPlaceholders(sc, { hero, relationships, education }) {
  const teacher = education?.currentSchool?.teachers?.[0]?.fullName || 'my teacher';
  const sibling = relationships?.siblings?.[0]?.fullName || 'my classmate';
  const friendName = relationships?.siblings?.[0]?.firstName || 'my friend';
  const motherName = relationships?.mother?.firstName || 'Mom';
  const fatherName = relationships?.father?.firstName || 'Dad';
  const parentName = relationships?.mother?.firstName || (relationships?.father?.firstName || 'Mom');
  const bully = education?.currentSchool?.classmates?.[0]?.fullName || 'a school bully';
  const city = hero.city || 'town';
  const country = hero.country || 'the country';

  function cleanText(str) {
    if (!str) return '';
    return str
      .replace(/<teacher>/gi, teacher)
      .replace(/<teacher-possessive>/gi, `${teacher}'s`)
      .replace(/<friend>/gi, friendName)
      .replace(/<friend-possessive>/gi, `${friendName}'s`)
      .replace(/<mother>/gi, motherName)
      .replace(/<father>/gi, fatherName)
      .replace(/<bully>/gi, bully)
      .replace(/<sibling>/gi, sibling)
      .replace(/<city>/gi, city)
      .replace(/<country>/gi, country)
      .replace(/<his\/her>/gi, hero.gender === 'male' ? 'his' : 'her')
      .replace(/<him\/her>/gi, hero.gender === 'male' ? 'him' : 'her')
      .replace(/<he\/she>/gi, hero.gender === 'male' ? 'he' : 'she')
      .replace(/\bparent's\b/gi, `${parentName}'s`)
      .replace(/\bparent\b/gi, parentName)
      .replace(/parent-possessive/gi, `${parentName}'s`)
      .replace(/random-person-indefinite/gi, 'a stranger')
      .replace(/random-person/gi, 'a stranger')
      .replace(/musician-indefinite/gi, 'a street musician')
      .replace(/vacation-destination/gi, 'Hawaii')
      .replace(/circumstance-public/gi, 'while out in public')
      .replace(/<[^>]+>/g, '');
  }

  return {
    ...sc,
    title: cleanText(sc.title),
    category: cleanText(sc.category),
    body: cleanText(sc.body),
    cta: cleanText(sc.cta),
    choices: (sc.choices || []).map(c => ({
      ...c,
      text: cleanText(c.text),
      narrative: cleanText(c.narrative),
    })),
  };
}

export function resolveScenarioChoice(state, choiceIndex) {
  const sc = state.pendingScenario;
  if (!sc || !sc.choices || !sc.choices[choiceIndex]) {
    return { state: { ...state, pendingScenario: null }, message: null };
  }
  const choice = sc.choices[choiceIndex];
  const hero = state.hero;
  const newStats = {
    ...hero.stats,
    happiness: Math.max(0, Math.min(100, hero.stats.happiness + (choice.happiness || 0))),
    smarts: Math.max(0, Math.min(100, hero.stats.smarts + (choice.smarts || 0))),
    looks: Math.max(0, Math.min(100, hero.stats.looks + (choice.looks || 0))),
  };

  const logEntry = {
    age: hero.age,
    icon: '⚡',
    text: choice.narrative || choice.text,
    category: 'scenario',
  };

  return {
    state: {
      ...state,
      pendingScenario: null,
      hero: {
        ...hero,
        stats: newStats,
      },
      lifeLog: [logEntry, ...state.lifeLog],
    },
    message: choice.narrative || choice.text,
  };
}

// ─── Mind & Body Engine (BitLife APK) ───────────────────────────────────

export function performGym(state) {
  const hero = state.hero;
  if (hero.age < 12) {
    return { state, success: false, error: 'age_restricted', message: 'You must be at least 12 years old to go to the gym.' };
  }
  const cost = hero.age < 18 ? 0 : 20;
  if (hero.bankBalance < cost) {
    return {
      state,
      success: false,
      error: 'insufficient_funds',
      cost,
      message: `You don't have enough money for a gym pass ($20). Your balance is $${hero.bankBalance.toLocaleString()}.`,
    };
  }

  const encounters = [
    'Someone at the gym complimented my lifting form and shoulder definition.',
    'I pushed myself on the squat rack and set a new personal record.',
    'A friendly gym regular gave me great advice on my workout routine.',
    'I had an intense, energizing workout and broke a serious sweat.',
    "I hit the treadmill for a runner's high and stretched thoroughly afterwards.",
  ];
  const encounter = getRandomFromList(encounters);

  const healthDelta = getRandomInt(3, 5);
  const looksDelta = getRandomInt(1, 3);
  const happyDelta = getRandomInt(2, 4);

  const nextStats = {
    ...hero.stats,
    health: Math.min(100, hero.stats.health + healthDelta),
    looks: Math.min(100, hero.stats.looks + looksDelta),
    happiness: Math.min(100, hero.stats.happiness + happyDelta),
  };

  const newLog = {
    id: `gym_${hero.age}_${Date.now()}`,
    age: hero.age,
    icon: '🏋️',
    text: encounter,
    category: 'mind_body',
  };

  return {
    state: {
      ...state,
      hero: {
        ...hero,
        bankBalance: hero.bankBalance - cost,
        stats: nextStats,
      },
      lifeLog: [newLog, ...state.lifeLog],
    },
    success: true,
    title: 'Gym Workout',
    message: encounter,
    cost,
    paidBy: cost > 0 ? 'Self' : (hero.age < 18 ? 'Free Youth Pass' : 'Self'),
    statDeltas: {
      health: healthDelta,
      looks: looksDelta,
      happiness: happyDelta,
    },
  };
}

export function performMeditate(state) {
  const hero = state.hero;
  if (hero.age < 6) {
    return { state, success: false, error: 'age_restricted', message: 'You are too young to understand meditation.' };
  }

  const isEnlightened = Math.random() < 0.12;
  const text = isEnlightened
    ? 'While meditating in deep contemplation, I felt a wave of cosmic serenity and achieved true inner peace.'
    : 'I meditated quietly for thirty minutes, letting all thoughts and anxieties drift away.';

  const happyDelta = isEnlightened ? getRandomInt(8, 14) : getRandomInt(3, 6);
  const healthDelta = getRandomInt(1, 3);

  const nextStats = {
    ...hero.stats,
    happiness: Math.min(100, hero.stats.happiness + happyDelta),
    health: Math.min(100, hero.stats.health + healthDelta),
  };

  const newLog = {
    id: `meditate_${hero.age}_${Date.now()}`,
    age: hero.age,
    icon: '🧘',
    text,
    category: 'mind_body',
  };

  return {
    state: {
      ...state,
      hero: { ...hero, stats: nextStats },
      lifeLog: [newLog, ...state.lifeLog],
    },
    success: true,
    title: isEnlightened ? 'Cosmic Enlightenment!' : 'Meditation',
    message: text,
    cost: 0,
    statDeltas: {
      happiness: happyDelta,
      health: healthDelta,
    },
  };
}

export function performWalk(state, { pace = 'Normal', duration = '30 minutes' } = {}) {
  const hero = state.hero;
  if (hero.age < 6) {
    return { state, success: false, error: 'age_restricted', message: 'You are too young to go on solo walks.' };
  }

  const encounters = [
    { text: 'I found a crisp $20 bill lying on the sidewalk!', money: 20, happy: 5 },
    { text: 'A friendly Golden Retriever ran up to me and let me pet its soft ears.', money: 0, happy: 5 },
    { text: 'I saw a beautiful double rainbow arched across the afternoon sky.', money: 0, happy: 4 },
    { text: 'I caught the delicious aroma of fresh cinnamon rolls from a neighborhood bakery.', money: 0, happy: 3 },
    { text: 'I found a shiny antique brass coin in the grass.', money: 5, happy: 3 },
  ];

  const hasEvent = Math.random() < 0.35;
  const event = hasEvent ? getRandomFromList(encounters) : null;
  const baseLog = `I went for a ${duration} ${pace.toLowerCase()} around the neighborhood.`;
  const fullLog = event ? `${baseLog} ${event.text}` : baseLog;

  const healthBoost = pace === 'Speed Walk' || pace === 'Power Walk' ? getRandomInt(3, 5) : getRandomInt(2, 4);
  const happyBoost = event?.happy || getRandomInt(2, 4);

  const nextStats = {
    ...hero.stats,
    health: Math.min(100, hero.stats.health + healthBoost),
    happiness: Math.min(100, hero.stats.happiness + happyBoost),
  };

  const newLog = {
    id: `walk_${hero.age}_${Date.now()}`,
    age: hero.age,
    icon: '🚶',
    text: fullLog,
    category: 'mind_body',
  };

  return {
    state: {
      ...state,
      hero: {
        ...hero,
        bankBalance: hero.bankBalance + (event?.money || 0),
        stats: nextStats,
      },
      lifeLog: [newLog, ...state.lifeLog],
    },
    success: true,
    title: 'Walk in the Neighborhood',
    message: fullLog,
    cost: 0,
    moneyFound: event?.money || 0,
    statDeltas: {
      health: healthBoost,
      happiness: happyBoost,
    },
  };
}

export function performLibrary(state) {
  const hero = state.hero;
  if (hero.age < 6) {
    return { state, success: false, error: 'age_restricted', message: 'You are too young to visit the library by yourself.' };
  }

  const books = (mindBodyData.books || []).filter(b => hero.age >= b.minAge);
  const randomBook = getRandomFromList(books) || { title: 'The Great Encyclopedia', author: 'Various' };
  const text = `I visited the public library and spent a quiet afternoon reading excerpts from "${randomBook.title}" by ${randomBook.author}.`;

  const smartsDelta = getRandomInt(2, 5);
  const happyDelta = getRandomInt(1, 3);

  const nextStats = {
    ...hero.stats,
    smarts: Math.min(100, hero.stats.smarts + smartsDelta),
    happiness: Math.min(100, hero.stats.happiness + happyDelta),
  };

  const newLog = {
    id: `library_${hero.age}_${Date.now()}`,
    age: hero.age,
    icon: '📚',
    text,
    category: 'mind_body',
  };

  return {
    state: {
      ...state,
      hero: { ...hero, stats: nextStats },
      lifeLog: [newLog, ...state.lifeLog],
    },
    success: true,
    title: 'Public Library',
    message: text,
    cost: 0,
    statDeltas: {
      smarts: smartsDelta,
      happiness: happyDelta,
    },
  };
}

export function performReadBook(state, bookIndex) {
  const hero = state.hero;
  const book = (mindBodyData.books && mindBodyData.books[bookIndex]) || mindBodyData.books[0];
  if (hero.age < book.minAge) {
    return {
      state,
      success: false,
      error: 'age_restricted',
      message: `You must be at least ${book.minAge} years old to read "${book.title}".`,
    };
  }

  const smartsGain = Math.max(1, book.intelligenceScore || 2);
  const happyGain = Math.max(1, book.happinessScore || 2);

  const nextStats = {
    ...hero.stats,
    smarts: Math.min(100, hero.stats.smarts + smartsGain),
    happiness: Math.min(100, hero.stats.happiness + happyGain),
  };

  const text = `I finished reading the ${book.genre.toLowerCase()} book "${book.title}" by ${book.author} (${book.pages} pages).`;

  const newLog = {
    id: `book_${hero.age}_${Date.now()}`,
    age: hero.age,
    icon: '📖',
    text,
    category: 'mind_body',
  };

  const updatedBooksRead = [...(hero.booksRead || []), book.title];

  return {
    state: {
      ...state,
      hero: {
        ...hero,
        booksRead: updatedBooksRead,
        stats: nextStats,
      },
      lifeLog: [newLog, ...state.lifeLog],
    },
    success: true,
    title: 'Book Completed',
    message: text,
    cost: 0,
    bookTitle: book.title,
    statDeltas: {
      smarts: smartsGain,
      happiness: happyGain,
    },
  };
}

export function performSetDiet(state, dietName) {
  const hero = state.hero;
  if (dietName === 'None') {
    const text = 'I decided to stop my diet and eat whatever I want.';
    const newLog = {
      id: `diet_stop_${hero.age}_${Date.now()}`,
      age: hero.age,
      icon: '🍔',
      text,
      category: 'mind_body',
    };
    return {
      state: {
        ...state,
        hero: { ...hero, diet: 'None' },
        lifeLog: [newLog, ...state.lifeLog],
      },
      success: true,
      title: 'Diet Ended',
      message: text,
      cost: 0,
      diet: 'None',
      statDeltas: {},
    };
  }

  const diet = (mindBodyData.diets || []).find(d => d.name.toLowerCase() === dietName.toLowerCase());
  if (!diet) {
    return { state, success: false, error: 'invalid_diet', message: 'Diet not found.' };
  }

  const text = `I have started the ${diet.name} diet ($${diet.monthlyCost}/month).`;
  const newLog = {
    id: `diet_start_${hero.age}_${Date.now()}`,
    age: hero.age,
    icon: '🥗',
    text,
    category: 'mind_body',
  };

  return {
    state: {
      ...state,
      hero: { ...hero, diet: diet.name },
      lifeLog: [newLog, ...state.lifeLog],
    },
    success: true,
    title: 'New Diet Started',
    message: text,
    diet: diet.name,
    cost: diet.monthlyCost,
    statDeltas: {
      health: diet.healthImpact || 1,
      looks: diet.appearanceImpact || 1,
    },
  };
}

export function performTrainMartialArt(state, martialArtName, parentTarget = 'auto') {
  const hero = state.hero;
  if (hero.age < 8) {
    return { state, success: false, error: 'age_restricted', message: 'You must be at least 8 years old to take martial arts lessons.' };
  }

  const art = (mindBodyData.martialArts || []).find(m => m.name.toLowerCase() === martialArtName.toLowerCase());
  if (!art) {
    return { state, success: false, error: 'not_found', message: 'Martial art style not found.' };
  }

  const currentInfo = (hero.martialArts && hero.martialArts[art.name]) || { beltIndex: -1, moves: [] };
  const currentBeltIndex = currentInfo.beltIndex;

  if (currentBeltIndex >= art.belts.length - 1) {
    const topBelt = art.belts[art.belts.length - 1];
    return {
      state,
      success: false,
      error: 'max_mastery',
      message: `You are already a master of ${art.name} with a ${topBelt} belt!`,
    };
  }

  const nextBeltIndex = currentBeltIndex + 1;
  const nextBelt = art.belts[nextBeltIndex];
  const newMoves = [...currentInfo.moves];
  let moveUnlocked = null;

  const midIndex = Math.floor(art.belts.length / 2);
  const topIndex = art.belts.length - 1;

  if (nextBeltIndex === midIndex && !newMoves.includes(art.move1.name)) {
    newMoves.push(art.move1.name);
    moveUnlocked = art.move1.name;
  } else if (nextBeltIndex === topIndex && !newMoves.includes(art.move2.name)) {
    newMoves.push(art.move2.name);
    moveUnlocked = art.move2.name;
  }

  // Parent sponsorship logic for minors
  if (hero.age < 18) {
    let chosenParentKey = parentTarget === 'father' ? 'father' : (parentTarget === 'mother' ? 'mother' : null);
    if (!chosenParentKey) {
      if (state.relationships.mother?.alive && (!state.relationships.father?.alive || (state.relationships.mother.relationship >= state.relationships.father.relationship))) {
        chosenParentKey = 'mother';
      } else if (state.relationships.father?.alive) {
        chosenParentKey = 'father';
      } else {
        chosenParentKey = 'mother';
      }
    }

    const parent = state.relationships[chosenParentKey];
    if (!parent || !parent.alive) {
      return {
        state,
        success: false,
        error: 'no_parents',
        message: 'You do not have a living parent to ask for lessons!',
      };
    }

    const agrees = (parent.relationship >= 45 && parent.generosity >= 25) ||
      (parent.relationship + parent.generosity >= 85) ||
      Math.random() < 0.65;

    if (!agrees) {
      const rejectReasons = [
        "Money doesn't grow on trees, focus on your schoolwork!",
        '"We cannot afford martial arts lessons right now."',
        '"I am not paying $500 for you to kick people in the shin!"',
      ];
      const rejectReason = getRandomFromList(rejectReasons);
      const failLog = {
        id: `martial_reject_${hero.age}_${Date.now()}`,
        age: hero.age,
        icon: '🥋',
        text: `My ${parent.relation.toLowerCase()} refused to pay for my ${art.name} lessons.`,
        category: 'mind_body',
      };
      return {
        state: {
          ...state,
          hero: {
            ...hero,
            stats: {
              ...hero.stats,
              happiness: Math.max(0, hero.stats.happiness - 3),
            },
          },
          lifeLog: [failLog, ...state.lifeLog],
        },
        success: false,
        title: `${parent.relation} Refused`,
        message: `Your ${parent.relation.toLowerCase()} (${parent.firstName}) refused to pay the $500 fee for your ${art.name} lessons! They said: ${rejectReason}`,
        cost: 0,
        paidBy: null,
        statDeltas: {
          happiness: -3,
        },
      };
    }

    // Parent agrees!
    const updatedParent = {
      ...parent,
      relationship: Math.min(100, parent.relationship + getRandomInt(2, 4)),
    };

    const logText = moveUnlocked
      ? `I earned my ${nextBelt} belt in ${art.name}! I also mastered the ${moveUnlocked} move.`
      : `I took ${art.name} lessons and was awarded my ${nextBelt} belt.`;

    const fullMessage = `Your ${parent.relation.toLowerCase()} (${parent.firstName}) happily agreed to pay $500 for your ${art.name} lessons! ${logText}`;

    const healthDelta = getRandomInt(2, 4);
    const smartsDelta = 1;
    const happyDelta = getRandomInt(2, 4);

    const nextStats = {
      ...hero.stats,
      health: Math.min(100, hero.stats.health + healthDelta),
      smarts: Math.min(100, hero.stats.smarts + smartsDelta),
      happiness: Math.min(100, hero.stats.happiness + happyDelta),
    };

    const newLog = {
      id: `martial_${hero.age}_${Date.now()}`,
      age: hero.age,
      icon: '🥋',
      text: `My ${parent.relation.toLowerCase()} paid for my ${art.name} lessons. ${logText}`,
      category: 'mind_body',
    };

    const updatedMartialArts = {
      ...(hero.martialArts || {}),
      [art.name]: {
        belt: nextBelt,
        beltIndex: nextBeltIndex,
        moves: newMoves,
      },
    };

    return {
      state: {
        ...state,
        relationships: {
          ...state.relationships,
          [chosenParentKey]: updatedParent,
        },
        hero: {
          ...hero,
          martialArts: updatedMartialArts,
          stats: nextStats,
        },
        lifeLog: [newLog, ...state.lifeLog],
      },
      success: true,
      title: `${art.name} (${nextBelt} Belt)`,
      message: fullMessage,
      cost: 0,
      paidBy: `${parent.fullName} (${parent.relation})`,
      nextBelt,
      moveUnlocked,
      statDeltas: {
        health: healthDelta,
        smarts: smartsDelta,
        happiness: happyDelta,
      },
    };
  }

  // Adult pays $500
  const cost = 500;
  if (hero.bankBalance < cost) {
    return {
      state,
      success: false,
      error: 'insufficient_funds',
      cost,
      message: `You don't have enough money for ${art.name} lessons ($500). Your balance is $${hero.bankBalance.toLocaleString()}.`,
    };
  }

  const logText = moveUnlocked
    ? `I earned my ${nextBelt} belt in ${art.name}! I also mastered the ${moveUnlocked} move.`
    : `I took ${art.name} lessons and was awarded my ${nextBelt} belt.`;

  const healthDelta = getRandomInt(2, 4);
  const smartsDelta = 1;
  const happyDelta = getRandomInt(2, 3);

  const nextStats = {
    ...hero.stats,
    health: Math.min(100, hero.stats.health + healthDelta),
    smarts: Math.min(100, hero.stats.smarts + smartsDelta),
    happiness: Math.min(100, hero.stats.happiness + happyDelta),
  };

  const newLog = {
    id: `martial_${hero.age}_${Date.now()}`,
    age: hero.age,
    icon: '🥋',
    text: logText,
    category: 'mind_body',
  };

  const updatedMartialArts = {
    ...(hero.martialArts || {}),
    [art.name]: {
      belt: nextBelt,
      beltIndex: nextBeltIndex,
      moves: newMoves,
    },
  };

  return {
    state: {
      ...state,
      hero: {
        ...hero,
        bankBalance: hero.bankBalance - cost,
        martialArts: updatedMartialArts,
        stats: nextStats,
      },
      lifeLog: [newLog, ...state.lifeLog],
    },
    success: true,
    title: `${art.name} (${nextBelt} Belt)`,
    message: logText,
    cost,
    paidBy: 'Self',
    nextBelt,
    moveUnlocked,
    statDeltas: {
      health: healthDelta,
      smarts: smartsDelta,
      happiness: happyDelta,
    },
  };
}

export function performActingLesson(state, parentTarget = 'auto') {
  const hero = state.hero;
  if (hero.age < 8) {
    return { state, success: false, error: 'age_restricted', message: 'You must be at least 8 years old to take acting lessons.' };
  }

  const skillGain = getRandomInt(6, 12);
  const nextSkill = Math.min(100, (hero.actingSkill || 20) + skillGain);

  // Minor parent sponsorship
  if (hero.age < 18) {
    let chosenParentKey = parentTarget === 'father' ? 'father' : (parentTarget === 'mother' ? 'mother' : null);
    if (!chosenParentKey) {
      if (state.relationships.mother?.alive && (!state.relationships.father?.alive || (state.relationships.mother.relationship >= state.relationships.father.relationship))) {
        chosenParentKey = 'mother';
      } else if (state.relationships.father?.alive) {
        chosenParentKey = 'father';
      } else {
        chosenParentKey = 'mother';
      }
    }

    const parent = state.relationships[chosenParentKey];
    if (!parent || !parent.alive) {
      return {
        state,
        success: false,
        error: 'no_parents',
        message: 'You do not have a living parent to ask for lessons!',
      };
    }

    const agrees = (parent.relationship >= 45 && parent.generosity >= 25) ||
      (parent.relationship + parent.generosity >= 85) ||
      Math.random() < 0.65;

    if (!agrees) {
      const rejectReason = "Acting isn't a real career, go study hard for school!";
      const failLog = {
        id: `acting_reject_${hero.age}_${Date.now()}`,
        age: hero.age,
        icon: '🎭',
        text: `My ${parent.relation.toLowerCase()} refused to pay for my acting lessons.`,
        category: 'mind_body',
      };
      return {
        state: {
          ...state,
          hero: {
            ...hero,
            stats: {
              ...hero.stats,
              happiness: Math.max(0, hero.stats.happiness - 3),
            },
          },
          lifeLog: [failLog, ...state.lifeLog],
        },
        success: false,
        title: `${parent.relation} Refused`,
        message: `Your ${parent.relation.toLowerCase()} (${parent.firstName}) refused to pay $500 for acting lessons. They said: ${rejectReason}`,
        cost: 0,
        paidBy: null,
        statDeltas: {
          happiness: -3,
        },
      };
    }

    const updatedParent = {
      ...parent,
      relationship: Math.min(100, parent.relationship + getRandomInt(2, 4)),
    };

    const text = `My ${parent.relation.toLowerCase()} paid for my acting lessons. I practiced monologue delivery and emotional expression. My acting skill improved to ${nextSkill}%!`;
    const message = `Your ${parent.relation.toLowerCase()} (${parent.firstName}) agreed to pay $500 for your acting lessons! Your acting skill improved by +${skillGain}% (now ${nextSkill}%).`;

    const happyDelta = getRandomInt(2, 4);
    const smartsDelta = 1;

    const nextStats = {
      ...hero.stats,
      happiness: Math.min(100, hero.stats.happiness + happyDelta),
      smarts: Math.min(100, hero.stats.smarts + smartsDelta),
    };

    const newLog = {
      id: `acting_${hero.age}_${Date.now()}`,
      age: hero.age,
      icon: '🎭',
      text,
      category: 'mind_body',
    };

    return {
      state: {
        ...state,
        relationships: {
          ...state.relationships,
          [chosenParentKey]: updatedParent,
        },
        hero: {
          ...hero,
          actingSkill: nextSkill,
          stats: nextStats,
        },
        lifeLog: [newLog, ...state.lifeLog],
      },
      success: true,
      title: 'Acting Lessons',
      message,
      cost: 0,
      paidBy: `${parent.fullName} (${parent.relation})`,
      skillGain,
      statDeltas: {
        happiness: happyDelta,
        smarts: smartsDelta,
      },
    };
  }

  // Adult pays $500
  const cost = 500;
  if (hero.bankBalance < cost) {
    return {
      state,
      success: false,
      error: 'insufficient_funds',
      cost,
      message: `You don't have enough money for acting lessons ($500). Your balance is $${hero.bankBalance.toLocaleString()}.`,
    };
  }

  const text = `I took an intensive acting lesson and practiced monologue delivery. My acting skill improved to ${nextSkill}%!`;
  const happyDelta = getRandomInt(2, 4);
  const smartsDelta = 1;

  const nextStats = {
    ...hero.stats,
    happiness: Math.min(100, hero.stats.happiness + happyDelta),
    smarts: Math.min(100, hero.stats.smarts + smartsDelta),
  };

  const newLog = {
    id: `acting_${hero.age}_${Date.now()}`,
    age: hero.age,
    icon: '🎭',
    text,
    category: 'mind_body',
  };

  return {
    state: {
      ...state,
      hero: {
        ...hero,
        bankBalance: hero.bankBalance - cost,
        actingSkill: nextSkill,
        stats: nextStats,
      },
      lifeLog: [newLog, ...state.lifeLog],
    },
    success: true,
    title: 'Acting Lessons',
    message: text,
    cost,
    paidBy: 'Self',
    skillGain,
    statDeltas: {
      happiness: happyDelta,
      smarts: smartsDelta,
    },
  };
}

export function performGarden(state) {
  const hero = state.hero;
  if (hero.age < 8) {
    return { state, success: false, error: 'age_restricted', message: 'You are too young to manage a garden.' };
  }

  const text = 'I spent a rewarding afternoon in the garden, pruning flowers, watering vegetables, and breathing fresh air.';
  const happyDelta = getRandomInt(3, 5);
  const healthDelta = getRandomInt(1, 2);

  const nextStats = {
    ...hero.stats,
    happiness: Math.min(100, hero.stats.happiness + happyDelta),
    health: Math.min(100, hero.stats.health + healthDelta),
  };

  const newLog = {
    id: `garden_${hero.age}_${Date.now()}`,
    age: hero.age,
    icon: '🌱',
    text,
    category: 'mind_body',
  };

  return {
    state: {
      ...state,
      hero: { ...hero, stats: nextStats },
      lifeLog: [newLog, ...state.lifeLog],
    },
    success: true,
    title: 'Gardening',
    message: text,
    cost: 0,
    statDeltas: {
      happiness: happyDelta,
      health: healthDelta,
    },
  };
}

export function performSpaTreatment(state, treatmentIndex) {
  const hero = state.hero;
  if (hero.age < 16) {
    return { state, success: false, error: 'age_restricted', message: 'You must be at least 16 years old to visit the spa.' };
  }

  const treatment = (mindBodyData.spaTreatments && mindBodyData.spaTreatments[treatmentIndex]) || mindBodyData.spaTreatments[0];
  const cost = treatment.cost || 500;
  if (hero.bankBalance < cost) {
    return {
      state,
      success: false,
      error: 'insufficient_funds',
      cost,
      message: `You can't afford the ${treatment.name} ($${cost.toLocaleString()}). Your balance is $${hero.bankBalance.toLocaleString()}.`,
    };
  }

  const text = `I treated myself to a luxurious ${treatment.name} at the spa. I feel completely refreshed!`;

  const looksDelta = Math.max(2, treatment.looksImpact || 3);
  const healthDelta = Math.max(1, treatment.healthImpact || 2);
  const happyDelta = Math.max(3, treatment.happinessImpact || 4);

  const nextStats = {
    ...hero.stats,
    looks: Math.min(100, hero.stats.looks + looksDelta),
    health: Math.min(100, hero.stats.health + healthDelta),
    happiness: Math.min(100, hero.stats.happiness + happyDelta),
  };

  const newLog = {
    id: `spa_${hero.age}_${Date.now()}`,
    age: hero.age,
    icon: '💆',
    text,
    category: 'mind_body',
  };

  return {
    state: {
      ...state,
      hero: {
        ...hero,
        bankBalance: hero.bankBalance - cost,
        stats: nextStats,
      },
      lifeLog: [newLog, ...state.lifeLog],
    },
    success: true,
    title: treatment.name,
    message: text,
    cost,
    paidBy: 'Self',
    statDeltas: {
      looks: looksDelta,
      health: healthDelta,
      happiness: happyDelta,
    },
  };
}

export function performPlasticSurgery(state, surgeryIndex) {
  const hero = state.hero;
  if (hero.age < 18) {
    return { state, success: false, error: 'age_restricted', message: 'You must be at least 18 years old to undergo plastic surgery.' };
  }

  const proc = (mindBodyData.plasticSurgeries && mindBodyData.plasticSurgeries[surgeryIndex]) || mindBodyData.plasticSurgeries[0];
  const cost = proc.cost || 2500;
  if (hero.bankBalance < cost) {
    return {
      state,
      success: false,
      error: 'insufficient_funds',
      cost,
      message: `You don't have enough money for a ${proc.procedure} ($${cost.toLocaleString()}). Your balance is $${hero.bankBalance.toLocaleString()}.`,
    };
  }

  const isSuccess = Math.random() < 0.88;
  let text = '';
  let nextStats = {};
  let deltas = {};

  if (isSuccess) {
    const looksGain = getRandomInt(5, 10);
    const happyGain = getRandomInt(4, 7);
    text = `My ${proc.procedure} went smoothly and the results look sensational!`;
    deltas = { looks: looksGain, happiness: happyGain };
    nextStats = {
      ...hero.stats,
      looks: Math.min(100, hero.stats.looks + looksGain),
      happiness: Math.min(100, hero.stats.happiness + happyGain),
    };
  } else {
    const looksLoss = getRandomInt(8, 15);
    const healthLoss = getRandomInt(5, 10);
    const happyLoss = getRandomInt(10, 20);
    text = `Nightmare! The plastic surgeon botched my ${proc.procedure}. It looks disastrous!`;
    deltas = { looks: -looksLoss, health: -healthLoss, happiness: -happyLoss };
    nextStats = {
      ...hero.stats,
      looks: Math.max(0, hero.stats.looks - looksLoss),
      health: Math.max(0, hero.stats.health - healthLoss),
      happiness: Math.max(0, hero.stats.happiness - happyLoss),
    };
  }

  const newLog = {
    id: `surgery_${hero.age}_${Date.now()}`,
    age: hero.age,
    icon: isSuccess ? '✨' : '🩹',
    text,
    category: 'mind_body',
  };

  return {
    state: {
      ...state,
      hero: {
        ...hero,
        bankBalance: hero.bankBalance - cost,
        stats: nextStats,
      },
      lifeLog: [newLog, ...state.lifeLog],
    },
    success: isSuccess,
    title: isSuccess ? `${proc.procedure} Succeeded!` : 'Botched Surgery!',
    message: text,
    cost,
    paidBy: 'Self',
    statDeltas: deltas,
  };
}

export function performLottery(state, ticketCount = 1) {
  const hero = state.hero;
  if (hero.age < 18) {
    return { state, success: false, error: 'age_restricted', message: 'You must be at least 18 years old to play the lottery.' };
  }

  const cost = ticketCount * 5;
  if (hero.bankBalance < cost) {
    return {
      state,
      success: false,
      error: 'insufficient_funds',
      cost,
      message: `You don't have enough money to buy ${ticketCount} lottery ticket(s) ($${cost}). Your balance is $${hero.bankBalance.toLocaleString()}.`,
    };
  }

  const roll = Math.random();
  let winnings = 0;
  let text = '';
  let statDeltas = {};

  if (roll < 0.001) {
    // Jackpot! $15,000,000 to $80,000,000
    winnings = getRandomInt(15000000, 80000000);
    text = `JACKPOT! My lottery ticket won the grand prize jackpot of $${winnings.toLocaleString()}! I am a multimillionaire!`;
    statDeltas = { happiness: 50 };
  } else if (roll < 0.02) {
    // Medium prize $500 to $2,500
    winnings = getRandomInt(500, 2500);
    text = `I won a lucky secondary prize of $${winnings.toLocaleString()} on the lottery!`;
    statDeltas = { happiness: 10 };
  } else if (roll < 0.08) {
    // Small prize $20 to $100
    winnings = getRandomInt(20, 100);
    text = `I won a small $${winnings.toLocaleString()} payout on my lottery ticket!`;
    statDeltas = { happiness: 3 };
  } else {
    text = `I scratched ${ticketCount} lottery ticket(s) and unfortunately didn't win anything this time.`;
    statDeltas = { happiness: -1 };
  }

  const nextHappiness = Math.max(0, Math.min(100, hero.stats.happiness + (statDeltas.happiness || 0)));
  const nextBalance = hero.bankBalance - cost + winnings;

  const newLog = {
    id: `lottery_${hero.age}_${Date.now()}`,
    age: hero.age,
    icon: winnings > 0 ? '🎟️' : '🎫',
    text,
    category: 'mind_body',
  };

  return {
    state: {
      ...state,
      hero: {
        ...hero,
        bankBalance: nextBalance,
        stats: {
          ...hero.stats,
          happiness: nextHappiness,
        },
      },
      lifeLog: [newLog, ...state.lifeLog],
    },
    success: winnings > 0,
    title: winnings > 0 ? 'Lottery Winner!' : 'No Winner',
    message: text,
    cost,
    winnings,
    statDeltas,
  };
}

export function performDoctorVisit(state, doctorType = 'gp') {
  const hero = state.hero;
  if (hero.age < 6) {
    return { state, success: false, error: 'age_restricted', message: 'You are too young to visit a doctor alone.' };
  }

  const cost = hero.age < 18 ? 0 : 100;
  if (hero.bankBalance < cost) {
    return {
      state,
      success: false,
      error: 'insufficient_funds',
      cost,
      message: `You don't have enough money for a doctor visit ($${cost}). Your balance is $${hero.bankBalance.toLocaleString()}.`,
    };
  }

  const healthBoost = getRandomInt(6, 12);
  const happyBoost = getRandomInt(3, 5);

  const text = 'The physician gave me a thorough medical examination and confirmed that my vitals and health are in great shape!';

  const nextStats = {
    ...hero.stats,
    health: Math.min(100, hero.stats.health + healthBoost),
    happiness: Math.min(100, hero.stats.happiness + happyBoost),
  };

  const newLog = {
    id: `doctor_${hero.age}_${Date.now()}`,
    age: hero.age,
    icon: '🩺',
    text,
    category: 'mind_body',
  };

  return {
    state: {
      ...state,
      hero: {
        ...hero,
        bankBalance: hero.bankBalance - cost,
        stats: nextStats,
      },
      lifeLog: [newLog, ...state.lifeLog],
    },
    success: true,
    title: 'Medical Examination',
    message: text,
    cost,
    paidBy: cost > 0 ? 'Self' : 'Parents / Youth Care',
    statDeltas: {
      health: healthBoost,
      happiness: happyBoost,
    },
  };
}

export function ageUpLife(currentState) {
  const hero = currentState.hero;
  if (!hero.alive) return currentState; // deceased heroes don't age

  const nextAge = hero.age + 1;
  const newLogs = [];

  // ─── Death Check (old age / failing health) ────────────────────────────────
  const deathCause = rollNaturalDeath(nextAge, hero.stats.health);
  if (deathCause) {
    const doomed = { ...currentState, hero: { ...hero, age: nextAge } };
    return killHero(doomed, deathCause).state;
  }

  // Age up hero stage
  const nextStage = getStageFromAge(nextAge);

  // Education & School Transitions
  let nextEducation = {
    ...currentState.hero.education,
    degrees: [...(currentState.hero.education?.degrees || [])],
    activities: [...(currentState.hero.education?.activities || [])],
  };
  let nextOccupation = currentState.hero.occupation;
  let nextJob = currentState.hero.job ? { ...currentState.hero.job } : null;
  let nextPartTimeJob = currentState.hero.partTimeJob ? { ...currentState.hero.partTimeJob } : null;
  let nextSpecialCareer = currentState.hero.specialCareer ? { ...currentState.hero.specialCareer } : null;
  let nextBankBalance = currentState.hero.bankBalance;
  let nextPension = currentState.hero.pension || 0;

  if (nextAge === 6) {
    const school = generateSchool('Elementary', 6, currentState.hero.city, currentState.hero.countryCode, null, null, currentState.hero.gender);
    nextEducation.currentSchool = school;
    nextOccupation = 'Elementary School Student';
    newLogs.push({
      id: `school_start_${nextAge}`,
      age: nextAge,
      icon: '🏫',
      text: `I began attending ${school.name}.`,
      category: 'education',
    });
  } else if (nextAge === 12) {
    const oldSchoolName = nextEducation.currentSchool?.name || 'Elementary School';
    newLogs.push({
      id: `school_grad_elem_${nextAge}`,
      age: nextAge,
      icon: '🎓',
      text: `I graduated from ${oldSchoolName} and advanced to Middle School.`,
      category: 'education',
    });
    const school = generateSchool('Middle', 12, currentState.hero.city, currentState.hero.countryCode, null, null, currentState.hero.gender);
    nextEducation.currentSchool = school;
    nextEducation.clique = null;
    nextEducation.activities = [];
    nextEducation.activityRoles = {};
    nextEducation.activityRecords = {};
    nextEducation.schoolWeeklyHours = 0;
    nextOccupation = 'Middle School Student';
    newLogs.push({
      id: `school_middle_${nextAge}`,
      age: nextAge,
      icon: '🏫',
      text: `I enrolled in ${school.name}.`,
      category: 'education',
    });
  } else if (nextAge === 15) {
    const oldSchoolName = nextEducation.currentSchool?.name || 'Middle School';
    newLogs.push({
      id: `school_grad_mid_${nextAge}`,
      age: nextAge,
      icon: '🎓',
      text: `I graduated from ${oldSchoolName} and advanced to High School.`,
      category: 'education',
    });
    const school = generateSchool('High', 15, currentState.hero.city, currentState.hero.countryCode, null, null, currentState.hero.gender);
    nextEducation.currentSchool = school;
    nextEducation.clique = null;
    nextEducation.activities = [];
    nextEducation.activityRoles = {};
    nextEducation.activityRecords = {};
    nextEducation.schoolWeeklyHours = 0;
    nextOccupation = 'High School Student';
    newLogs.push({
      id: `school_high_${nextAge}`,
      age: nextAge,
      icon: '🏫',
      text: `I enrolled in ${school.name}.`,
      category: 'education',
    });
  }

  // Active School Progression
  if (nextEducation.currentSchool) {
    const currentSchool = { ...nextEducation.currentSchool };
    currentSchool.yearsAttended += 1;

    currentSchool.performance = Math.max(15, Math.min(100, currentSchool.performance + getRandomInt(-4, 3)));

    if (currentSchool.funding === 'Loan' && currentSchool.tuition > 0) {
      nextEducation.studentLoanDebt = (nextEducation.studentLoanDebt || 0) + currentSchool.tuition;
    }

    if (currentSchool.principal) {
      const pAge = currentSchool.principal.age + 1;
      currentSchool.principal = {
        ...currentSchool.principal,
        age: pAge,
        appearance: {
          ...currentSchool.principal.appearance,
          stage: getStageFromAge(pAge),
        },
      };
    }
    if (currentSchool.teachers) {
      currentSchool.teachers = currentSchool.teachers.map(t => {
        const tAge = t.age + 1;
        return {
          ...t,
          age: tAge,
          appearance: { ...t.appearance, stage: getStageFromAge(tAge) },
        };
      });
    }
    if (currentSchool.classmates) {
      currentSchool.classmates = currentSchool.classmates.map(c => {
        const cAge = c.age + 1;
        return {
          ...c,
          age: cAge,
          appearance: { ...c.appearance, stage: getStageFromAge(cAge) },
        };
      });
    }

    if (currentSchool.type === 'High' && nextAge === 18) {
      if (currentSchool.performance >= 45) {
        nextEducation.degrees.push({
          name: 'High School Diploma',
          year: nextAge,
          school: currentSchool.name,
        });
        nextEducation.highestCompleted = 'High School Diploma';
        nextEducation.currentSchool = null;
        nextEducation.clique = null;
        nextEducation.activities = [];
        nextEducation.activityRoles = {};
        nextEducation.activityRecords = {};
        nextEducation.schoolWeeklyHours = 0;
        if (!nextJob) nextOccupation = 'Unemployed';
        newLogs.push({
          id: `school_grad_high_${nextAge}`,
          age: nextAge,
          icon: '🎓',
          text: `I graduated from ${currentSchool.name} with a High School Diploma!`,
          category: 'education',
        });
      } else {
        newLogs.push({
          id: `school_fail_high_${nextAge}`,
          age: nextAge,
          icon: '❌',
          text: `I failed to graduate from ${currentSchool.name} due to poor academic performance.`,
          category: 'education',
        });
      }
    } else if (['University', 'Community', 'Medical', 'Law', 'Business', 'Dental', 'Pharmacy', 'Veterinary', 'Nursing', 'Graduate'].includes(currentSchool.type)) {
      if (currentSchool.yearsAttended >= currentSchool.totalYears) {
        if (currentSchool.performance >= 45) {
          let degreeTitle = '';
          if (currentSchool.type === 'University') {
            degreeTitle = `Bachelor's Degree in ${currentSchool.major}`;
            nextEducation.undergraduateMajor = currentSchool.major;
          } else if (currentSchool.type === 'Community') {
            degreeTitle = `Associate Degree in ${currentSchool.major || 'General Studies'}`;
          } else if (currentSchool.type === 'Medical') {
            degreeTitle = 'Doctor of Medicine (M.D.)';
          } else if (currentSchool.type === 'Law') {
            degreeTitle = 'Juris Doctor (J.D.)';
          } else if (currentSchool.type === 'Business') {
            degreeTitle = 'Master of Business Administration (MBA)';
          } else if (currentSchool.type === 'Dental') {
            degreeTitle = 'Doctor of Dental Surgery (D.D.S.)';
          } else if (currentSchool.type === 'Pharmacy') {
            degreeTitle = 'Doctor of Pharmacy (Pharm.D.)';
          } else if (currentSchool.type === 'Veterinary') {
            degreeTitle = 'Doctor of Veterinary Medicine (D.V.M.)';
          } else if (currentSchool.type === 'Nursing') {
            degreeTitle = 'Bachelor of Science in Nursing (BSN)';
          } else {
            degreeTitle = `Master's Degree in ${currentSchool.major || 'Specialized Studies'}`;
          }

          nextEducation.degrees.push({
            name: degreeTitle,
            year: nextAge,
            school: currentSchool.name,
            major: currentSchool.major,
          });
          nextEducation.highestCompleted = degreeTitle;
          nextEducation.currentSchool = null;
          nextEducation.clique = null;
          nextEducation.activities = [];
          nextEducation.activityRoles = {};
          nextEducation.activityRecords = {};
          nextEducation.schoolWeeklyHours = 0;
          if (!nextJob) nextOccupation = 'Unemployed';
          newLogs.push({
            id: `college_grad_${nextAge}`,
            age: nextAge,
            icon: '🎓',
            text: `I graduated from ${currentSchool.name} with a ${degreeTitle}!`,
            category: 'education',
          });
        } else {
          newLogs.push({
            id: `college_fail_${nextAge}`,
            age: nextAge,
            icon: '❌',
            text: `I was flunked out of ${currentSchool.name} due to failing grades.`,
            category: 'education',
          });
          nextEducation.currentSchool = null;
          if (!nextJob) nextOccupation = 'Unemployed';
        }
      } else {
        nextEducation.currentSchool = currentSchool;
      }
    } else {
      nextEducation.currentSchool = currentSchool;
    }
  }

  // ─── Yearly school-activity effects (APK a16_school-activities semantics) ───
  // Each joined activity's category flags drive stat gains, popularity scores
  // adjust the hidden popularity stat, "Track Performance" teams/bands play a
  // season in the background, and too many weekly hours tank your grades.
  let actStatDelta = { happiness: 0, health: 0, smarts: 0, looks: 0 };
  let actAthleticismDelta = 0;
  let actPopularityDelta = 0;
  let currentSchoolPerformancePenalty = 0;
  if (nextEducation.currentSchool && (nextEducation.activities || []).length > 0) {
    const popScoreKey = currentState.hero.gender === 'male' ? 'popularityScoreMale' : 'popularityScoreFemale';
    for (const actName of nextEducation.activities) {
      const act = findSchoolActivity(actName);
      if (!act) continue;
      const f = act.flags || {};
      const HOURS = act.weeklyHours || 4;
      if (f.sports) {
        actStatDelta.health += getRandomInt(1, 3) * (HOURS >= 10 ? 2 : 1);
        actAthleticismDelta += getRandomInt(2, 5) * (HOURS >= 10 ? 2 : 1);
      }
      if (f.nerd) actStatDelta.smarts += getRandomInt(1, 3);
      if (f.band) actStatDelta.happiness += getRandomInt(1, 2);
      if (f.arts) { actStatDelta.happiness += getRandomInt(1, 2); actStatDelta.looks += Math.random() < 0.5 ? 1 : 0; }
      if (f.acting) actStatDelta.looks += getRandomInt(1, 2);
      if (f.gaming || f.weeb) actStatDelta.happiness += getRandomInt(1, 2);
      if (act.kind === 'Career Interest') actStatDelta.smarts += getRandomInt(1, 2);
      if (act.kind === 'Community') actStatDelta.happiness += getRandomInt(1, 2);
      const popScore = act[popScoreKey] || 0;
      if (popScore > 0) actPopularityDelta += 1;       // e.g. football team roster = cred
      else if (popScore < 0) actPopularityDelta -= 1;
      // Season record for teams/bands tracked by the APK ('Track Performance' x)
      if (act.trackPerformance) {
        const records = { ...(nextEducation.activityRecords || {}) };
        let wins = 0, losses = 0;
        const m = String(records[actName] || '0W – 0L').match(/(\d+)\s*W\s*[–-]\s*(\d+)\s*L/);
        if (m) { wins = parseInt(m[1], 10); losses = parseInt(m[2], 10); }
        const games = act.kind === 'Athletics Team' ? 10 : 6;
        const stats0 = currentState.hero.stats;
        const winOdds = Math.max(0.2, Math.min(0.85, 0.3 + stats0.athleticism / 300 + stats0.popularity / 500 + popScore * 0.04));
        const w = [...Array(games)].filter(() => Math.random() < winOdds).length;
        wins += w; losses += games - w;
        records[actName] = `${wins}W – ${losses}L`;
        nextEducation.activityRecords = records;
        if (wins > losses) actPopularityDelta += 1;
        const seasonLog = {
          id: `season_${actName}_${nextAge}`,
          age: nextAge,
          icon: act.flags.sports ? '🏆' : '🎵',
          text: wins >= losses
            ? `Great season with the ${actName} — went ${w}-${games - w} this year (career ${wins}W – ${losses}L)!`
            : `Rough season with the ${actName} — went ${w}-${games - w} this year (career ${wins}W – ${losses}L).`,
          category: 'education',
        };
        newLogs.push(seasonLog);
      }
    }
    // Activity overload: too many weekly hours drag the grades
    const totalHours = nextEducation.activities.reduce((s, nm) => s + (findSchoolActivity(nm)?.weeklyHours || 4), 0);
    nextEducation.schoolWeeklyHours = totalHours;
    if (totalHours > 14) {
      currentSchoolPerformancePenalty = getRandomInt(1, Math.min(6, totalHours - 14 + 1));
    }
  }
  if (currentSchoolPerformancePenalty > 0 && nextEducation.currentSchool) {
    nextEducation.currentSchool = {
      ...nextEducation.currentSchool,
      performance: Math.max(15, nextEducation.currentSchool.performance - currentSchoolPerformancePenalty),
    };
  }

  // ─── Career & Job Progression on Age Up ──────────────────────────────────
  if (nextJob) {
    // Collect Salary
    nextBankBalance += nextJob.salary;
    newLogs.push({
      id: `salary_${nextAge}`,
      age: nextAge,
      icon: '💵',
      text: `I earned my annual salary of $${nextJob.salary.toLocaleString()} from ${nextJob.companyName}.`,
      category: 'financial',
    });

    nextJob.yearsAtCompany = (nextJob.yearsAtCompany || 0) + 1;

    // Slight performance drift
    nextJob.performance = Math.max(10, Math.min(100, nextJob.performance + getRandomInt(-5, 3)));

    // Low performance warning or fired
    if (nextJob.performance < 25) {
      newLogs.push({
        id: `fired_${nextAge}`,
        age: nextAge,
        icon: '🔥',
        text: `I was fired from my position as ${nextJob.title} at ${nextJob.companyName} due to poor job performance!`,
        category: 'career',
      });
      nextJob = null;
      if (!nextEducation.currentSchool) nextOccupation = 'Unemployed';
    } else if (nextJob.performance < 38) {
      const warnTemplate = getRandomFromList(jobsData.supervisorWarnings) || '<supervisor> warned you to improve your performance.';
      const warnMsg = warnTemplate.replace(/<supervisor>/gi, nextJob.supervisor?.fullName || 'My supervisor');
      newLogs.push({
        id: `job_warning_${nextAge}`,
        age: nextAge,
        icon: '⚠️',
        text: warnMsg,
        category: 'career',
      });
    } else if (nextJob.performance >= 85 && Math.random() < 0.45) {
      // Automatic annual raise
      const autoRaise = Math.round(nextJob.salary * (getRandomInt(3, 7) / 100));
      nextJob.salary += autoRaise;
      newLogs.push({
        id: `auto_raise_${nextAge}`,
        age: nextAge,
        icon: '📈',
        text: `My supervisor gave me a performance raise of $${autoRaise.toLocaleString()}! My salary is now $${nextJob.salary.toLocaleString()}/yr.`,
        category: 'career',
      });
    }

    // Age up supervisor and coworkers
    if (nextJob?.supervisor) {
      const sAge = nextJob.supervisor.age + 1;
      nextJob.supervisor = {
        ...nextJob.supervisor,
        age: sAge,
        appearance: { ...nextJob.supervisor.appearance, stage: getStageFromAge(sAge) },
      };
    }
    if (nextJob?.coworkers) {
      nextJob.coworkers = nextJob.coworkers.map(c => {
        const cAge = c.age + 1;
        return {
          ...c,
          age: cAge,
          appearance: { ...c.appearance, stage: getStageFromAge(cAge) },
        };
      });
    }
  }

  // Part-time Job earnings
  if (nextPartTimeJob) {
    nextBankBalance += nextPartTimeJob.annualEarnings;
    newLogs.push({
      id: `pt_earnings_${nextAge}`,
      age: nextAge,
      icon: '💵',
      text: `I earned $${nextPartTimeJob.annualEarnings.toLocaleString()} working part-time as a ${nextPartTimeJob.title} at ${nextPartTimeJob.companyName}.`,
      category: 'financial',
    });
  }

  // ─── Special Career Yearly Progression on Age Up ──────────────────────────
  if (nextSpecialCareer) {
    if (nextSpecialCareer.salary > 0) {
      nextBankBalance += nextSpecialCareer.salary;
      newLogs.push({
        id: `sc_salary_${nextAge}`,
        age: nextAge,
        icon: '💵',
        text: `I earned $${nextSpecialCareer.salary.toLocaleString()} from my career as ${nextSpecialCareer.title} (${nextSpecialCareer.organization}).`,
        category: 'financial',
      });
    }

    nextSpecialCareer.yearsActive = (nextSpecialCareer.yearsActive || 0) + 1;

    // Career specific annual logic
    if (nextSpecialCareer.type === 'politician') {
      nextSpecialCareer.yearsInTerm = (nextSpecialCareer.yearsInTerm || 0) + 1;
      nextSpecialCareer.standing = Math.max(10, Math.min(100, nextSpecialCareer.standing + getRandomInt(-6, 5)));

      if (nextSpecialCareer.yearsInTerm >= (nextSpecialCareer.termYears || 4)) {
        if (nextSpecialCareer.standing >= 50) {
          newLogs.push({
            id: `reelection_${nextAge}`,
            age: nextAge,
            icon: '🗳️',
            text: `RE-ELECTED! Voters re-elected me to another ${nextSpecialCareer.termYears}-year term as ${nextSpecialCareer.title} with a ${nextSpecialCareer.standing}% approval rating!`,
            category: 'career',
          });
          nextSpecialCareer.yearsInTerm = 0;
        } else {
          newLogs.push({
            id: `election_loss_${nextAge}`,
            age: nextAge,
            icon: '❌',
            text: `ELECTION DEFEAT: Due to a low approval rating (${nextSpecialCareer.standing}%), I was voted out of office as ${nextSpecialCareer.title}. My term has ended.`,
            category: 'career',
          });
          nextSpecialCareer = null;
          nextOccupation = 'Unemployed';
        }
      }
    } else if (nextSpecialCareer.type === 'athlete') {
      const wonChamp = Math.random() < 0.28;
      if (wonChamp) {
        nextSpecialCareer.championships = (nextSpecialCareer.championships || 0) + 1;
        newLogs.push({
          id: `champ_${nextAge}`,
          age: nextAge,
          icon: '🏆',
          text: `CHAMPIONS! My team, the ${nextSpecialCareer.organization}, won the World Championship! I received a championship ring!`,
          category: 'career',
        });
      }
      if (nextAge >= 38) {
        newLogs.push({
          id: `athlete_retire_${nextAge}`,
          age: nextAge,
          icon: '👟',
          text: `At age ${nextAge}, my physical stamina declined and I announced my retirement from professional ${nextSpecialCareer.sport}.`,
          category: 'career',
        });
        nextSpecialCareer = null;
        nextOccupation = 'Retired Athlete';
      }
    } else if (nextSpecialCareer.type === 'musician') {
      const royalties = Math.round((nextSpecialCareer.fame || 25) * getRandomInt(800, 2500));
      nextBankBalance += royalties;
      newLogs.push({
        id: `music_royalties_${nextAge}`,
        age: nextAge,
        icon: '🎵',
        text: `I received $${royalties.toLocaleString()} in annual streaming and catalog royalties from my music discography.`,
        category: 'financial',
      });
      nextSpecialCareer.fame = Math.max(5, Math.min(100, nextSpecialCareer.fame + getRandomInt(-3, 2)));
    } else if (nextSpecialCareer.type === 'actor') {
      const residuals = Math.round((nextSpecialCareer.fame || 20) * getRandomInt(1000, 3000));
      nextBankBalance += residuals;
      newLogs.push({
        id: `actor_residuals_${nextAge}`,
        age: nextAge,
        icon: '🎞️',
        text: `I collected $${residuals.toLocaleString()} in annual TV broadcast and streaming residuals for my filmography.`,
        category: 'financial',
      });
      nextSpecialCareer.fame = Math.max(5, Math.min(100, nextSpecialCareer.fame + getRandomInt(-2, 2)));
    } else if (nextSpecialCareer.type === 'hustler') {
      const streetLoot = getRandomInt(6000, 22000);
      nextBankBalance += streetLoot;
      newLogs.push({
        id: `hustle_annual_${nextAge}`,
        age: nextAge,
        icon: '🪙',
        text: `I scraped together $${streetLoot.toLocaleString()} working the streets over the past year.`,
        category: 'financial',
      });
    } else if (nextSpecialCareer.type === 'dealer') {
      const drugProfits = getRandomInt(18000, 55000);
      nextBankBalance += drugProfits;
      newLogs.push({
        id: `dealer_annual_${nextAge}`,
        age: nextAge,
        icon: '💊',
        text: `I pulled in $${drugProfits.toLocaleString()} running product across our cartel's city territory.`,
        category: 'financial',
      });
    } else if (nextSpecialCareer.type === 'business') {
      const dividend = Math.round(nextSpecialCareer.valuation * (getRandomInt(-5, 20) / 100));
      if (dividend > 0) {
        nextBankBalance += dividend;
        newLogs.push({
          id: `biz_div_${nextAge}`,
          age: nextAge,
          icon: '📈',
          text: `${nextSpecialCareer.organization} had a profitable fiscal year! I received an executive dividend of $${dividend.toLocaleString()}.`,
          category: 'financial',
        });
      }
      nextSpecialCareer.valuation = Math.max(10000, Math.round(nextSpecialCareer.valuation * (1 + (getRandomInt(-10, 25) / 100))));
    }
  }

  // ─── Prison Sentence Progression on Age Up ─────────────────────────────────
  let nextPrison = currentState.hero.prison ? { ...currentState.hero.prison } : null;
  let prisonStatMod = { happiness: 0, health: 0, smarts: 0 };
  if (nextPrison) {
    nextPrison.yearsServed += 1;
    const remaining = Math.max(0, nextPrison.sentence - nextPrison.yearsServed);

    if (remaining <= 0) {
      newLogs.push({
        id: `prison_release_${nextAge}`,
        age: nextAge,
        icon: '🕊️',
        text: `SOCIETY FORGIVEN: I completed my ${nextPrison.sentence}-year sentence for ${nextPrison.charge} and was released from prison!`,
        category: 'crime',
      });
      nextPrison = null;
      nextOccupation = 'Unemployed';
      prisonStatMod.happiness = 12;
    } else if (nextPrison.yearsServed >= Math.ceil(nextPrison.sentence / 2) && Math.random() < 0.18) {
      newLogs.push({
        id: `parole_${nextAge}`,
        age: nextAge,
        icon: '🕊️',
        text: `EARLY RELEASE: After ${nextPrison.yearsServed} years of good behavior behind bars, I was granted parole!`,
        category: 'crime',
      });
      nextPrison = null;
      nextOccupation = 'Unemployed (Parole)';
      prisonStatMod.happiness = 10;
    } else {
      const prisonWage = getRandomInt(800, 2000);
      nextBankBalance += prisonWage;
      newLogs.push({
        id: `prison_year_${nextAge}`,
        age: nextAge,
        icon: '🛏️',
        text: `I spent another year behind bars for ${nextPrison.charge}, working the laundry detail for $${prisonWage.toLocaleString()}. ${remaining} year${remaining === 1 ? '' : 's'} remain on my sentence.`,
        category: 'crime',
      });
      nextOccupation = 'Prisoner';
      prisonStatMod = { happiness: -4, health: -1, smarts: 1 };
    }
  }

  // Retirement Pension
  if (nextPension > 0) {
    nextBankBalance += nextPension;
    newLogs.push({
      id: `pension_${nextAge}`,
      age: nextAge,
      icon: '🌴',
      text: `I received my annual retirement pension of $${nextPension.toLocaleString()}.`,
      category: 'financial',
    });
  }

  // Student loan repayment
  if (nextEducation.studentLoanDebt > 0 && nextBankBalance > 0) {
    const annualLoanPayment = Math.min(nextEducation.studentLoanDebt, Math.min(nextBankBalance, Math.round(nextEducation.studentLoanDebt * 0.10) || 500));
    if (annualLoanPayment > 0) {
      nextEducation.studentLoanDebt -= annualLoanPayment;
      nextBankBalance -= annualLoanPayment;
      newLogs.push({
        id: `loan_pay_${nextAge}`,
        age: nextAge,
        icon: '💳',
        text: `An automatic payment of $${annualLoanPayment.toLocaleString()} was made towards my student loans. Remaining balance: $${nextEducation.studentLoanDebt.toLocaleString()}.`,
        category: 'financial',
      });
    }
  }

  // Age up parents
  const updatedRels = { ...currentState.relationships };

  if (updatedRels.mother?.alive) {
    const nextMotherAge = updatedRels.mother.age + 1;
    const nextMotherStage = getStageFromAge(nextMotherAge);
    updatedRels.mother = {
      ...updatedRels.mother,
      age: nextMotherAge,
      appearance: {
        ...(updatedRels.mother.appearance || {}),
        stage: nextMotherStage,
      },
    };
  }

  if (updatedRels.father?.alive) {
    const nextFatherAge = updatedRels.father.age + 1;
    const nextFatherStage = getStageFromAge(nextFatherAge);
    updatedRels.father = {
      ...updatedRels.father,
      age: nextFatherAge,
      appearance: {
        ...(updatedRels.father.appearance || {}),
        stage: nextFatherStage,
      },
    };
  }

  // Age up siblings
  if (updatedRels.siblings?.length > 0) {
    updatedRels.siblings = updatedRels.siblings.map(sib => {
      if (!sib.alive) return sib;
      const nextSibAge = sib.age + 1;
      const nextSibStage = getStageFromAge(nextSibAge);
      return {
        ...sib,
        age: nextSibAge,
        appearance: {
          ...(sib.appearance || {}),
          stage: nextSibStage,
        },
      };
    });
  }

  // Age up pet
  if (updatedRels.pet?.alive) {
    const petNextAge = updatedRels.pet.age + 1;
    if (petNextAge > 15 && Math.random() < 0.4) {
      updatedRels.pet = { ...updatedRels.pet, alive: false };
      newLogs.push({
        id: `pet_died_${nextAge}`,
        age: nextAge,
        icon: '🪦',
        text: `Our family pet, ${updatedRels.pet.name}, passed away of old age at age ${petNextAge}.`,
        category: 'pet',
      });
    } else {
      updatedRels.pet = { ...updatedRels.pet, age: petNextAge };
    }
  }

  // Mind & Body: Annual diet financial & health effects
  if (currentState.hero.diet && currentState.hero.diet !== 'None') {
    const activeDiet = (mindBodyData?.diets || []).find(d => d.name.toLowerCase() === currentState.hero.diet.toLowerCase());
    if (activeDiet) {
      const annualCost = activeDiet.monthlyCost * 12;
      nextBankBalance = Math.max(0, nextBankBalance - annualCost);
      if (activeDiet.associatedDisease && Math.random() < 0.04) {
        newLogs.push({
          id: `diet_disease_${nextAge}`,
          age: nextAge,
          icon: '🤢',
          text: `My ${activeDiet.name} diet has caused me to develop ${activeDiet.associatedDisease}!`,
          category: 'health',
        });
      }
    }
  }

  // Slight natural stat drift
  const activeDietData = (currentState.hero.diet && currentState.hero.diet !== 'None')
    ? (mindBodyData?.diets || []).find(d => d.name.toLowerCase() === currentState.hero.diet.toLowerCase())
    : null;
  const dietHealthBoost = (activeDietData?.healthImpact || 0) * 2;
  const dietHappyBoost = (activeDietData?.happinessImpact || 0) * 2;
  const dietLooksBoost = (activeDietData?.appearanceImpact || 0) * 2;

  const nextStats = {
    happiness: Math.max(0, Math.min(100, currentState.hero.stats.happiness + getRandomInt(-3, 3) + dietHappyBoost + prisonStatMod.happiness + actStatDelta.happiness)),
    health: Math.max(0, Math.min(100, currentState.hero.stats.health + getRandomInt(-2, 2) + dietHealthBoost + prisonStatMod.health + actStatDelta.health)),
    smarts: Math.max(0, Math.min(100, currentState.hero.stats.smarts + getRandomInt(-1, 2) + prisonStatMod.smarts + actStatDelta.smarts)),
    looks: Math.max(0, Math.min(100, currentState.hero.stats.looks + getRandomInt(-1, 1) + dietLooksBoost + actStatDelta.looks)),
    // APK hidden stats surfaced by school clubs & teams
    athleticism: Math.max(0, Math.min(100, (normalizeExtendedStats(currentState.hero).stats.athleticism) + actAthleticismDelta - (nextAge > 30 ? 1 : 0))),
    popularity: Math.max(0, Math.min(100, (normalizeExtendedStats(currentState.hero).stats.popularity) + actPopularityDelta + (nextAge >= 6 && nextAge <= 22 ? getRandomInt(-1, 2) : getRandomInt(-2, 0)))),
  };

  return {
    ...currentState,
    hero: {
      ...currentState.hero,
      age: nextAge,
      stage: nextStage,
      occupation: nextOccupation,
      bankBalance: nextBankBalance,
      stats: nextStats,
      education: nextEducation,
      job: nextJob,
      partTimeJob: nextPartTimeJob,
      specialCareer: nextSpecialCareer,
      pension: nextPension,
      prison: nextPrison,
      jobListings: [], // refresh each year
      partTimeListings: [],
      appearance: {
        ...(currentState.hero.appearance || {}),
        stage: nextStage,
      },
    },
    relationships: updatedRels,
    lifeLog: [...newLogs, ...currentState.lifeLog],
    pendingScenario: (() => {
      // No random events while locked up
      if (nextPrison) return null;
      // Pick random yearly event from 1,296 APK scenarios
      const rollChance = (nextAge >= 11 && nextAge <= 18) ? 0.65 : 0.45;
      if (nextAge >= 4 && Math.random() < rollChance) {
        const hasJob = Boolean(nextJob || nextSpecialCareer || nextPartTimeJob);
        const hasSchool = Boolean(nextEducation?.currentSchool);
        const hasPet = Boolean(updatedRels?.pet?.alive);

        const eligible = (scenariosData || []).filter(sc => {
          if (nextAge < sc.minAge || nextAge > sc.maxAge) return false;
          if ((sc.studentOnly || sc.requiresSchool) && !hasSchool) return false;
          if ((sc.jobOnly || sc.requiresJob) && !hasJob) return false;
          if (sc.requiresPet && !hasPet) return false;

          // Strict life stage guardrails:
          if (nextAge < 6) {
            // Ages 0-5 (Infant / Toddler): Strictly childhood category only
            return sc.category === 'Childhood' && sc.maxAge <= 10;
          }
          if (nextAge < 12) {
            // Ages 6-11 (Childhood / Elementary): No workplace events; elementary & family only
            if (sc.requiresJob || sc.jobOnly) return false;
            return sc.minAge <= 11;
          }
          if (nextAge < 18) {
            // Ages 12-17 (Teens): No job events unless hero actually holds a job
            if ((sc.requiresJob || sc.jobOnly) && !hasJob) return false;
            return sc.minAge <= 17;
          }
          // Ages 18+ (Adults): Job events strictly require an actual job
          if ((sc.requiresJob || sc.jobOnly) && !hasJob) return false;
          return true;
        });
        if (eligible.length > 0) {
          const rawSc = getRandomFromList(eligible);
          return resolveScenarioPlaceholders(rawSc, {
            hero: { ...currentState.hero, age: nextAge },
            relationships: updatedRels,
            education: nextEducation,
          });
        }
      }
      return null;
    })(),
  };
}


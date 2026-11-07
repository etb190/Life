// GameScreen.jsx — Authentic BitLife Game UI with Live NPCs, Life Log, and Interactions
import { useState, useEffect, useRef } from 'react';
import Toast from './Toast.jsx';
import GameOver from './GameOver.jsx';
import { FacePreview } from './AvatarFace.jsx';
import {
  interactWithNPC,
  ageUpLife,
  getStageFromAge,
  studyHarder,
  dropOutOfSchool,
  joinSchoolActivity,
  leaveSchoolActivity,
  joinSchoolClique,
  runForSchoolOffice,
  activityGateReason,
  findSchoolActivity,
  interactWithTeacher,
  interactWithClassmate,
  applyToHigherEducation,
  generateJobListings,
  generatePartTimeListings,
  applyForJob,
  answerJobInterview,
  applyForPartTimeJob,
  workHarderAtJob,
  askForRaise,
  askForPromotion,
  interactWithSupervisor,
  interactWithCoworker,
  resignFromJob,
  retireFromJob,
  leaveSpecialCareer,
  startPoliticianCareer,
  politicianCampaignSpeech,
  politicianPassLaw,
  politicianSpreadRumor,
  politicianMeetLobbyist,
  resolveScenarioChoice,
  joinMafia,
  mafiaPushCrime,
  mafiaExtort,
  mafiaWhack,
  startMusicCareer,
  musicReleaseAlbum,
  musicGoOnTour,
  startActorCareer,
  actorAudition,
  startAthleteCareer,
  athletePractice,
  startModelCareer,
  modelDoGig,
  applySpaceAcademy,
  launchSpaceMission,
  startStreetHustle,
  streetHustleAction,
  startDealerCareer,
  dealerSellDrug,
  startStartupBusiness,
  mindBodyData,
  crimeData,
  performGym,
  performMeditate,
  performWalk,
  performLibrary,
  performReadBook,
  performSetDiet,
  performTrainMartialArt,
  performGarden,
  performActingLesson,
  performSpaTreatment,
  performPlasticSurgery,
  performLottery,
  performDoctorVisit,
  commitCrime,
  commitMurder,
  commitBankRobbery,
  hireHitman,
  hackSocialMedia,
  startSpyAgency,
  spyRunMission,
  mafiaScare,
  mafiaTemptation,
  dealerDrugRun,
  dealerCutDrugs,
  hustlerBusk,
  hustlerRunScam,
  crimeMinigamesData,
  carsData,
  refreshCarDealership,
  buyCar,
  sellCar,
  getLicenseQuiz,
  submitLicenseTest,
  getCarTheftTargets,
  stealCar,
  commitBurglary,
  resolveBurglaryPuzzle,
  startCarDriveEvent,
  resolveCarDriveChoice,
  carSpriteFor,
} from '../../game/lifeEngine.js';
import educationData from '../../data/education-data.json';
import schoolData from '../../data/school-activities-data.json';
import jobsData from '../../data/jobs-data.json';
import specialJobsData from '../../data/special-jobs-data.json';

// ─── Burglary alarm-bypass minigame (APK a16_Numberlink* puzzle kit) ─────────
// Wire every colored circuit terminal-to-terminal before the alarm clock
// expires. Built exactly like Flow Free: no crossings, no revisits.
function BurglaryAlarmPuzzle({ puzzle, onDone, onAbort }) {
  const gs = puzzle.gridSize;
  const [secondsLeft, setSecondsLeft] = useState(puzzle.timeLimit);
  const [wires, setWires] = useState({});        // pairId -> cells[]
  const [activePair, setActivePair] = useState(null);
  const draggingRef = useRef(false);
  const doneRef = useRef(false);
  const boardRef = useRef(null);

  const cellOf = (e) => {
    const rect = boardRef.current.getBoundingClientRect();
    const size = rect.width / gs;
    const c = Math.floor((e.clientX - rect.left) / size);
    const r = Math.floor((e.clientY - rect.top) / size);
    if (r < 0 || c < 0 || r >= gs || c >= gs) return null;
    return [r, c];
  };
  const keyOf = ([r, c]) => r * gs + c;
  const ownedBy = (r, c) => {
    for (const [pid, cells] of Object.entries(wires)) {
      if (cells.some(cell => cell[0] === r && cell[1] === c)) return Number(pid);
    }
    return null;
  };
  const anchorOf = ([r, c]) => (puzzle.pairs.find(p => p.ends.some(e => e[0] === r && e[1] === c)) || null);
  const wireComplete = (pid) => {
    const line = wires[pid];
    if (!line || line.length < 2) return false;
    const pair = puzzle.pairs.find(p => p.id === pid);
    const a = keyOf(line[0]);
    const b = keyOf(line[line.length - 1]);
    const ea = keyOf(pair.ends[0]);
    const eb = keyOf(pair.ends[1]);
    return (a === ea && b === eb) || (a === eb && b === ea);
  };
  const lockedCount = puzzle.pairs.filter(p => wireComplete(p.id)).length;

  const finish = (outcome) => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone(outcome);
  };

  // Alarm countdown
  useEffect(() => {
    const t = setInterval(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (secondsLeft <= 0 && !doneRef.current) {
      doneRef.current = true;
      setTimeout(() => onDone({ solved: false, timeout: true }), 350);
    }
  }, [secondsLeft, onDone]);

  const handleDown = (e) => {
    if (doneRef.current) return;
    const cell = cellOf(e);
    if (!cell) return;
    // tap an unfinished terminal → start (or restart) its wire
    const anchor = anchorOf(cell);
    if (anchor && lockedCount !== puzzle.pairCount) {
      const idx = anchor.ends.findIndex(en => en[0] === cell[0] && en[1] === cell[1]);
      setActivePair(anchor.id);
      draggingRef.current = true;
      setWires(prev => ({ ...prev, [anchor.id]: idx === 0 ? [anchor.ends[0]] : [anchor.ends[1]] }));
      return;
    }
    // tap the tail of a partial wire → resume dragging it
    if (activePair != null) {
      const cs = wires[activePair];
      const tail = cs && cs[cs.length - 1];
      if (tail && tail[0] === cell[0] && tail[1] === cell[1]) draggingRef.current = true;
    }
  };

  const handleMove = (e) => {
    if (!draggingRef.current || doneRef.current) return;
    const cell = cellOf(e);
    if (!cell || activePair == null) return;
    const pair = puzzle.pairs.find(p => p.id === activePair);
    setWires(prev => {
      const line = prev[activePair] || [];
      if (!line.length) return prev;
      const [lr, lc] = line[line.length - 1];
      if (cell[0] === lr && cell[1] === lc) return prev;
      // backtrack along the current wire
      const backIdx = line.findIndex(cell2 => cell2[0] === cell[0] && cell2[1] === cell[1]);
      if (backIdx !== -1 && backIdx < line.length - 1) {
        return { ...prev, [activePair]: line.slice(0, backIdx + 1) };
      }
      const adj = Math.abs(cell[0] - lr) + Math.abs(cell[1] - lc);
      if (adj !== 1) return prev;
      // blocked by other wires or other pairs' terminals
      const owner = ownedBy(cell[0], cell[1]);
      if (owner != null) return prev;
      const cellAnchor = anchorOf(cell);
      if (cellAnchor && cellAnchor.id !== activePair) return prev;
      if (cellAnchor && cellAnchor.id === activePair) {
        // circuit complete — hand lands on the matching terminal.
        // NOTE: no setState here — this runs inside the setWires updater,
        // and calling setActivePair during render-phase updates can wedge React.
        draggingRef.current = false;
        return { ...prev, [activePair]: [...line, cell] };
      }
      return { ...prev, [activePair]: [...line, cell] };
    });
  };

  // Watch for circuit completion after each wire update
  useEffect(() => {
    if (doneRef.current) return;
    const locked = puzzle.pairs.filter(p => wireComplete(p.id));
    if (locked.length === puzzle.pairCount) {
      draggingRef.current = false;
      setActivePair(null);
      doneRef.current = true;
      const frac = Math.max(0, secondsLeft) / puzzle.timeLimit;
      setTimeout(() => onDone({ solved: true, timeLeftFrac: frac }), 250);
    }
  }, [wires, secondsLeft, onDone, puzzle]);

  const handleUp = () => { draggingRef.current = false; };

  const linePts = cells => cells.map(([r, c]) => `${(c + 0.5) * 100 / gs},${(r + 0.5) * 100 / gs}`).join(' ');
  const timeFrac = Math.max(0, Math.min(1, secondsLeft / puzzle.timeLimit));

  return (
    <div className="space-y-2.5">
      <div className="p-2.5 rounded-xl bg-slate-950/70 border border-red-900/50">
        <div className="flex items-center justify-between mb-1.5">
          <h5 className="text-xs font-bold text-red-300">🔦 Strip the panel — wire the bypass</h5>
          <span className={`text-xs font-bold font-mono ${timeFrac < 0.25 ? 'text-red-400' : 'text-emerald-400'}`}>
            {Math.max(0, secondsLeft)}s
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800 border border-slate-700/60">
          <div className="h-full bg-gradient-to-r from-red-500 to-amber-400 transition-all duration-1000"
            style={{ width: `${timeFrac * 100}%` }} />
        </div>
        <p className="text-[9px] text-slate-500 mt-1">
          Drag from a colored terminal to its twin. Wires can never touch. Tap a terminal again to restart its wire.
        </p>
      </div>

      <div
        ref={boardRef}
        className="relative w-full max-w-xs mx-auto aspect-square rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-950 shadow-inner select-none touch-none cursor-pointer"
        style={{ backgroundImage: 'url(/games/a16_numberlinkGridFrame.png)', backgroundSize: 'cover' }}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerLeave={handleUp}
      >
        {/* circuit wires */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          {puzzle.pairs.map(p => {
            const cells = wires[p.id];
            if (!cells || cells.length < 2) return null;
            const complete = cells.length >= 2 && cells[0].join() !== cells[cells.length - 1].join();
            return (
              <polyline
                key={p.id}
                points={linePts(cells)}
                fill="none"
                stroke={p.color}
                strokeWidth={complete ? 6.5 : 6.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={complete ? 1 : 0.75}
              />
            );
          })}
        </svg>
        {/* terminals */}
        {puzzle.pairs.map(p => p.ends.map((end, ei) => {
          const [r, c] = end;
          const complete = wireComplete(p.id);
          return (
            <div
              key={`${p.id}-${ei}`}
              className="absolute rounded-full border-2 flex items-center justify-center text-[11px] font-extrabold text-white shadow"
              style={{
                left: `${((c + 0.5) * 100) / gs}%`,
                top: `${((r + 0.5) * 100) / gs}%`,
                width: `${80 / gs}%`, height: `${80 / gs}%`,
                transform: 'translate(-50%, -50%)',
                borderColor: complete ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)',
                backgroundColor: p.color,
              }}
            >
              <span className="drop-shadow">{p.id + 1}</span>
            </div>
          );
        }))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setWires({}); setActivePair(null); draggingRef.current = false; }}
          className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold cursor-pointer"
        >
          Reset wires
        </button>
        <button
          type="button"
          onClick={() => onAbort()}
          className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold cursor-pointer"
        >
          Call it off
        </button>
      </div>
      <p className="text-center text-[10px] text-slate-500 italic">
        Circuits wired: {lockedCount}/{puzzle.pairCount}
      </p>
    </div>
  );
}

function StatBar({ label, icon, value, colorClass }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex-1 min-w-[70px] space-y-1">
      <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
        <span className="flex items-center gap-1">
          <span>{icon}</span>
          <span className="hidden sm:inline">{label}</span>
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800 border border-slate-700/60">
        <div
          className={`h-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function NpcAvatar({ npc, size = 64 }) {
  if (npc.type === 'pet') {
    return (
      <div className="shrink-0 flex items-center justify-center text-3xl select-none" style={{ width: size, height: size }}>
        <span>{npc.animal === 'Dog' ? '🐶' : '🐱'}</span>
      </div>
    );
  }

  const app = npc.appearance;
  if (!app) return null;

  const currentStage = getStageFromAge(npc.age);

  return (
    <div className="shrink-0 flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <FacePreview
        gender={app.gender || npc.gender}
        stage={currentStage}
        sel={{ ...app, stage: currentStage }}
        size={size}
      />
    </div>
  );
}

export default function GameScreen({ gameState, onUpdateState, onNewLife }) {
  const { hero, relationships, lifeLog } = gameState;
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'relationships' | 'occupation' | 'assets'
  const [selectedNPC, setSelectedNPC] = useState(null);
  const [toast, setToast] = useState(null);

  // Education Modals & Sub-states
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedClassmate, setSelectedClassmate] = useState(null);
  const [showActivitiesModal, setShowActivitiesModal] = useState(false);
  const [showCliquesModal, setShowCliquesModal] = useState(false);
  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [showClassmatesModal, setShowClassmatesModal] = useState(false);
  const [higherEdModalSchool, setHigherEdModalSchool] = useState(null);
  const [selectedMajor, setSelectedMajor] = useState('Computer Science');
  const [selectedFunding, setSelectedFunding] = useState('Scholarship');

  // Job & Career State & Modals
  const [jobSubTab, setJobSubTab] = useState('full_time'); // 'full_time' | 'part_time' | 'higher_ed' | 'special'
  const [cachedJobListings, setCachedJobListings] = useState([]);
  const [cachedPartTimeListings, setCachedPartTimeListings] = useState([]);
  const [interviewState, setInterviewState] = useState(null); // { listing, question }
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);
  const [selectedCoworker, setSelectedCoworker] = useState(null);
  const [showCoworkersModal, setShowCoworkersModal] = useState(false);

  // Special Careers States & Modals
  const [specialCareerModal, setSpecialCareerModal] = useState(null);
  const [specialActionModal, setSpecialActionModal] = useState(null);
  const [politicianForm, setPoliticianForm] = useState({ officeId: 'school_board', party: 'Democrat', budget: 10000 });
  const [mafiaMob, setMafiaMob] = useState('Sicilian mafia');
  const [musicianForm, setMusicianForm] = useState({ genre: 'Rock', role: 'Guitarist', isBand: true, instrument: 'Electric Guitar' });
  const [actorRole, setActorRole] = useState('Supporting');
  const [athleteForm, setAthleteForm] = useState({ sport: 'football', position: 'Quarterback' });
  const [astronautAnswer, setAstronautAnswer] = useState(0);
  const [hustlerForm, setHustlerForm] = useState({ type: 'Street Performer', act: 'Breakdancing' });
  const [dealerCartel, setDealerCartel] = useState('Varicose Vixens');
  const [startupForm, setStartupForm] = useState({ industry: 'Brewery', investment: 25000 });

  // Crime Minigame States (murder, bank robbery, hitman, spy, mafia, dealer, hustler)
  const [crimeSubView, setCrimeSubView] = useState(null); // null | 'murder' | 'bankRobbery' | 'hitman' | 'spy'
  const [murderMethod, setMurderMethod] = useState(0);
  const [bankRobberyForm, setBankRobberyForm] = useState({ weapon: 0, disguise: 0, getaway: 0 });
  const [spyMission, setSpyMission] = useState('stealth');
  const [mafiaScareMethod, setMafiaScareMethod] = useState(0);
  const [dealerRunForm, setDealerRunForm] = useState({ pkg: 0, drop: 0 });
  const [selectedHitman, setSelectedHitman] = useState(0);
  const [buskMusic, setBuskMusic] = useState(0);
  const [spyFront, setSpyFront] = useState(null);
  const [carTheftTargets, setCarTheftTargets] = useState(null);
  const [burglaryForm, setBurglaryForm] = useState({ time: 1, entry: 0 });
  const [burglaryPuzzle, setBurglaryPuzzle] = useState(null); // active NumberLink board

  // Car / License / Garage state
  const [assetSubView, setAssetSubView] = useState(null); // null | 'dealer' | 'garage' | 'licenseQuiz'
  const [dealerStock, setDealerStock] = useState(null);
  const [licenseQuiz, setLicenseQuiz] = useState(null); // { kind, questions, qIndex, correct }
  const [carDriveModal, setCarDriveModal] = useState(null); // { incident, carName }

  // Mind & Body / Activities States
  const [mindBodyView, setMindBodyView] = useState(false); // 'Mind & Body' full-screen sub-view inside the Activities tab
  const [crimeView, setCrimeView] = useState(false); // 'Crime' full-screen sub-view inside the Activities tab
  const [activeActivitySubModal, setActiveActivitySubModal] = useState(null); // 'walk' | 'books' | 'diets' | 'martial_arts' | 'acting' | 'spa' | 'surgery' | 'lottery' | 'insufficient_funds'
  const [walkPace, setWalkPace] = useState('Normal');
  const [walkDuration, setWalkDuration] = useState('30 minutes');
  const [bookGenreFilter, setBookGenreFilter] = useState('All');
  const [selectedMartialArt, setSelectedMartialArt] = useState('Karate');
  const [insufficientFundsInfo, setInsufficientFundsInfo] = useState(null);

  function handleActivityOutcome(res, fallbackIcon = '✨') {
    if (!res) return;
    if (res.error === 'insufficient_funds') {
      setInsufficientFundsInfo({
        title: res.title || 'Insufficient Funds',
        cost: res.cost,
        balance: hero.bankBalance,
        message: res.message,
      });
      setActiveActivitySubModal('insufficient_funds');
      return;
    }

    if (res.error === 'age_restricted') {
      triggerFeedback(res.message);
      return;
    }

    if (res.state) {
      // No outcome modal: display the result directly in the Life Log
      const summaryBits = [];
      const d = res.statDeltas || {};
      if (d.health) summaryBits.push(`Health ${d.health > 0 ? '+' : ''}${d.health}%`);
      if (d.happiness) summaryBits.push(`Happiness ${d.happiness > 0 ? '+' : ''}${d.happiness}%`);
      if (d.smarts) summaryBits.push(`Smarts ${d.smarts > 0 ? '+' : ''}${d.smarts}%`);
      if (d.looks) summaryBits.push(`Looks ${d.looks > 0 ? '+' : ''}${d.looks}%`);
      if (res.winnings > 0) {
        summaryBits.push(`+$${res.winnings.toLocaleString()}`);
      } else if (res.paidBy && res.paidBy !== 'Self') {
        summaryBits.push(`Paid by ${res.paidBy}`);
      } else if (res.cost > 0) {
        summaryBits.push(`-$${res.cost.toLocaleString()}`);
      }
      const summary = summaryBits.length > 0 ? ` (${summaryBits.join(', ')})` : '';
      const decoratedText = res.message ? `${res.message}${summary}` : null;

      const logs = res.state.lifeLog || [];
      const first = logs[0];
      let nextLogs = logs;
      if (decoratedText && first && first.text === res.message) {
        // The engine already logged this outcome — enrich that entry with the stat/cost summary
        nextLogs = [{ ...first, text: decoratedText }, ...logs.slice(1)];
      } else if (decoratedText) {
        nextLogs = [{ age: hero.age, icon: fallbackIcon, text: decoratedText, category: 'mind_body' }, ...logs];
      }

      onUpdateState({ ...res.state, lifeLog: nextLogs });
    }

    // Return straight to the Life Log
    setActiveActivitySubModal(null);
    setActiveTab('feed');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function getJobListings() {
    if (cachedJobListings.length > 0) return cachedJobListings;
    const generated = generateJobListings(hero);
    setCachedJobListings(generated);
    return generated;
  }

  function getPartTimeListings() {
    if (cachedPartTimeListings.length > 0) return cachedPartTimeListings;
    const generated = generatePartTimeListings(hero);
    setCachedPartTimeListings(generated);
    return generated;
  }

  function handleApplyFullTime(listing) {
    const res = applyForJob(gameState, listing);
    if (!res.qualified) {
      triggerFeedback(res.message);
    } else {
      setInterviewState({ listing, question: res.interviewQuestion });
    }
  }

  function handleSelectInterviewChoice(choiceIndex) {
    if (!interviewState) return;
    const res = answerJobInterview(gameState, interviewState.listing, choiceIndex, interviewState.question);
    onUpdateState(res.state);
    triggerFeedback(res.message);
    setInterviewState(null);
    if (res.hired) {
      setCachedJobListings([]);
    }
  }

  function handleApplyPartTime(listing) {
    const res = applyForPartTimeJob(gameState, listing);
    if (!res.success) {
      triggerFeedback(res.message);
    } else {
      onUpdateState(res.state);
      triggerFeedback(res.message);
      setCachedPartTimeListings([]);
    }
  }

  function handleWorkHarder() {
    const res = workHarderAtJob(gameState);
    onUpdateState(res.state);
    triggerFeedback(res.message);
  }

  function handleAskRaise() {
    const res = askForRaise(gameState);
    onUpdateState(res.state);
    triggerFeedback(res.message);
  }

  function handleAskPromotion() {
    const res = askForPromotion(gameState);
    onUpdateState(res.state);
    triggerFeedback(res.message);
  }

  function handleSupervisorAction(action) {
    const res = interactWithSupervisor(action, gameState);
    onUpdateState(res.state);
    triggerFeedback(res.message);
    setSelectedSupervisor(null);
  }

  function handleCoworkerAction(action) {
    if (!selectedCoworker) return;
    const res = interactWithCoworker(selectedCoworker.id, action, gameState);
    onUpdateState(res.state);
    triggerFeedback(res.message);
    setSelectedCoworker(null);
  }

  function handleResign(isPartTime = false) {
    const msg = isPartTime ? 'Are you sure you want to quit your part-time job?' : 'Are you sure you want to resign from your career?';
    if (window.confirm(msg)) {
      const res = resignFromJob(gameState, isPartTime);
      onUpdateState(res.state);
      triggerFeedback(res.message);
    }
  }

  function handleRetire() {
    if (window.confirm('Are you sure you want to retire from your career? You will collect an annual pension.')) {
      const res = retireFromJob(gameState);
      onUpdateState(res.state);
      triggerFeedback(res.message);
    }
  }

  function triggerFeedback(msg) {
    if (!msg) return;
    setToast({
      id: Date.now(),
      icon: toastIconFor(msg),
      blocked: BLOCKED_RE.test(msg),
      text: shortenToastText(msg),
    });
  }

  // Popups stay vague on purpose — e.g. blocked actions say "You're too young."
  // instead of the full explanation.
  const BLOCKED_RE = /too young|must be at least|age_restricted/i;
  function toastIconFor(msg) {
    if (/passed away|whacked|retaliation/i.test(msg)) return '🪦';
    if (/arrest|busted|prison|parole/i.test(msg)) return '🚓';
    if (BLOCKED_RE.test(msg)) return '🚫';
    if (/enough money|insufficient|bank/.test(msg)) return '💸';
    return 'ℹ️';
  }
  function shortenToastText(msg) {
    const ageMatch = /(?:at least (\d+) years old|\(Age (\d+)\))/i.exec(msg);
    if (BLOCKED_RE.test(msg)) {
      const age = ageMatch ? ageMatch[1] || ageMatch[2] : null;
      return age ? `You're too young. (Age ${age}+)` : "You're too young.";
    }
    return msg.length > 110 ? `${msg.slice(0, 107)}…` : msg;
  }

  // Group life log entries by age
  const logsByAge = {};
  lifeLog.forEach(entry => {
    if (!logsByAge[entry.age]) logsByAge[entry.age] = [];
    logsByAge[entry.age].push(entry);
  });
  const sortedAges = Object.keys(logsByAge).map(Number).sort((a, b) => b - a);

  function handleAgeUp() {
    if (!gameState.hero?.alive) return; // deceased heroes can't age up
    const updated = ageUpLife(gameState);
    onUpdateState(updated);
  }

  function handleStudyHarder() {
    const res = studyHarder(gameState);
    onUpdateState(res.state);
    triggerFeedback(res.message);
  }

  function handleDropOut() {
    if (window.confirm('Are you sure you want to drop out of school?')) {
      const res = dropOutOfSchool(gameState);
      onUpdateState(res.state);
      triggerFeedback(res.message);
    }
  }

  function handleTeacherAction(action) {
    if (!selectedTeacher) return;
    const res = interactWithTeacher(selectedTeacher.id, action, gameState);
    onUpdateState(res.state);
    triggerFeedback(res.message);
    setSelectedTeacher(null);
  }

  function handleClassmateAction(action) {
    if (!selectedClassmate) return;
    const res = interactWithClassmate(selectedClassmate.id, action, gameState);
    onUpdateState(res.state);
    triggerFeedback(res.message);
    setSelectedClassmate(null);
  }

  function handleJoinActivity(actName) {
    const res = joinSchoolActivity(gameState, actName);
    onUpdateState(res.state);
    triggerFeedback(res.message);
  }

  function handleSchoolOutcome(res) {
    if (res?.state) onUpdateState(res.state);
    if (res?.message) triggerFeedback(res.message);
  }

  function handleLeaveActivity(actName) {
    const res = leaveSchoolActivity(gameState, actName);
    onUpdateState(res.state);
    triggerFeedback(res.message);
  }

  function handleJoinClique(cliqueName) {
    const res = joinSchoolClique(gameState, cliqueName);
    onUpdateState(res.state);
    triggerFeedback(res.message);
  }

  function handleApplyCollege(schoolType) {
    const res = applyToHigherEducation(gameState, schoolType, selectedMajor, selectedFunding);
    onUpdateState(res.state);
    triggerFeedback(res.message);
    if (res.state.hero.education?.currentSchool) {
      setHigherEdModalSchool(null);
    }
  }

  function handlePayLoans() {
    const debt = hero.education?.studentLoanDebt || 0;
    if (debt <= 0) return;
    const payment = Math.min(debt, hero.bankBalance);
    if (payment <= 0) {
      triggerFeedback('You do not have enough money to pay down your loans.');
      return;
    }
    const nextDebt = debt - payment;
    const nextBank = hero.bankBalance - payment;
    onUpdateState({
      ...gameState,
      hero: {
        ...hero,
        bankBalance: nextBank,
        education: {
          ...hero.education,
          studentLoanDebt: nextDebt,
        },
      },
      lifeLog: [
        {
          age: hero.age,
          icon: '💳',
          text: `I made a payment of $${payment.toLocaleString()} towards my student loans. Remaining balance: $${nextDebt.toLocaleString()}.`,
          category: 'financial',
        },
        ...lifeLog,
      ],
    });
    triggerFeedback(`You paid $${payment.toLocaleString()} towards your student loans!`);
  }

  function handleNPCAction(action) {
    if (!selectedNPC) return;
    const res = interactWithNPC(selectedNPC, action, gameState);

    // Apply stat changes to hero & NPC
    const nextHeroStats = {
      ...hero.stats,
      happiness: Math.max(0, Math.min(100, hero.stats.happiness + (res.happinessChange || 0))),
      smarts: Math.max(0, Math.min(100, hero.stats.smarts + (res.smartsChange || 0))),
    };

    const nextBank = hero.bankBalance + (res.moneyChange || 0);

    // Update relationship score on target NPC
    const nextRels = { ...relationships };
    if (selectedNPC.type === 'mother' && nextRels.mother) {
      nextRels.mother = {
        ...nextRels.mother,
        relationship: Math.max(0, Math.min(100, nextRels.mother.relationship + res.relationshipChange)),
      };
      setSelectedNPC(nextRels.mother);
    } else if (selectedNPC.type === 'father' && nextRels.father) {
      nextRels.father = {
        ...nextRels.father,
        relationship: Math.max(0, Math.min(100, nextRels.father.relationship + res.relationshipChange)),
      };
      setSelectedNPC(nextRels.father);
    } else if (selectedNPC.type === 'sibling' && nextRels.siblings) {
      nextRels.siblings = nextRels.siblings.map(s => {
        if (s.id === selectedNPC.id) {
          const updated = {
            ...s,
            relationship: Math.max(0, Math.min(100, s.relationship + res.relationshipChange)),
          };
          setSelectedNPC(updated);
          return updated;
        }
        return s;
      });
    } else if (selectedNPC.type === 'pet' && nextRels.pet) {
      nextRels.pet = {
        ...nextRels.pet,
        relationship: Math.max(0, Math.min(100, nextRels.pet.relationship + res.relationshipChange)),
      };
      setSelectedNPC(nextRels.pet);
    }

    const nextLogs = res.logEntry ? [res.logEntry, ...lifeLog] : lifeLog;

    onUpdateState({
      ...gameState,
      hero: {
        ...hero,
        stats: nextHeroStats,
        bankBalance: nextBank,
      },
      relationships: nextRels,
      lifeLog: nextLogs,
    });

    setToast({ id: Date.now(), icon: 'ℹ️', blocked: false, text: res.message });
  }

  const allFamilyList = [
    relationships.mother,
    relationships.father,
    ...(relationships.siblings || []),
    relationships.pet,
  ].filter(Boolean);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={onNewLife}
          className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700 cursor-pointer"
        >
          <span>🌱</span>
          <span>New Life</span>
        </button>

        <div className="text-center">
          <h1 className="text-sm font-extrabold tracking-wide text-white">{hero.fullName}</h1>
          <p className="text-[11px] font-semibold text-emerald-400">
            Age: {hero.age} • {hero.occupation}
          </p>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Bank</span>
          <span className="text-xs font-bold text-emerald-400">
            ${hero.bankBalance.toLocaleString()}
          </span>
        </div>
      </header>

      {/* ── Main Container ────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-lg flex-1 px-3 sm:px-4 py-4 space-y-4 pb-28">


        {/* Hero Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="shrink-0 flex items-center justify-center select-none" style={{ width: 80, height: 80 }}>
              <FacePreview
                gender={hero.gender}
                stage={getStageFromAge(hero.age)}
                sel={{ ...hero.appearance, stage: getStageFromAge(hero.age) }}
                size={80}
              />
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-white truncate">{hero.fullName}</h2>
              <p className="text-xs text-slate-400">
                {hero.gender === 'male' ? '♂️ Male' : '♀️ Female'} • Born in {hero.city}, {hero.country}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                🎂 {hero.birthday.formatted} ({hero.birthday.zodiac})
              </p>
            </div>
          </div>

          {/* 4 Iconic BitLife Stat Bars */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80">
            <StatBar
              label="Happiness"
              icon="😃"
              value={hero.stats.happiness}
              colorClass="bg-gradient-to-r from-amber-500 to-yellow-400"
            />
            <StatBar
              label="Health"
              icon="💚"
              value={hero.stats.health}
              colorClass="bg-gradient-to-r from-emerald-500 to-green-400"
            />
            <StatBar
              label="Smarts"
              icon="🧠"
              value={hero.stats.smarts}
              colorClass="bg-gradient-to-r from-blue-500 to-cyan-400"
            />
            <StatBar
              label="Looks"
              icon="✨"
              value={hero.stats.looks}
              colorClass="bg-gradient-to-r from-purple-500 to-pink-400"
            />
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-colors cursor-pointer
              ${activeTab === 'feed' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            📜 Log
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('relationships')}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1
              ${activeTab === 'relationships' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <span>👥 Relations</span>
            <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-300">
              {allFamilyList.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('occupation')}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1
              ${activeTab === 'occupation' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <span>{hero.education?.currentSchool ? '🏫 School' : '💼 Job'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('assets')}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-colors cursor-pointer
              ${activeTab === 'assets' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            💰 Assets
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('activities');
              setMindBodyView(false);
              setCrimeView(false);
              setCrimeSubView(null);
            }}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-colors cursor-pointer
              ${activeTab === 'activities' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            🧘 Activities
          </button>
        </div>

        {/* ── View: Life Log Feed ─────────────────────────────────── */}
        {activeTab === 'feed' && (
          <div className="space-y-4">
            {sortedAges.map(age => (
              <div key={age} className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-lg space-y-2.5">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-blue-400">
                    Age {age}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {age === 0 ? 'Infant' : `Year ${age}`}
                  </span>
                </div>

                <div className="space-y-2">
                  {logsByAge[age].map((item, idx) => (
                    <div key={item.id || idx} className="flex items-start gap-2.5 text-xs text-slate-200 leading-relaxed">
                      <span className="text-sm shrink-0 select-none">{item.icon}</span>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── View: Relationships ─────────────────────────────────── */}
        {activeTab === 'relationships' && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Family Members ({allFamilyList.length})
            </h3>

            <div className="space-y-2">
              {allFamilyList.map(npc => {
                const isPet = npc.type === 'pet';
                const name = isPet ? npc.name : npc.fullName;
                const subtitle = isPet
                  ? `${npc.animal} (${npc.breed}) • Age ${npc.age}`
                  : `${npc.relation} • Age ${npc.age} • ${npc.occupation}`;

                return (
                  <button
                    key={npc.id}
                    type="button"
                    onClick={() => setSelectedNPC(npc)}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 cursor-pointer transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <NpcAvatar npc={npc} size={50} />
                      <div>
                        <h4 className="text-sm font-bold text-white">{name}</h4>
                        <p className="text-[11px] text-slate-400">{subtitle}</p>
                      </div>
                    </div>

                    <div className="w-20 text-right">
                      <div className="text-[10px] text-slate-400 mb-1 font-semibold">
                        {npc.relationship}%
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full"
                          style={{ width: `${npc.relationship}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── View: School / Occupation ────────────────────────────── */}
        {activeTab === 'occupation' && (
          <div className="space-y-4">
            {hero.education?.currentSchool ? (
              /* Enrolled in School */
              <div className="space-y-4">
                <div className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-4 space-y-3 shadow-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-400">
                        {hero.education.currentSchool.type} School
                      </span>
                      <h3 className="text-lg font-bold text-white">{hero.education.currentSchool.name}</h3>
                      {hero.education.currentSchool.major && (
                        <p className="text-xs font-semibold text-emerald-400">
                          Major: {hero.education.currentSchool.major}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">
                        Year {hero.education.currentSchool.yearsAttended + 1} of {hero.education.currentSchool.totalYears} • Funding: {hero.education.currentSchool.funding}
                      </p>
                    </div>
                    <span className="text-3xl select-none">
                      {['University', 'Medical', 'Law', 'Business', 'Dental', 'Pharmacy', 'Veterinary', 'Nursing', 'Graduate'].includes(hero.education.currentSchool.type) ? '🎓' : '🏫'}
                    </span>
                  </div>

                  {/* Grades / Performance Bar */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-300">Academic Performance</span>
                      <span className={hero.education.currentSchool.performance >= 70 ? 'text-emerald-400' : hero.education.currentSchool.performance >= 45 ? 'text-amber-400' : 'text-red-400'}>
                        {hero.education.currentSchool.performance}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          hero.education.currentSchool.performance >= 70 ? 'bg-emerald-400' : hero.education.currentSchool.performance >= 45 ? 'bg-amber-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${hero.education.currentSchool.performance}%` }}
                      />
                    </div>
                  </div>

                  {/* Active Clique & Activities Tags */}
                  {(hero.education.clique || (hero.education.activities && hero.education.activities.length > 0) || hero.stats?.athleticism !== undefined) && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {hero.stats?.athleticism !== undefined && (
                        <span className="rounded-md bg-orange-950/60 border border-orange-500/40 px-2 py-0.5 text-[10px] font-bold text-orange-300">
                          🏋️ Athleticism: {hero.stats.athleticism}%
                        </span>
                      )}
                      {hero.stats?.popularity !== undefined && (
                        <span className="rounded-md bg-pink-950/60 border border-pink-500/40 px-2 py-0.5 text-[10px] font-bold text-pink-300">
                          📢 Popularity: {hero.stats.popularity}%
                        </span>
                      )}
                      {hero.education.clique && (
                        <span className="rounded-md bg-purple-950/60 border border-purple-500/40 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                          👥 Clique: {hero.education.clique}
                        </span>
                      )}
                      {hero.education.activities?.map(act => {
                        const role = hero.education.activityRoles?.[act];
                        return (
                          <span key={act} className="rounded-md bg-blue-950/60 border border-blue-500/40 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                            ⚽ {act}{role && role !== 'Member' ? ` · ${role === (findSchoolActivity(act)?.leaderTitle) ? '👑' : '⭐'}` : ''}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* School Action Menu */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleStudyHarder}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                  >
                    <span className="text-2xl select-none">📖</span>
                    <div>
                      <h4 className="text-xs font-bold text-white">Study Harder</h4>
                      <p className="text-[11px] text-slate-400">Boost performance & smarts</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowFacultyModal(true)}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                  >
                    <span className="text-2xl select-none">👩‍🏫</span>
                    <div>
                      <h4 className="text-xs font-bold text-white">Faculty & Teachers</h4>
                      <p className="text-[11px] text-slate-400">
                        {1 + (hero.education.currentSchool.teachers?.length || 0)} instructors
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowClassmatesModal(true)}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                  >
                    <span className="text-2xl select-none">🎒</span>
                    <div>
                      <h4 className="text-xs font-bold text-white">Classmates</h4>
                      <p className="text-[11px] text-slate-400">
                        {hero.education.currentSchool.classmates?.length || 0} students
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowActivitiesModal(true)}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                  >
                    <span className="text-2xl select-none">⚽</span>
                    <div>
                      <h4 className="text-xs font-bold text-white">Extracurriculars</h4>
                      <p className="text-[11px] text-slate-400">Sports & Clubs ({hero.education.activities?.length || 0} joined)</p>
                    </div>
                  </button>

                  {['Middle', 'High'].includes(hero.education.currentSchool.type) && (
                    <button
                      type="button"
                      onClick={() => setShowCliquesModal(true)}
                      className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                    >
                      <span className="text-2xl select-none">👥</span>
                      <div>
                        <h4 className="text-xs font-bold text-white">School Cliques</h4>
                        <p className="text-[11px] text-slate-400">
                          {hero.education.clique ? `Member of ${hero.education.clique}` : 'Browse 18 cliques'}
                        </p>
                      </div>
                    </button>
                  )}

                  {(hero.age >= 16 || ['University', 'Community', 'Medical', 'Law', 'Business', 'Dental', 'Pharmacy', 'Veterinary', 'Nursing', 'Graduate'].includes(hero.education.currentSchool.type)) && (
                    <button
                      type="button"
                      onClick={handleDropOut}
                      className="flex items-center gap-3 p-3.5 rounded-xl bg-red-950/20 border border-red-500/30 hover:border-red-500/60 hover:bg-red-950/40 cursor-pointer text-left transition-colors"
                    >
                      <span className="text-2xl select-none">🚪</span>
                      <div>
                        <h4 className="text-xs font-bold text-red-300">Drop Out</h4>
                        <p className="text-[11px] text-red-400/80">Leave school prematurely</p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            ) : hero.specialCareer ? (
              /* Active Special Career Dashboard */
              <div className="space-y-4">
                <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-b from-amber-950/20 to-slate-900/90 p-4 space-y-3 shadow-xl">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                        ⭐ Special Career • {hero.specialCareer.type.toUpperCase()}
                      </span>
                      <h3 className="text-xl font-black text-white">{hero.specialCareer.title}</h3>
                      <p className="text-xs font-semibold text-slate-300">
                        {hero.specialCareer.organization}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Earnings: <span className="text-emerald-400 font-bold">${hero.specialCareer.salary.toLocaleString()}/yr</span> • {hero.specialCareer.yearsActive || 0} yrs active
                      </p>
                    </div>
                    <span className="text-4xl select-none">
                      {hero.specialCareer.type === 'politician' ? '🏛️' :
                       hero.specialCareer.type === 'mafia' ? '🕶️' :
                       hero.specialCareer.type === 'musician' ? '🎸' :
                       hero.specialCareer.type === 'actor' ? '🎬' :
                       hero.specialCareer.type === 'athlete' ? '🏆' :
                       hero.specialCareer.type === 'model' ? '👠' :
                       hero.specialCareer.type === 'astronaut' ? '🚀' :
                       hero.specialCareer.type === 'hustler' ? '🪙' :
                       hero.specialCareer.type === 'dealer' ? '💊' : '🏢'}
                    </span>
                  </div>

                  {/* Standing & Fame Bars */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-300">
                          {hero.specialCareer.type === 'politician' ? 'Approval' :
                           hero.specialCareer.type === 'mafia' ? 'Mob Respect' :
                           hero.specialCareer.type === 'musician' ? 'Band Chemistry' :
                           hero.specialCareer.type === 'athlete' ? 'Performance' :
                           hero.specialCareer.type === 'astronaut' ? 'Readiness' :
                           hero.specialCareer.type === 'hustler' ? 'Hustle Skill' :
                           hero.specialCareer.type === 'dealer' ? 'Cartel Respect' : 'Reputation'}
                        </span>
                        <span className="text-emerald-400 font-extrabold">{hero.specialCareer.standing}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full bg-emerald-400 transition-all duration-300" style={{ width: `${hero.specialCareer.standing}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-300">
                          {hero.specialCareer.type === 'mafia' ? 'Notoriety' : 'Fame'}
                        </span>
                        <span className="text-amber-400 font-extrabold">
                          {hero.specialCareer.type === 'mafia' ? (hero.specialCareer.notoriety || 30) : (hero.specialCareer.fame || 0)}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full bg-amber-400 transition-all duration-300"
                          style={{ width: `${hero.specialCareer.type === 'mafia' ? (hero.specialCareer.notoriety || 30) : (hero.specialCareer.fame || 0)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Career Actions Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  {hero.specialCareer.type === 'politician' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const res = politicianCampaignSpeech(gameState);
                          onUpdateState(res.state);
                          triggerFeedback(res.message);
                        }}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                      >
                        <span className="text-2xl select-none">🎤</span>
                        <div>
                          <h4 className="text-xs font-bold text-white">Public Rally</h4>
                          <p className="text-[11px] text-slate-400">Give campaign speech</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSpecialActionModal('pass_law')}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                      >
                        <span className="text-2xl select-none">📜</span>
                        <div>
                          <h4 className="text-xs font-bold text-white">Pass Legislation</h4>
                          <p className="text-[11px] text-slate-400">Sign a new bill</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const res = politicianSpreadRumor(gameState);
                          onUpdateState(res.state);
                          triggerFeedback(res.message);
                        }}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                      >
                        <span className="text-2xl select-none">🗣️</span>
                        <div>
                          <h4 className="text-xs font-bold text-white">Leak Rumor</h4>
                          <p className="text-[11px] text-slate-400">Oppo research smear</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const res = politicianMeetLobbyist(gameState);
                          onUpdateState(res.state);
                          triggerFeedback(res.message);
                        }}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                      >
                        <span className="text-2xl select-none">💼</span>
                        <div>
                          <h4 className="text-xs font-bold text-white">Lobbyist Meeting</h4>
                          <p className="text-[11px] text-slate-400">Special interest offers</p>
                        </div>
                      </button>
                    </>
                  )}

                  {hero.specialCareer.type === 'mafia' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSpecialActionModal('push_crime')}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-red-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                      >
                        <span className="text-2xl select-none">🔫</span>
                        <div>
                          <h4 className="text-xs font-bold text-white">Push Crime</h4>
                          <p className="text-[11px] text-slate-400">Perform mob contract</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSpecialActionModal('extort')}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-red-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                      >
                        <span className="text-2xl select-none">💼</span>
                        <div>
                          <h4 className="text-xs font-bold text-white">Extortion</h4>
                          <p className="text-[11px] text-slate-400">Shake down local shops</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSpecialActionModal('whack')}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-red-950/30 border border-red-500/40 hover:bg-red-950/50 cursor-pointer text-left transition-colors"
                      >
                        <span className="text-2xl select-none">💀</span>
                        <div>
                          <h4 className="text-xs font-bold text-red-300">Whack Traitor</h4>
                          <p className="text-[11px] text-red-400/80">Mob execution hit</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSpecialActionModal('mafia_scare')}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-red-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                      >
                        <span className="text-2xl select-none">😱</span>
                        <div>
                          <h4 className="text-xs font-bold text-white">Intimidate</h4>
                          <p className="text-[11px] text-slate-400">Scare a target into paying</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSpecialActionModal('mafia_temptation')}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                      >
                        <span className="text-2xl select-none">🤫</span>
                        <div>
                          <h4 className="text-xs font-bold text-white">Opportunity</h4>
                          <p className="text-[11px] text-slate-400">Skim... or stay loyal?</p>
                        </div>
                      </button>
                    </>
                  )}

                  {hero.specialCareer.type === 'musician' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSpecialActionModal('release_album')}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                      >
                        <span className="text-2xl select-none">💿</span>
                        <div>
                          <h4 className="text-xs font-bold text-white">Release Album</h4>
                          <p className="text-[11px] text-slate-400">Cut new studio record</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const res = musicGoOnTour(gameState);
                          onUpdateState(res.state);
                          triggerFeedback(res.message);
                        }}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                      >
                        <span className="text-2xl select-none">🎤</span>
                        <div>
                          <h4 className="text-xs font-bold text-white">World Tour</h4>
                          <p className="text-[11px] text-slate-400">Perform in arenas</p>
                        </div>
                      </button>
                    </>
                  )}

                  {hero.specialCareer.type === 'actor' && (
                    <button
                      type="button"
                      onClick={() => setSpecialActionModal('actor_audition')}
                      className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                    >
                      <span className="text-2xl select-none">🎬</span>
                      <div>
                        <h4 className="text-xs font-bold text-white">Film Audition</h4>
                        <p className="text-[11px] text-slate-400">Try out for film roles</p>
                      </div>
                    </button>
                  )}

                  {hero.specialCareer.type === 'athlete' && (
                    <button
                      type="button"
                      onClick={() => {
                        const res = athletePractice(gameState);
                        onUpdateState(res.state);
                        triggerFeedback(res.message);
                      }}
                      className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                    >
                      <span className="text-2xl select-none">🏋️</span>
                      <div>
                        <h4 className="text-xs font-bold text-white">Drills & Practice</h4>
                        <p className="text-[11px] text-slate-400">Boost fitness & skill</p>
                      </div>
                    </button>
                  )}

                  {hero.specialCareer.type === 'model' && (
                    <button
                      type="button"
                      onClick={() => setSpecialActionModal('model_gig')}
                      className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                    >
                      <span className="text-2xl select-none">📸</span>
                      <div>
                        <h4 className="text-xs font-bold text-white">Book Photoshoot</h4>
                        <p className="text-[11px] text-slate-400">Complete modeling gig</p>
                      </div>
                    </button>
                  )}

                  {hero.specialCareer.type === 'astronaut' && (
                    <button
                      type="button"
                      onClick={() => setSpecialActionModal('space_mission')}
                      className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                    >
                      <span className="text-2xl select-none">🚀</span>
                      <div>
                        <h4 className="text-xs font-bold text-white">Space Mission</h4>
                        <p className="text-[11px] text-slate-400">Launch into orbit</p>
                      </div>
                    </button>
                  )}

                  {hero.specialCareer.type === 'hustler' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const res = streetHustleAction(gameState);
                          onUpdateState(res.state);
                          triggerFeedback(res.message);
                        }}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                      >
                        <span className="text-2xl select-none">🪙</span>
                        <div>
                          <h4 className="text-xs font-bold text-white">Work Sidewalk</h4>
                          <p className="text-[11px] text-slate-400">Collect tips from passersby</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSpecialActionModal('hustler_busk')}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                      >
                        <span className="text-2xl select-none">🎻</span>
                        <div>
                          <h4 className="text-xs font-bold text-white">Busk</h4>
                          <p className="text-[11px] text-slate-400">Pick music, gear & attire</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSpecialActionModal('hustler_scam')}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                      >
                        <span className="text-2xl select-none">🎭</span>
                        <div>
                          <h4 className="text-xs font-bold text-white">Run a Scam</h4>
                          <p className="text-[11px] text-slate-400">Con a fresh mark</p>
                        </div>
                      </button>
                    </>
                  )}

                  {hero.specialCareer.type === 'dealer' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSpecialActionModal('dealer_sell')}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                      >
                        <span className="text-2xl select-none">💊</span>
                        <div>
                          <h4 className="text-xs font-bold text-white">Move Product</h4>
                          <p className="text-[11px] text-slate-400">Sell package on corner</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSpecialActionModal('dealer_run')}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                      >
                        <span className="text-2xl select-none">📦</span>
                        <div>
                          <h4 className="text-xs font-bold text-white">Drug Run</h4>
                          <p className="text-[11px] text-slate-400">Move a big shipment</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const res = dealerCutDrugs(gameState, 2);
                          onUpdateState(res.state);
                          triggerFeedback(res.message);
                        }}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                      >
                        <span className="text-2xl select-none">🧪</span>
                        <div>
                          <h4 className="text-xs font-bold text-white">Cut the Product</h4>
                          <p className="text-[11px] text-slate-400">Stretch inventory, raise heat</p>
                        </div>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const res = leaveSpecialCareer(gameState);
                      onUpdateState(res.state);
                      triggerFeedback(res.message);
                    }}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-red-950/20 border border-red-500/30 hover:border-red-500/60 hover:bg-red-950/40 cursor-pointer text-left transition-colors"
                  >
                    <span className="text-2xl select-none">🚪</span>
                    <div>
                      <h4 className="text-xs font-bold text-red-300">Walk Away</h4>
                      <p className="text-[11px] text-red-400/80">Leave this career</p>
                    </div>
                  </button>
                </div>
              </div>
            ) : hero.job ? (
              /* Employed at Full-Time Career */
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-3 shadow-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                        {hero.job.companyType || 'Corporate'} Career
                      </span>
                      <h3 className="text-lg font-bold text-white">{hero.job.title}</h3>
                      <p className="text-xs font-semibold text-slate-300">
                        {hero.job.companyName}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Salary: <span className="text-emerald-400 font-bold">${hero.job.salary.toLocaleString()}/yr</span> • {hero.job.yearsAtCompany} years with company
                      </p>
                    </div>
                    <span className="text-3xl select-none">🏢</span>
                  </div>

                  {/* Performance & Stress Bars */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-300">Performance</span>
                        <span className={hero.job.performance >= 70 ? 'text-emerald-400' : 'text-amber-400'}>
                          {hero.job.performance}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${hero.job.performance >= 70 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                          style={{ width: `${hero.job.performance}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-300">Stress</span>
                        <span className="text-red-400">{hero.job.stress || 20}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-400 transition-all duration-300"
                          style={{ width: `${hero.job.stress || 20}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Career Action Menu */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleWorkHarder}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                  >
                    <span className="text-2xl select-none">💼</span>
                    <div>
                      <h4 className="text-xs font-bold text-white">Work Harder</h4>
                      <p className="text-[11px] text-slate-400">Put in extra hours</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleAskRaise}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                  >
                    <span className="text-2xl select-none">📈</span>
                    <div>
                      <h4 className="text-xs font-bold text-white">Ask for a Raise</h4>
                      <p className="text-[11px] text-slate-400">Request higher salary</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleAskPromotion}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                  >
                    <span className="text-2xl select-none">🏆</span>
                    <div>
                      <h4 className="text-xs font-bold text-white">Ask for Promotion</h4>
                      <p className="text-[11px] text-slate-400">Advance on seniority track</p>
                    </div>
                  </button>

                  {hero.job.supervisor && (
                    <button
                      type="button"
                      onClick={() => setSelectedSupervisor(hero.job.supervisor)}
                      className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                    >
                      <NpcAvatar npc={hero.job.supervisor} size={38} />
                      <div>
                        <h4 className="text-xs font-bold text-white">Supervisor</h4>
                        <p className="text-[11px] text-slate-400">{hero.job.supervisor.fullName} ({hero.job.supervisor.relationship}%)</p>
                      </div>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowCoworkersModal(true)}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 cursor-pointer text-left transition-colors"
                  >
                    <span className="text-2xl select-none">👥</span>
                    <div>
                      <h4 className="text-xs font-bold text-white">Coworkers</h4>
                      <p className="text-[11px] text-slate-400">{hero.job.coworkers?.length || 0} colleagues</p>
                    </div>
                  </button>

                  {hero.age >= 62 && (
                    <button
                      type="button"
                      onClick={handleRetire}
                      className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/40 hover:bg-emerald-950/40 cursor-pointer text-left transition-colors"
                    >
                      <span className="text-2xl select-none">🌴</span>
                      <div>
                        <h4 className="text-xs font-bold text-emerald-300">Retire</h4>
                        <p className="text-[11px] text-emerald-400/80">Collect annual pension</p>
                      </div>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleResign(false)}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-red-950/20 border border-red-500/30 hover:border-red-500/60 hover:bg-red-950/40 cursor-pointer text-left transition-colors"
                  >
                    <span className="text-2xl select-none">🚪</span>
                    <div>
                      <h4 className="text-xs font-bold text-red-300">Resign</h4>
                      <p className="text-[11px] text-red-400/80">Leave this job</p>
                    </div>
                  </button>
                </div>

                {/* Optional Part-time Job */}
                {hero.partTimeJob && (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">Part-Time Job</span>
                        <h4 className="text-sm font-bold text-white">{hero.partTimeJob.title}</h4>
                        <p className="text-xs text-slate-400">{hero.partTimeJob.companyName} • ${hero.partTimeJob.hourlyRate}/hr</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleResign(true)}
                        className="px-2.5 py-1 rounded bg-slate-800 text-[10px] font-bold text-red-400 hover:bg-slate-700 cursor-pointer"
                      >
                        Quit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Unemployed / Looking for Job or School */
              <div className="space-y-4">
                {hero.age < 14 ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center space-y-2">
                    <span className="text-4xl block select-none">👶</span>
                    <h3 className="text-base font-bold text-white">Early Childhood</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      You are only {hero.age} years old! You are too young to work. Part-time jobs unlock at age 14, and full-time careers unlock at age 18.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Career Status Header */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Status</span>
                          <h3 className="text-base font-bold text-white">{hero.occupation}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Highest Education: <span className="text-emerald-400 font-semibold">{hero.education?.highestCompleted || 'None'}</span>
                          </p>
                        </div>
                        <span className="text-3xl select-none">💼</span>
                      </div>

                      {/* Pension if retired */}
                      {(hero.pension || 0) > 0 && (
                        <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                          <span className="text-[10px] uppercase font-bold text-emerald-400 block">Annual Pension</span>
                          <span className="text-sm font-extrabold text-emerald-300">${hero.pension.toLocaleString()}/yr</span>
                        </div>
                      )}

                      {/* Student Loans Notice */}
                      {(hero.education?.studentLoanDebt || 0) > 0 && (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-red-950/30 border border-red-500/30">
                          <div>
                            <span className="text-[10px] font-bold text-red-300 block uppercase">Student Loan Debt</span>
                            <span className="text-sm font-extrabold text-red-400">
                              ${hero.education.studentLoanDebt.toLocaleString()}
                            </span>
                          </div>
                          {hero.bankBalance > 0 && (
                            <button
                              type="button"
                              onClick={handlePayLoans}
                              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
                            >
                              Pay Off
                            </button>
                          )}
                        </div>
                      )}

                      {/* Completed Degrees */}
                      {hero.education?.degrees?.length > 0 && (
                        <div className="pt-2 border-t border-slate-800 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Earned Degrees ({hero.education.degrees.length})
                          </span>
                          <div className="space-y-1">
                            {hero.education.degrees.map((deg, i) => (
                              <div key={i} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-slate-800/60">
                                <span className="font-semibold text-slate-200">🎓 {deg.name}</span>
                                <span className="text-slate-400 text-[11px]">Age {deg.year}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Job Center Sub-Tabs */}
                    <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
                      {hero.age >= 18 && (
                        <button
                          type="button"
                          onClick={() => setJobSubTab('full_time')}
                          className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-colors cursor-pointer
                            ${jobSubTab === 'full_time' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          💼 Careers
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setJobSubTab('part_time')}
                        className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-colors cursor-pointer
                          ${jobSubTab === 'part_time' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      >
                        ⏱️ Part-Time
                      </button>
                      {hero.age >= 18 && (
                        <button
                          type="button"
                          onClick={() => setJobSubTab('higher_ed')}
                          className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-colors cursor-pointer
                            ${jobSubTab === 'higher_ed' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          🏛️ College
                        </button>
                      )}
                      {hero.age >= 15 && (
                        <button
                          type="button"
                          onClick={() => setJobSubTab('special')}
                          className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-colors cursor-pointer
                            ${jobSubTab === 'special' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          ⭐ Special
                        </button>
                      )}
                    </div>

                    {/* Full-Time Career Listings */}
                    {jobSubTab === 'full_time' && hero.age >= 18 && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between px-1">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Available Career Listings</h4>
                          <button
                            type="button"
                            onClick={() => {
                              setCachedJobListings(generateJobListings(hero));
                              triggerFeedback('Refreshed job openings!');
                            }}
                            className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                          >
                            🔄 Refresh
                          </button>
                        </div>

                        <div className="space-y-2">
                          {getJobListings().map(listing => (
                            <div
                              key={listing.id}
                              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
                            >
                              <div className="min-w-0 flex-1 pr-3">
                                <h4 className="text-xs font-bold text-white truncate">{listing.title}</h4>
                                <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                                  ${listing.salary.toLocaleString()}/yr • {listing.companyName}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  Req: {listing.education} {listing.major?.length > 0 ? `(${listing.major.slice(0, 2).join(', ')})` : ''}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleApplyFullTime(listing)}
                                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors shrink-0 shadow"
                              >
                                Apply
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Part-Time Job Listings */}
                    {jobSubTab === 'part_time' && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between px-1">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Part-Time Jobs (Age {hero.age})</h4>
                          <button
                            type="button"
                            onClick={() => {
                              setCachedPartTimeListings(generatePartTimeListings(hero));
                              triggerFeedback('Refreshed part-time jobs!');
                            }}
                            className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                          >
                            🔄 Refresh
                          </button>
                        </div>

                        <div className="space-y-2">
                          {getPartTimeListings().map(listing => (
                            <div
                              key={listing.id}
                              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
                            >
                              <div>
                                <h4 className="text-xs font-bold text-white">{listing.title}</h4>
                                <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                                  ${listing.hourlyRate}/hr • {listing.weeklyHours} hrs/wk (${listing.annualEarnings.toLocaleString()}/yr)
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{listing.companyName}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleApplyPartTime(listing)}
                                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer transition-colors shrink-0"
                              >
                                Apply
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Higher Education Center */}
                    {jobSubTab === 'higher_ed' && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Universities & Graduate Schools</h4>
                        <div className="space-y-2">
                          {educationData.colleges.map(col => {
                            const requiresDegree = col.school !== 'Undergraduate' && col.school !== 'Community';
                            const hasUndergrad = !!hero.education?.undergraduateMajor;
                            const meetsPrereq = !requiresDegree || (hasUndergrad && (col.prerequisites.length === 0 || col.prerequisites.includes(hero.education.undergraduateMajor)));

                            return (
                              <button
                                key={col.school}
                                type="button"
                                onClick={() => setHigherEdModalSchool(col.school)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left cursor-pointer transition-colors
                                  ${meetsPrereq ? 'bg-slate-850/80 border-slate-750 hover:border-blue-500/60 hover:bg-slate-800' : 'bg-slate-900/40 border-slate-800/50 opacity-60'}`}
                              >
                                <div>
                                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                                    <span>{col.school === 'Medical' ? '🩺' : col.school === 'Law' ? '⚖️' : col.school === 'Business' ? '💼' : '🏛️'}</span>
                                    <span>{col.school === 'Undergraduate' ? 'University (Undergraduate)' : `${col.school} School`}</span>
                                  </h4>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    {col.years} Years • ${col.tuition.toLocaleString()}/yr
                                    {col.prerequisites.length > 0 && ` • Req: ${col.prerequisites.slice(0, 3).join(', ')}`}
                                  </p>
                                </div>
                                <span className="text-xs font-bold text-blue-400">Apply →</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Special Career Options */}
                    {jobSubTab === 'special' && (
                      <div className="space-y-3">
                        <div className="px-1">
                          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">⭐ Special Careers</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">Pursue high-profile, extraordinary BitLife career paths.</p>
                        </div>

                        <div className="space-y-2">
                          {/* Politician */}
                          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl select-none">🏛️</span>
                              <div>
                                <h4 className="text-xs font-bold text-white">Politician</h4>
                                <p className="text-[11px] text-slate-400">School Board, Mayor, Governor, President (Age 18+)</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSpecialCareerModal('politician')}
                              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer"
                            >
                              Run →
                            </button>
                          </div>

                          {/* Mafia */}
                          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-red-500/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl select-none">🕶️</span>
                              <div>
                                <h4 className="text-xs font-bold text-white">Mafia Syndicate</h4>
                                <p className="text-[11px] text-slate-400">Sicilian Mafia, Yakuza, Cartels, Triad (Age 18+)</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSpecialCareerModal('mafia')}
                              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
                            >
                              Join →
                            </button>
                          </div>

                          {/* Musician */}
                          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl select-none">🎸</span>
                              <div>
                                <h4 className="text-xs font-bold text-white">Musician</h4>
                                <p className="text-[11px] text-slate-400">Solo artist or Rock/Pop/Rap band (Age 16+)</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSpecialCareerModal('musician')}
                              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer"
                            >
                              Sign →
                            </button>
                          </div>

                          {/* Actor */}
                          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl select-none">🎬</span>
                              <div>
                                <h4 className="text-xs font-bold text-white">Actor</h4>
                                <p className="text-[11px] text-slate-400">Audition for Hollywood movies (Age 18+)</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSpecialCareerModal('actor')}
                              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer"
                            >
                              Audition →
                            </button>
                          </div>

                          {/* Pro Athlete */}
                          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl select-none">🏆</span>
                              <div>
                                <h4 className="text-xs font-bold text-white">Pro Athlete</h4>
                                <p className="text-[11px] text-slate-400">Football, Basketball, Soccer, Baseball (Age 18-28)</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSpecialCareerModal('athlete')}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                            >
                              Draft →
                            </button>
                          </div>

                          {/* Model */}
                          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-pink-500/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl select-none">👠</span>
                              <div>
                                <h4 className="text-xs font-bold text-white">Model</h4>
                                <p className="text-[11px] text-slate-400">Elite agency runway & magazine modeling (Age 18+, Looks 60+)</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSpecialCareerModal('model')}
                              className="px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold cursor-pointer"
                            >
                              Audition →
                            </button>
                          </div>

                          {/* Astronaut */}
                          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl select-none">🚀</span>
                              <div>
                                <h4 className="text-xs font-bold text-white">Astronaut</h4>
                                <p className="text-[11px] text-slate-400">Space Agency academy & missions (Age 21+, Smarts 60+)</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSpecialCareerModal('astronaut')}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                            >
                              Exam →
                            </button>
                          </div>

                          {/* Street Hustler */}
                          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl select-none">🪙</span>
                              <div>
                                <h4 className="text-xs font-bold text-white">Street Hustler</h4>
                                <p className="text-[11px] text-slate-400">Panhandling, busking, & street scams (Age 15+)</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSpecialCareerModal('hustler')}
                              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer"
                            >
                              Hustle →
                            </button>
                          </div>

                          {/* Dealer */}
                          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl select-none">💊</span>
                              <div>
                                <h4 className="text-xs font-bold text-white">Cartel Dealer</h4>
                                <p className="text-[11px] text-slate-400">Street Dealing to Cartel Kingpin (Age 16+)</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSpecialCareerModal('dealer')}
                              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer"
                            >
                              Deal →
                            </button>
                          </div>

                          {/* Startup CEO */}
                          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl select-none">🏢</span>
                              <div>
                                <h4 className="text-xs font-bold text-white">Startup CEO</h4>
                                <p className="text-[11px] text-slate-400">Found and capitalize your own enterprise (Age 18+)</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSpecialCareerModal('business')}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                            >
                              Incorporate →
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── View: Assets ────────────────────────────────────────── */}
        {activeTab === 'assets' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Financial Summary</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-750">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Bank Balance</span>
                  <span className="text-base font-extrabold text-emerald-400">${hero.bankBalance.toLocaleString()}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-750">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Student Loan Debt</span>
                  <span className="text-base font-extrabold text-red-400">${(hero.education?.studentLoanDebt || 0).toLocaleString()}</span>
                </div>
              </div>

              {(hero.education?.studentLoanDebt || 0) > 0 && hero.bankBalance > 0 && (
                <button
                  type="button"
                  onClick={handlePayLoans}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  Pay Down Loans (${Math.min(hero.education.studentLoanDebt, hero.bankBalance).toLocaleString()})
                </button>
              )}
            </div>

            {/* ── Garage & Dealer & Licenses tiles ── */}
            {!assetSubView && (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const r = refreshCarDealership(gameState);
                      if (r.state) onUpdateState(r.state);
                      if (r.stock) setDealerStock(r.stock);
                      setAssetSubView('dealer');
                    }}
                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 text-left transition-all cursor-pointer flex flex-col gap-1.5"
                  >
                    <span className="text-2xl select-none">🚘</span>
                    <h5 className="text-xs font-bold text-white">Car Dealer</h5>
                    <p className="text-[10px] text-slate-500">New & used shipments</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssetSubView('garage')}
                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 text-left transition-all cursor-pointer flex flex-col gap-1.5"
                  >
                    <span className="text-2xl select-none">{(hero.cars || []).length ? '🚗' : '🏚️'}</span>
                    <h5 className="text-xs font-bold text-white">Garage</h5>
                    <p className="text-[10px] text-slate-500">{(hero.cars || []).length} vehicle{(hero.cars || []).length === 1 ? '' : 's'} owned</p>
                  </button>
                </div>

                {/* License cards */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Licenses</span>
                    <img src="/cars/license/emoji-Drivers-License_silver.png" alt="license" className="h-8 w-auto" />
                  </h3>
                  {[
                    { kind: 'car', minAge: 16, icon: '🪪', name: "Driver's License", desc: '30-question road-sign test' },
                    { kind: 'boat', minAge: 18, icon: '⛵', name: 'Boating License', desc: 'Watercraft safety exam' },
                    { kind: 'plane', minAge: 18, icon: '✈️', name: "Pilot's License", desc: 'Aviation basics exam' },
                  ].map(l => {
                    const held = (hero.licenses || {})[l.kind];
                    const locked = hero.age < l.minAge;
                    return (
                      <div key={l.kind} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-750">
                        <span className="text-xl select-none">{l.icon}</span>
                        <div className="flex-1">
                          <h5 className="text-xs font-bold text-white">{l.name}</h5>
                          <p className="text-[10px] text-slate-400">
                            {held ? `${l.desc} — passed at age ${held.year}` : l.desc}
                          </p>
                        </div>
                        {held ? (
                          <img src={`/cars/license/emoji-Drivers-License_${held.tier}.png`} alt={held.tier} className="h-7 w-auto" title={`${held.tier} ${l.kind} license`} />
                        ) : (
                          <button
                            type="button"
                            disabled={locked || !!hero.prison}
                            onClick={async () => {
                              const r = getLicenseQuiz(gameState, l.kind);
                              if (r.quiz) {
                                setLicenseQuiz({ kind: l.kind, questions: r.quiz.questions, qIndex: 0, correct: 0 });
                                setAssetSubView('licenseQuiz');
                              } else if (r.message) triggerFeedback(r.message);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            {locked ? `Age ${l.minAge}+` : 'Take Test'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── Car Dealership stock ── */}
            {assetSubView === 'dealer' && dealerStock && (
              <div className="space-y-3">
                <div className="px-1 flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2"><span>🚘</span><span>Dealership</span></h3>
                  <button
                    type="button"
                    onClick={() => { const r = refreshCarDealership(gameState); if (r.state) onUpdateState(r.state); if (r.stock) setDealerStock(r.stock); }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-[10px] font-bold cursor-pointer"
                  >
                    🔄 New Shipment
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {dealerStock.map((c, i) => {
                    const afford = hero.bankBalance >= c.price;
                    return (
                      <div key={i} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex gap-3">
                        <img src={carSpriteFor(c)} alt={`${c.make} ${c.model}`} className="w-16 h-16 object-contain shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-bold text-white truncate">{c.make} {c.model}</h5>
                          <p className="text-[10px] text-slate-400">{c.new ? 'Brand-new' : `Used (${c.usedYears} yrs)`} • {c.type} • Condition {c.condition}%</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">
                            Cool {'●'.repeat(c.cool || 1)}{'○'.repeat(5 - (c.cool || 1))} • Reliability {'●'.repeat(c.reliability || 1)}{'○'.repeat(5 - (c.reliability || 1))}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <span className={`text-[11px] font-extrabold ${afford ? 'text-emerald-400' : 'text-red-400'}`}>${c.price.toLocaleString()}</span>
                            <button
                              type="button"
                              disabled={!afford || hero.age < 16}
                              onClick={() => {
                                const res = buyCar(gameState, i);
                                if (res.state) onUpdateState(res.state);
                                triggerFeedback(res.message);
                                if (res.success) setDealerStock(prev => (prev || []).filter((_, j) => j !== i));
                              }}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[10px] font-bold cursor-pointer transition-colors"
                            >
                              Buy
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setAssetSubView(null)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
                >
                  ← Back to Assets
                </button>
              </div>
            )}

            {/* ── Garage: owned cars ── */}
            {assetSubView === 'garage' && (
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2 px-1"><span>🚗</span><span>Your Garage</span></h3>
                {!(hero.cars || []).length && (
                  <p className="text-[11px] text-slate-400 px-1">Empty garage. Visit the Car Dealer (or steal one…).</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(hero.cars || []).map((c, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex gap-3">
                      <img src={carSpriteFor(c)} alt={`${c.make} ${c.model}`} className="w-16 h-16 object-contain shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-bold text-white truncate">
                          {c.make} {c.model} {c.stolen && <span className="text-red-400">🩸stolen</span>}
                        </h5>
                        <p className="text-[10px] text-slate-400">{c.type} • Condition {c.condition || 100}% • owned since {c.ownedSince}</p>
                        <div className="flex gap-1.5 mt-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const r = startCarDriveEvent(gameState, i);
                              if (r.state) { onUpdateState(r.state); triggerFeedback(r.message); }
                              else if (r.incident) setCarDriveModal({ incident: r.incident, carName: r.carName });
                              else if (r.message && !r.state) triggerFeedback(r.message);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            🛣️ Drive
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const res = sellCar(gameState, i);
                              if (res.state) onUpdateState(res.state);
                              triggerFeedback(res.message);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            💵 Sell
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setAssetSubView(null)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
                >
                  ← Back to Assets
                </button>
              </div>
            )}

            {/* ── License quiz ── */}
            {assetSubView === 'licenseQuiz' && licenseQuiz && (
              <div className="space-y-3">
                {(() => {
                  const q = licenseQuiz.questions[licenseQuiz.qIndex];
                  const done = licenseQuiz.qIndex >= licenseQuiz.questions.length;
                  if (done) return null;
                  const isCar = licenseQuiz.kind === 'car';
                  const imgIdx = licenseQuiz.questions[licenseQuiz.qIndex].index;
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">
                          {licenseQuiz.kind} test — Q{licenseQuiz.qIndex + 1}/{licenseQuiz.questions.length}
                        </span>
                        <span className="text-[11px] text-emerald-400 font-bold">✔ {licenseQuiz.correct} correct</span>
                      </div>
                      {isCar && (
                        <div className="flex justify-center">
                          <img src={`/cars/license/roadSign${imgIdx}.png`} alt="road sign" className="h-36 w-auto rounded-xl bg-slate-800/50 p-2" />
                        </div>
                      )}
                      <p className="text-xs text-white font-bold text-center px-2">
                        {isCar ? 'What does this sign mean?' : q.prompt}
                      </p>
                      {q.options.map((o, oi) => (
                        <button
                          key={oi}
                          type="button"
                          onClick={() => {
                            const right = o.correct ? licenseQuiz.correct + 1 : licenseQuiz.correct;
                            const nextQ = licenseQuiz.qIndex + 1;
                            if (nextQ >= licenseQuiz.questions.length) {
                              const res = submitLicenseTest(gameState, licenseQuiz.kind, right);
                              triggerFeedback(res.message);
                              if (res.state) onUpdateState(res.state);
                              setLicenseQuiz(null);
                              setAssetSubView(null);
                            } else {
                              setLicenseQuiz({ ...licenseQuiz, qIndex: nextQ, correct: right });
                            }
                          }}
                          className="w-full p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 text-left text-xs font-bold text-white cursor-pointer transition-colors"
                        >
                          {o.text}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* ── View: Activities (Dedicated Full Screen BitLife Hub) ── */}
        {activeTab === 'activities' && (
          <div className="space-y-4">
            {/* ── Hub view: category launcher ─────────────────────── */}
            {!mindBodyView && (
              <>
                <div className="px-1">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <span>🧘</span>
                    <span>Activities</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Improve your character, make life choices, and pursue personal growth.
                  </p>
                </div>

                {/* Mind & Body entry button */}
                <button
                  type="button"
                  onClick={() => setMindBodyView(true)}
                  className="w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between bg-slate-900/90 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl select-none">🧘</span>
                    <div>
                      <h5 className="text-xs font-bold text-white">Mind & Body</h5>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Gym, Meditate, Walks, Books, Diets, Martial Arts, Spa, Surgery, Doctor & Lottery
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-500 text-xs">➔</span>
                </button>

                {/* Crime entry button */}
                <button
                  type="button"
                  onClick={() => setCrimeView(true)}
                  className="w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between bg-slate-900/90 border-slate-800 hover:border-red-500/50 hover:bg-slate-850 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl select-none">🦹</span>
                    <div>
                      <h5 className="text-xs font-bold text-white">Crime</h5>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {hero.prison ? 'You are behind bars' : 'Commit a crime • Shoplifting, GTA, Robbery & more'}
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-500 text-xs">➔</span>
                </button>
              </>
            )}

            {/* ── Mind & Body full screen ──────────────────────────── */}
            {mindBodyView && (
              <>
                <div className="px-1 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMindBodyView(false)}
                    className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer shrink-0"
                  >
                    ←
                  </button>
                  <div>
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <span>🧘</span>
                      <span>Mind & Body</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Wellness, growth & personal care — everything in one place.
                    </p>
                  </div>
                </div>

            {/* Category: Mind & Body */}
            <div className="space-y-2">
              <div className="px-1 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <span>🧘</span>
                  <span>Mind & Body</span>
                </h4>
                <span className="text-[11px] text-slate-500">Wellness & Growth</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Gym */}
                <button
                  type="button"
                  disabled={hero.age < 12}
                  onClick={() => {
                    const res = performGym(gameState);
                    handleActivityOutcome(res, '🏋️');
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between
                    ${hero.age < 12 ? 'bg-slate-900/40 border-slate-800/40 opacity-50' : 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl select-none">🏋️</span>
                    <div>
                      <h5 className="text-xs font-bold text-white">Gym</h5>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {hero.age < 12 ? 'Requires Age 12+' : (hero.age < 18 ? 'Free Youth Pass • Boost Health & Looks' : '$20 Pass • Boost Health & Looks')}
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-500 text-xs">➔</span>
                </button>

                {/* Meditate */}
                <button
                  type="button"
                  disabled={hero.age < 6}
                  onClick={() => {
                    const res = performMeditate(gameState);
                    handleActivityOutcome(res, '🧘');
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between
                    ${hero.age < 6 ? 'bg-slate-900/40 border-slate-800/40 opacity-50' : 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl select-none">🧘</span>
                    <div>
                      <h5 className="text-xs font-bold text-white">Meditate</h5>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {hero.age < 6 ? 'Requires Age 6+' : 'Find inner peace & boost Happiness'}
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-500 text-xs">➔</span>
                </button>

                {/* Go on a Walk */}
                <button
                  type="button"
                  disabled={hero.age < 6}
                  onClick={() => setActiveActivitySubModal('walk')}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between
                    ${hero.age < 6 ? 'bg-slate-900/40 border-slate-800/40 opacity-50' : 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl select-none">🚶</span>
                    <div>
                      <h5 className="text-xs font-bold text-white">Go on a Walk</h5>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {hero.age < 6 ? 'Requires Age 6+' : 'Choose pace & duration • Random encounters'}
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-500 text-xs">➔</span>
                </button>

                {/* Library */}
                <button
                  type="button"
                  disabled={hero.age < 6}
                  onClick={() => {
                    const res = performLibrary(gameState);
                    handleActivityOutcome(res, '📚');
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between
                    ${hero.age < 6 ? 'bg-slate-900/40 border-slate-800/40 opacity-50' : 'bg-slate-900/90 border-slate-800 hover:border-blue-500/50 hover:bg-slate-850'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl select-none">📚</span>
                    <div>
                      <h5 className="text-xs font-bold text-white">Public Library</h5>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {hero.age < 6 ? 'Requires Age 6+' : 'Free admission • Read excerpts & boost Smarts'}
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-500 text-xs">➔</span>
                </button>

                {/* Read a Book */}
                <button
                  type="button"
                  disabled={hero.age < 6}
                  onClick={() => setActiveActivitySubModal('books')}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between
                    ${hero.age < 6 ? 'bg-slate-900/40 border-slate-800/40 opacity-50' : 'bg-slate-900/90 border-slate-800 hover:border-blue-500/50 hover:bg-slate-850'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl select-none">📖</span>
                    <div>
                      <h5 className="text-xs font-bold text-white">Read a Book</h5>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {hero.age < 6 ? 'Requires Age 6+' : `${(hero.booksRead || []).length} books read • 200+ titles available`}
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-500 text-xs">➔</span>
                </button>

                {/* Diet */}
                <button
                  type="button"
                  disabled={hero.age < 12}
                  onClick={() => setActiveActivitySubModal('diets')}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between
                    ${hero.age < 12 ? 'bg-slate-900/40 border-slate-800/40 opacity-50' : 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl select-none">🥗</span>
                    <div>
                      <h5 className="text-xs font-bold text-white">Diet</h5>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Current: <span className="text-emerald-400 font-semibold">{hero.diet || 'None'}</span> • 15 authentic diets
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-500 text-xs">➔</span>
                </button>

                {/* Martial Arts */}
                <button
                  type="button"
                  disabled={hero.age < 8}
                  onClick={() => setActiveActivitySubModal('martial_arts')}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between
                    ${hero.age < 8 ? 'bg-slate-900/40 border-slate-800/40 opacity-50' : 'bg-slate-900/90 border-slate-800 hover:border-amber-500/50 hover:bg-slate-850'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl select-none">🥋</span>
                    <div>
                      <h5 className="text-xs font-bold text-white">Martial Arts</h5>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {hero.age < 8 ? 'Requires Age 8+' : (hero.age < 18 ? 'Ask Parents to Pay ($500) • 6 styles & moves' : '$500 Lessons • Karate, Judo, Kung Fu...')}
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-500 text-xs">➔</span>
                </button>

                {/* Acting Lessons */}
                <button
                  type="button"
                  disabled={hero.age < 8}
                  onClick={() => setActiveActivitySubModal('acting')}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between
                    ${hero.age < 8 ? 'bg-slate-900/40 border-slate-800/40 opacity-50' : 'bg-slate-900/90 border-slate-800 hover:border-amber-500/50 hover:bg-slate-850'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl select-none">🎭</span>
                    <div>
                      <h5 className="text-xs font-bold text-white">Acting Lessons</h5>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Skill: <span className="text-amber-400 font-semibold">{hero.actingSkill || 20}%</span> • {hero.age < 18 ? 'Ask Parents to Pay ($500)' : '$500 Lessons'}
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-500 text-xs">➔</span>
                </button>

                {/* Garden */}
                <button
                  type="button"
                  disabled={hero.age < 8}
                  onClick={() => {
                    const res = performGarden(gameState);
                    handleActivityOutcome(res, '🌱');
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between
                    ${hero.age < 8 ? 'bg-slate-900/40 border-slate-800/40 opacity-50' : 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl select-none">🌱</span>
                    <div>
                      <h5 className="text-xs font-bold text-white">Garden</h5>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {hero.age < 8 ? 'Requires Age 8+' : 'Water plants & enjoy nature • Boost Health & Happiness'}
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-500 text-xs">➔</span>
                </button>
              </div>
            </div>

            {/* Category: Salon & Spa */}
            <div className="space-y-2 pt-2">
              <div className="px-1 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                  <span>💆</span>
                  <span>Salon & Spa</span>
                </h4>
                <span className="text-[11px] text-slate-500">Luxury Wellness (Age 16+)</span>
              </div>

              <button
                type="button"
                disabled={hero.age < 16}
                onClick={() => setActiveActivitySubModal('spa')}
                className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between
                  ${hero.age < 16 ? 'bg-slate-900/40 border-slate-800/40 opacity-50' : 'bg-slate-900/90 border-slate-800 hover:border-pink-500/50 hover:bg-slate-850 cursor-pointer'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl select-none">🧖</span>
                  <div>
                    <h5 className="text-xs font-bold text-white">Spa & Salon Treatments</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      30 luxury treatments • 24K Gold Facial, Hot Bamboo Massage, Caviar Facial ($150 - $12,000)
                    </p>
                  </div>
                </div>
                <span className="text-slate-500 text-xs">➔</span>
              </button>
            </div>

            {/* Category: Plastic Surgery */}
            <div className="space-y-2 pt-2">
              <div className="px-1 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <span>💉</span>
                  <span>Plastic Surgery</span>
                </h4>
                <span className="text-[11px] text-slate-500">Cosmetic Procedures (Age 18+)</span>
              </div>

              <button
                type="button"
                disabled={hero.age < 18}
                onClick={() => setActiveActivitySubModal('surgery')}
                className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between
                  ${hero.age < 18 ? 'bg-slate-900/40 border-slate-800/40 opacity-50' : 'bg-slate-900/90 border-slate-800 hover:border-purple-500/50 hover:bg-slate-850 cursor-pointer'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl select-none">✨</span>
                  <div>
                    <h5 className="text-xs font-bold text-white">Cosmetic Surgery</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      11 procedures • Botox, Nose Job, Liposuction, Facelift • High risk, high reward
                    </p>
                  </div>
                </div>
                <span className="text-slate-500 text-xs">➔</span>
              </button>
            </div>

            {/* Category: Health & Medical */}
            <div className="space-y-2 pt-2">
              <div className="px-1 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <span>🩺</span>
                  <span>Doctor & Health</span>
                </h4>
                <span className="text-[11px] text-slate-500">Medical Care</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const res = performDoctorVisit(gameState);
                  handleActivityOutcome(res, '🩺');
                }}
                className="w-full p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-red-500/50 hover:bg-slate-850 text-left cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl select-none">👨‍⚕️</span>
                  <div>
                    <h5 className="text-xs font-bold text-white">General Practitioner</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {hero.age < 18 ? 'Free Checkup (Youth Care) • Routine Medical Examination' : '$100 Consultation • Complete Health Assessment'}
                    </p>
                  </div>
                </div>
                <span className="text-slate-500 text-xs">➔</span>
              </button>
            </div>

            {/* Category: Casino & Lottery */}
            <div className="space-y-2 pt-2">
              <div className="px-1 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <span>🎟️</span>
                  <span>Casino & Lottery</span>
                </h4>
                <span className="text-[11px] text-slate-500">Chance to Strike Rich (Age 18+)</span>
              </div>

              <button
                type="button"
                disabled={hero.age < 18}
                onClick={() => setActiveActivitySubModal('lottery')}
                className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between
                  ${hero.age < 18 ? 'bg-slate-900/40 border-slate-800/40 opacity-50' : 'bg-slate-900/90 border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 cursor-pointer'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl select-none">🎫</span>
                  <div>
                    <h5 className="text-xs font-bold text-white">Lottery Tickets</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      $5 per ticket • Multimillion-dollar jackpot jackpot opportunity
                    </p>
                  </div>
                </div>
                <span className="text-slate-500 text-xs">➔</span>
              </button>
            </div>
              </>
            )}

            {/* ── Crime full screen ────────────────────────────────── */}
            {crimeView && (
              <>
                <div className="px-1 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => { if (crimeSubView) setCrimeSubView(null); else setCrimeView(false); }}
                    className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer shrink-0"
                  >
                    ←
                  </button>
                  <div>
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <span>🦹</span>
                      <span>{crimeSubView ? ({ murder: 'Murder', bankRobbery: 'Bank Robbery', hitman: 'Hire a Hitman', spy: 'Spy Agency', list: 'Commit a Crime', carTheft: 'Car Theft', burglary: 'Burglary' }[crimeSubView] || 'Crime') : 'Crime'}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {crimeSubView
                        ? ({
                            murder: 'Choose a method — every one has different odds.',
                            bankRobbery: 'Pick a weapon, disguise and getaway.',
                            hitman: 'Pay a professional to do your dirty work.',
                            spy: 'Run covert missions from your agency front.',
                            list: 'The full lineup — big money, big risk.',
                            carTheft: 'Ease of theft decides your odds. Sell or keep.',
                            burglary: 'Pick a time & entry. Loot vs. alarm risk.',
                          }[crimeSubView] || 'Big money, big risk.')
                        : 'Commit a crime — big money, big risk. Getting caught means prison.'}
                    </p>
                  </div>
                </div>

                {hero.prison && (
                  <div className="p-3 rounded-xl border border-red-500/40 bg-red-950/40 flex items-center gap-3">
                    <span className="text-2xl select-none">🚓</span>
                    <p className="text-[11px] text-red-200 font-semibold">
                      You are serving a {hero.prison.sentence}-year sentence for {hero.prison.charge}. No crimes to commit behind bars.
                    </p>
                  </div>
                )}

                {/* Subgroup tiles menu */}
                {!crimeSubView && (
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { id: 'list', icon: '🦹', name: 'Commit a Crime', desc: 'The full lineup' },
                      { id: 'murder', icon: '🔪', name: 'Murder', desc: 'Eliminate a target' },
                      { id: 'bankRobbery', icon: '🏦', name: 'Bank Robbery', desc: 'The big score' },
                      { id: 'hitman', icon: '🧎', name: 'Hitman', desc: 'Hire a professional' },
                      { id: 'spy', icon: '🕵️', name: 'Spy Agency', desc: 'Covert missions' },
                      { id: 'carTheft', icon: '🚗', name: 'Car Theft', desc: 'Boost parked cars' },
                      { id: 'burglary', icon: '🏠', name: 'Burglary', desc: 'Breaking & entering' },
                    ].map(sg => (
                      <button
                        key={sg.id}
                        type="button"
                        onClick={() => {
                          if (sg.id === 'carTheft') setCarTheftTargets(getCarTheftTargets(gameState));
                          setCrimeSubView(sg.id);
                        }}
                        className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-red-500/50 text-left transition-all cursor-pointer flex flex-col gap-1.5"
                      >
                        <span className="text-2xl select-none">{sg.icon}</span>
                        <h5 className="text-xs font-bold text-white">{sg.name}</h5>
                        <p className="text-[10px] text-slate-500">{sg.desc}</p>
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={hero.prison}
                      onClick={() => {
                        const res = hackSocialMedia(gameState);
                        handleActivityOutcome(res, '💻');
                      }}
                      className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-1.5
                        ${hero.prison ? 'bg-slate-900/40 border-slate-800/40 opacity-50' : 'bg-slate-900/90 border-slate-800 hover:border-red-500/50 cursor-pointer'}`}
                    >
                      <span className="text-2xl select-none">💻</span>
                      <h5 className="text-xs font-bold text-white">Hack Social Media</h5>
                      <p className="text-[10px] text-slate-500">Quick score</p>
                    </button>
                  </div>
                )}

                {/* Full crime list */}
                {crimeSubView === 'list' && crimeData.tiers.map(tier => {
                  const crimes = crimeData.crimes.filter(c => c.tier === tier.name);
                  const ageLocked = hero.age < tier.minAge;
                  return (
                    <div key={tier.name} className="space-y-2">
                      <div className="px-1 flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                          <span>{tier.icon}</span>
                          <span>{tier.name}</span>
                        </h4>
                        <span className="text-[11px] text-slate-500">{tier.desc}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {crimes.map(crime => {
                          const risk = crime.seriousness >= 4 ? 'High Risk' : (crime.seriousness === 3 ? 'Moderate Risk' : 'Low Risk');
                          return (
                            <button
                              key={crime.name}
                              type="button"
                              disabled={hero.prison || ageLocked}
                              onClick={() => {
                                const res = commitCrime(gameState, crime.name);
                                handleActivityOutcome(res, '🦹');
                              }}
                              className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between
                                ${hero.prison || ageLocked ? 'bg-slate-900/40 border-slate-800/40 opacity-50' : 'bg-slate-900/90 border-slate-800 hover:border-red-500/50 hover:bg-slate-850 cursor-pointer'}`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-2xl select-none">{crime.emoji}</span>
                                <div>
                                  <h5 className="text-xs font-bold text-white">{crime.name}</h5>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    {hero.prison ? 'Behind bars' : (ageLocked ? `Requires Age ${tier.minAge}+` : `${risk} • Up to $${tier.payoutMax.toLocaleString()}`)}
                                  </p>
                                </div>
                              </div>
                              <span className="text-slate-500 text-xs">➔</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Murder minigame: method picker */}
                {crimeSubView === 'murder' && (
                  <div className="space-y-2.5">
                    <p className="text-[11px] text-slate-400 px-1">
                      Each method has different odds for success, retaliation (the target fights back) and getting caught.
                    </p>
                    <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                      {(crimeMinigamesData.murderMethods || []).map((m, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setMurderMethod(i)}
                          className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer
                            ${murderMethod === i ? 'border-red-500 bg-red-950/30' : 'bg-slate-900/90 border-slate-800 hover:border-slate-600'}`}
                        >
                          <h5 className="text-xs font-bold text-white">{m.method}</h5>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[10px] text-slate-400">
                            <span>Effectiveness <span className="text-red-400">{'●'.repeat(m.effectiveness || 0)}{'○'.repeat(5 - (m.effectiveness || 0))}</span></span>
                            <span>Retaliation <span className="text-amber-400">{'●'.repeat(m.retaliation || 0)}{'○'.repeat(5 - (m.retaliation || 0))}</span></span>
                            <span>Get Caught <span className="text-sky-400">{'●'.repeat(m.getCaught || 0)}{'○'.repeat(5 - (m.getCaught || 0))}</span></span>
                          </div>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={hero.prison || hero.age < 14}
                      onClick={() => {
                        const res = commitMurder(gameState, murderMethod);
                        handleActivityOutcome(res, '🔪');
                      }}
                      className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors cursor-pointer"
                    >
                      {hero.age < 14 ? 'Requires Age 14+' : 'Commit Murder'}
                    </button>
                  </div>
                )}

                {/* Bank robbery minigame: weapon → disguise → getaway */}
                {crimeSubView === 'bankRobbery' && (
                  <div className="space-y-3">
                    {[
                      { key: 'weapon', label: 'Weapon', items: (crimeMinigamesData.bankRobbery || {}).weapons || [], field: 'weapon' },
                      { key: 'disguise', label: 'Disguise', items: (crimeMinigamesData.bankRobbery || {}).disguises || [], field: 'disguise' },
                      { key: 'getaway', label: 'Getaway', items: (crimeMinigamesData.bankRobbery || {}).getaways || [], field: 'getaway' },
                    ].map(row => (
                      <div key={row.key}>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">{row.label}</label>
                        <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                          {row.items.map((it, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setBankRobberyForm(prev => ({ ...prev, [row.field]: i }))}
                              className={`p-2 rounded-lg border text-left transition-all cursor-pointer
                                ${bankRobberyForm[row.field] === i ? 'border-red-500 bg-red-950/30' : 'bg-slate-900/90 border-slate-800 hover:border-slate-600'}`}
                            >
                              <p className="text-[10px] font-bold text-white capitalize truncate">{it.name}</p>
                              <p className="text-[9px] text-red-400">{'●'.repeat(it.effectiveness || 0)}{'○'.repeat(5 - (it.effectiveness || 0))}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      disabled={hero.prison || hero.age < 18}
                      onClick={() => {
                        const res = commitBankRobbery(gameState, {
                          weaponIndex: bankRobberyForm.weapon,
                          disguiseIndex: bankRobberyForm.disguise,
                          getawayIndex: bankRobberyForm.getaway,
                        });
                        handleActivityOutcome(res, '🏦');
                      }}
                      className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors cursor-pointer"
                    >
                      {hero.age < 18 ? 'Requires Age 18+' : 'Execute the Heist'}
                    </button>
                  </div>
                )}

                {/* Hitman: hire a professional */}
                {crimeSubView === 'hitman' && (
                  <div className="space-y-2.5">
                    <p className="text-[11px] text-slate-400 px-1">
                      Fees vary by skill. A traced contract could land YOU in prison for murder-for-hire.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto pr-1">
                      {(crimeMinigamesData.hitmen || []).map((h, i) => {
                        const fee = 25000 * ((i % 5) + 1);
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedHitman(i)}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between
                              ${selectedHitman === i ? 'border-red-500 bg-red-950/30' : 'bg-slate-900/90 border-slate-800 hover:border-slate-600'}`}
                          >
                            <span className="text-xs font-bold text-white">{h.name}</span>
                            <span className="text-[10px] text-emerald-400 font-bold">${fee.toLocaleString()}</span>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      disabled={hero.prison || hero.age < 18}
                      onClick={() => {
                        const res = hireHitman(gameState, selectedHitman);
                        handleActivityOutcome(res, '🧎');
                      }}
                      className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors cursor-pointer"
                    >
                      {hero.age < 18 ? 'Requires Age 18+' : `Hire ${((crimeMinigamesData.hitmen || [])[selectedHitman] || {}).name || 'a Hitman'}`}
                    </button>
                  </div>
                )}

                {/* Car theft minigame: parked lot with theft difficulty */}
                {crimeSubView === 'carTheft' && (
                  <div className="space-y-3">
                    <p className="text-[11px] text-slate-400 px-1">
                      ● marks ease of theft (5 = a joyrider's dream, 1 = Eagle-Coil & kill-switch). Exotics are almost impossible.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {(carTheftTargets || []).map((t, i) => (
                        <button
                          key={i}
                          type="button"
                          disabled={hero.prison || hero.age < 14}
                          onClick={() => {
                            const res = stealCar(gameState, i, carTheftTargets);
                            handleActivityOutcome(res, '🚗');
                            setCarTheftTargets(getCarTheftTargets(gameState));
                          }}
                          className={`p-3 rounded-xl border text-left transition-all ${hero.prison ? 'border-slate-800/40 opacity-50' : 'bg-slate-900/90 border-slate-800 hover:border-red-500/50 cursor-pointer'}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <img src={carSpriteFor(t)} alt={`${t.make} ${t.model}`} className="w-12 h-12 object-contain shrink-0" />
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-white truncate">{t.make} {t.model}</h5>
                              <p className="text-[9px] text-slate-500">{t.type} • value ${t.value.toLocaleString()}</p>
                              <p className="text-[9px] text-red-400">Ease of theft {'●'.repeat(t.easeOfTheft || 1)}{'○'.repeat(5 - (t.easeOfTheft || 1))}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCarTheftTargets(getCarTheftTargets(gameState))}
                      className="w-full py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-[11px] font-bold cursor-pointer"
                    >
                      🔄 Walk to another parking lot
                    </button>
                  </div>
                )}

                 {/* Burglary minigame: time + entry choice, then the APK NumberLink alarm bypass */}
                {crimeSubView === 'burglary' && (
                  burglaryPuzzle ? (
                    <BurglaryAlarmPuzzle
                      puzzle={burglaryPuzzle}
                      onDone={(outcome) => {
                        const p = burglaryPuzzle;
                        setBurglaryPuzzle(null);
                        const res = resolveBurglaryPuzzle(gameState, outcome);
                        handleActivityOutcome(res, '🏠');
                      }}
                      onAbort={() => {
                        setBurglaryPuzzle(null);
                        triggerFeedback('You slip back out through the window empty-handed.');
                      }}
                    />
                  ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">When</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { name: 'Dusk (7 PM)', risk: 'Lower loot, safer' },
                          { name: 'Midnight', risk: 'Balanced' },
                          { name: '3 AM', risk: 'Best loot, raises' },
                        ].map((t, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setBurglaryForm(prev => ({ ...prev, time: i }))}
                            className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all
                              ${burglaryForm.time === i ? 'border-red-500 bg-red-950/30' : 'bg-slate-900/90 border-slate-800 hover:border-slate-600'}`}
                          >
                            <p className="text-[10px] font-bold text-white">{t.name}</p>
                            <p className="text-[9px] text-slate-500">{t.risk}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Entry</label>
                      <div className="space-y-1.5">
                        {[
                          { name: 'Pick the back-door lock', desc: 'Stealthy +2' },
                          { name: 'Through the unlocked window', desc: 'Easy +3' },
                          { name: 'Smash a side window (loud)', desc: 'Fast but loud –2' },
                        ].map((e, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setBurglaryForm(prev => ({ ...prev, entry: i }))}
                            className={`w-full p-2.5 rounded-xl border text-left cursor-pointer transition-all
                              ${burglaryForm.entry === i ? 'border-red-500 bg-red-950/30' : 'bg-slate-900/90 border-slate-800 hover:border-slate-600'}`}
                          >
                            <p className="text-[10px] font-bold text-white">{e.name}</p>
                            <p className="text-[9px] text-slate-500">{e.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={hero.prison || hero.age < 14}
                      onClick={() => {
                        const res = commitBurglary(gameState, burglaryForm.time, burglaryForm.entry);
                        if (res.phase === 'puzzle') {
                          if (res.state) onUpdateState(res.state);
                          setBurglaryPuzzle(res.puzzle);
                          triggerFeedback(res.message);
                        } else {
                          setBurglaryPuzzle(null);
                          handleActivityOutcome(res, '🏠');
                        }
                      }}
                      className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors cursor-pointer"
                    >
                      {hero.age < 14 ? 'Requires Age 14+' : 'Break In'}
                    </button>
                  </div>
                  ))}

                {/* Spy agency: found or run missions */}
                {crimeSubView === 'spy' && (
                  hero.specialCareer?.type === 'spy' ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                        <h5 className="text-xs font-bold text-white">{hero.specialCareer.organization}</h5>
                        <div className="flex gap-4 mt-1.5 text-[10px] text-slate-400">
                          <span>Cover: {hero.specialCareer.cover || 50}%</span>
                          <span>Agents: {hero.specialCareer.agentCount || 1}</span>
                          <span>Missions: {hero.specialCareer.missionsDone || 0}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'stealth', icon: '🥷', name: 'Stealth' },
                          { id: 'hacking', icon: '💾', name: 'Hacking' },
                          { id: 'assassination', icon: '🎯', name: 'Assassination' },
                          { id: 'honeypot', icon: '💋', name: 'Honeypot' },
                        ].map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setSpyMission(m.id)}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer
                              ${spyMission === m.id ? 'border-red-500 bg-red-950/30' : 'bg-slate-900/90 border-slate-800 hover:border-slate-600'}`}
                          >
                            <span className="text-xl select-none">{m.icon}</span>
                            <h5 className="text-xs font-bold text-white mt-1">{m.name}</h5>
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        disabled={hero.prison}
                        onClick={() => {
                          const res = spyRunMission(gameState, spyMission);
                          handleActivityOutcome(res, '🕵️');
                        }}
                        className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors cursor-pointer"
                      >
                        Run {spyMission.charAt(0).toUpperCase() + spyMission.slice(1)} Mission
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-[11px] text-slate-400 px-1">Choose a front business for your covert agency.</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {((crimeMinigamesData.secretAgent || {}).agencyFronts || []).map((f, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSpyFront(f.type)}
                            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer
                              ${spyFront === f.type || (!spyFront && f.starter) ? 'border-red-500 bg-red-950/30' : 'bg-slate-900/90 border-slate-800 hover:border-slate-600'}`}
                          >
                            <p className="text-[10px] font-bold text-white capitalize">{f.type}</p>
                            <p className="text-[9px] text-slate-500">Capacity {f.minAgents}-{f.maxAgents} agents</p>
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        disabled={hero.age < 18}
                        onClick={() => {
                          const res = startSpyAgency(gameState, spyFront);
                          handleActivityOutcome(res, '🕵️');
                        }}
                        className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors cursor-pointer"
                      >
                        {hero.age < 18 ? 'Requires Age 18+' : 'Found Your Agency'}
                      </button>
                    </div>
                  )
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* ── Popup: short "can't do that" messages (no buttons) ─────── */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* ── Death: full-screen Game Over (blocks all interaction) ─────── */}
      {!hero?.alive && <GameOver hero={hero} onNewLife={onNewLife} />}

      {/* ── Modal: Faculty & Teachers List ────────────────────────── */}
      {showFacultyModal && hero.education?.currentSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Faculty & Teachers</h3>
                <p className="text-xs text-slate-400">{hero.education.currentSchool.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowFacultyModal(false)}
                className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {/* Principal */}
              {hero.education.currentSchool.principal && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTeacher(hero.education.currentSchool.principal);
                    setShowFacultyModal(false);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-750 hover:bg-slate-750 cursor-pointer text-left transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <NpcAvatar npc={hero.education.currentSchool.principal} size={46} />
                    <div>
                      <h4 className="text-xs font-bold text-white">{hero.education.currentSchool.principal.fullName}</h4>
                      <p className="text-[11px] text-blue-400 font-semibold">{hero.education.currentSchool.principal.role}</p>
                    </div>
                  </div>
                  <div className="w-16 text-right">
                    <span className="text-[10px] text-slate-400">{hero.education.currentSchool.principal.relationship}%</span>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400" style={{ width: `${hero.education.currentSchool.principal.relationship}%` }} />
                    </div>
                  </div>
                </button>
              )}

              {/* Teachers */}
              {hero.education.currentSchool.teachers?.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSelectedTeacher(t);
                    setShowFacultyModal(false);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-750 hover:bg-slate-750 cursor-pointer text-left transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <NpcAvatar npc={t} size={46} />
                    <div>
                      <h4 className="text-xs font-bold text-white">{t.fullName}</h4>
                      <p className="text-[11px] text-slate-400">{t.subject}</p>
                    </div>
                  </div>
                  <div className="w-16 text-right">
                    <span className="text-[10px] text-slate-400">{t.relationship}%</span>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400" style={{ width: `${t.relationship}%` }} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Teacher Profile & Actions ───────────────────────── */}
      {selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <NpcAvatar npc={selectedTeacher} size={58} />
                <div>
                  <h3 className="text-base font-bold text-white">{selectedTeacher.fullName}</h3>
                  <p className="text-xs text-slate-400">{selectedTeacher.subject || selectedTeacher.role} • Age {selectedTeacher.age}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTeacher(null)}
                className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Teacher Relationship Bar */}
            <div className="space-y-1.5 bg-slate-800/50 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>Relationship</span>
                <span className="text-emerald-400">{selectedTeacher.relationship}%</span>
              </div>
              <div className="h-2 w-full bg-slate-850 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 transition-all duration-300" style={{ width: `${selectedTeacher.relationship}%` }} />
              </div>
            </div>

            {/* Teacher Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleTeacherAction('suck_up')}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold cursor-pointer transition-colors border border-slate-700/60"
              >
                <span className="text-base">🍎</span>
                <span>Suck Up / Compliment</span>
              </button>

              <button
                type="button"
                onClick={() => handleTeacherAction('ask_help')}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold cursor-pointer transition-colors border border-slate-700/60"
              >
                <span className="text-base">🙋</span>
                <span>Ask for Help</span>
              </button>

              <button
                type="button"
                onClick={() => handleTeacherAction('disrespect')}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-red-950/20 hover:bg-red-950/40 text-red-300 text-xs font-bold cursor-pointer transition-colors border border-red-500/30"
              >
                <span className="text-base">🤬</span>
                <span>Disrespect / Talk Back</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Classmates List ─────────────────────────────────── */}
      {showClassmatesModal && hero.education?.currentSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Classmates</h3>
                <p className="text-xs text-slate-400">{hero.education.currentSchool.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowClassmatesModal(false)}
                className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {hero.education.currentSchool.classmates?.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedClassmate(c);
                    setShowClassmatesModal(false);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-750 hover:bg-slate-750 cursor-pointer text-left transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <NpcAvatar npc={c} size={46} />
                    <div>
                      <h4 className="text-xs font-bold text-white">{c.fullName}</h4>
                      <p className="text-[11px] text-slate-400">Age {c.age} • {c.gender === 'male' ? '♂️' : '♀️'}</p>
                    </div>
                  </div>
                  <div className="w-16 text-right">
                    <span className="text-[10px] text-slate-400">{c.relationship}%</span>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400" style={{ width: `${c.relationship}%` }} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Classmate Profile & Actions ─────────────────────── */}
      {selectedClassmate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <NpcAvatar npc={selectedClassmate} size={58} />
                <div>
                  <h3 className="text-base font-bold text-white">{selectedClassmate.fullName}</h3>
                  <p className="text-xs text-slate-400">Classmate • Age {selectedClassmate.age}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClassmate(null)}
                className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Relationship Bar */}
            <div className="space-y-1.5 bg-slate-800/50 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>Relationship</span>
                <span className="text-emerald-400">{selectedClassmate.relationship}%</span>
              </div>
              <div className="h-2 w-full bg-slate-850 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 transition-all duration-300" style={{ width: `${selectedClassmate.relationship}%` }} />
              </div>
            </div>

            {/* Classmate Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleClassmateAction('befriend')}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold cursor-pointer transition-colors border border-slate-700/60"
              >
                <span className="text-base">💬</span>
                <span>Befriend / Hang Out</span>
              </button>

              {hero.age >= 12 && (
                <button
                  type="button"
                  onClick={() => handleClassmateAction('flirt')}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold cursor-pointer transition-colors border border-slate-700/60"
                >
                  <span className="text-base">💘</span>
                  <span>Flirt</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleClassmateAction('prank')}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold cursor-pointer transition-colors border border-slate-700/60"
              >
                <span className="text-base">🤪</span>
                <span>Pull a Prank</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: School Activities ───────────────────────────────── */}
      {showActivitiesModal && hero.education?.currentSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Extracurricular Activities</h3>
                <p className="text-xs text-slate-400">Join clubs, arts, and athletic sports</p>
              </div>
              <button
                type="button"
                onClick={() => setShowActivitiesModal(false)}
                className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {/* Weekly hours load (APK Weekly Hours column) */}
              {(hero.education.schoolWeeklyHours || 0) > 0 && (
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-750 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white">⏱️ Weekly commitment</span>
                  <span className={`text-xs font-bold font-mono ${(hero.education.schoolWeeklyHours || 0) > 14 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {hero.education.schoolWeeklyHours || 0} hrs{hero.education.schoolWeeklyHours > 14 ? ' ⚠ grades at risk' : ''}
                  </span>
                </div>
              )}

              {/* Joined Activities: role + season record + election */}
              {hero.education.activities?.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-emerald-400 block tracking-wider">Your Activities</span>
                  {hero.education.activities.map(actName => {
                    const act = findSchoolActivity(actName);
                    const role = hero.education.activityRoles?.[actName] || 'Member';
                    const record = hero.education.activityRecords?.[actName];
                    const isLeader = act && role === act.leaderTitle;
                    return (
                      <div key={actName} className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">
                              {act?.flags?.sports ? '⚽' : act?.flags?.band ? '🎺' : act?.kind === 'Athletics Team' ? '🏈' : '🎭'} {actName}
                            </h4>
                            <p className="text-[10px] text-slate-400">
                              {isLeader ? `👑 ${role}` : role} {act ? `• ${act.name.toLowerCase().includes('team') ? 'team' : act.referenceNoun}` : ''} {act ? `• ~${act.weeklyHours} hrs/wk` : ''}{record ? ` • Season: ${record}` : ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleLeaveActivity(actName)}
                            className="px-2 py-1 rounded bg-slate-800 text-[10px] font-bold text-red-400 hover:bg-slate-700 cursor-pointer shrink-0"
                          >
                            Quit
                          </button>
                        </div>
                        {act && !isLeader && (
                          <button
                            type="button"
                            onClick={() => {
                              const res = runForSchoolOffice(gameState, actName, true);
                              handleSchoolOutcome(res);
                            }}
                            className="w-full py-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-blue-200 text-[10px] font-bold cursor-pointer"
                          >
                            🏅 Run for {act.leaderTitle}
                            {act.otherOfficers?.length > 0 ? ` (or ${act.otherOfficers[0]})` : ''}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Available Activities to Join (APK gates + tryouts) */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Available at School</span>
                {hero.education.currentSchool.availableActivities?.map(act => {
                  const isJoined = hero.education.activities?.includes(act.name);
                  if (isJoined) return null;
                  // New-save rows carry the full APK schema; legacy saves keep old fields.
                  const apkAct = findSchoolActivity(act.name) || act;
                  const gateMsg = activityGateReason(gameState, apkAct);
                  const blocked = !!gateMsg;
                  const gateBits = [
                    ((apkAct.minGrades || apkAct.minHealth || apkAct.minSmarts || apkAct.minAthleticism || apkAct.minLooks || apkAct.minPopularity)) === 0 ? null
                      : `Req: ${[apkAct.minGrades ? `${apkAct.minGrades}% grades` : null, apkAct.minHealth ? `${apkAct.minHealth}% health` : null, apkAct.minSmarts ? `${apkAct.minSmarts}% smarts` : null, apkAct.minAthleticism ? `${apkAct.minAthleticism}% athleticism` : null, apkAct.minLooks ? `${apkAct.minLooks}% looks` : null, apkAct.minPopularity ? `${apkAct.minPopularity}% popularity` : null].filter(Boolean).join(', ')}`,
                    apkAct.requiresTryouts ? 'Tryouts required' : null,
                  ].filter(Boolean);

                  return (
                    <div key={act.name} className={`flex items-center justify-between p-2.5 rounded-xl border ${blocked ? 'bg-slate-900/70 border-slate-800 opacity-80' : 'bg-slate-800/60 border-slate-750'}`}>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white flex items-center gap-1">
                          {apkAct.flags?.sports ? '⚽' : apkAct.flags?.band ? '🎺' : apkAct.kind === 'Athletics Team' ? '🏈' : '🎭'} {act.name}
                          {apkAct.requiresTryouts && <span className="text-[9px] bg-amber-900/70 text-amber-300 px-1 rounded font-bold self-start">TRYOUTS</span>}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {[apkAct.kind || apkAct.type, `${apkAct.weeklyHours || 4} hrs/wk`, ...gateBits].filter(Boolean).join(' • ')}
                        </p>
                        {blocked && <p className="text-[10px] text-red-400/90 font-semibold mt-0.5">🔒 {gateMsg}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleJoinActivity(act.name)}
                        className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer transition-colors shrink-0"
                      >
                        Join
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: School Cliques ─────────────────────────────────── */}
      {showCliquesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">School Cliques</h3>
                <p className="text-xs text-slate-400">
                  {hero.education?.clique ? `Current: ${hero.education.clique}` : 'Find your crowd'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCliquesModal(false)}
                className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {schoolData.cliques.map(clique => {
                const isCurrent = hero.education?.clique === clique.name;
                return (
                  <div
                    key={clique.name}
                    className={`p-3 rounded-xl border text-left transition-colors
                      ${isCurrent ? 'bg-purple-950/40 border-purple-500/60' : 'bg-slate-800/60 border-slate-750'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{clique.name}</span>
                          {isCurrent && <span className="text-[10px] bg-purple-600 text-white px-1.5 rounded">Joined</span>}
                        </h4>
                        <p className="text-[11px] text-slate-300 mt-1 leading-snug">{clique.shortDescription || clique.description}</p>
                      </div>
                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleJoinClique(clique.name)}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold shrink-0 ml-2 cursor-pointer"
                        >
                          Join
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Higher Education Application ────────────────────── */}
      {higherEdModalSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Apply to {higherEdModalSchool === 'Undergraduate' ? 'University' : `${higherEdModalSchool} School`}</h3>
                <p className="text-xs text-slate-400">Choose your major and financing</p>
              </div>
              <button
                type="button"
                onClick={() => setHigherEdModalSchool(null)}
                className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* University Major Picker */}
            {higherEdModalSchool === 'Undergraduate' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">Select College Major (28 Majors)</label>
                <select
                  value={selectedMajor}
                  onChange={e => setSelectedMajor(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {educationData.majors.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Funding Source Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">How will you pay for tuition?</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'Scholarship', icon: '🎓', label: 'Scholarship', desc: 'Req: 75% Smarts' },
                  { id: 'Parents',     icon: '👨‍👩‍👧', label: 'Parents',     desc: 'Ask your parents' },
                  { id: 'Loan',        icon: '💳', label: 'Student Loan',desc: 'Pay back later' },
                  { id: 'Cash',        icon: '💵', label: 'Cash',        desc: 'From bank balance' },
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFunding(f.id)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all
                      ${selectedFunding === f.id ? 'bg-blue-900/40 border-blue-500 text-white' : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'}`}
                  >
                    <span className="text-base block">{f.icon}</span>
                    <span className="text-xs font-bold block">{f.label}</span>
                    <span className="text-[10px] text-slate-400 block">{f.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleApplyCollege(higherEdModalSchool)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer transition-colors shadow-lg"
              >
                Submit Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: NPC Profile & Actions ─────────────────────────── */}
      {selectedNPC && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <NpcAvatar npc={selectedNPC} size={58} />
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedNPC.type === 'pet' ? selectedNPC.name : selectedNPC.fullName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedNPC.type === 'pet' ? `${selectedNPC.animal} (${selectedNPC.breed})` : selectedNPC.relation} • Age {selectedNPC.age}
                  </p>
                  {selectedNPC.occupation && (
                    <p className="text-[11px] font-semibold text-emerald-400">
                      {selectedNPC.occupation}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNPC(null)}
                className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Relationship Bar */}
            <div className="space-y-1.5 bg-slate-800/50 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>Relationship</span>
                <span className="text-emerald-400">{selectedNPC.relationship}%</span>
              </div>
              <div className="h-2 w-full bg-slate-850 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${selectedNPC.relationship}%` }}
                />
              </div>
            </div>

            {/* Authentic BitLife NPC Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleNPCAction('spend_time')}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold cursor-pointer transition-colors border border-slate-700/60"
              >
                <span className="text-base">💬</span>
                <span>Spend Time</span>
              </button>

              {selectedNPC.type !== 'pet' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleNPCAction('conversation')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold cursor-pointer transition-colors border border-slate-700/60"
                  >
                    <span className="text-base">🗣️</span>
                    <span>Conversation</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNPCAction('compliment')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold cursor-pointer transition-colors border border-slate-700/60"
                  >
                    <span className="text-base">💖</span>
                    <span>Compliment</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNPCAction('insult')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold cursor-pointer transition-colors border border-slate-700/60"
                  >
                    <span className="text-base">🤬</span>
                    <span>Insult</span>
                  </button>

                  {(selectedNPC.type === 'mother' || selectedNPC.type === 'father') && (
                    <button
                      type="button"
                      onClick={() => handleNPCAction('ask_money')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-300 text-xs font-bold cursor-pointer transition-colors border border-emerald-700/50"
                    >
                      <span className="text-base">💵</span>
                      <span>Ask for Money</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Job Interview ───────────────────────────────────── */}
      {interviewState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">Job Interview</span>
                <h3 className="text-base font-bold text-white">{interviewState.listing.title}</h3>
                <p className="text-xs text-slate-400">{interviewState.listing.companyName} • ${interviewState.listing.salary.toLocaleString()}/yr</p>
              </div>
              <button
                type="button"
                onClick={() => setInterviewState(null)}
                className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-200 bg-slate-800/60 p-3 rounded-xl border border-slate-750">
                "{interviewState.question.question}"
              </p>
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider px-1">Choose your response:</span>
            </div>

            <div className="space-y-2">
              {interviewState.question.choices.map((c, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectInterviewChoice(idx)}
                  className="w-full text-left p-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 hover:border-emerald-500/60 text-xs text-slate-100 font-medium cursor-pointer transition-colors"
                >
                  {c.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Supervisor Profile & Actions ─────────────────────── */}
      {selectedSupervisor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <NpcAvatar npc={selectedSupervisor} size={58} />
                <div>
                  <h3 className="text-base font-bold text-white">{selectedSupervisor.fullName}</h3>
                  <p className="text-xs text-slate-400">Supervisor • Age {selectedSupervisor.age}</p>
                  <p className="text-[11px] text-emerald-400 font-semibold">{hero.job?.companyName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSupervisor(null)}
                className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Relationship Bar */}
            <div className="space-y-1.5 bg-slate-800/50 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>Relationship</span>
                <span className="text-emerald-400">{selectedSupervisor.relationship}%</span>
              </div>
              <div className="h-2 w-full bg-slate-850 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${selectedSupervisor.relationship}%` }}
                />
              </div>
            </div>

            {/* Supervisor Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleSupervisorAction('compliment')}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold cursor-pointer transition-colors border border-slate-700/60"
              >
                <span className="text-base">💖</span>
                <span>Compliment / Suck Up</span>
              </button>

              <button
                type="button"
                onClick={() => handleSupervisorAction('conversation')}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold cursor-pointer transition-colors border border-slate-700/60"
              >
                <span className="text-base">💬</span>
                <span>Have a Conversation</span>
              </button>

              <button
                type="button"
                onClick={() => handleSupervisorAction('spend_time')}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold cursor-pointer transition-colors border border-slate-700/60"
              >
                <span className="text-base">☕</span>
                <span>Grab Lunch</span>
              </button>

              <button
                type="button"
                onClick={() => handleSupervisorAction('insult')}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-red-950/20 hover:bg-red-950/40 text-red-300 text-xs font-bold cursor-pointer transition-colors border border-red-500/30"
              >
                <span className="text-base">🤬</span>
                <span>Insult / Disrespect</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Coworkers List ──────────────────────────────────── */}
      {showCoworkersModal && hero.job && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Coworkers</h3>
                <p className="text-xs text-slate-400">{hero.job.companyName}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCoworkersModal(false)}
                className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {hero.job.coworkers?.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedCoworker(c);
                    setShowCoworkersModal(false);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-750 hover:bg-slate-750 cursor-pointer text-left transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <NpcAvatar npc={c} size={46} />
                    <div>
                      <h4 className="text-xs font-bold text-white">{c.fullName}</h4>
                      <p className="text-[11px] text-slate-400">Age {c.age} • Colleague</p>
                    </div>
                  </div>
                  <div className="w-16 text-right">
                    <span className="text-[10px] text-slate-400">{c.relationship}%</span>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400" style={{ width: `${c.relationship}%` }} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Coworker Profile & Actions ──────────────────────── */}
      {selectedCoworker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <NpcAvatar npc={selectedCoworker} size={58} />
                <div>
                  <h3 className="text-base font-bold text-white">{selectedCoworker.fullName}</h3>
                  <p className="text-xs text-slate-400">Coworker • Age {selectedCoworker.age}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCoworker(null)}
                className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Relationship Bar */}
            <div className="space-y-1.5 bg-slate-800/50 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>Relationship</span>
                <span className="text-emerald-400">{selectedCoworker.relationship}%</span>
              </div>
              <div className="h-2 w-full bg-slate-850 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 transition-all duration-300" style={{ width: `${selectedCoworker.relationship}%` }} />
              </div>
            </div>

            {/* Coworker Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleCoworkerAction('spend_time')}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold cursor-pointer transition-colors border border-slate-700/60"
              >
                <span className="text-base">🍻</span>
                <span>Hang Out After Work</span>
              </button>

              <button
                type="button"
                onClick={() => handleCoworkerAction('conversation')}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold cursor-pointer transition-colors border border-slate-700/60"
              >
                <span className="text-base">💬</span>
                <span>Have a Conversation</span>
              </button>

              <button
                type="button"
                onClick={() => handleCoworkerAction('compliment')}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold cursor-pointer transition-colors border border-slate-700/60"
              >
                <span className="text-base">💖</span>
                <span>Compliment</span>
              </button>

              <button
                type="button"
                onClick={() => handleCoworkerAction('flirt')}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold cursor-pointer transition-colors border border-slate-700/60"
              >
                <span className="text-base">💘</span>
                <span>Flirt / Hook Up</span>
              </button>

              <button
                type="button"
                onClick={() => handleCoworkerAction('prank')}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold cursor-pointer transition-colors border border-slate-700/60"
              >
                <span className="text-base">🤪</span>
                <span>Pull a Prank</span>
              </button>

              <button
                type="button"
                onClick={() => handleCoworkerAction('rumor')}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-red-950/20 hover:bg-red-950/40 text-red-300 text-xs font-bold cursor-pointer transition-colors border border-red-500/30"
              >
                <span className="text-base">🤫</span>
                <span>Spread a Rumor</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fixed Bottom Bar with + Age Button ─────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-800 bg-slate-900/95 px-4 py-2 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <button
            type="button"
            onClick={() => setActiveTab('occupation')}
            className={`flex flex-col items-center gap-1 text-[10px] font-semibold cursor-pointer
              ${activeTab === 'occupation' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <span className="text-lg">{hero.education?.currentSchool ? '🏫' : '💼'}</span>
            <span>{hero.education?.currentSchool ? 'School' : 'Job'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('assets')}
            className={`flex flex-col items-center gap-1 text-[10px] font-semibold cursor-pointer
              ${activeTab === 'assets' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <span className="text-lg">💰</span>
            <span>Assets</span>
          </button>

          {/* Central "+ Age" Button */}
          <button
            type="button"
            onClick={handleAgeUp}
            className="flex h-14 w-14 -translate-y-3 items-center justify-center rounded-full bg-emerald-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-600/40 hover:bg-emerald-400 active:scale-95 transition-transform cursor-pointer border-4 border-slate-950"
          >
            + Age
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('relationships')}
            className={`flex flex-col items-center gap-1 text-[10px] font-semibold cursor-pointer
              ${activeTab === 'relationships' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <span className="text-lg">👥</span>
            <span>Relations</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('activities');
              setMindBodyView(false);
              setCrimeView(false);
              setCrimeSubView(null);
            }}
            className={`flex flex-col items-center gap-1 text-[10px] font-semibold cursor-pointer
              ${activeTab === 'activities' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <span className="text-lg">🧘</span>
            <span>Activities</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            className={`flex flex-col items-center gap-1 text-[10px] font-semibold cursor-pointer
              ${activeTab === 'feed' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <span className="text-lg">📜</span>
            <span>Log</span>
          </button>
        </div>
      </nav>

      {/* ── Modal: Special Career Enrollment ────────────────────────────── */}
      {specialCareerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>⭐</span>
                <span>Special Career Enrollment</span>
              </h3>
              <button
                type="button"
                onClick={() => setSpecialCareerModal(null)}
                className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1">
              {/* Politician */}
              {specialCareerModal === 'politician' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30">
                    <h4 className="text-xs font-bold text-amber-300">Run for Public Office</h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">Campaign for municipal, state, or national leadership.</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Target Office</label>
                    <select
                      value={politicianForm.officeId}
                      onChange={e => {
                        const off = specialJobsData.politician.offices.find(o => o.id === e.target.value);
                        setPoliticianForm(prev => ({ ...prev, officeId: e.target.value, budget: off ? off.campaignCost : 10000 }));
                      }}
                      className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold"
                    >
                      {specialJobsData.politician.offices.map(o => (
                        <option key={o.id} value={o.id}>{o.title} (Age {o.minAge}+, ${o.salary.toLocaleString()}/yr)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Political Party</label>
                    <select
                      value={politicianForm.party}
                      onChange={e => setPoliticianForm(prev => ({ ...prev, party: e.target.value }))}
                      className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold"
                    >
                      {specialJobsData.politician.parties.map(p => (
                        <option key={p.name} value={p.name}>{p.name} Party</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Campaign Budget ($)</label>
                    <input
                      type="number"
                      value={politicianForm.budget}
                      onChange={e => setPoliticianForm(prev => ({ ...prev, budget: parseInt(e.target.value) || 0 }))}
                      className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Bank Balance: ${hero.bankBalance.toLocaleString()}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const res = startPoliticianCareer(gameState, {
                        officeId: politicianForm.officeId,
                        partyName: politicianForm.party,
                        campaignBudget: politicianForm.budget,
                      });
                      if (res.state) onUpdateState(res.state);
                      triggerFeedback(res.message);
                      if (res.success) setSpecialCareerModal(null);
                    }}
                    className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Launch Campaign 🗳️
                  </button>
                </div>
              )}

              {/* Mafia */}
              {specialCareerModal === 'mafia' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30">
                    <h4 className="text-xs font-bold text-red-300">Pledge Loyalty to The Family</h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">Start as an Associate and prove your loyalty through crimes.</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Crime Syndicate</label>
                    <select
                      value={mafiaMob}
                      onChange={e => setMafiaMob(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold"
                    >
                      {specialJobsData.mafia.mobs.map(m => (
                        <option key={m.name} value={m.name}>{m.name} (Notoriety: {m.notoriety}/5)</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const res = joinMafia(gameState, mafiaMob);
                      if (res.state) onUpdateState(res.state);
                      triggerFeedback(res.message);
                      if (res.success) setSpecialCareerModal(null);
                    }}
                    className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Pledge Blood Oath 🕶️
                  </button>
                </div>
              )}

              {/* Musician */}
              {specialCareerModal === 'musician' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30">
                    <h4 className="text-xs font-bold text-purple-300">Professional Music Career</h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">Sign with a record label and release chart-topping albums.</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Musical Genre</label>
                    <select
                      value={musicianForm.genre}
                      onChange={e => setMusicianForm(prev => ({ ...prev, genre: e.target.value }))}
                      className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold"
                    >
                      {specialJobsData.musician.genres.map(g => (
                        <option key={g.genre} value={g.genre}>{g.genre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Format</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setMusicianForm(prev => ({ ...prev, isBand: true }))}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border ${musicianForm.isBand ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
                      >
                        Join Band
                      </button>
                      <button
                        type="button"
                        onClick={() => setMusicianForm(prev => ({ ...prev, isBand: false }))}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border ${!musicianForm.isBand ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
                      >
                        Solo Artist
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Role / Instrument</label>
                    <select
                      value={musicianForm.instrument}
                      onChange={e => setMusicianForm(prev => ({ ...prev, instrument: e.target.value, role: e.target.value }))}
                      className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold"
                    >
                      {specialJobsData.musician.instruments.map(inst => (
                        <option key={inst.name} value={inst.name}>{inst.name} ({inst.category})</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const res = startMusicCareer(gameState, {
                        genre: musicianForm.genre,
                        role: musicianForm.role,
                        isBand: musicianForm.isBand,
                        instrumentName: musicianForm.instrument,
                      });
                      if (res.state) onUpdateState(res.state);
                      triggerFeedback(res.message);
                      if (res.success) setSpecialCareerModal(null);
                    }}
                    className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Sign Record Deal 🎸
                  </button>
                </div>
              )}

              {/* Actor */}
              {specialCareerModal === 'actor' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30">
                    <h4 className="text-xs font-bold text-amber-300">Hollywood Acting</h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">Hire a talent agent and land breakthrough movie roles.</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Starting Path</label>
                    <select
                      value={actorRole}
                      onChange={e => setActorRole(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold"
                    >
                      <option value="Extra">Movie Extra ($35,000/yr)</option>
                      <option value="Supporting">Supporting Actor ($75,000/yr)</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const res = startActorCareer(gameState, { roleType: actorRole });
                      if (res.state) onUpdateState(res.state);
                      triggerFeedback(res.message);
                      if (res.success) setSpecialCareerModal(null);
                    }}
                    className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Sign with Talent Agent 🎬
                  </button>
                </div>
              )}

              {/* Pro Athlete */}
              {specialCareerModal === 'athlete' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                    <h4 className="text-xs font-bold text-emerald-300">Professional Sports Draft</h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">Enter the pro league draft and sign multi-million dollar contracts.</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Sport</label>
                    <select
                      value={athleteForm.sport}
                      onChange={e => setAthleteForm(prev => ({ ...prev, sport: e.target.value }))}
                      className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold"
                    >
                      {specialJobsData.athlete.sports.map(s => (
                        <option key={s.sport} value={s.sport.toLowerCase()}>{s.sport}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Position</label>
                    <select
                      value={athleteForm.position}
                      onChange={e => setAthleteForm(prev => ({ ...prev, position: e.target.value }))}
                      className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold"
                    >
                      {(specialJobsData.athlete.positions[athleteForm.sport] || [{ position: 'Player' }]).map((pos, i) => (
                        <option key={i} value={pos.position}>{pos.position}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const res = startAthleteCareer(gameState, { sport: athleteForm.sport, position: athleteForm.position });
                      if (res.state) onUpdateState(res.state);
                      triggerFeedback(res.message);
                      if (res.success) setSpecialCareerModal(null);
                    }}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Enter Draft 🏆
                  </button>
                </div>
              )}

              {/* Model */}
              {specialCareerModal === 'model' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-pink-950/30 border border-pink-500/30">
                    <h4 className="text-xs font-bold text-pink-300">High Fashion Modeling</h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">Audition for top agencies like Elite, IMG, and Ford Models (Looks 60+).</p>
                  </div>
                  <p className="text-xs text-slate-300">Your Current Looks: <span className="text-pink-400 font-bold">{hero.stats.looks}%</span></p>
                  <button
                    type="button"
                    onClick={() => {
                      const res = startModelCareer(gameState);
                      if (res.state) onUpdateState(res.state);
                      triggerFeedback(res.message);
                      if (res.success) setSpecialCareerModal(null);
                    }}
                    className="w-full py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Audition for Agency 👠
                  </button>
                </div>
              )}

              {/* Astronaut */}
              {specialCareerModal === 'astronaut' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/30">
                    <h4 className="text-xs font-bold text-blue-300">Space Agency Entrance Exam</h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">Answer the astrophysics technical question to earn your astronaut commission.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                    <p className="text-xs font-bold text-white">
                      {specialJobsData.astronaut.trainingQuestions[0].question}
                    </p>
                    <div className="space-y-1.5">
                      {[specialJobsData.astronaut.trainingQuestions[0].correct, ...specialJobsData.astronaut.trainingQuestions[0].wrong].map((ans, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAstronautAnswer(idx)}
                          className={`w-full p-2.5 rounded-lg text-left text-xs font-semibold border transition-colors ${astronautAnswer === idx ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-900/60 text-slate-300 border-slate-800'}`}
                        >
                          {ans}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const res = applySpaceAcademy(gameState, astronautAnswer, 0);
                      if (res.state) onUpdateState(res.state);
                      triggerFeedback(res.message);
                      if (res.success) setSpecialCareerModal(null);
                    }}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Submit Aerospace Exam 🚀
                  </button>
                </div>
              )}

              {/* Hustler */}
              {specialCareerModal === 'hustler' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30">
                    <h4 className="text-xs font-bold text-amber-300">Street Hustler</h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">Work the downtown sidewalks to make immediate cash.</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Hustle Style</label>
                    <select
                      value={hustlerForm.type}
                      onChange={e => setHustlerForm(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold"
                    >
                      <option value="Street Performer">Street Performer</option>
                      <option value="Busker">Busker (Music)</option>
                      <option value="Panhandler">Panhandler</option>
                      <option value="Scam Artist">Scam Artist</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const res = startStreetHustle(gameState, { hustleType: hustlerForm.type, strategyOrAct: hustlerForm.act });
                      if (res.state) onUpdateState(res.state);
                      triggerFeedback(res.message);
                      if (res.success) setSpecialCareerModal(null);
                    }}
                    className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Hit the Streets 🪙
                  </button>
                </div>
              )}

              {/* Dealer */}
              {specialCareerModal === 'dealer' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30">
                    <h4 className="text-xs font-bold text-purple-300">Cartel Drug Operation</h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">Push product and rise from Corner Boy to Kingpin.</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Cartel</label>
                    <select
                      value={dealerCartel}
                      onChange={e => setDealerCartel(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold"
                    >
                      {specialJobsData.dealer.cartels.map((c, i) => (
                        <option key={i} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const res = startDealerCareer(gameState, dealerCartel);
                      if (res.state) onUpdateState(res.state);
                      triggerFeedback(res.message);
                      if (res.success) setSpecialCareerModal(null);
                    }}
                    className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Join Cartel 💊
                  </button>
                </div>
              )}

              {/* Startup CEO */}
              {specialCareerModal === 'business' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                    <h4 className="text-xs font-bold text-emerald-300">Incorporate Enterprise</h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">Found and capitalize your own corporate enterprise.</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Industry</label>
                    <select
                      value={startupForm.industry}
                      onChange={e => setStartupForm(prev => ({ ...prev, industry: e.target.value }))}
                      className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold"
                    >
                      {specialJobsData.business.industries.map((ind, i) => (
                        <option key={i} value={ind.industry}>{ind.industry} (Min Capital: ${ind.launchCost.toLocaleString()})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Seed Investment ($)</label>
                    <input
                      type="number"
                      value={startupForm.investment}
                      onChange={e => setStartupForm(prev => ({ ...prev, investment: parseInt(e.target.value) || 0 }))}
                      className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Bank Balance: ${hero.bankBalance.toLocaleString()}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const res = startStartupBusiness(gameState, startupForm.industry, startupForm.investment);
                      if (res.state) onUpdateState(res.state);
                      triggerFeedback(res.message);
                      if (res.success) setSpecialCareerModal(null);
                    }}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Incorporate Company 🏢
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Car Drive Incident (APK racing-drive tables) ─────────────── */}
      {carDriveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🚗</span>
                <span>Driving — {carDriveModal.carName}</span>
              </h3>
              <button
                type="button"
                onClick={() => setCarDriveModal(null)}
                className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto pr-1">
              <p className="text-xs text-slate-200 leading-relaxed">
                {carDriveModal.incident.scenario}
              </p>
              <p className="text-[11px] font-bold text-slate-400 uppercase">{carDriveModal.incident.cta || 'What will you do?'}</p>
              {(carDriveModal.incident.choices || []).map((ch, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    const res = resolveCarDriveChoice(gameState, carDriveModal.incident, i);
                    if (res.state) onUpdateState(res.state);
                    triggerFeedback(res.message);
                    setCarDriveModal(null);
                  }}
                  className="w-full p-3 rounded-xl bg-slate-800/80 border border-slate-700 hover:bg-slate-750 text-left cursor-pointer transition-colors"
                >
                  <h4 className="text-xs font-bold text-white">{ch.text}</h4>
                  {ch.narrative && <p className="text-[10px] text-slate-400 mt-0.5">{ch.narrative}</p>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Special Career In-Action ───────────────────────────────── */}
      {specialActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>⭐</span>
                <span>Special Career Action</span>
              </h3>
              <button
                type="button"
                onClick={() => setSpecialActionModal(null)}
                className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1">
              {/* Pass Law */}
              {specialActionModal === 'pass_law' && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 block uppercase">Select Legislation to Sign</span>
                  {specialJobsData.politician.laws.slice(0, 15).map(law => (
                    <button
                      key={law.id}
                      type="button"
                      onClick={() => {
                        const res = politicianPassLaw(gameState, law.id);
                        onUpdateState(res.state);
                        triggerFeedback(res.message);
                        setSpecialActionModal(null);
                      }}
                      className="w-full p-3 rounded-xl bg-slate-800/80 border border-slate-700 hover:bg-slate-750 text-left cursor-pointer transition-colors"
                    >
                      <h4 className="text-xs font-bold text-white">"{law.law}"</h4>
                      <p className={`text-[10px] font-semibold mt-1 ${law.approvalImpact >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        Approval Impact: {law.approvalImpact >= 0 ? `+${law.approvalImpact}%` : `${law.approvalImpact}%`}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {/* Push Crime */}
              {specialActionModal === 'push_crime' && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 block uppercase">Select Family Mob Job</span>
                  {specialJobsData.mafia.crimes.slice(0, 15).map((crime, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const res = mafiaPushCrime(gameState, idx);
                        onUpdateState(res.state);
                        triggerFeedback(res.message);
                        setSpecialActionModal(null);
                      }}
                      className="w-full p-3 rounded-xl bg-slate-800/80 border border-slate-700 hover:bg-slate-750 text-left cursor-pointer transition-colors"
                    >
                      <h4 className="text-xs font-bold text-white capitalize">{crime.snippet}</h4>
                      <p className="text-[10px] text-slate-400 mt-1">Severity: {crime.seriousness}/5 • Risk: {crime.risk}/5</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Extort Business */}
              {specialActionModal === 'extort' && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 block uppercase">Select Shakedown Target</span>
                  {specialJobsData.mafia.extortions.slice(0, 15).map((ext, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const res = mafiaExtort(gameState, idx);
                        onUpdateState(res.state);
                        triggerFeedback(res.message);
                        setSpecialActionModal(null);
                      }}
                      className="w-full p-3 rounded-xl bg-slate-800/80 border border-slate-700 hover:bg-slate-750 text-left cursor-pointer transition-colors"
                    >
                      <h4 className="text-xs font-bold text-white">{ext.business}</h4>
                      <p className="text-[10px] text-slate-400 mt-1">Target: {ext.target} • Payout: {ext.moneyScore}/5</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Whack Traitor */}
              {specialActionModal === 'whack' && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-red-400 block uppercase">Select Hit Execution Method</span>
                  {specialJobsData.mafia.executions.slice(0, 15).map((exec, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const res = mafiaWhack(gameState, idx);
                        onUpdateState(res.state);
                        triggerFeedback(res.message);
                        setSpecialActionModal(null);
                      }}
                      className="w-full p-3 rounded-xl bg-red-950/30 border border-red-500/40 hover:bg-red-950/50 text-left cursor-pointer transition-colors"
                    >
                      <h4 className="text-xs font-bold text-red-300">{exec.method}</h4>
                    </button>
                  ))}
                </div>
              )}

              {/* Mafia: Intimidate (scare tactics) */}
              {specialActionModal === 'mafia_scare' && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 block uppercase">Select Scare Tactic</span>
                  {((crimeMinigamesData.mafia || {}).scareMethods || []).map((m, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const res = mafiaScare(gameState, idx);
                        onUpdateState(res.state);
                        triggerFeedback(res.message);
                        setSpecialActionModal(null);
                      }}
                      className="w-full p-3 rounded-xl bg-slate-800/80 border border-slate-700 hover:bg-slate-750 text-left cursor-pointer transition-colors"
                    >
                      <h4 className="text-xs font-bold text-white">{m.method}</h4>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Effectiveness {m.effectiveness || 2}/5 • Heat {m.getCaught || 2}/10
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {/* Mafia: Opportunity (skim or stay loyal) */}
              {specialActionModal === 'mafia_temptation' && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-amber-400 block uppercase">Opportunity Knocks</span>
                  {((crimeMinigamesData.mafia || {}).temptations || []).slice(0, 10).map((t, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-800/80 border border-slate-700"
                    >
                      <p className="text-[11px] text-white font-semibold">{t.scenario}</p>
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            const res = mafiaTemptation(gameState, idx, true);
                            onUpdateState(res.state);
                            triggerFeedback(res.message);
                            setSpecialActionModal(null);
                          }}
                          className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          💰 Skim It
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const res = mafiaTemptation(gameState, idx, false);
                            onUpdateState(res.state);
                            triggerFeedback(res.message);
                            setSpecialActionModal(null);
                          }}
                          className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          🤝 Stay Loyal
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Hustler: Busk (music + attire) */}
              {specialActionModal === 'hustler_busk' && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 block uppercase">Pick Your Setlist</span>
                  {((crimeMinigamesData.hustler || {}).buskMusicTypes || []).slice(0, 12).map((m, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setBuskMusic(idx)}
                      className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-colors
                        ${buskMusic === idx ? 'border-amber-500 bg-amber-950/30' : 'bg-slate-800/80 border-slate-700 hover:bg-slate-750'}`}
                    >
                      <h4 className="text-xs font-bold text-white capitalize">{m.type} {m.needsMusicAppended ? 'music' : ''}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {(m.bestInstruments && m.bestInstruments.length ? `Best: ${m.bestInstruments.join(', ')}` : '')}
                        {` • Score ${m.successScore || 2}/5`}
                      </p>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const res = hustlerBusk(gameState, { musicIndex: buskMusic });
                      onUpdateState(res.state);
                      triggerFeedback(res.message);
                      setSpecialActionModal(null);
                    }}
                    className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold cursor-pointer transition-colors"
                  >
                    🎻 Start Busking
                  </button>
                </div>
              )}

              {/* Hustler: Run a Scam */}
              {specialActionModal === 'hustler_scam' && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 block uppercase">Pick Your Con</span>
                  {((crimeMinigamesData.hustler || {}).scamTypes || specialJobsData.hustler.scams || []).slice(0, 15).map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const res = hustlerRunScam(gameState, idx);
                        onUpdateState(res.state);
                        triggerFeedback(res.message);
                        setSpecialActionModal(null);
                      }}
                      className="w-full p-3 rounded-xl bg-slate-800/80 border border-slate-700 hover:bg-slate-750 text-left cursor-pointer transition-colors"
                    >
                      <h4 className="text-xs font-bold text-white capitalize">{s.name || s.scam}</h4>
                      {s.description && <p className="text-[10px] text-slate-400 mt-1">{s.description}</p>}
                    </button>
                  ))}
                </div>
              )}

              {/* Dealer: Drug Run (package + drop-off) */}
              {specialActionModal === 'dealer_run' && (
                <div className="space-y-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block uppercase mb-1">Packaging</span>
                    <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
                      {((crimeMinigamesData.dealer || {}).packageTypes || []).slice(0, 12).map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setDealerRunForm(prev => ({ ...prev, pkg: idx }))}
                          className={`p-2 rounded-lg border text-left cursor-pointer transition-colors
                            ${dealerRunForm.pkg === idx ? 'border-purple-500 bg-purple-950/30' : 'bg-slate-800/80 border-slate-700 hover:bg-slate-750'}`}
                        >
                          <p className="text-[10px] font-bold text-white truncate">{p.name}</p>
                          <p className="text-[9px] text-slate-400">Break {p.breakChance || 1}/10</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block uppercase mb-1">Drop-off Location</span>
                    <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {((crimeMinigamesData.dealer || {}).dropOffLocations || []).map((d, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setDealerRunForm(prev => ({ ...prev, drop: idx }))}
                          className={`p-2 rounded-lg border text-left cursor-pointer transition-colors
                            ${dealerRunForm.drop === idx ? 'border-purple-500 bg-purple-950/30' : 'bg-slate-800/80 border-slate-700 hover:bg-slate-750'}`}
                        >
                          <p className="text-[10px] font-bold text-white truncate capitalize">{d.name}</p>
                          <p className="text-[9px] text-slate-400">Risk {d.risk || 2}/5</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const res = dealerDrugRun(gameState, { packageIndex: dealerRunForm.pkg, dropOffIndex: dealerRunForm.drop });
                      onUpdateState(res.state);
                      triggerFeedback(res.message);
                      setSpecialActionModal(null);
                    }}
                    className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold cursor-pointer transition-colors"
                  >
                    📦 Start the Run
                  </button>
                </div>
              )}

              {/* Release Album */}
              {specialActionModal === 'release_album' && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 block uppercase">Select Album Type</span>
                  {['Studio Album', 'Single', 'EP', 'Live Album', 'Acoustic Album'].map((alb, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const res = musicReleaseAlbum(gameState, { albumType: alb });
                        onUpdateState(res.state);
                        triggerFeedback(res.message);
                        setSpecialActionModal(null);
                      }}
                      className="w-full p-3 rounded-xl bg-slate-800/80 border border-slate-700 hover:bg-slate-750 text-left cursor-pointer transition-colors"
                    >
                      <h4 className="text-xs font-bold text-white">{alb}</h4>
                    </button>
                  ))}
                </div>
              )}

              {/* Actor Audition */}
              {specialActionModal === 'actor_audition' && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 block uppercase">Select Film Genre to Audition</span>
                  {specialJobsData.actor.genres.map((g, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const res = actorAudition(gameState, { genre: g.genre });
                        onUpdateState(res.state);
                        triggerFeedback(res.message);
                        setSpecialActionModal(null);
                      }}
                      className="w-full p-3 rounded-xl bg-slate-800/80 border border-slate-700 hover:bg-slate-750 text-left cursor-pointer transition-colors"
                    >
                      <h4 className="text-xs font-bold text-white">{g.genre} Blockbuster</h4>
                    </button>
                  ))}
                </div>
              )}

              {/* Model Gig */}
              {specialActionModal === 'model_gig' && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 block uppercase">Select Modeling Gig</span>
                  {specialJobsData.model.gigs.map((gig, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const res = modelDoGig(gameState, idx);
                        onUpdateState(res.state);
                        triggerFeedback(res.message);
                        setSpecialActionModal(null);
                      }}
                      className="w-full p-3 rounded-xl bg-slate-800/80 border border-slate-700 hover:bg-slate-750 text-left cursor-pointer transition-colors"
                    >
                      <h4 className="text-xs font-bold text-white">{gig.name}</h4>
                    </button>
                  ))}
                </div>
              )}

              {/* Space Mission */}
              {specialActionModal === 'space_mission' && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-blue-400 block uppercase">Select Space Agency Mission</span>
                  {specialJobsData.astronaut.lunarMissions.map((mis, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const res = launchSpaceMission(gameState, idx);
                        onUpdateState(res.state);
                        triggerFeedback(res.message);
                        setSpecialActionModal(null);
                      }}
                      className="w-full p-3 rounded-xl bg-slate-800/80 border border-slate-700 hover:bg-slate-750 text-left cursor-pointer transition-colors"
                    >
                      <h4 className="text-xs font-bold text-white">{mis.type}</h4>
                      <p className="text-[10px] text-slate-400 mt-1">{mis.snippet.replace(/<[^>]+>/g, 'the Moon')}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Dealer Move Product */}
              {specialActionModal === 'dealer_sell' && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-purple-400 block uppercase">Select Product to Move</span>
                  {specialJobsData.dealer.drugs.map((d, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const res = dealerSellDrug(gameState, d.name);
                        onUpdateState(res.state);
                        triggerFeedback(res.message);
                        setSpecialActionModal(null);
                      }}
                      className="w-full p-3 rounded-xl bg-slate-800/80 border border-slate-700 hover:bg-slate-750 text-left cursor-pointer transition-colors"
                    >
                      <h4 className="text-xs font-bold text-white">{d.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-1">Street Value: ${d.streetValue}/dose • Demand: {d.baseDemand}/5</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ── Modal: Insufficient Funds Alert ───────────────────────── */}
      {activeActivitySubModal === 'insufficient_funds' && insufficientFundsInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-red-500/40 shadow-2xl p-5 space-y-4 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>⚠️</span>
                <span>{insufficientFundsInfo.title}</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveActivitySubModal(null)}
                className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                {insufficientFundsInfo.message || 'You do not have enough money in your bank account for this activity.'}
              </p>

              <div className="grid grid-cols-2 gap-2 bg-slate-800/60 p-3 rounded-xl border border-slate-750 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Cost</span>
                  <span className="text-sm font-bold text-red-400">${insufficientFundsInfo.cost?.toLocaleString() || '0'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Bank Balance</span>
                  <span className="text-sm font-bold text-emerald-400">${insufficientFundsInfo.balance?.toLocaleString() || '0'}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveActivitySubModal(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: Walk Customizer ─────────────────────────────────── */}
      {activeActivitySubModal === 'walk' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-emerald-500/40 shadow-2xl p-5 space-y-4 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🚶</span>
                <span>Go for a Walk</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveActivitySubModal(null)}
                className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-300 block">Select Pace</span>
                <div className="grid grid-cols-2 gap-2">
                  {['Stroll', 'Normal', 'Brisk', 'Power Walk'].map(pace => (
                    <button
                      key={pace}
                      type="button"
                      onClick={() => setWalkPace(pace)}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        walkPace === pace
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                      }`}
                    >
                      {pace}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-300 block">Select Duration</span>
                <div className="grid grid-cols-2 gap-2">
                  {['15 minutes', '30 minutes', '45 minutes', '60 minutes'].map(dur => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setWalkDuration(dur)}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        walkDuration === dur
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                      }`}
                    >
                      {dur}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const res = performWalk(gameState, { pace: walkPace, duration: walkDuration });
                  handleActivityOutcome(res, '🚶');
                }}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-lg transition-colors mt-2"
              >
                Start Walking ({walkPace} • {walkDuration})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Martial Arts Training (With Parent Sponsorship) ── */}
      {activeActivitySubModal === 'martial_arts' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-amber-500/40 shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🥋</span>
                <span>Martial Arts Training</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveActivitySubModal(null)}
                className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              <p className="text-xs text-slate-400">
                {hero.age < 18
                  ? 'As a minor, you must ask a parent to pay the $500 lesson fee. Their decision depends on your relationship and generosity.'
                  : 'Take lessons for $500 to earn higher belts and unlock devastating combat strikes.'}
              </p>

              {(mindBodyData.martialArts || []).map((art, idx) => {
                const trained = (hero.martialArts && hero.martialArts[art.name]) || null;
                const beltName = trained ? trained.belt : 'Not Started';
                const moves = trained ? trained.moves : [];

                return (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>🥋</span>
                          <span>{art.name}</span>
                        </h4>
                        <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                          Current Belt: {beltName}
                        </p>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 space-y-1 pt-1 border-t border-slate-750">
                      <div>Belts: {art.belts.join(' → ')}</div>
                      {moves.length > 0 && (
                        <div className="text-amber-400 font-semibold">Mastered Strikes: {moves.join(', ')}</div>
                      )}
                    </div>

                    {/* Lesson Buttons */}
                    <div className="pt-1">
                      {hero.age < 18 ? (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Ask Parent to Pay ($500):</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {relationships.mother?.alive && (
                              <button
                                type="button"
                                onClick={() => {
                                  const res = performTrainMartialArt(gameState, art.name, 'mother');
                                  handleActivityOutcome(res, '🥋');
                                }}
                                className="px-3 py-2 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white text-[11px] font-bold cursor-pointer transition-colors text-left truncate"
                              >
                                Ask Mother ({relationships.mother.firstName})
                              </button>
                            )}
                            {relationships.father?.alive && (
                              <button
                                type="button"
                                onClick={() => {
                                  const res = performTrainMartialArt(gameState, art.name, 'father');
                                  handleActivityOutcome(res, '🥋');
                                }}
                                className="px-3 py-2 rounded-lg bg-blue-700/80 hover:bg-blue-600 text-white text-[11px] font-bold cursor-pointer transition-colors text-left truncate"
                              >
                                Ask Father ({relationships.father.firstName})
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const res = performTrainMartialArt(gameState, art.name);
                            handleActivityOutcome(res, '🥋');
                          }}
                          className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors"
                        >
                          Take Lesson ($500)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Acting Lessons (With Parent Sponsorship) ───────── */}
      {activeActivitySubModal === 'acting' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-amber-500/40 shadow-2xl p-5 space-y-4 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🎭</span>
                <span>Acting Lessons</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveActivitySubModal(null)}
                className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-750 space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-300">Acting Skill</span>
                  <span className="text-amber-400">{hero.actingSkill || 20}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 transition-all duration-300" style={{ width: `${hero.actingSkill || 20}%` }} />
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {hero.age < 18
                  ? 'As a minor, you can ask your mother or father to pay the $500 fee for acting school.'
                  : 'Pay $500 to practice dramatic monologue delivery and method acting.'}
              </p>

              {hero.age < 18 ? (
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Ask Parent to Pay ($500):</span>
                  {relationships.mother?.alive && (
                    <button
                      type="button"
                      onClick={() => {
                        const res = performActingLesson(gameState, 'mother');
                        handleActivityOutcome(res, '🎭');
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer transition-colors text-left"
                    >
                      Ask Mother ({relationships.mother.firstName})
                    </button>
                  )}
                  {relationships.father?.alive && (
                    <button
                      type="button"
                      onClick={() => {
                        const res = performActingLesson(gameState, 'father');
                        handleActivityOutcome(res, '🎭');
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-blue-700/80 hover:bg-blue-600 text-white text-xs font-bold cursor-pointer transition-colors text-left"
                    >
                      Ask Father ({relationships.father.firstName})
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const res = performActingLesson(gameState);
                    handleActivityOutcome(res, '🎭');
                  }}
                  className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  Take Lesson ($500)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Books Browser ───────────────────────────────────── */}
      {activeActivitySubModal === 'books' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-blue-500/40 shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>📖</span>
                <span>Choose a Book to Read</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveActivitySubModal(null)}
                className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 pb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Available (Age {hero.age}+)</span>
              <select
                value={bookGenreFilter}
                onChange={e => setBookGenreFilter(e.target.value)}
                className="rounded-lg bg-slate-800 border border-slate-700 text-[11px] text-white px-2 py-1"
              >
                <option value="All">All Genres</option>
                {Array.from(new Set((mindBodyData.books || []).map(b => b.genre))).map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {(mindBodyData.books || [])
                .filter(b => hero.age >= b.minAge && (bookGenreFilter === 'All' || b.genre === bookGenreFilter))
                .slice(0, 40)
                .map((book, idx) => {
                  const alreadyRead = (hero.booksRead || []).includes(book.title);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const originalIdx = mindBodyData.books.findIndex(b => b.title === book.title);
                        const res = performReadBook(gameState, originalIdx);
                        handleActivityOutcome(res, '📖');
                      }}
                      className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                        alreadyRead
                          ? 'bg-slate-850 border-emerald-500/30 text-slate-300'
                          : 'bg-slate-800/80 border-slate-700 hover:border-emerald-500/50 hover:bg-slate-750'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-bold text-white">{book.title}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-blue-400 font-semibold">{book.genre}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">by {book.author} • {book.pages} pages {alreadyRead ? '• ✓ Read' : ''}</p>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Diets ───────────────────────────────────────────── */}
      {activeActivitySubModal === 'diets' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-emerald-500/40 shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🥗</span>
                <span>Choose a Diet</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveActivitySubModal(null)}
                className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              <button
                type="button"
                onClick={() => {
                  const res = performSetDiet(gameState, 'None');
                  handleActivityOutcome(res, '🍔');
                }}
                className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                  (!hero.diet || hero.diet === 'None')
                    ? 'bg-emerald-950/40 border-emerald-500/60'
                    : 'bg-slate-800/80 border-slate-700 hover:bg-slate-750'
                }`}
              >
                <h4 className="text-xs font-bold text-white">No Diet (Eat whatever you want)</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">$0/month • No stat modifiers</p>
              </button>

              {(mindBodyData.diets || []).map((diet, idx) => {
                const isActive = hero.diet === diet.name;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const res = performSetDiet(gameState, diet.name);
                      handleActivityOutcome(res, '🥗');
                    }}
                    className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-emerald-950/40 border-emerald-500/60'
                        : 'bg-slate-800/80 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-white">{diet.name} Diet {isActive ? '★ Active' : ''}</h4>
                      <span className="text-[11px] font-bold text-emerald-400">${diet.monthlyCost}/mo</span>
                    </div>
                    <div className="flex gap-3 text-[10px] text-slate-400 mt-1">
                      <span>Health: {diet.healthImpact >= 0 ? `+${diet.healthImpact}` : diet.healthImpact}</span>
                      <span>Looks: {diet.appearanceImpact >= 0 ? `+${diet.appearanceImpact}` : diet.appearanceImpact}</span>
                      {diet.associatedDisease && <span className="text-amber-400">Risk: {diet.associatedDisease}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Salon & Spa Menu ─────────────────────────────────── */}
      {activeActivitySubModal === 'spa' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-pink-500/40 shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🧖</span>
                <span>Luxury Spa Treatments</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveActivitySubModal(null)}
                className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {(mindBodyData.spaTreatments || []).map((treatment, idx) => {
                const cost = treatment.cost || 500;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const res = performSpaTreatment(gameState, idx);
                      handleActivityOutcome(res, '💆');
                    }}
                    className="w-full p-3 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-pink-500/50 hover:bg-slate-750 text-left cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-white">{treatment.name}</h4>
                      <span className="text-xs font-bold text-pink-400">${cost.toLocaleString()}</span>
                    </div>
                    <div className="flex gap-3 text-[10px] text-slate-400 mt-1">
                      <span>Looks: +{treatment.looksImpact}</span>
                      <span>Health: +{treatment.healthImpact}</span>
                      <span>Happy: +{treatment.happinessImpact}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Plastic Surgery ─────────────────────────────────── */}
      {activeActivitySubModal === 'surgery' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-purple-500/40 shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>💉</span>
                <span>Cosmetic Surgery Procedures</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveActivitySubModal(null)}
                className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {(mindBodyData.plasticSurgeries || []).map((proc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    const res = performPlasticSurgery(gameState, idx);
                    handleActivityOutcome(res, '💉');
                  }}
                  className="w-full p-3 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-purple-500/50 hover:bg-slate-750 text-left cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-white">{proc.procedure}</h4>
                    <span className="text-xs font-bold text-purple-400">${proc.cost.toLocaleString()}</span>
                  </div>
                  <div className="flex gap-3 text-[10px] text-slate-400 mt-1">
                    <span>Appearance Gain: +{proc.looksScore}/5</span>
                    <span className={proc.dangerScore > 1 ? 'text-amber-400' : 'text-slate-400'}>Danger: {proc.dangerScore}/5</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Lottery Tickets ─────────────────────────────────── */}
      {activeActivitySubModal === 'lottery' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-amber-500/40 shadow-2xl p-5 space-y-4 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🎟️</span>
                <span>State Lottery</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveActivitySubModal(null)}
                className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                Test your luck! Buy tickets for a chance to win the multimillion-dollar jackpot.
              </p>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const res = performLottery(gameState, 1);
                    handleActivityOutcome(res, '🎟️');
                  }}
                  className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer transition-colors flex items-center justify-between px-4"
                >
                  <span>Buy 1 Ticket</span>
                  <span>$5</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const res = performLottery(gameState, 10);
                    handleActivityOutcome(res, '🎟️');
                  }}
                  className="w-full py-3 rounded-xl bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer transition-colors flex items-center justify-between px-4"
                >
                  <span>Buy 10 Tickets (Bundle)</span>
                  <span>$50</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Yearly Decision Scenario (Random Annual Event Popup from APK) ── */}
      {gameState.pendingScenario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-amber-500/40 shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                <span>⚡</span>
                <span>{gameState.pendingScenario.category || 'Life Dilemma'}</span>
              </span>
              <span className="text-xs font-bold text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full">
                Age {hero.age}
              </span>
            </div>

            <div className="space-y-2 overflow-y-auto pr-1">
              <h3 className="text-base font-black text-white leading-snug">
                {gameState.pendingScenario.title}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {gameState.pendingScenario.body}
              </p>
              {gameState.pendingScenario.cta && (
                <p className="text-xs font-bold text-amber-300 italic pt-1">
                  {gameState.pendingScenario.cta}
                </p>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              {(gameState.pendingScenario.choices || []).map((choice, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    const res = resolveScenarioChoice(gameState, idx);
                    onUpdateState(res.state);
                    
                  }}
                  className="w-full py-3 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-amber-500/50 text-white text-xs font-bold transition-all cursor-pointer text-left flex items-center justify-between group active:scale-[0.99]"
                >
                  <span className="text-slate-100 group-hover:text-white">{choice.text}</span>
                  <span className="text-slate-500 group-hover:text-amber-400 transition-colors">➔</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

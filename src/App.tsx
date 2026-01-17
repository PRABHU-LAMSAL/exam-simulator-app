import { useEffect, useMemo, useRef, useState } from 'react';
import { Question, sampleQuestions } from './questions';

type Phase = 'login' | 'dashboard' | 'exam' | 'result' | 'review' | 'progress';

type AnswerMap = Record<string, number | null>;

type ExamAttempt = {
  id: string;
  symbolNumber: string;
  date: number;
  score: { correct: number; total: number };
  percent: number;
  elapsedSeconds: number;
  totalSeconds: number;
  answers: AnswerMap;
  questionIds: string[];
};

const TOTAL_QUESTIONS = 100;
const EXAM_DURATION_MINUTES = 90;

// LocalStorage utilities
const STORAGE_KEY = 'nhpc_exam_attempts';

function saveExamAttempt(attempt: ExamAttempt): void {
  try {
    const existing = getExamAttempts();
    existing.push(attempt);
    // Keep only last 50 attempts to avoid storage issues
    const recent = existing.slice(-50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
  } catch (error) {
    console.error('Failed to save exam attempt:', error);
  }
}

function getExamAttempts(): ExamAttempt[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load exam attempts:', error);
    return [];
  }
}

function getAttemptsBySymbol(symbolNumber: string): ExamAttempt[] {
  return getExamAttempts().filter(attempt => attempt.symbolNumber === symbolNumber);
}

function useCountdown(seconds: number, isRunning: boolean) {
  const [remaining, setRemaining] = useState(seconds);
  const savedRunning = useRef(isRunning);

  useEffect(() => { 
    savedRunning.current = isRunning; 
  }, [isRunning]);

  useEffect(() => {
    if (isRunning) {
      setRemaining(seconds);
    }
  }, [seconds, isRunning]);

  useEffect(() => {
    if (!isRunning) return;
    
    setRemaining(seconds);
    const id = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 0) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(id);
  }, [isRunning, seconds]);

  return remaining;
}

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function pickRandom<T>(array: T[], count: number): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.max(0, Math.min(count, array.length)));
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('login');
  const [symbolNumber, setSymbolNumber] = useState<string>('');
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [submittedAt, setSubmittedAt] = useState<number | null>(null);
  const [examTimerStarted, setExamTimerStarted] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  const totalSeconds = EXAM_DURATION_MINUTES * 60;
  const isRunning = phase === 'exam' && examTimerStarted;
  const remainingSeconds = useCountdown(totalSeconds, isRunning);

  useEffect(() => {
    if (phase === 'exam' && remainingSeconds === 0) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds, phase]);

  const score = useMemo(() => {
    let correct = 0;
    for (const q of examQuestions) {
      if (answers[q.id] === q.answerIndex) correct += 1;
    }
    return { correct, total: examQuestions.length };
  }, [answers, examQuestions]);

  function handleLogin(symbol: string) {
    if (symbol.trim()) {
      const trimmedSymbol = symbol.trim();
      setSymbolNumber(trimmedSymbol);
      // Store login name
      try {
        localStorage.setItem('nhpc_last_login', trimmedSymbol);
      } catch (error) {
        console.error('Failed to save login:', error);
      }
      setPhase('dashboard');
    }
  }

  // Load last login on mount
  useEffect(() => {
    try {
      const lastLogin = localStorage.getItem('nhpc_last_login');
      if (lastLogin) {
        // Optionally auto-fill but don't auto-login
      }
    } catch (error) {
        console.error('Failed to load last login:', error);
      }
  }, []);

  function handleLogout() {
    setSymbolNumber('');
    setPhase('login');
    setExamQuestions([]);
    setAnswers({});
    setStartedAt(null);
    setSubmittedAt(null);
    setExamTimerStarted(false);
  }

  function handleStartExam() {
    const qs = pickRandom(sampleQuestions, TOTAL_QUESTIONS);
    const initialAnswers: AnswerMap = Object.fromEntries(qs.map(q => [q.id, null]));
    setExamQuestions(qs);
    setAnswers(initialAnswers);
    setSubmittedAt(null);
    setExamTimerStarted(false);
    setPhase('exam');
  }

  function handleStartTimer() {
    setExamTimerStarted(true);
    setStartedAt(Date.now());
  }

  function handleSelect(questionId: string, optionIndex: number) {
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  }

  function handleSubmit() {
    if (phase !== 'exam') return;
    const submitTime = Date.now();
    setSubmittedAt(submitTime);
    
    // Calculate elapsed seconds
    const calculatedElapsed = startedAt ? Math.max(0, Math.floor((submitTime - startedAt) / 1000)) : 0;
    
    // Save exam attempt
    const percent = examQuestions.length === 0 ? 0 : Math.round((score.correct / examQuestions.length) * 100);
    const attempt: ExamAttempt = {
      id: `attempt_${submitTime}_${Math.random().toString(36).substr(2, 9)}`,
      symbolNumber: symbolNumber,
      date: submitTime,
      score: score,
      percent: percent,
      elapsedSeconds: calculatedElapsed,
      totalSeconds: totalSeconds,
      answers: { ...answers },
      questionIds: examQuestions.map(q => q.id)
    };
    saveExamAttempt(attempt);
    
    setPhase('result');
  }

  function handleRestart() {
    setPhase('dashboard');
    setExamQuestions([]);
    setAnswers({});
    setStartedAt(null);
    setSubmittedAt(null);
    setExamTimerStarted(false);
  }

  function handleRestartExam() {
    const qs = pickRandom(sampleQuestions, TOTAL_QUESTIONS);
    const initialAnswers: AnswerMap = Object.fromEntries(qs.map(q => [q.id, null]));
    setExamQuestions(qs);
    setAnswers(initialAnswers);
    setSubmittedAt(null);
    setExamTimerStarted(false);
    setPhase('exam');
  }

  const elapsedSeconds = useMemo(() => {
    if (!startedAt) return 0;
    const end = submittedAt ?? Date.now();
    return Math.max(0, Math.floor((end - startedAt) / 1000));
  }, [startedAt, submittedAt]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');
  }, [isDarkTheme]);

  return (
    <div className="app">
      <Header 
        symbolNumber={symbolNumber} 
        onLogout={handleLogout}
        phase={phase}
        onStartExam={phase === 'dashboard' ? handleStartExam : undefined}
        onStartTimer={phase === 'exam' && !examTimerStarted ? handleStartTimer : undefined}
        onSubmit={phase === 'exam' && examTimerStarted ? handleSubmit : undefined}
        onRestart={phase === 'review' ? handleRestart : undefined}
        remainingSeconds={phase === 'exam' && examTimerStarted ? remainingSeconds : null}
        isDarkTheme={isDarkTheme}
        onToggleTheme={() => setIsDarkTheme(!isDarkTheme)}
        onViewProgress={symbolNumber && phase !== 'exam' ? () => setPhase('progress') : undefined}
      />
      <div className="container">
        {phase === 'exam' ? (
          <ExamView
            questions={examQuestions}
            answers={answers}
            onSelect={handleSelect}
            remainingSeconds={remainingSeconds}
            examTimerStarted={examTimerStarted}
          />
        ) : (
          <div className="card" style={{ padding: 24 }}>
            {phase === 'login' && (
              <LoginView onLogin={handleLogin} />
            )}

            {phase === 'dashboard' && (
              <DashboardView 
                symbolNumber={symbolNumber}
                onStartExam={handleStartExam}
              />
            )}

            {phase === 'progress' && (
              <ProgressView
                symbolNumber={symbolNumber}
                onBack={() => setPhase('dashboard')}
              />
            )}

            {phase === 'result' && (
              <ResultView
                score={score}
                elapsedSeconds={elapsedSeconds}
                totalSeconds={totalSeconds}
                onReview={() => setPhase('review')}
                onRestart={handleRestartExam}
                onExit={handleLogout}
              />
            )}

            {phase === 'review' && (
              <ReviewView
                questions={examQuestions}
                answers={answers}
                onBack={() => setPhase('result')}
                onRestart={handleRestart}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Header({
  symbolNumber,
  onLogout,
  phase,
  onStartExam,
  onStartTimer,
  onSubmit,
  onRestart,
  remainingSeconds,
  isDarkTheme,
  onToggleTheme,
  onViewProgress,
}: {
  symbolNumber: string;
  onLogout: () => void;
  phase: Phase;
  onStartExam?: () => void;
  onStartTimer?: () => void;
  onSubmit?: () => void;
  onRestart?: () => void;
  remainingSeconds: number | null;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  onViewProgress?: () => void;
}) {
  const isLowTime = remainingSeconds !== null && remainingSeconds < 300; // Less than 5 minutes

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-brand">
          <div className="logo-placeholder">NMC</div>
          <div className="brand-text">
            <div className="brand-title">Nepal Medical Council</div>
            <div className="brand-subtitle">NHPC License Examination</div>
          </div>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-secondary" 
            onClick={onToggleTheme}
            style={{ padding: '8px 12px', minWidth: 'auto' }}
            title={isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {isDarkTheme ? '☀️' : '🌙'}
          </button>
          {onViewProgress && (
            <button 
              className="btn btn-secondary" 
              onClick={onViewProgress}
              title="View exam attempts and progress"
            >
              📊 Attempts
            </button>
          )}
          {symbolNumber && (
            <div className="symbol-display">
              Symbol: <strong>{symbolNumber}</strong>
            </div>
          )}
          {remainingSeconds !== null && phase === 'exam' && (
            <div className={`header-timer ${isLowTime ? 'timer-warning' : ''}`}>
              <span className="timer-icon">⏱</span>
              {formatSeconds(remainingSeconds)}
            </div>
          )}
          {onStartTimer && phase === 'exam' && (
            <button className="btn btn-primary" onClick={onStartTimer}>
              Start Exam
            </button>
          )}
          {onSubmit && phase === 'exam' && (
            <button className="btn btn-danger" onClick={onSubmit}>
              Submit Exam
            </button>
          )}
          {onRestart && phase === 'review' && (
            <button className="btn btn-primary" onClick={onRestart}>
              Restart Exam
            </button>
          )}
          {symbolNumber && (
            <button className="btn btn-secondary" onClick={onLogout}>
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function LoginView({ onLogin }: { onLogin: (symbol: string) => void }) {
  const [symbol, setSymbol] = useState('');
  const [lastLogin, setLastLogin] = useState<string>('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('nhpc_last_login');
      if (saved) {
        setLastLogin(saved);
      }
    } catch (error) {
      console.error('Failed to load last login:', error);
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onLogin(symbol);
  }

  return (
    <div className="grid" style={{ gap: 24, maxWidth: 400, margin: '0 auto' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 className="title">NHPC License Exam</h1>
        <p className="muted">Enter your symbol number to continue</p>
        {lastLogin && (
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Last login: {lastLogin}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid" style={{ gap: 16 }}>
        <div className="field">
          <label>Symbol Number</label>
          <input
            type="text"
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
            placeholder={lastLogin ? `Last: ${lastLogin}` : "Enter your symbol number"}
            required
            autoFocus
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
          Login
        </button>
      </form>
    </div>
  );
}

function DashboardView({
  symbolNumber,
  onStartExam,
}: {
  symbolNumber: string;
  onStartExam: () => void;
}) {
  return (
    <div className="grid" style={{ gap: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <h1 className="title">Welcome, {symbolNumber}</h1>
        <p className="muted">NHPC License Examination</p>
      </div>

      <div className="exam-info-card">
        <h2 className="section-title">Exam Information</h2>
        <div className="info-grid">
          <div className="info-item">
            <div className="info-label">Total Questions</div>
            <div className="info-value">{TOTAL_QUESTIONS}</div>
          </div>
          <div className="info-item">
            <div className="info-label">Duration</div>
            <div className="info-value">{EXAM_DURATION_MINUTES} minutes</div>
          </div>
          <div className="info-item">
            <div className="info-label">Question Type</div>
            <div className="info-value">Multiple Choice</div>
          </div>
        </div>
      </div>

      <div className="instructions-card">
        <h2 className="section-title">Instructions</h2>
        <ul className="instructions-list">
          <li>You have {EXAM_DURATION_MINUTES} minutes to complete {TOTAL_QUESTIONS} questions</li>
          <li>Each question has 4 options. Select the best answer</li>
          <li>All questions are displayed in a scrollable list - scroll down to see all questions</li>
          <li>You can review and change your answers before submitting</li>
          <li>The exam will auto-submit when time expires</li>
          <li>Make sure you have a stable internet connection</li>
        </ul>
      </div>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button className="btn btn-primary btn-large" onClick={onStartExam}>
          Enter Examination
        </button>
      </div>

    </div>
  );
}

function ExamView({
  questions,
  answers,
  onSelect,
  remainingSeconds,
  examTimerStarted,
}: {
  questions: Question[];
  answers: AnswerMap;
  onSelect: (questionId: string, optionIndex: number) => void;
  remainingSeconds: number;
  examTimerStarted: boolean;
}) {
  const answeredCount = Object.values(answers).filter(a => a !== null).length;
  const isLowTime = remainingSeconds < 300; // Less than 5 minutes

  return (
    <div className="exam-container">
      {!examTimerStarted && (
        <div className="exam-warning-message">
          <p>Please click "Start Exam" button in the navbar to begin the examination.</p>
        </div>
      )}
      <div className="questions-list">
        {questions.map((q, idx) => {
          const selected = answers[q.id];
          return (
            <div key={q.id} className="question-item">
              <div className="question-number">Question {idx + 1}</div>
              <div className="question-text">{q.text}</div>
              <div className="options-list">
                {q.options.map((opt, optIdx) => (
                  <label
                    key={optIdx}
                    className={`option-label-simple ${selected === optIdx ? 'selected' : ''} ${!examTimerStarted ? 'disabled' : ''}`}
                    onClick={() => {
                      if (examTimerStarted) {
                        onSelect(q.id, optIdx);
                      }
                    }}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={selected === optIdx}
                      onChange={() => {
                        if (examTimerStarted) {
                          onSelect(q.id, optIdx);
                        }
                      }}
                      disabled={!examTimerStarted}
                    />
                    <span>{String.fromCharCode(65 + optIdx)}. {opt}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResultView({
  score,
  elapsedSeconds,
  totalSeconds,
  onReview,
  onRestart,
  onExit,
}: {
  score: { correct: number; total: number };
  elapsedSeconds: number;
  totalSeconds: number;
  onReview: () => void;
  onRestart: () => void;
  onExit: () => void;
}) {
  const [showScorePercent, setShowScorePercent] = useState(false);
  const percent = score.total === 0 ? 0 : Math.round((score.correct / score.total) * 100);

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="row space">
        <div>
          <h2 className="title">Results</h2>
          <p className="muted">Great work! Here is how you did.</p>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={() => setShowScorePercent(!showScorePercent)}
          style={{ padding: '8px 12px' }}
          title={showScorePercent ? "Hide score and percent" : "Show score and percent"}
        >
          {showScorePercent ? '👁️' : '👁️‍🗨️'}
        </button>
      </div>

      <div className="grid cols-3" style={{ gap: 12 }}>
        {showScorePercent && <Stat label="Score" value={`${score.correct} / ${score.total}`} />}
        {showScorePercent && <Stat label="Percent" value={`${percent}%`} />}
        <Stat label="Time" value={`${formatSeconds(elapsedSeconds)} / ${formatSeconds(totalSeconds)}`} />
      </div>

      <div className="row" style={{ justifyContent: 'center', gap: 16, marginTop: 8 }}>
        <button className="btn btn-primary btn-large" onClick={onReview}>
          View Answers
        </button>
        <button className="btn btn-primary btn-large" onClick={onRestart}>
          Restart Exam
        </button>
        <button className="btn btn-secondary btn-large" onClick={onExit}>
          Exit App
        </button>
      </div>
    </div>
  );
}

function ReviewView({
  questions,
  answers,
  onBack,
  onRestart,
}: {
  questions: Question[];
  answers: AnswerMap;
  onBack: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="row space">
        <div>
          <h2 className="title" style={{ marginBottom: 4 }}>Review</h2>
          <p className="muted">Your selections compared to the correct answers.</p>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <button className="btn btn-secondary" onClick={onBack}>Back to Results</button>
          <button className="btn btn-primary" onClick={onRestart}>Back to Dashboard</button>
        </div>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        {questions.map((q, idx) => {
          const user = answers[q.id];
          return (
            <div key={q.id} className="card" style={{ padding: 16 }}>
              <div className="row space">
                <div>
                  <strong>Q{idx + 1}.</strong> {q.text}
                </div>
                <div>
                  {user === q.answerIndex ? '✅ Correct' : '❌ Incorrect'}
                </div>
              </div>
              <div className="grid" style={{ marginTop: 10 }}>
                {q.options.map((opt, i) => {
                  const isCorrect = i === q.answerIndex;
                  const isSelected = i === user;
                  return (
                    <div key={i} className={`option ${isCorrect ? 'correct' : ''} ${isSelected && !isCorrect ? 'incorrect' : ''}`}>
                      <div>{opt}</div>
                      <div style={{ marginLeft: 'auto', fontWeight: 700, fontSize: 18 }}>
                        {isCorrect ? '✓' : isSelected && !isCorrect ? '✗' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
              {q.explanation && (
                <div className="muted" style={{ marginTop: 8 }}>Explanation: {q.explanation}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="muted" style={{ marginBottom: 6 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 22 }}>{value}</div>
    </div>
  );
}

function ProgressView({
  symbolNumber,
  onBack,
}: {
  symbolNumber: string;
  onBack: () => void;
}) {
  const attempts = useMemo(() => {
    return getAttemptsBySymbol(symbolNumber).sort((a, b) => b.date - a.date);
  }, [symbolNumber]);

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  if (attempts.length === 0) {
    return (
      <div className="grid" style={{ gap: 18 }}>
        <div>
          <h2 className="title">Exam Progress</h2>
          <p className="muted">No exam attempts yet. Complete an exam to see your progress here.</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <button className="btn btn-secondary" onClick={onBack}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const bestScore = Math.max(...attempts.map(a => a.percent));
  const averageScore = Math.round(attempts.reduce((acc, a) => acc + a.percent, 0) / attempts.length);

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="row space">
        <div>
          <h2 className="title">Exam Progress</h2>
          <p className="muted">Your exam attempts and performance history</p>
        </div>
        <button className="btn btn-secondary" onClick={onBack}>
          Back to Dashboard
        </button>
      </div>

      <div className="grid cols-3" style={{ gap: 12 }}>
        <Stat label="Total Attempts" value={attempts.length.toString()} />
        <Stat label="Best Score" value={`${bestScore}%`} />
        <Stat label="Average Score" value={`${averageScore}%`} />
      </div>

      <div>
        <h3 className="section-title" style={{ marginBottom: 16 }}>Attempt History</h3>
        <div className="grid" style={{ gap: 12 }}>
          {attempts.map((attempt, idx) => (
            <div key={attempt.id} className="card" style={{ padding: 16 }}>
              <div className="row space">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                    Attempt #{attempts.length - idx}
                  </div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {formatDate(attempt.date)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--text)' }}>
                    {attempt.percent}%
                  </div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {attempt.score.correct} / {attempt.score.total}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--muted)' }}>
                Time: {formatSeconds(attempt.elapsedSeconds)} / {formatSeconds(attempt.totalSeconds)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}



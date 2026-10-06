import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Plus,
  Trash2,
  Check,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Quiz, Question, QuizCategory, QuizDifficulty, UserProfile } from '../types';
import { sound } from '../utils/audio';

interface Props {
  user: UserProfile;
  onQuizCreated: (newQuiz: Quiz) => void;
  onCancel: () => void;
}

export const QuizCreator: React.FC<Props> = ({ user, onQuizCreated, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<QuizCategory>('cultura_general');
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('medio');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [questions, setQuestions] = useState<
    Omit<Question, 'id'>[]
  >([
    {
      text: '¿Cuál es la capital del país del sol naciente (Japón)?',
      category: 'geografia',
      difficulty: 'facil',
      options: ['Kioto', 'Tokio', 'Osaka', 'Nagoya'],
      correctOptionIndex: 1,
      timeLimitSeconds: 15,
      explanation: 'Tokio se convirtió en la capital oficial de Japón en 1868 cuando el emperador Meiji trasladó su corte desde Kioto.',
    },
    {
      text: '¿Qué científico formuló la ley de la gravitación universal?',
      category: 'ciencia',
      difficulty: 'facil',
      options: ['Albert Einstein', 'Isaac Newton', 'Galileo Galilei', 'Nikola Tesla'],
      correctOptionIndex: 1,
      timeLimitSeconds: 15,
      explanation: 'Sir Isaac Newton presentó los Principia Mathematica en 1687, definiendo las leyes del movimiento y la gravitación universal.',
    },
  ]);

  const handleAddQuestion = () => {
    sound.playClick();
    setQuestions([
      ...questions,
      {
        text: '',
        category,
        difficulty,
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        timeLimitSeconds: 15,
        explanation: '',
      },
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    sound.playClick();
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleUpdateQuestion = (idx: number, field: string, value: any) => {
    const copy = [...questions];
    copy[idx] = { ...copy[idx], [field]: value };
    setQuestions(copy);
  };

  const handleUpdateOption = (qIdx: number, optIdx: number, val: string) => {
    const copy = [...questions];
    const newOpts = [...copy[qIdx].options] as [string, string, string, string];
    newOpts[optIdx] = val;
    copy[qIdx].options = newOpts;
    setQuestions(copy);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Por favor añade un título para tu quiz.');
      sound.playWrong();
      return;
    }

    if (!description.trim()) {
      setErrorMessage('Por favor añade una breve descripción.');
      sound.playWrong();
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        setErrorMessage(`La pregunta #${i + 1} no tiene texto.`);
        sound.playWrong();
        return;
      }
      for (let j = 0; j < 4; j++) {
        if (!q.options[j].trim()) {
          setErrorMessage(`La opción ${j + 1} de la pregunta #${i + 1} está vacía.`);
          sound.playWrong();
          return;
        }
      }
    }

    setIsSubmitting(true);
    sound.playClick();

    const formattedQuestions: Question[] = questions.map((q, idx) => ({
      ...q,
      id: `q-user-${Date.now()}-${idx}`,
      category,
      difficulty,
    }));

    const payload = {
      title: title.trim(),
      description: description.trim(),
      category,
      difficulty,
      questions: formattedQuestions,
      authorName: user.username,
      authorAvatar: user.avatar,
      isPublic: true,
    };

    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Error guardando el quiz');
      }

      const createdQuiz: Quiz = await res.json();
      sound.playVictory();
      onQuizCreated(createdQuiz);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al conectar con el servidor.');
      sound.playWrong();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-2xl font-bold font-display text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Creador de Cuestionarios Públicos
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Publica tu propio quiz para que cualquier usuario de la comunidad pueda jugarlo solo o en multijugador.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold font-display text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            1. Información General del Quiz
          </h3>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Título del Cuestionario *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Curiosidades del Antiguo Egipto"
              maxLength={80}
              className="w-full px-4 py-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Descripción Breve *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explica de qué trata este reto y a quién va dirigido..."
              maxLength={200}
              rows={2}
              className="w-full px-4 py-2 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Categoría
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as QuizCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="religion">Religión</option>
                <option value="ciencia">Ciencia</option>
                <option value="historia">Historia</option>
                <option value="cine">Cine & TV</option>
                <option value="geografia">Geografía</option>
                <option value="tecnologia">Tecnología</option>
                <option value="deportes">Deportes</option>
                <option value="arte">Arte y Literatura</option>
                <option value="cultura_general">Cultura General</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Nivel de Dificultad
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as QuizDifficulty)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="facil">Fácil (Para todos los públicos)</option>
                <option value="medio">Medio (Conocimiento sólido)</option>
                <option value="dificil">Difícil (Solo para eruditos)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Questions Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-display text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              2. Preguntas del Cuestionario ({questions.length})
            </h3>
            <button
              type="button"
              onClick={handleAddQuestion}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Añadir Otra Pregunta
            </button>
          </div>

          {questions.map((q, qIdx) => (
            <motion.div
              key={qIdx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm space-y-4 relative"
            >
              <div className="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  Pregunta #{qIdx + 1}
                </span>

                <div className="flex items-center gap-3">
                  {/* Question Timer */}
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Clock className="w-3.5 h-3.5" />
                    <select
                      value={q.timeLimitSeconds}
                      onChange={(e) =>
                        handleUpdateQuestion(qIdx, 'timeLimitSeconds', parseInt(e.target.value, 10))
                      }
                      className="bg-transparent font-semibold focus:outline-none"
                    >
                      <option value={10}>10 seg</option>
                      <option value={15}>15 seg</option>
                      <option value={20}>20 seg</option>
                      <option value={30}>30 seg</option>
                    </select>
                  </div>

                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIdx)}
                      className="text-zinc-400 hover:text-rose-500 p-1 transition-colors"
                      title="Eliminar pregunta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Enunciado de la Pregunta
                </label>
                <input
                  type="text"
                  value={q.text}
                  onChange={(e) => handleUpdateQuestion(qIdx, 'text', e.target.value)}
                  placeholder="¿Cuál es la velocidad de la luz en el vacío?"
                  className="w-full px-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* 4 Options with radio for correct answer */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Opciones de Respuesta
                  </label>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Marca el círculo de la opción correcta
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {q.options.map((opt, optIdx) => {
                    const isCorrect = q.correctOptionIndex === optIdx;
                    return (
                      <div
                        key={optIdx}
                        className={`flex items-center gap-2 p-2.5 rounded-2xl border transition-all ${
                          isCorrect
                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                            : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`correct-${qIdx}`}
                          checked={isCorrect}
                          onChange={() => handleUpdateQuestion(qIdx, 'correctOptionIndex', optIdx)}
                          className="w-4 h-4 accent-emerald-600 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                          placeholder={`Opción ${optIdx + 1}`}
                          className="flex-1 bg-transparent text-xs font-medium focus:outline-none text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Explanation field */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Explicación o Dato Curioso (se muestra tras responder)
                </label>
                <input
                  type="text"
                  value={q.explanation}
                  onChange={(e) => handleUpdateQuestion(qIdx, 'explanation', e.target.value)}
                  placeholder="Ej: Albert Einstein dedujo este principio fundamental en 1905..."
                  className="w-full px-3.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Submit & Cancel Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-lg transition-all flex items-center gap-2 hover:scale-[1.02]"
          >
            {isSubmitting ? (
              'Publicando...'
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Publicar Quiz en la Comunidad
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

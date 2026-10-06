import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  Users,
  Play,
  Star,
  BookOpen,
  Sparkles,
  Atom,
  Landmark,
  Film,
  Globe2,
  Cpu,
  Trophy,
  HelpCircle,
  Church,
} from 'lucide-react';
import { Quiz, QuizCategory, QuizDifficulty } from '../types';
import { AvatarDisplay } from './AvatarDisplay';
import { sound } from '../utils/audio';

interface Props {
  quizzes: Quiz[];
  onPlaySolo: (quiz: Quiz) => void;
  onCreateMultiplayer: (quiz: Quiz) => void;
  onNavigateToCreate: () => void;
}

const CATEGORIES: { id: QuizCategory | 'todos'; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'todos', label: 'Todos', icon: Sparkles },
  { id: 'religion', label: 'Religión', icon: Church },
  { id: 'ciencia', label: 'Ciencia', icon: Atom },
  { id: 'historia', label: 'Historia', icon: Landmark },
  { id: 'cine', label: 'Cine & TV', icon: Film },
  { id: 'geografia', label: 'Geografía', icon: Globe2 },
  { id: 'tecnologia', label: 'Tecnología', icon: Cpu },
  { id: 'deportes', label: 'Deportes', icon: Trophy },
  { id: 'cultura_general', label: 'Cultura General', icon: HelpCircle },
];

export const QuizLibrary: React.FC<Props> = ({
  quizzes,
  onPlaySolo,
  onCreateMultiplayer,
  onNavigateToCreate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesCategory = selectedCategory === 'todos' || quiz.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'todos' || quiz.difficulty === selectedDifficulty;
    const matchesSearch =
      quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quiz.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quiz.authorName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesDifficulty && matchesSearch;
  });

  const getDifficultyBadge = (diff: QuizDifficulty) => {
    switch (diff) {
      case 'facil':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">Fácil</span>;
      case 'medio':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">Medio</span>;
      case 'dificil':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">Difícil</span>;
    }
  };

  const getCategoryColor = (cat: QuizCategory) => {
    switch (cat) {
      case 'religion':
        return 'from-amber-500/10 to-yellow-600/10 border-amber-300 dark:border-amber-700/40 text-amber-700 dark:text-amber-300';
      case 'ciencia':
        return 'from-blue-500/10 to-indigo-500/10 border-blue-200 dark:border-blue-900/40 text-blue-600 dark:text-blue-400';
      case 'historia':
        return 'from-amber-500/10 to-orange-500/10 border-amber-200 dark:border-amber-900/40 text-amber-600 dark:text-amber-400';
      case 'cine':
        return 'from-pink-500/10 to-rose-500/10 border-pink-200 dark:border-pink-900/40 text-pink-600 dark:text-pink-400';
      case 'geografia':
        return 'from-emerald-500/10 to-teal-500/10 border-emerald-200 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400';
      case 'tecnologia':
        return 'from-cyan-500/10 to-blue-500/10 border-cyan-200 dark:border-cyan-900/40 text-cyan-600 dark:text-cyan-400';
      case 'deportes':
        return 'from-red-500/10 to-amber-500/10 border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400';
      default:
        return 'from-purple-500/10 to-indigo-500/10 border-purple-200 dark:border-purple-900/40 text-purple-600 dark:text-purple-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Cuestionarios Públicos y Comunitarios
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold font-display tracking-tight leading-tight">
            Desafía tu mente o compite con amigos
          </h1>
          <p className="text-sm sm:text-base text-white/80 max-w-xl">
            Elige entre cientos de preguntas en múltiples categorías, acumula puntos para el récord mundial o crea tu propia sala multijugador.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Search and Category Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por tema, título o autor..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
          </div>

          {/* Difficulty Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-3.5 py-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="todos">Cualquier Dificultad</option>
              <option value="facil">Fácil</option>
              <option value="medio">Medio</option>
              <option value="dificil">Difícil</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  sound.playClick();
                  setSelectedCategory(cat.id);
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm scale-[1.02]'
                    : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quiz Grid */}
      {filteredQuizzes.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-4">
          <BookOpen className="w-12 h-12 text-zinc-400 mx-auto" />
          <h3 className="text-lg font-bold font-display text-zinc-900 dark:text-zinc-100">
            No se encontraron cuestionarios
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            Prueba a cambiar tus filtros de búsqueda o sé el primero en crear un quiz público para la comunidad.
          </p>
          <button
            onClick={onNavigateToCreate}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Crear Quiz Ahora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredQuizzes.map((quiz) => (
            <motion.div
              key={quiz.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="group bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800/80 p-5 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-800 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Category & Difficulty Header */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-xl bg-gradient-to-r border ${getCategoryColor(
                      quiz.category
                    )}`}
                  >
                    {quiz.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {getDifficultyBadge(quiz.difficulty)}
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-500">
                      <Star className="w-3 h-3 fill-amber-500" />
                      {quiz.rating.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h3
                    title={quiz.title}
                    className="font-bold font-display text-base sm:text-lg text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug break-words"
                  >
                    {quiz.title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                    {quiz.description}
                  </p>
                </div>

                {/* Author info & stats */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                  <div className="flex items-center gap-2">
                    <AvatarDisplay avatar={quiz.authorAvatar} size="xs" />
                    <span className="text-xs text-zinc-600 dark:text-zinc-300 font-medium truncate max-w-[110px]">
                      {quiz.authorName}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-zinc-400">
                    {quiz.questions.length} preguntas · {quiz.playsCount.toLocaleString()} jugados
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5 mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
                <button
                  onClick={() => {
                    sound.playClick();
                    onPlaySolo(quiz);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-indigo-600 dark:fill-indigo-400" />
                  Jugar Solo
                </button>

                <button
                  onClick={() => {
                    sound.playClick();
                    onCreateMultiplayer(quiz);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Users className="w-3.5 h-3.5" />
                  Multijugador
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

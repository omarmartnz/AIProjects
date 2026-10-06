import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Check, Shuffle, Crown } from 'lucide-react';
import { AvatarConfig, UserProfile } from '../types';
import { AvatarDisplay } from './AvatarDisplay';
import { sound } from '../utils/audio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onSave: (updatedUser: Partial<UserProfile>) => void;
}

const SKIN_TONES = [
  { label: 'Cálido', value: '#FCD34D' },
  { label: 'Melocotón', value: '#FED7AA' },
  { label: 'Rosa Suave', value: '#FBCFE8' },
  { label: 'Dorado', value: '#FDE68A' },
  { label: 'Bronce', value: '#D97706' },
  { label: 'Chocolate', value: '#92400E' },
  { label: 'Avatar Azul', value: '#93C5FD' },
  { label: 'Alien Verde', value: '#86EFAC' },
];

const HAIR_STYLES: { id: AvatarConfig['hairStyle']; label: string }[] = [
  { id: 'cresta', label: 'Cresta' },
  { id: 'corto', label: 'Corto Clásico' },
  { id: 'largo', label: 'Largo Ondulado' },
  { id: 'rizado', label: 'Rizado Afro' },
  { id: 'coleta', label: 'Coleta Alta' },
  { id: 'calvo', label: 'Rapado' },
  { id: 'gorra', label: 'Gorra Gamer' },
  { id: 'auriculares', label: 'DJ Headset' },
];

const HAIR_COLORS = [
  { label: 'Oscuro', value: '#1F2937' },
  { label: 'Castaño', value: '#78350F' },
  { label: 'Rubio', value: '#F59E0B' },
  { label: 'Fuego', value: '#EF4444' },
  { label: 'Cíber Azul', value: '#3B82F6' },
  { label: 'Lavanda', value: '#8B5CF6' },
  { label: 'Neon Rosa', value: '#EC4899' },
  { label: 'Esmeralda', value: '#10B981' },
];

const EXPRESSIONS: { id: AvatarConfig['expression']; label: string }[] = [
  { id: 'sonrisa', label: 'Sonrisa Amigable' },
  { id: 'guiño', label: 'Guiño Pícaro' },
  { id: 'inteligente', label: 'Cerebral' },
  { id: 'emocionado', label: 'Súper Emocionado' },
  { id: 'gafas_sol', label: 'Gafas Oscuras Cool' },
  { id: 'concentrado', label: 'Enfoque Máximo' },
];

const ACCESSORIES: { id: AvatarConfig['accessory']; label: string }[] = [
  { id: 'ninguno', label: 'Sin Accesorio' },
  { id: 'corona', label: 'Corona Dorada' },
  { id: 'gafas', label: 'Gafas de Erudito' },
  { id: 'auriculares', label: 'Auriculares Pro' },
  { id: 'medalla', label: 'Medalla Olímpica' },
  { id: 'varita', label: 'Varita Mágica' },
];

const BG_COLORS = [
  { label: 'Índigo', value: '#4F46E5' },
  { label: 'Púrpura', value: '#7C3AED' },
  { label: 'Rosa Fucsia', value: '#DB2777' },
  { label: 'Verde Émeralda', value: '#059669' },
  { label: 'Ámbar', value: '#D97706' },
  { label: 'Azul Marino', value: '#2563EB' },
  { label: 'Teal', value: '#0D9488' },
  { label: 'Grafito', value: '#374151' },
];

const TITLES = [
  'Novato Curioso',
  'Mente Brillante',
  'Trivia Master',
  'Cerebro Dorado',
  'Estratega Quiz',
  'Campeón Mensual',
  'Leyenda Viva',
];

export const AvatarCustomizer: React.FC<Props> = ({ isOpen, onClose, user, onSave }) => {
  const [username, setUsername] = useState(user.username);
  const [config, setConfig] = useState<AvatarConfig>({ ...user.avatar });
  const [activeTab, setActiveTab] = useState<'base' | 'pelo' | 'expresion' | 'accesorios' | 'fondo'>('base');

  if (!isOpen) return null;

  const handleRandomize = () => {
    sound.playClick();
    const randomSkin = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)].value;
    const randomHair = HAIR_STYLES[Math.floor(Math.random() * HAIR_STYLES.length)].id;
    const randomHairColor = HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)].value;
    const randomExp = EXPRESSIONS[Math.floor(Math.random() * EXPRESSIONS.length)].id;
    const randomAcc = ACCESSORIES[Math.floor(Math.random() * ACCESSORIES.length)].id;
    const randomBg = BG_COLORS[Math.floor(Math.random() * BG_COLORS.length)].value;
    const randomTitle = TITLES[Math.floor(Math.random() * TITLES.length)];

    setConfig({
      skinTone: randomSkin,
      hairStyle: randomHair,
      hairColor: randomHairColor,
      expression: randomExp,
      accessory: randomAcc,
      bgColor: randomBg,
      title: randomTitle,
    });
  };

  const handleSave = () => {
    sound.playVictory();
    onSave({
      username: username.trim() || user.username,
      avatar: config,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-display">Personalizar Avatar y Perfil</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Define tu identidad en partidas multijugador y clasificaciones</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Live Preview Hero */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60">
              <div className="relative group">
                <AvatarDisplay avatar={config} size="2xl" showBadge={false} animate />
                <button
                  onClick={handleRandomize}
                  title="Generar aleatorio"
                  className="absolute -bottom-2 -right-2 p-2.5 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 space-y-3 w-full">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                    Nombre de Jugador
                  </label>
                  <input
                    type="text"
                    value={username}
                    maxLength={20}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Tu alias..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                    Título Honorífico
                  </label>
                  <select
                    value={config.title}
                    onChange={(e) => setConfig({ ...config, title: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {TITLES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Customization Tabs */}
            <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-2 overflow-x-auto pb-1">
              {(
                [
                  { id: 'base', label: 'Piel y Base' },
                  { id: 'pelo', label: 'Cabello' },
                  { id: 'expresion', label: 'Expresión' },
                  { id: 'accesorios', label: 'Accesorios' },
                  { id: 'fondo', label: 'Color de Fondo' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    sound.playClick();
                    setActiveTab(tab.id);
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="space-y-4">
              {activeTab === 'base' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
                    Tono de Piel
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                    {SKIN_TONES.map((tone) => (
                      <button
                        key={tone.value}
                        onClick={() => {
                          sound.playClick();
                          setConfig({ ...config, skinTone: tone.value });
                        }}
                        className={`group flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                          config.skinTone === tone.value
                            ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/20'
                            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                        }`}
                      >
                        <div
                          className="w-9 h-9 rounded-full shadow-inner border border-black/10 flex items-center justify-center"
                          style={{ backgroundColor: tone.value }}
                        >
                          {config.skinTone === tone.value && <Check className="w-4 h-4 text-zinc-900" />}
                        </div>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium truncate">
                          {tone.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'pelo' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
                      Estilo de Cabello
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {HAIR_STYLES.map((h) => (
                        <button
                          key={h.id}
                          onClick={() => {
                            sound.playClick();
                            setConfig({ ...config, hairStyle: h.id });
                          }}
                          className={`p-3 rounded-xl border text-sm font-medium text-left transition-all ${
                            config.hairStyle === h.id
                              ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                              : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                          }`}
                        >
                          {h.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
                      Color de Cabello
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                      {HAIR_COLORS.map((hc) => (
                        <button
                          key={hc.value}
                          onClick={() => {
                            sound.playClick();
                            setConfig({ ...config, hairColor: hc.value });
                          }}
                          className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                            config.hairColor === hc.value
                              ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/20'
                              : 'border-zinc-200 dark:border-zinc-800'
                          }`}
                        >
                          <div
                            className="w-9 h-9 rounded-full shadow-inner border border-black/10 flex items-center justify-center"
                            style={{ backgroundColor: hc.value }}
                          >
                            {config.hairColor === hc.value && <Check className="w-4 h-4 text-white" />}
                          </div>
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{hc.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'expresion' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
                    Expresión Facial
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {EXPRESSIONS.map((exp) => (
                      <button
                        key={exp.id}
                        onClick={() => {
                          sound.playClick();
                          setConfig({ ...config, expression: exp.id });
                        }}
                        className={`p-3.5 rounded-xl border text-sm font-medium flex items-center justify-between transition-all ${
                          config.expression === exp.id
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                            : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        <span>{exp.label}</span>
                        {config.expression === exp.id && <Check className="w-4 h-4 text-indigo-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'accesorios' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
                    Accesorio Especial
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {ACCESSORIES.map((acc) => (
                      <button
                        key={acc.id}
                        onClick={() => {
                          sound.playClick();
                          setConfig({ ...config, accessory: acc.id });
                        }}
                        className={`p-3.5 rounded-xl border text-sm font-medium text-left transition-all ${
                          config.accessory === acc.id
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                            : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        {acc.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'fondo' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
                    Color de Fondo
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                    {BG_COLORS.map((bg) => (
                      <button
                        key={bg.value}
                        onClick={() => {
                          sound.playClick();
                          setConfig({ ...config, bgColor: bg.value });
                        }}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                          config.bgColor === bg.value
                            ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/20'
                            : 'border-zinc-200 dark:border-zinc-800'
                        }`}
                      >
                        <div
                          className="w-9 h-9 rounded-full shadow-inner border border-black/10 flex items-center justify-center"
                          style={{ backgroundColor: bg.value }}
                        >
                          {config.bgColor === bg.value && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{bg.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md active:scale-95 transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Guardar Cambios
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

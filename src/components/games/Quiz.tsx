import React, { useState, useEffect } from 'react';
import { Brain, CheckCircle2, XCircle, Star, ArrowRight, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BiblicalQuestion, User } from '../../types';
import { getDailyQuiz, submitQuiz } from '../../services/api';

export default function Quiz({ user }: { user: User }) {
  const [questions, setQuestions] = useState<BiblicalQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDailyQuiz()
      .then(data => {
        setQuestions(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching quiz:", err);
        setLoading(false);
      });
  }, []);

  const handleAnswer = (option: string) => {
    if (selectedOption) return;
    
    setSelectedOption(option);
    const correct = option === questions[currentIndex].correct_option;
    setIsCorrect(correct);
    
    if (correct) {
      const points = (currentIndex + 1) * 10;
      setScore(prev => prev + points);
    }

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedOption(null);
        setIsCorrect(null);
      } else {
        setQuizFinished(true);
        handleSubmitScore();
      }
    }, 1500);
  };

  const handleSubmitScore = async () => {
    try {
      await submitQuiz(user.id, score);
    } catch (err) {
      console.error("Error submitting quiz score:", err);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>;

  if (quizFinished) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto bg-white p-8 rounded-3xl border border-stone-200 shadow-xl text-center"
      >
        <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trophy size={40} fill="currentColor" />
        </div>
        <h3 className="text-2xl font-bold text-stone-900 mb-2">Quiz Concluído!</h3>
        <p className="text-stone-500 mb-6">Parabéns pelo seu conhecimento bíblico.</p>
        
        <div className="bg-red-50 p-6 rounded-2xl mb-8">
          <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1">Pontos Ganhos</p>
          <p className="text-4xl font-black text-red-700">+{score}</p>
        </div>

        <button 
          onClick={() => window.location.href = '/games'}
          className="w-full py-4 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-colors"
        >
          Voltar para Games
        </button>
      </motion.div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const options = [
    { key: 'A', text: currentQuestion.option_a },
    { key: 'B', text: currentQuestion.option_b },
    { key: 'C', text: currentQuestion.option_c },
    { key: 'D', text: currentQuestion.option_d },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <Brain className="text-red-600" size={24} />
          <span className="font-bold text-stone-800">Questão {currentIndex + 1}/3</span>
        </div>
        <div className="flex items-center gap-1 text-red-600 font-bold">
          <Star size={18} fill="currentColor" />
          <span>{score} pts</span>
        </div>
      </div>

      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / 3) * 100}%` }}
          className="h-full bg-red-500"
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm"
        >
          <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-2 block">
            {currentQuestion.category} • {currentQuestion.difficulty}
          </span>
          <h3 className="text-xl font-bold text-stone-900 mb-8 leading-relaxed">
            {currentQuestion.question}
          </h3>

          <div className="grid grid-cols-1 gap-3">
            {options.map((opt) => (
              <button
                key={opt.key}
                onClick={() => handleAnswer(opt.key)}
                disabled={!!selectedOption}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group ${
                  selectedOption === opt.key
                    ? isCorrect 
                      ? 'bg-red-50 border-red-500 text-red-700' 
                      : 'bg-red-50 border-red-500 text-red-700'
                    : selectedOption && opt.key === currentQuestion.correct_option
                      ? 'bg-red-50 border-red-500 text-red-700'
                      : 'bg-white border-stone-100 hover:border-red-200 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                    selectedOption === opt.key
                      ? isCorrect ? 'bg-red-500 text-white' : 'bg-red-500 text-white'
                      : 'bg-stone-100 text-stone-500 group-hover:bg-red-100 group-hover:text-red-600'
                  }`}>
                    {opt.key}
                  </span>
                  <span className="font-semibold">{opt.text}</span>
                </div>
                {selectedOption === opt.key && (
                  isCorrect ? <CheckCircle2 size={20} /> : <XCircle size={20} />
                )}
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
